import { db } from "../db";
import { 
  properties, 
  regions, 
  propertyClasses, 
  propertyAnalytics, 
  investmentAnalytics,
  type PropertyWithRelations 
} from "@shared/schema";
import { eq, and, gte, lte, ilike, desc, sql, count } from "drizzle-orm";

export interface PropertyFilters {
  regionId?: number;
  propertyClassId?: number;
  minPrice?: number;
  maxPrice?: number;
  rooms?: number;
  minArea?: number;
  maxArea?: number;
  propertyType?: string;
  marketType?: string;
  query?: string;
}

export interface PaginationOptions {
  page?: number;
  perPage?: number;
}

export class OptimizedPropertyService {
  /**
   * Получение свойств с оптимизированными joins вместо N+1 queries
   */
  static async getPropertiesWithRelations(
    filters: PropertyFilters = {},
    pagination: PaginationOptions = {}
  ) {
    const { page = 1, perPage = 10 } = pagination;
    const offset = (page - 1) * perPage;

    // Базовый запрос с joins
    let query = db
      .select({
        // Property fields
        property: properties,
        // Related data
        region: regions,
        propertyClass: propertyClasses,
        analytics: propertyAnalytics,
        investmentAnalytics: investmentAnalytics
      })
      .from(properties)
      .leftJoin(regions, eq(properties.regionId, regions.id))
      .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
      .leftJoin(propertyAnalytics, eq(properties.id, propertyAnalytics.propertyId))
      .leftJoin(investmentAnalytics, eq(properties.id, investmentAnalytics.propertyId));

    // Применение фильтров
    const conditions = this.buildFilterConditions(filters);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Сортировка и пагинация
    const [propertiesData, totalCountResult] = await Promise.all([
      query
        .orderBy(desc(properties.createdAt))
        .limit(perPage)
        .offset(offset),
      
      // Подсчет общего количества с теми же фильтрами
      db
        .select({ count: count() })
        .from(properties)
        .leftJoin(regions, eq(properties.regionId, regions.id))
        .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
    ]);

    const total = totalCountResult[0]?.count || 0;
    const pages = Math.ceil(total / perPage);

    // Преобразование результатов
    const formattedProperties = propertiesData.map(row => ({
      ...row.property,
      region: row.region,
      propertyClass: row.propertyClass,
      analytics: row.analytics,
      investmentAnalytics: row.investmentAnalytics
    }));

    return {
      properties: formattedProperties,
      pagination: {
        page,
        perPage,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Получение данных для карты с оптимизированными запросами
   */
  static async getMapData(filters: PropertyFilters = {}) {
    const conditions = this.buildFilterConditions(filters);

    const mapData = await db
      .select({
        id: properties.id,
        title: properties.title,
        price: properties.price,
        pricePerSqm: properties.pricePerSqm,
        coordinates: properties.coordinates,
        area: properties.area,
        rooms: properties.rooms,
        address: properties.address,
        propertyClassName: propertyClasses.name,
        regionName: regions.name,
        roi: investmentAnalytics.roi,
        liquidityScore: investmentAnalytics.liquidityScore,
        investmentRating: investmentAnalytics.investmentRating
      })
      .from(properties)
      .leftJoin(regions, eq(properties.regionId, regions.id))
      .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
      .leftJoin(investmentAnalytics, eq(properties.id, investmentAnalytics.propertyId))
      .where(
        and(
          eq(properties.isActive, true),
          sql`${properties.coordinates} IS NOT NULL`,
          conditions.length > 0 ? and(...conditions) : undefined
        )
      )
      .limit(1000); // Лимит для производительности карты

    // Преобразование в GeoJSON формат
    return mapData
      .filter(item => item.coordinates)
      .map(item => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: item.coordinates!.split(',').map(Number) as [number, number]
        },
        properties: {
          id: item.id,
          title: item.title,
          price: item.price,
          pricePerSqm: item.pricePerSqm,
          propertyClass: item.propertyClassName,
          rooms: item.rooms,
          area: item.area,
          address: item.address,
          roi: item.roi ? parseFloat(item.roi) : undefined,
          liquidityScore: item.liquidityScore,
          investmentRating: item.investmentRating
        }
      }));
  }

  /**
   * Получение аналитики по региону с агрегированными данными
   */
  static async getRegionAnalytics(regionId: number) {
    const analytics = await db
      .select({
        totalProperties: count(properties.id),
        avgPrice: sql<number>`AVG(${properties.price})`,
        minPrice: sql<number>`MIN(${properties.price})`,
        maxPrice: sql<number>`MAX(${properties.price})`,
        avgPricePerSqm: sql<number>`AVG(${properties.pricePerSqm})`,
        avgRoi: sql<number>`AVG(${investmentAnalytics.roi})`,
        avgLiquidityScore: sql<number>`AVG(${investmentAnalytics.liquidityScore})`,
        propertyTypeDistribution: sql<any[]>`
          json_agg(
            json_build_object(
              'type', ${properties.propertyType},
              'count', count(*)
            )
          )
        `
      })
      .from(properties)
      .leftJoin(investmentAnalytics, eq(properties.id, investmentAnalytics.propertyId))
      .where(
        and(
          eq(properties.regionId, regionId),
          eq(properties.isActive, true)
        )
      )
      .groupBy(properties.propertyType);

    return analytics[0] || null;
  }

