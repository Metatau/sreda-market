import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateAIResponse, generatePropertyRecommendations, analyzePropertyInvestment } from "./services/openai";
import { simpleInvestmentAnalyticsService } from "./services/simpleInvestmentAnalytics";
import { analyticsService } from "./services/analyticsService";
import { blankBankPaymentService } from "./services/paymentService";
import { ReferralService } from "./services/referralService";
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
  app.post("/api/chat", async (req, res) => {
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
        content: typeof response === 'string' ? response : response.message || 'Response generated',
        createdAt: new Date(),
      });

      res.json({
        message: typeof response === 'string' ? response : response.message || 'Response generated',
        sessionId: sessionId || `session_${Date.now()}`,
      });
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // AI Property Recommendations
  app.post("/api/ai/recommendations", async (req, res) => {
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

  app.post("/api/properties/:id/analyze-investment", async (req, res) => {
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

  // Новые API маршруты для фронтенда
  app.get("/api/investment-analytics/:id", async (req, res) => {
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

  app.post("/api/investment-analytics/:id/calculate", async (req, res) => {
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
      console.error("Error calculating investment analytics:", error);
      res.status(500).json({ error: "Failed to calculate investment analytics" });
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

  // Payment routes for Blank Bank
  app.post("/api/payments/create", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { plan, promoCode, returnUrl, referralCode } = req.body;
      const userId = parseInt(req.user.id);
      
      const planPrices = {
        promo: 0,
        standard: 990,
        professional: 2490
      };

      const amount = planPrices[plan as keyof typeof planPrices];
      if (amount === undefined) {
        return res.status(400).json({ error: "Invalid subscription plan" });
      }

      if (amount === 0) {
        // Для промо тарифа просто возвращаем успех
        return res.json({
          success: true,
          plan: 'promo',
          message: 'Промо план активирован бесплатно на 30 дней'
        });
      }

      // Рассчитываем финальную цену с учетом бонусов
      const priceCalculation = await ReferralService.calculateFinalPrice(userId, amount);
      
      // Проверяем реферальный код если он указан
      let referrerId = null;
      if (referralCode) {
        const referrer = await ReferralService.getUserByReferralCode(referralCode);
        if (referrer && referrer.id !== userId) {
          referrerId = referrer.id;
        }
      }

      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const description = `Подписка SREDA Market - ${plan === 'standard' ? 'Стандарт' : 'Профи'}`;

      // Если вся сумма покрывается бонусами, обрабатываем как бесплатную подписку
      if (priceCalculation.finalPrice === 0) {
        // Списываем бонусы
        await ReferralService.spendBonuses(
          userId, 
          priceCalculation.bonusUsed, 
          `Оплата подписки ${description} бонусами`
        );

        // Если есть реферер, начисляем ему бонусы
        if (referrerId) {
          await ReferralService.processReferralEarning(referrerId, userId, amount, plan);
        }

        return res.json({
          success: true,
          plan,
          message: `Подписка активирована с использованием ${priceCalculation.bonusUsed}₽ бонусов`,
          bonusUsed: priceCalculation.bonusUsed,
          finalPrice: 0
        });
      }

      const payment = await blankBankPaymentService.createPayment({
        amount: priceCalculation.finalPrice,
        orderId,
        description: `${description} ${priceCalculation.bonusUsed > 0 ? `(использовано бонусов: ${priceCalculation.bonusUsed}₽)` : ''}`,
        returnUrl: returnUrl || `${req.protocol}://${req.get('host')}/profile?tab=subscription`,
        customerEmail: req.body.email,
        metadata: {
          userId,
          originalAmount: amount,
          bonusUsed: priceCalculation.bonusUsed,
          referrerId,
          subscriptionType: plan
        }
      });

      res.json({
        success: true,
        paymentId: payment.paymentId,
        paymentUrl: payment.paymentUrl,
        orderId,
        originalPrice: amount,
        finalPrice: priceCalculation.finalPrice,
        bonusUsed: priceCalculation.bonusUsed,
        savings: amount - priceCalculation.finalPrice
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  app.get("/api/payments/:paymentId/status", async (req, res) => {
    try {
      const { paymentId } = req.params;
      const status = await blankBankPaymentService.getPaymentStatus(paymentId);
      res.json(status);
    } catch (error) {
      console.error("Error getting payment status:", error);
      res.status(500).json({ error: "Failed to get payment status" });
    }
  });

  app.post("/api/payments/callback", async (req, res) => {
    try {
      const isValid = blankBankPaymentService.verifyCallback(req.body);
      
      if (!isValid) {
        return res.status(400).json({ error: "Invalid callback signature" });
      }

      const { payment_id, order_id, status } = req.body;
      
      if (status === 'PAID') {
        // Здесь нужно активировать подписку для пользователя
        console.log(`Payment successful for order ${order_id}, payment ${payment_id}`);
        // TODO: Обновить статус подписки пользователя в базе данных
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error processing payment callback:", error);
      res.status(500).json({ error: "Failed to process callback" });
    }
  });

  app.post("/api/payments/:paymentId/refund", async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { amount } = req.body;
      
      const refund = await blankBankPaymentService.refundPayment(paymentId, amount);
      res.json(refund);
    } catch (error) {
      console.error("Error refunding payment:", error);
      res.status(500).json({ error: "Failed to refund payment" });
    }
  });

  // Referral System APIs
  app.get("/api/referrals/code/:code/user", async (req, res) => {
    try {
      const { code } = req.params;
      const user = await ReferralService.getUserByReferralCode(code);
      
      if (!user) {
        return res.status(404).json({ error: "Referral code not found" });
      }
      
      res.json({
        username: user.username,
        isValid: true
      });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ error: "Failed to validate referral code" });
    }
  });

  app.get("/api/referrals/stats", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.user.id);
      const stats = await ReferralService.getReferralStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting referral stats:", error);
      res.status(500).json({ error: "Failed to get referral stats" });
    }
  });

  app.post("/api/payments/calculate-price", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { originalPrice } = req.body;
      const userId = parseInt(req.user.id);
      
      const priceCalculation = await ReferralService.calculateFinalPrice(userId, originalPrice);
      
      res.json({
        originalPrice,
        finalPrice: priceCalculation.finalPrice,
        bonusUsed: priceCalculation.bonusUsed,
        bonusAvailable: priceCalculation.bonusAvailable,
        savings: originalPrice - priceCalculation.finalPrice
      });
    } catch (error) {
      console.error("Error calculating price:", error);
      res.status(500).json({ error: "Failed to calculate price" });
    }
  });

  // Global error handler
  app.use(globalErrorHandler);

  const httpServer = createServer(app);
  return httpServer;
}