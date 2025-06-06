import { Router } from 'express';
import { Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * Получение данных о недвижимости в формате GeoJSON
 * GET /api/properties/geojson
 */
router.get('/properties/geojson', async (req: Request, res: Response) => {
  try {
    const { 
      regionId, 
      propertyClassId, 
      minPrice, 
      maxPrice, 
      rooms,
      minArea,
      maxArea,
      propertyType,
      marketType 
    } = req.query;

    // Безопасная подготовка фильтров
    const filters: any = {};
    
    if (regionId && !isNaN(Number(regionId))) {
      filters.regionId = parseInt(regionId as string);
    }
    if (propertyClassId && !isNaN(Number(propertyClassId))) {
      filters.propertyClassId = parseInt(propertyClassId as string);
    }
    if (minPrice && !isNaN(Number(minPrice))) {
      filters.minPrice = parseFloat(minPrice as string);
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      filters.maxPrice = parseFloat(maxPrice as string);
    }
    if (rooms && !isNaN(Number(rooms))) {
      filters.rooms = parseInt(rooms as string);
    }
    if (minArea && !isNaN(Number(minArea))) {
      filters.minArea = parseFloat(minArea as string);
    }
    if (maxArea && !isNaN(Number(maxArea))) {
      filters.maxArea = parseFloat(maxArea as string);
    }
    if (propertyType && typeof propertyType === 'string') {
      filters.propertyType = propertyType;
    }
    if (marketType && (marketType === 'secondary' || marketType === 'new_construction')) {
      filters.marketType = marketType;
    }

    // Получение данных с большим лимитом для GeoJSON
    const result = await storage.getProperties(filters, { page: 1, perPage: 10000 });
    const properties = result?.properties || [];

    // Преобразование в GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: properties
        .filter(property => property.coordinates)
        .map(property => {
          const coords = property.coordinates!.split(',').map(Number);
          if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
            return null;
          }

          return {
            type: 'Feature',
            properties: {
              id: property.id,
              title: property.title,
              price: property.price,
              pricePerSqm: property.pricePerSqm,
              rooms: property.rooms,
              totalArea: property.totalArea,
              livingArea: property.livingArea,
              kitchenArea: property.kitchenArea,
              floor: property.floor,
              floorsTotal: property.floorsTotal,
              propertyType: property.propertyType,
              marketType: property.marketType,
              address: property.address,
              district: property.district,
              metroDistance: property.metroDistance,
              regionName: property.region?.name,
              propertyClassName: property.propertyClass?.name,
              investmentRating: property.investmentAnalytics?.investmentRating,
              roi: property.investmentAnalytics?.roi,
              liquidityScore: property.investmentAnalytics?.liquidityScore
            },
            geometry: {
              type: 'Point',
              coordinates: [coords[1], coords[0]] // [longitude, latitude] для GeoJSON
            }
          };
        })
        .filter(Boolean)
    };

    // Добавляем заголовки для кэширования
    res.set({
      'Content-Type': 'application/geo+json',
      'Cache-Control': 'public, max-age=300', // 5 минут
      'ETag': `"${Date.now()}"`,
      'Access-Control-Allow-Origin': '*'
    });

    res.json(geojson);

  } catch (error) {
    console.error('GeoJSON export error:', error);
    
    // Возвращаем пустой GeoJSON вместо ошибки
    res.status(200).json({
      type: 'FeatureCollection',
      features: []
    });
  }
});

/**
 * Получение метаданных GeoJSON
 * GET /api/properties/geojson/metadata
 */
router.get('/properties/geojson/metadata', async (req: Request, res: Response) => {
  try {
    const { properties } = await storage.getProperties(undefined, { page: 1, perPage: 1 });
    const totalCount = await storage.getProperties(undefined, { page: 1, perPage: 50000 });

    const validCoordinatesCount = totalCount.properties.filter(
      p => p.coordinates && p.coordinates.split(',').length === 2
    ).length;

    res.json({
      success: true,
      data: {
        totalProperties: totalCount.total,
        propertiesWithCoordinates: validCoordinatesCount,
        format: 'GeoJSON',
        coordinateSystem: 'WGS84 (EPSG:4326)',
        lastUpdated: new Date().toISOString(),
        bounds: {
          // Приблизительные границы России
          west: 19.48,
          south: 41.19,
          east: 169.01,
          north: 81.89
        },
        clustering: {
          enabled: true,
          maxZoom: 14,
          radius: 50
        }
      }
    });

  } catch (error) {
    console.error('GeoJSON metadata error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metadata'
    });
  }
});

/**
 * Получение GeoJSON данных по регионам
 * GET /api/regions/geojson
 */
router.get('/regions/geojson', async (req: Request, res: Response) => {
  try {
    const regions = await storage.getRegions();

    const geojson = {
      type: 'FeatureCollection',
      features: regions
        .filter(region => region.coordinates)
        .map(region => {
          const coords = region.coordinates!.split(',').map(Number);
          if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
            return null;
          }

          return {
            type: 'Feature',
            properties: {
              id: region.id,
              name: region.name,
              regionType: region.regionType,
              timezone: region.timezone
            },
            geometry: {
              type: 'Point',
              coordinates: [coords[1], coords[0]] // [longitude, latitude]
            }
          };
        })
        .filter(Boolean)
    };

    res.set({
      'Content-Type': 'application/geo+json',
      'Cache-Control': 'public, max-age=3600', // 1 час
      'Access-Control-Allow-Origin': '*'
    });

    res.json(geojson);

  } catch (error) {
    console.error('Regions GeoJSON error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate regions GeoJSON'
    });
  }
});

export { router as geoJsonRoutes };