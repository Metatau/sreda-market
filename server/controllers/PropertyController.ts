
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
    const { page, perPage } = validatePagination(
      req.query.page as string,
      req.query.per_page as string
    );

    const filters = validateFilters(req.query);
    console.log('Property filters applied:', filters, 'Original query:', req.query);
    
    const result = await this.propertyService.getProperties(filters, { page, perPage });
    
    this.sendSuccess(res, {
      properties: result.properties,
      pagination: {
        page,
        perPage,
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
