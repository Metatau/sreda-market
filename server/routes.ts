import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateAIPropertyRecommendations, generateAIResponse } from "./services/openai";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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
      const region = await storage.getRegion(id);
      if (!region) {
        return res.status(404).json({ error: "Region not found" });
      }
      
      const analytics = await storage.getRegionAnalytics(id);
      res.json({ ...region, analytics });
    } catch (error) {
      console.error("Error fetching region:", error);
      res.status(500).json({ error: "Failed to fetch region" });
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

  // Properties
  app.get("/api/properties", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const perPage = Math.min(parseInt(req.query.per_page as string) || 20, 100);
      
      const filters = {
        regionId: req.query.region_id ? parseInt(req.query.region_id as string) : undefined,
        propertyClassId: req.query.property_class_id ? parseInt(req.query.property_class_id as string) : undefined,
        minPrice: req.query.min_price ? parseInt(req.query.min_price as string) : undefined,
        maxPrice: req.query.max_price ? parseInt(req.query.max_price as string) : undefined,
        rooms: req.query.rooms ? parseInt(req.query.rooms as string) : undefined,
        propertyType: req.query.property_type as string,
      };

      const { properties, total } = await storage.getProperties(filters, { page, perPage });
      
      res.json({
        properties,
        pagination: {
          page,
          perPage,
          total,
          pages: Math.ceil(total / perPage),
          hasNext: page * perPage < total,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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

  // Map data
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
        features: mapData.map(point => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: point.coordinates.split(',').map(Number), // Assuming "lng,lat" format
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
        })),
      };

      res.json(geoJson);
    } catch (error) {
      console.error("Error fetching map data:", error);
      res.status(500).json({ error: "Failed to fetch map data" });
    }
  });

  // AI Chat
  app.post("/api/chat", async (req, res) => {
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

  // AI Property Recommendations
  app.post("/api/ai/recommendations", async (req, res) => {
    try {
      const recommendationSchema = z.object({
        budget: z.number().optional(),
        regionId: z.number().optional(),
        investmentGoals: z.string().optional(),
        riskTolerance: z.string().optional(),
      });

      const preferences = recommendationSchema.parse(req.body);
      
      const recommendations = await generateAIPropertyRecommendations(preferences);
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Analytics
  app.get("/api/analytics/districts", async (req, res) => {
    try {
      // This would typically involve more complex analytics
      // For now, return basic region analytics
      const regions = await storage.getRegions();
      const analytics = await Promise.all(
        regions.map(async (region) => {
          const stats = await storage.getRegionAnalytics(region.id);
          return {
            ...region,
            ...stats,
          };
        })
      );
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching district analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