  /**
   * Поиск свойств с полнотекстовым поиском
   */
  static async searchProperties(searchQuery: string, filters: PropertyFilters = {}) {
    const conditions = this.buildFilterConditions(filters);
    
    // Добавляем полнотекстовый поиск
    const searchConditions = [
      ilike(properties.title, `%${searchQuery}%`),
      ilike(properties.description, `%${searchQuery}%`),
      ilike(properties.address, `%${searchQuery}%`)
    ];

    const results = await db
      .select({
        property: properties,
        region: regions,
        propertyClass: propertyClasses,
        investmentAnalytics: investmentAnalytics,
        // Ранжирование по релевантности
        relevanceScore: sql<number>`
          CASE 
            WHEN ${properties.title} ILIKE ${`%${searchQuery}%`} THEN 3
            WHEN ${properties.address} ILIKE ${`%${searchQuery}%`} THEN 2
            WHEN ${properties.description} ILIKE ${`%${searchQuery}%`} THEN 1
            ELSE 0
          END
        `
      })
      .from(properties)
      .leftJoin(regions, eq(properties.regionId, regions.id))
      .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
      .leftJoin(investmentAnalytics, eq(properties.id, investmentAnalytics.propertyId))
      .where(
        and(
          eq(properties.isActive, true),
          sql`(${searchConditions.join(' OR ')})`,
          conditions.length > 0 ? and(...conditions) : undefined
        )
      )
      .orderBy(desc(sql`relevance_score`), desc(properties.createdAt))
      .limit(50);

    return results.map(row => ({
      ...row.property,
      region: row.region,
      propertyClass: row.propertyClass,
      investmentAnalytics: row.investmentAnalytics,
      relevanceScore: row.relevanceScore
    }));
  }

  /**
   * Построение условий фильтрации
   */
  private static buildFilterConditions(filters: PropertyFilters) {
    console.log('🔍 Building filter conditions for:', filters);
    const conditions = [eq(properties.isActive, true)];

    if (filters.regionId) {
      conditions.push(eq(properties.regionId, filters.regionId));
    }

    if (filters.propertyClassId) {
      conditions.push(eq(properties.propertyClassId, filters.propertyClassId));
    }

    if (filters.minPrice) {
      conditions.push(gte(properties.price, filters.minPrice));
    }

    if (filters.maxPrice) {
      conditions.push(lte(properties.price, filters.maxPrice));
    }

    if (filters.rooms) {
      conditions.push(eq(properties.rooms, filters.rooms));
    }

    if (filters.propertyType) {
      conditions.push(eq(properties.propertyType, filters.propertyType));
    }

    if (filters.marketType) {
      console.log('🔍 Adding marketType filter:', filters.marketType);
      conditions.push(sql`properties.market_type = ${filters.marketType}`);
    }

    if (filters.minArea && filters.maxArea) {
      conditions.push(
        sql`CAST(${properties.area} AS NUMERIC) BETWEEN ${filters.minArea} AND ${filters.maxArea}`
      );
    } else if (filters.minArea) {
      conditions.push(
        sql`CAST(${properties.area} AS NUMERIC) >= ${filters.minArea}`
      );
    } else if (filters.maxArea) {
      conditions.push(
        sql`CAST(${properties.area} AS NUMERIC) <= ${filters.maxArea}`
      );
    }

    return conditions;
  }

  /**
   * Получение статистики для дашборда
   */
  static async getDashboardStats() {
    const [propertyStats, regionStats, recentActivity] = await Promise.all([
      // Статистика по объектам
      db
        .select({
          total: count(properties.id),
          avgPrice: sql<number>`AVG(${properties.price})`,
          totalValue: sql<number>`SUM(${properties.price})`
        })
        .from(properties)
        .where(eq(properties.isActive, true)),

      // Статистика по регионам
      db
        .select({
          regionName: regions.name,
          propertyCount: count(properties.id),
          avgPrice: sql<number>`AVG(${properties.price})`
        })
        .from(properties)
        .innerJoin(regions, eq(properties.regionId, regions.id))
        .where(eq(properties.isActive, true))
        .groupBy(regions.id, regions.name)
        .orderBy(desc(count(properties.id)))
        .limit(10),

      // Последняя активность
      db
        .select({
          property: properties,
          region: regions
        })
        .from(properties)
        .innerJoin(regions, eq(properties.regionId, regions.id))
        .where(eq(properties.isActive, true))
        .orderBy(desc(properties.createdAt))
        .limit(5)
    ]);

    return {
      properties: propertyStats[0],
      regions: regionStats,
      recentActivity: recentActivity.map(row => ({
        ...row.property,
        region: row.region
      }))
    };
  }
}