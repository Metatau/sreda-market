import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateAIResponse, generatePropertyRecommendations, analyzePropertyInvestment } from "./services/openai";
import { simpleInvestmentAnalyticsService } from "./services/simpleInvestmentAnalytics";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "./middleware/auth";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Authentication routes
  app.get("/api/auth/status", (req, res) => {
    const userId = req.headers['x-replit-user-id'];
    const userName = req.headers['x-replit-user-name'];
    const userRoles = req.headers['x-replit-user-roles'];

    if (userId && userName) {
      res.json({
        authenticated: true,
        userId,
        userName,
        userRoles: userRoles || '',
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // Since we're using Repl Auth, logout is handled client-side
    // This endpoint exists for consistency
    res.json({ success: true });
  });

  // Regions
  app.get("/api/regions", async (req, res) => {
    try {
      const regions = await storage.getRegions();
      res.json(regions);
    } catch (error) {
      console.error("Error fetching regions:", error);
      res.status(500).json({ error: "Failed to fetch regions" });
    }
  });

  app.get("/api/regions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate input
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid region ID" });
      }
      
      const region = await storage.getRegion(id);
      if (!region) {
        return res.status(404).json({ error: "Region not found" });
      }
      res.json(region);
    } catch (error) {
      console.error("Error fetching region:", error);
      res.status(500).json({ 
        error: "Failed to fetch region",
        ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
      });
    }
  });

  // Property Classes
  app.get("/api/property-classes", async (req, res) => {
    try {
      const propertyClasses = await storage.getPropertyClasses();
      res.json(propertyClasses);
    } catch (error) {
      console.error("Error fetching property classes:", error);
      res.status(500).json({ error: "Failed to fetch property classes" });
    }
  });

  app.get("/api/property-classes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const propertyClass = await storage.getPropertyClass(id);
      if (!propertyClass) {
        return res.status(404).json({ error: "Property class not found" });
      }
      res.json(propertyClass);
    } catch (error) {
      console.error("Error fetching property class:", error);
      res.status(500).json({ error: "Failed to fetch property class" });
    }
  });

  // Properties
  app.get("/api/properties", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.per_page as string) || 20;
      
      const filters = {
        regionId: req.query.region_id ? parseInt(req.query.region_id as string) : undefined,
        propertyClassId: req.query.property_class_id ? parseInt(req.query.property_class_id as string) : undefined,
        minPrice: req.query.min_price ? parseInt(req.query.min_price as string) : undefined,
        maxPrice: req.query.max_price ? parseInt(req.query.max_price as string) : undefined,
        rooms: req.query.rooms ? parseInt(req.query.rooms as string) : undefined,
        propertyType: req.query.property_type as string,
      };

      const result = await storage.getProperties(filters, { page, perPage });
      
      res.json({
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
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  // Map data - must be before :id route to avoid conflict
  app.get("/api/properties/map-data", async (req, res) => {
    try {
      const filters = {
        regionId: req.query.region_id ? parseInt(req.query.region_id as string) : undefined,
        propertyClassId: req.query.property_class_id ? parseInt(req.query.property_class_id as string) : undefined,
      };

      const mapData = await storage.getMapData(filters);
      
      // Convert to GeoJSON format
      const geoJson = {
        type: "FeatureCollection" as const,
        features: mapData.map(point => {
          // Parse coordinates from PostGIS POINT format
          const coordMatch = point.coordinates.match(/POINT\(([^)]+)\)/);
          let coordinates = [37.6176, 55.7558]; // Default to Moscow coordinates
          
          if (coordMatch && coordMatch[1]) {
            const [lng, lat] = coordMatch[1].split(' ').map(Number);
            if (!isNaN(lng) && !isNaN(lat)) {
              coordinates = [lng, lat];
            }
          }
          
          return {
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates,
            },
            properties: {
              id: point.id,
              title: point.title,
              price: point.price,
              pricePerSqm: point.pricePerSqm,
              propertyClass: point.propertyClass,
              rooms: point.rooms,
              area: point.area,
            },
          };
        }),
      };

      res.json(geoJson);
    } catch (error) {
      console.error("Error fetching map data:", error);
      res.status(500).json({ error: "Failed to fetch map data" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid property ID" });
      }
      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  // Property search
  app.post("/api/properties/search", async (req, res) => {
    try {
      const searchSchema = z.object({
        query: z.string().optional(),
        regionId: z.number().optional(),
        propertyClassId: z.number().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        rooms: z.number().optional(),
      });

      const { query, ...filters } = searchSchema.parse(req.body);
      
      let properties;
      if (query) {
        properties = await storage.searchProperties(query, filters);
      } else {
        const result = await storage.getProperties(filters, { page: 1, perPage: 100 });
        properties = result.properties;
      }

      res.json({
        properties,
        total: properties.length,
      });
    } catch (error) {
      console.error("Error searching properties:", error);
      res.status(500).json({ error: "Failed to search properties" });
    }
  });

  // AI Chat (requires authentication)
  app.post("/api/chat", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const chatSchema = z.object({
        message: z.string(),
        sessionId: z.string().optional(),
      });

      const { message, sessionId = `session_${Date.now()}` } = chatSchema.parse(req.body);

      // Save user message
      await storage.saveChatMessage({
        sessionId,
        role: "user",
        content: message,
        createdAt: new Date(),
      });

      // Generate AI response
      const aiResponse = await generateAIResponse(message);

      // Save AI response
      await storage.saveChatMessage({
        sessionId,
        role: "assistant",
        content: aiResponse,
        createdAt: new Date(),
      });

      res.json({
        response: aiResponse,
        sessionId,
      });
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // AI Property Recommendations (requires authentication)
  app.post("/api/ai/recommendations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const recommendationSchema = z.object({
        budget: z.number().optional(),
        purpose: z.string().optional(),
        region: z.string().optional(),
        rooms: z.number().optional(),
      });

      const preferences = recommendationSchema.parse(req.body);
      
      const recommendations = await generatePropertyRecommendations(preferences);
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Investment Analysis
  app.post("/api/properties/:id/analyze", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid property ID" });
      }

      const property = await storage.getProperty(id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      const analysis = await analyzePropertyInvestment({
        price: property.price,
        pricePerSqm: property.pricePerSqm || 0,
        region: property.region?.name || "Unknown",
        propertyClass: property.propertyClass?.name || "Not specified",
        area: parseFloat(property.area?.toString() || "0")
      });

      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing property:", error);
      res.status(500).json({ error: "Failed to analyze property" });
    }
  });

  // Chat History
  app.get("/api/chat/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const history = await storage.getChatHistory(sessionId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  // Investment Analytics Routes
  app.get("/api/investment-analytics/:propertyId", async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ error: "Invalid property ID" });
      }

      const analytics = await simpleInvestmentAnalyticsService.getAnalytics(propertyId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching investment analytics:", error);
      res.status(500).json({ error: "Failed to fetch investment analytics" });
    }
  });

  app.post("/api/investment-analytics/:propertyId/calculate", async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      if (isNaN(propertyId)) {
        return res.status(400).json({ error: "Invalid property ID" });
      }

      const analytics = await simpleInvestmentAnalyticsService.calculateAnalytics(propertyId);
      res.json(analytics);
    } catch (error) {
      console.error("Error calculating investment analytics:", error);
      res.status(500).json({ error: "Failed to calculate investment analytics" });
    }
  });

  app.post("/api/investment-analytics/batch-calculate", async (req, res) => {
    try {
      const batchSchema = z.object({
        propertyIds: z.array(z.number()),
      });

      const { propertyIds } = batchSchema.parse(req.body);
      
      const results = [];
      for (const propertyId of propertyIds) {
        try {
          const analytics = await simpleInvestmentAnalyticsService.calculateAnalytics(propertyId);
          results.push({ propertyId, status: 'success', analytics });
        } catch (error) {
          results.push({ 
            propertyId, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
      
      res.json({ results });
    } catch (error) {
      console.error("Error in batch calculation:", error);
      res.status(500).json({ error: "Failed to batch calculate analytics" });
    }
  });

  // Analytics Dashboard - new properties in last 24 hours
  app.get("/api/analytics/new-properties", async (req, res) => {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      
      const newPropertiesCount = await storage.getNewPropertiesCount(twentyFourHoursAgo, regionId);
      
      res.json({ 
        count: newPropertiesCount,
        period: "24h",
        timestamp: new Date().toISOString(),
        regionId: regionId || null
      });
    } catch (error) {
      console.error("Error fetching new properties count:", error);
      res.status(500).json({ error: "Failed to fetch new properties count" });
    }
  });

  // Daily update status endpoint
  app.get("/api/analytics/update-status", async (req, res) => {
    try {
      const status = await import("./services/dailyUpdateService").then(m => m.dailyUpdateService.getUpdateStatus());
      res.json(status);
    } catch (error) {
      console.error("Error fetching update status:", error);
      res.status(500).json({ error: "Failed to fetch update status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}