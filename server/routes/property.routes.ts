/**
 * Property-related routes - extracted from monolithic routes.ts
 */
import { Router } from 'express';
import { PropertyController } from '../controllers/PropertyController';
import { PropertyService } from '../services/PropertyService';
import { addUserContext, requireAuth } from '../middleware/unified-auth';
import { ResponseHelper } from '../utils/response-helpers';
import { handleAsyncError } from '../utils/errors';

const router = Router();
const propertyService = new PropertyService();
const propertyController = new PropertyController(propertyService);

// Apply user context to all property routes
router.use(addUserContext);

/**
 * GET /api/properties - Get properties with filters and pagination
 */
router.get('/', handleAsyncError(async (req, res) => {
  const { page, perPage } = ResponseHelper.parsePagination(req.query);
  
  const filters = {
    regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
    propertyClassId: req.query.propertyClassId ? parseInt(req.query.propertyClassId as string) : undefined,
    minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
    maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
    rooms: req.query.rooms ? parseInt(req.query.rooms as string) : undefined,
    minArea: req.query.minArea ? parseInt(req.query.minArea as string) : undefined,
    maxArea: req.query.maxArea ? parseInt(req.query.maxArea as string) : undefined,
    propertyType: req.query.propertyType as string,
    marketType: req.query.marketType as 'secondary' | 'new_construction'
  };

  const result = await propertyService.getProperties(filters, { page, perPage });
  const pagination = ResponseHelper.calculatePagination(page, perPage, result.total);
  
  ResponseHelper.successWithPagination(res, result, pagination);
}));

/**
 * GET /api/properties/search - Search properties
 */
router.get('/search', handleAsyncError(async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return ResponseHelper.validationError(res, 'Search query is required');
  }

  const filters = {
    regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
    propertyClassId: req.query.propertyClassId ? parseInt(req.query.propertyClassId as string) : undefined,
  };

  const properties = await propertyService.searchProperties(query, filters);
  ResponseHelper.success(res, properties);
}));

/**
 * GET /api/properties/map-data - Get properties for map display
 */
router.get('/map-data', handleAsyncError(async (req, res) => {
  const filters = {
    regionId: req.query.regionId ? parseInt(req.query.regionId as string) : undefined,
    propertyClassId: req.query.propertyClassId ? parseInt(req.query.propertyClassId as string) : undefined,
    minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
    maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
  };

  const mapData = await propertyService.getMapData(filters);
  ResponseHelper.success(res, mapData);
}));

/**
 * GET /api/properties/:id - Get specific property
 */
router.get('/:id', handleAsyncError(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return ResponseHelper.validationError(res, 'Invalid property ID');
  }

  const property = await propertyService.getProperty(id);
  if (!property) {
    return ResponseHelper.notFound(res, 'Property');
  }

  ResponseHelper.success(res, property);
}));

export default router;