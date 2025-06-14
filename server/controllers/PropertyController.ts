
import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { PropertyService } from "../services/PropertyService";
import { handleAsyncError, NotFoundError } from "../utils/errors";
import { validateId, validatePagination, validateFilters, searchBodySchema } from "../utils/validation";

export class PropertyController extends BaseController {
  constructor(private propertyService: PropertyService) {
    super();
  }

  getProperties = handleAsyncError(async (req: Request, res: Response) => {
    console.log('=== PROPERTY CONTROLLER HIT ===');
    console.log('Full request URL:', req.url);
    console.log('Raw query params:', req.query);
    
    const { page, perPage } = validatePagination(
      req.query.page as string,
      req.query.per_page as string
    );

    const filters = validateFilters(req.query);
    console.log('📋 Controller - Validated filters:', JSON.stringify(filters, null, 2));
    
    const result = await this.propertyService.getProperties(filters, { page, limit: perPage });
    console.log('📊 Controller - Query result:', {
      propertiesCount: result.properties.length,
      total: result.total,
      hasFilters: Object.keys(filters).length > 0
    });
    
    this.sendSuccess(res, {
      properties: result.properties,
      pagination: {
        page,
        limit: perPage,
        total: result.total,
        pages: Math.ceil(result.total / perPage),
        hasNext: page < Math.ceil(result.total / perPage),
        hasPrev: page > 1,
      },
    });
  });

  getProperty = handleAsyncError(async (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    const property = await this.propertyService.getProperty(id);
    
    if (!property) {
      throw new NotFoundError("Property");
    }

    this.sendSuccess(res, property);
  });

  getMapData = handleAsyncError(async (req: Request, res: Response) => {
    const filters = validateFilters({
      region_id: req.query.region_id,
      property_class_id: req.query.property_class_id
    });

    const mapData = await this.propertyService.getMapData(filters);
    this.sendSuccess(res, mapData);
  });

  searchProperties = handleAsyncError(async (req: Request, res: Response) => {
    const { query, ...filters } = searchBodySchema.parse(req.body);
    
    const properties = query 
      ? await this.propertyService.searchProperties(query, filters)
      : await this.propertyService.getProperties(filters, { page: 1, perPage: 100 });

    this.sendSuccess(res, {
      properties: Array.isArray(properties) ? properties : properties.properties,
      total: Array.isArray(properties) ? properties.length : properties.total,
    });
  });
}
