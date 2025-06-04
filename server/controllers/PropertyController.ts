
import { Request, Response } from "express";
import { z } from "zod";
import { BaseController } from "./BaseController";
import { PropertyService } from "../services/PropertyService";
import { handleAsyncError, NotFoundError, ValidationError } from "../utils/errors";

const searchFiltersSchema = z.object({
  regionId: z.number().optional(),
  propertyClassId: z.number().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  rooms: z.number().optional(),
  propertyType: z.string().optional(),
});

const searchBodySchema = z.object({
  query: z.string().optional(),
  ...searchFiltersSchema.shape,
});

export class PropertyController extends BaseController {
  constructor(private propertyService: PropertyService) {
    super();
  }

  getProperties = handleAsyncError(async (req: Request, res: Response) => {
    const { page, perPage } = this.validatePagination(
      req.query.page as string,
      req.query.per_page as string
    );

    const filters = searchFiltersSchema.parse({
      regionId: req.query.region_id ? parseInt(req.query.region_id as string) : undefined,
      propertyClassId: req.query.property_class_id ? parseInt(req.query.property_class_id as string) : undefined,
      minPrice: req.query.min_price ? parseInt(req.query.min_price as string) : undefined,
      maxPrice: req.query.max_price ? parseInt(req.query.max_price as string) : undefined,
      rooms: req.query.rooms ? parseInt(req.query.rooms as string) : undefined,
      propertyType: req.query.property_type as string,
    });

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
    const id = this.validateId(req.params.id);
    const property = await this.propertyService.getProperty(id);
    
    if (!property) {
      throw new NotFoundError("Property");
    }

    this.sendSuccess(res, property);
  });

  getMapData = handleAsyncError(async (req: Request, res: Response) => {
    const filters = {
      regionId: req.query.region_id ? parseInt(req.query.region_id as string) : undefined,
      propertyClassId: req.query.property_class_id ? parseInt(req.query.property_class_id as string) : undefined,
    };

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
