import { z } from 'zod';

// Base validation schemas
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Property filters validation - supports both camelCase and snake_case
export const propertyFiltersSchema = z.object({
  regionId: z.coerce.number().int().positive().optional(),
  region_id: z.coerce.number().int().positive().optional(),
  propertyClassId: z.coerce.number().int().positive().optional(),
  property_class_id: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  min_price: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  max_price: z.coerce.number().int().min(0).optional(),
  rooms: z.coerce.number().int().min(0).max(10).optional(),
  minArea: z.coerce.number().min(0).optional(),
  min_area: z.coerce.number().min(0).optional(),
  maxArea: z.coerce.number().min(0).optional(),
  max_area: z.coerce.number().min(0).optional(),
  propertyType: z.enum(['apartment', 'house', 'studio', 'penthouse']).optional(),
  property_type: z.enum(['apartment', 'house', 'studio', 'penthouse']).optional(),
  marketType: z.enum(['secondary', 'new_construction']).optional(),
  market_type: z.enum(['secondary', 'new_construction']).optional(),
  query: z.string().max(500).optional()
}).refine(data => {
  if ((data.minPrice || data.min_price) && (data.maxPrice || data.max_price)) {
    const min = data.minPrice || data.min_price;
    const max = data.maxPrice || data.max_price;
    if (min! > max!) return false;
  }
  if ((data.minArea || data.min_area) && (data.maxArea || data.max_area)) {
    const min = data.minArea || data.min_area;
    const max = data.maxArea || data.max_area;
    if (min! > max!) return false;
  }
  return true;
}, {
  message: "Min values cannot be greater than max values"
});

// Chat message validation
export const chatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional()
});

// AI request validation
export const aiRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z.object({
    propertyId: z.number().int().positive().optional(),
    filters: propertyFiltersSchema.optional(),
    preferences: z.object({
      budget: z.number().int().min(0).optional(),
      purpose: z.enum(['investment', 'living', 'rental']).optional(),
      region: z.string().max(100).optional(),
      rooms: z.number().int().min(0).max(10).optional()
    }).optional()
  }).optional()
});

// Investment analytics validation
export const investmentAnalysisSchema = z.object({
  propertyId: z.number().int().positive(),
  purchasePrice: z.number().int().min(100000).optional(),
  downPayment: z.number().min(0).max(1).optional(),
  loanRate: z.number().min(0).max(1).optional(),
  loanTerm: z.number().int().min(1).max(30).optional(),
  expectedRentalIncome: z.number().int().min(0).optional(),
  expectedPriceGrowth: z.number().min(-1).max(5).optional()
});

// Middleware validation function
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code
            }))
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid request data'
          }
        });
      }
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid query parameters',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
              code: e.code
            }))
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid query parameters'
          }
        });
      }
    }
  };
}