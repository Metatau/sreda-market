import { Router } from 'express';
import { db } from '../db';
import { 
  properties, 
  regions, 
  propertyClasses, 
  investmentAnalytics,
  propertyAnalytics 
} from '@shared/schema';
import { requireAuth, requireAdmin } from '../middleware/unified-auth';
import { generalRateLimit } from '../middleware/rateLimiting';
import { responseCacheMiddleware } from '../middleware/cache';
import { eq, desc, count, sql, gte } from 'drizzle-orm';

const router = Router();

// Получение новых объектов за последние 24 часа
router.get('/new-properties',
  generalRateLimit,
  responseCacheMiddleware(300),
  async (req, res) => {
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const newPropertiesCount = await db
        .select({ count: count() })
        .from(properties)
        .where(gte(properties.createdAt, oneDayAgo));

      res.json({
        success: true,
        data: {
          count: newPropertiesCount[0]?.count || 0,
          period: '24h',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('New properties analytics error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch new properties analytics' }
      });
    }
  }
);

// Получение рыночных трендов
router.get('/market-trends',
  generalRateLimit,
  responseCacheMiddleware(1800),
  requireAuth,
  async (req, res) => {
    try {
      const trends = await db
        .select({
          regionName: regions.name,
          avgPrice: sql<number>`AVG(${properties.price})`,
          priceChange: sql<number>`
            AVG(${properties.price}) - LAG(AVG(${properties.price})) 
            OVER (PARTITION BY ${regions.id} ORDER BY DATE_TRUNC('month', ${properties.createdAt}))
          `,
          propertyCount: count(properties.id),
          month: sql<string>`DATE_TRUNC('month', ${properties.createdAt})`
        })
        .from(properties)
        .innerJoin(regions, eq(properties.regionId, regions.id))
        .where(eq(properties.isActive, true))
        .groupBy(regions.id, regions.name, sql`DATE_TRUNC('month', ${properties.createdAt})`)
        .orderBy(desc(sql`DATE_TRUNC('month', ${properties.createdAt})`))
        .limit(100);

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('Market trends error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch market trends' }
      });
    }
  }
);

// Получение инвестиционной аналитики
router.get('/investment-metrics',
  generalRateLimit,
  responseCacheMiddleware(900),
  requireAuth,
  async (req, res) => {
    try {
      const metrics = await db
        .select({
          avgRoi: sql<number>`AVG(${investmentAnalytics.roi})`,
          avgLiquidityScore: sql<number>`AVG(${investmentAnalytics.liquidityScore})`,
          topPerformingRegions: sql<any[]>`
            json_agg(
              json_build_object(
                'regionName', ${regions.name},
                'roi', AVG(${investmentAnalytics.roi}),
                'propertyCount', COUNT(${properties.id})
              )
              ORDER BY AVG(${investmentAnalytics.roi}) DESC
            ) FILTER (WHERE ${investmentAnalytics.roi} IS NOT NULL)
          `
        })
        .from(investmentAnalytics)
        .innerJoin(properties, eq(investmentAnalytics.propertyId, properties.id))
        .innerJoin(regions, eq(properties.regionId, regions.id))
        .where(eq(properties.isActive, true));

      res.json({
        success: true,
        data: metrics[0] || {}
      });
    } catch (error) {
      console.error('Investment metrics error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch investment metrics' }
      });
    }
  }
);

// Получение качества данных (только для администраторов)
router.get('/data-quality',
  generalRateLimit,
  responseCacheMiddleware(600),
  requireAdmin,
  async (req, res) => {
    try {
      const qualityMetrics = await db
        .select({
          totalProperties: count(properties.id),
          propertiesWithCoordinates: sql<number>`
            COUNT(CASE WHEN ${properties.coordinates} IS NOT NULL THEN 1 END)
          `,
          propertiesWithAnalytics: sql<number>`
            COUNT(CASE WHEN ${propertyAnalytics.id} IS NOT NULL THEN 1 END)
          `,
          propertiesWithInvestmentData: sql<number>`
            COUNT(CASE WHEN ${investmentAnalytics.id} IS NOT NULL THEN 1 END)
          `,
          regionsWithProperties: sql<number>`
            COUNT(DISTINCT ${properties.regionId})
          `,
          classesWithProperties: sql<number>`
            COUNT(DISTINCT ${properties.propertyClassId})
          `
        })
        .from(properties)
        .leftJoin(propertyAnalytics, eq(properties.id, propertyAnalytics.propertyId))
        .leftJoin(investmentAnalytics, eq(properties.id, investmentAnalytics.propertyId))
        .where(eq(properties.isActive, true));

      const metrics = qualityMetrics[0];
      const total = metrics.totalProperties;

      const qualityReport = {
        totalProperties: total,
        completeness: {
          coordinates: Math.round((metrics.propertiesWithCoordinates / total) * 100),
          analytics: Math.round((metrics.propertiesWithAnalytics / total) * 100),
          investmentData: Math.round((metrics.propertiesWithInvestmentData / total) * 100)
        },
        coverage: {
          regions: metrics.regionsWithProperties,
          propertyClasses: metrics.classesWithProperties
        },
        score: Math.round(
          (metrics.propertiesWithCoordinates + 
           metrics.propertiesWithAnalytics + 
           metrics.propertiesWithInvestmentData) / (total * 3) * 100
        )
      };

      res.json({
        success: true,
        data: qualityReport
      });
    } catch (error) {
      console.error('Data quality error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch data quality metrics' }
      });
    }
  }
);

export default router;