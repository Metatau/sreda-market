/**
 * Centralized validation utilities
 */
import { z } from "zod";
import { ValidationError } from "./errors";

// Common validation schemas
export const idSchema = z.number().int().positive("ID must be a positive integer");
export const paginationSchema = z.object({
  page: z.number().int().min(1, "Page must be at least 1").default(1),
  perPage: z.number().int().min(1).max(100, "Per page must be between 1 and 100").default(20)
});

export const propertyFiltersSchema = z.object({
  regionId: z.number().int().positive().optional(),
  propertyClassId: z.number().int().positive().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  rooms: z.number().int().min(1).optional(),
  minArea: z.number().min(0).optional(),
  maxArea: z.number().min(0).optional(),
  propertyType: z.string().optional(),
  marketType: z.enum(['secondary', 'new_construction']).optional(),
}).refine(data => {
  if (data.minPrice && data.maxPrice && data.minPrice > data.maxPrice) {
    return false;
  }
  if (data.minArea && data.maxArea && data.minArea > data.maxArea) {
    return false;
  }
  return true;
}, "Min values cannot be greater than max values");

export const searchBodySchema = z.object({
  query: z.string().min(1, "Search query cannot be empty").optional(),
  regionId: z.number().int().positive().optional(),
  propertyClassId: z.number().int().positive().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  rooms: z.number().int().min(1).optional(),
  minArea: z.number().min(0).optional(),
  maxArea: z.number().min(0).optional(),
  propertyType: z.string().optional(),
  marketType: z.enum(['secondary', 'new_construction']).optional(),
});

// Validation helper functions
export function validateId(id: string | number): number {
  try {
    const numId = typeof id === 'string' ? parseInt(id, 10) : id;
    return idSchema.parse(numId);
  } catch (error) {
    throw new ValidationError("Invalid ID provided");
  }
}

export function validatePagination(page?: string, perPage?: string) {
  try {
    return paginationSchema.parse({
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined
    });
  } catch (error) {
    throw new ValidationError("Invalid pagination parameters");
  }
}

export function validateFilters(query: Record<string, any>) {
  try {
    const filters: any = {};
    
    if (query.region_id) filters.regionId = parseInt(query.region_id as string);
    if (query.property_class_id) filters.propertyClassId = parseInt(query.property_class_id as string);
    if (query.min_price) filters.minPrice = parseFloat(query.min_price as string);
    if (query.max_price) filters.maxPrice = parseFloat(query.max_price as string);
    if (query.rooms) filters.rooms = parseInt(query.rooms as string);
    if (query.min_area) filters.minArea = parseFloat(query.min_area as string);
    if (query.max_area) filters.maxArea = parseFloat(query.max_area as string);
    if (query.property_type) filters.propertyType = query.property_type as string;
    if (query.market_type) filters.marketType = query.market_type as string;
    if (query.marketType) filters.marketType = query.marketType as string;

    return propertyFiltersSchema.parse(filters);
  } catch (error) {
    throw new ValidationError("Invalid filter parameters");
  }
}

// Coordinate validation helper
export function parseCoordinates(coordinateString: string): [number, number] {
  const coordMatch = coordinateString.match(/POINT\(([^)]+)\)/);
  const defaultCoords: [number, number] = [37.6176, 55.7558]; // Moscow
  
  if (!coordMatch || !coordMatch[1]) {
    return defaultCoords;
  }

  const [lng, lat] = coordMatch[1].split(' ').map(Number);
  
  if (isNaN(lng) || isNaN(lat)) {
    return defaultCoords;
  }

  // Validate coordinate ranges
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return defaultCoords;
  }

  return [lng, lat];
}