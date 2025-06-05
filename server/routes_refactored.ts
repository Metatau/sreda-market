import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateAIResponse, generatePropertyRecommendations, analyzePropertyInvestment } from "./services/openai";
import { simpleInvestmentAnalyticsService } from "./services/simpleInvestmentAnalytics";
import { analyticsService } from "./services/analyticsService";
import { requireAuth, optionalAuth, type AuthenticatedRequest } from "./middleware/auth";
import { RegionController } from "./controllers/RegionController";
import { PropertyClassController } from "./controllers/PropertyClassController";
import { PropertyController } from "./controllers/PropertyController";
import { PropertyService } from "./services/PropertyService";
import { globalErrorHandler } from "./utils/errors";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize controllers
  const propertyService = new PropertyService();
  const regionController = new RegionController();
  const propertyClassController = new PropertyClassController();
  const propertyController = new PropertyController(propertyService);

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
    res.json({ success: true });
  });

  // Region routes
  app.get("/api/regions", regionController.getRegions);
  app.get("/api/regions/:id", regionController.getRegion);
  app.get("/api/regions/:id/analytics", regionController.getRegionAnalytics);

  // Property class routes
  app.get("/api/property-classes", propertyClassController.getPropertyClasses);
  app.get("/api/property-classes/:id", propertyClassController.getPropertyClass);

  // Property routes
  app.get("/api/properties", propertyController.getProperties);
  app.get("/api/properties/map-data", propertyController.getMapData);
  app.get("/api/properties/:id", propertyController.getProperty);
  app.post("/api/properties/search", propertyController.searchProperties);

  // Analytics routes
  app.get("/api/analytics/districts", async (req, res) => {
    try {
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const analytics = await analyticsService.getDistrictAnalytics(regionId);
      res.json({ success: true, data: analytics });
    } catch (error) {
      console.error("Error fetching district analytics:", error);
      res.status(500).json({ success: false, error: "Failed to fetch district analytics" });
    }
  });

  app.get("/api/analytics/market-overview", async (req, res) => {
    try {
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const overview = await analyticsService.getMarketOverview(regionId);
      res.json({ success: true, data: overview });
    } catch (error) {
      console.error("Error fetching market overview:", error);
      res.status(500).json({ success: false, error: "Failed to fetch market overview" });
    }
  });

  app.get("/api/analytics/investment-map", async (req, res) => {
    try {
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const investmentMap = await analyticsService.getInvestmentMap(regionId);
      res.json({ success: true, data: investmentMap });
    } catch (error) {
      console.error("Error fetching investment map:", error);
      res.status(500).json({ success: false, error: "Failed to fetch investment map" });
    }
  });

  app.get("/api/analytics/new-properties", async (req, res) => {
    try {
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const count = await storage.getNewPropertiesCount(since, regionId);
      
      res.json({
        count: count.toString(),
        period: "24h",
        regionId: regionId || null
      });
    } catch (error) {
      console.error("Error fetching new properties count:", error);
      res.status(500).json({ error: "Failed to fetch new properties count" });
    }
  });

  app.get("/api/analytics/price-history", async (req, res) => {
    try {
      const regionId = req.query.regionId ? parseInt(req.query.regionId as string) : undefined;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const priceHistory = await analyticsService.getPriceHistory(regionId, days);
      res.json({ success: true, data: priceHistory });
    } catch (error) {
      console.error("Error fetching price history:", error);
      res.status(500).json({ success: false, error: "Failed to fetch price history" });
    }
  });

  // AI Chat
  app.post("/api/chat", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { message, sessionId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const response = await generateAIResponse(message);
      
      await storage.saveChatMessage({
        sessionId: sessionId || `session_${Date.now()}`,
        role: "user",
        content: message,
        createdAt: new Date(),
      });

      await storage.saveChatMessage({
        sessionId: sessionId || `session_${Date.now()}`,
        role: "assistant",
        content: response.message || response,
        createdAt: new Date(),
      });

      res.json({
        message: response.message || response,
        sessionId: sessionId || `session_${Date.now()}`,
      });
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // AI Property Recommendations
  app.post("/api/ai/recommendations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { budget, purpose, region, rooms } = req.body;
      
      const recommendations = await generatePropertyRecommendations({
        budget,
        purpose, 
        region,
        rooms
      });

      res.json(recommendations);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Investment Analytics
  app.get("/api/properties/:id/investment-analytics", async (req, res) => {
    try {
      const propertyId = parseInt(req.params.id);
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

  app.post("/api/properties/:id/analyze-investment", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const propertyId = parseInt(req.params.id);
      if (isNaN(propertyId)) {
        return res.status(400).json({ error: "Invalid property ID" });
      }

      const property = await storage.getProperty(propertyId);
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
      console.error("Error analyzing investment:", error);
      res.status(500).json({ error: "Failed to analyze investment" });
    }
  });

  // Batch calculate investment analytics
  app.post("/api/analytics/batch-calculate", async (req, res) => {
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

  // Global error handler
  app.use(globalErrorHandler);

  const httpServer = createServer(app);
  return httpServer;
}