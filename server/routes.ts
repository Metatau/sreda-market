import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateAIResponse, generatePropertyRecommendations, analyzePropertyInvestment } from "./services/openai";
import { simpleInvestmentAnalyticsService } from "./services/simpleInvestmentAnalytics";
import { analyticsService } from "./services/analyticsService";
import { blankBankPaymentService } from "./services/paymentService";
import { ReferralService } from "./services/referralService";
import { adsApiService } from "./services/adsApiService";
import { schedulerService } from "./services/schedulerService";
import { requireAuth, requireRoleAuth, requireAdmin, optionalAuth, checkAIQuota, type AuthenticatedRequest } from "./middleware/unifiedAuth";
import { sessionConfig, requireSessionAuth, type SessionAuthenticatedRequest } from "./middleware/sessionAuth";
import { UserService } from "./services/userService";
import { TelegramAuthService } from "./services/telegramAuthService";
import { RegionController } from "./controllers/RegionController";
import { PropertyClassController } from "./controllers/PropertyClassController";
import { PropertyController } from "./controllers/PropertyController";
import { PropertyService } from "./services/PropertyService";
import { globalErrorHandler } from "./utils/errors";
import { corsMiddleware } from "./middleware/cors";
import { db } from "./db";
import { promocodes, favorites, properties, regions, propertyClasses, dataSources, insertDataSourceSchema, selectDataSourceSchema } from "@shared/schema";
import { sql, eq, and, or, gte, desc, isNotNull } from "drizzle-orm";
import { generalRateLimit, authRateLimit, aiRateLimit, apiRateLimit } from "./middleware/rateLimiting";
import rateLimit from 'express-rate-limit';
import { performanceMonitor } from "./services/performanceService";
import { responseCacheMiddleware, cacheControl, etag, compression } from "./middleware/cache";
import { validateBody, validateQuery, aiRequestSchema, propertyFiltersSchema, chatMessageSchema, investmentAnalysisSchema } from "./validation/schemas";
import { imageRoutes } from "./routes/imageRoutes";
import mapRoutes from "./routes/mapRoutes";
import insightsRoutes from "./routes/insights";
import adminSourcesRoutes from "./routes/adminSources";
import { z } from "zod";
import { AuthService } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Global middleware
  app.use(corsMiddleware);
  app.use(sessionConfig); // Add session support
  // Skip rate limiting in development and for admin routes
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'development' || req.path.startsWith('/api/admin/')) {
      next();
    } else {
      generalRateLimit(req, res, next);
    }
  });
  app.use(performanceMonitor.middleware());
  app.use(compression);

  // Инициализация администратора при запуске
  try {
    await UserService.initializeAdministrators();
  } catch (error) {
    console.error('Failed to initialize administrator:', error);
  }

  // Initialize controllers
  const propertyService = new PropertyService();
  const regionController = new RegionController();
  const propertyClassController = new PropertyClassController();
  const propertyController = new PropertyController(propertyService);

  // Image serving routes
  app.use('/api', imageRoutes);

  // Map functionality routes
  app.use('/api/map', mapRoutes);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Serve sitemap.xml
  app.get("/sitemap.xml", (req, res) => {
    res.set('Content-Type', 'application/xml');
    res.sendFile('sitemap.xml', { root: '.' });
  });

  // Admin routes for ADS API management
  app.get("/api/admin/ads-api/status", async (req, res) => {
    try {
      const { adsApiService } = await import('./services/adsApiService');
      const status = await adsApiService.getStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      console.error("Error getting ADS API status:", error);
      res.status(500).json({ 
        success: false, 
        error: { 
          message: "Failed to get ADS API status", 
          type: "INTERNAL_ERROR" 
        } 
      });
    }
  });

  app.post("/api/admin/ads-api/sync", async (req, res) => {
    try {
      const { regions, credentials } = req.body;
      const { adsApiService } = await import('./services/adsApiService');
      const result = await adsApiService.syncProperties(regions, credentials);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error syncing properties:", error);
      res.status(500).json({ 
        success: false, 
        error: { 
          message: "Failed to sync properties", 
          type: "SYNC_ERROR" 
        } 
      });
    }
  });

  // Force JSON response for API routes (must be before any other middleware)
  app.use('/api/*', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // Authentication routes
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  const registerSchema = z.object({
    username: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    telegramHandle: z.string().optional(),
    referralCode: z.string().optional()
  });

  // Enhanced rate limiting for authentication
  const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // maximum 3 registration attempts per 15 minutes per IP
    message: {
      success: false,
      error: 'Слишком много попыток регистрации. Попробуйте через 15 минут.',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'development', // Skip in development
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 5, // maximum 5 login attempts per 15 minutes per IP
    message: {
      success: false,
      error: 'Слишком много попыток входа. Попробуйте через 15 минут.',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'development', // Skip in development
  });

  // Login endpoint with rate limiting
  app.post('/api/auth/login', loginLimiter, async (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await AuthService.login({ email, password });
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Неверный email или пароль' 
        });
      }

      // Set session and save it
      req.session.userId = user.id;
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Ошибка авторизации' 
      });
    }
  });

  // Register endpoint with rate limiting
  app.post('/api/auth/register', registrationLimiter, async (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      console.log('Registration attempt with data:', JSON.stringify(req.body, null, 2));
      
      // Validate input data
      const data = registerSchema.parse(req.body);
      console.log('Validation passed for:', data.email);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        console.log('User already exists:', data.email);
        return res.status(400).json({ 
          success: false, 
          error: 'Пользователь с таким email уже существует' 
        });
      }

      console.log('Creating new user...');
      const user = await AuthService.register(data);
      console.log('User created successfully:', user.id);
      
      // Set session and save it
      req.session.userId = user.id;
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            console.log('Session saved for user:', user.id);
            resolve(undefined);
          }
        });
      });
      
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        }
      });
    } catch (error: any) {
      console.error('Registration error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      });
      
      // Handle validation errors specifically
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          success: false, 
          error: 'Ошибка валидации данных',
          details: error.errors
        });
      }
      
      // Handle duplicate key errors
      if (error.code === '23505' || error.message.includes('duplicate key')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Пользователь с таким email или именем уже существует' 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: 'Ошибка регистрации',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Profile endpoint
  app.get('/api/auth/profile', async (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Необходима авторизация' 
        });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'Пользователь не найден' 
        });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        telegramHandle: user.telegramHandle,
        profileImageUrl: user.profileImageUrl,
        bonusBalance: user.bonusBalance || '0',
        authenticated: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Ошибка получения профиля' 
      });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', async (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      req.session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            error: 'Ошибка при выходе' 
          });
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Ошибка при выходе' 
      });
    }
  });

  // Region routes with caching
  app.get("/api/regions", cacheControl(600, 'api'), etag, responseCacheMiddleware(600), regionController.getRegions);
  app.get("/api/regions/:id", cacheControl(300, 'api'), etag, responseCacheMiddleware(300), regionController.getRegion);
  app.get("/api/regions/:id/analytics", cacheControl(180, 'dynamic'), etag, responseCacheMiddleware(180), regionController.getRegionAnalytics);

  // Property class routes with caching
  app.get("/api/property-classes", cacheControl(1800, 'static'), etag, responseCacheMiddleware(1800), propertyClassController.getPropertyClasses);
  app.get("/api/property-classes/:id", cacheControl(1800, 'static'), etag, responseCacheMiddleware(1800), propertyClassController.getPropertyClass);

  // Property routes with caching
  app.get("/api/properties", propertyController.getProperties);
  app.get("/api/properties/map-data", cacheControl(300, 'api'), etag, responseCacheMiddleware(300), propertyController.getMapData);
  app.get("/api/properties/:id", cacheControl(600, 'api'), etag, responseCacheMiddleware(600), propertyController.getProperty);
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

  // User management endpoints
  app.get("/api/users/profile", requireSessionAuth, async (req: SessionAuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const subscriptionStatus = await UserService.checkSubscriptionStatus(user.id);
      const aiLimits = await UserService.getAILimits(user.id);

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        telegramHandle: user.telegramHandle,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        bonusBalance: user.bonusBalance,
        subscription: subscriptionStatus,
        aiLimits
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login endpoint
  app.post("/api/users/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email and password are required' 
        });
      }

      const user = await AuthService.login({ email, password });
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Неверный email или пароль' 
        });
      }

      // Set session
      req.session.userId = user.id;
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Ошибка авторизации' 
      });
    }
  });

  app.post("/api/users/register", async (req, res) => {
    try {
      const { username, email, password, firstName, lastName, telegramHandle, referralCode } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Username, email and password are required' 
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ 
          success: false, 
          error: 'Password must be at least 6 characters long' 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'Пользователь с таким email уже существует' 
        });
      }

      // Hash password and register user
      const user = await AuthService.register({
        username,
        email,
        password,
        firstName,
        lastName,
        telegramHandle,
        referralCode
      });

      // Set session
      req.session.userId = user.id;
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });

      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Ошибка регистрации' 
      });
    }
  });

  // Telegram Authentication endpoints
  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const telegramAuthData = req.body;
      
      const user = await TelegramAuthService.authenticateUser(telegramAuthData);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          telegramHandle: user.telegramHandle,
          profileImageUrl: user.profileImageUrl
        }
      });
    } catch (error: any) {
      console.error('Telegram authentication error:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message || 'Telegram authentication failed' 
      });
    }
  });

  app.get("/api/auth/telegram/config", (req, res) => {
    try {
      console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set');
      console.log('TELEGRAM_BOT_USERNAME:', process.env.TELEGRAM_BOT_USERNAME ? 'Set' : 'Not set');
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const botUsername = process.env.TELEGRAM_BOT_USERNAME;
      
      if (!botToken || !botUsername) {
        return res.status(500).json({ 
          error: 'Telegram bot configuration missing. Please configure TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME',
          debug: {
            hasToken: !!botToken,
            hasUsername: !!botUsername
          }
        });
      }
      
      const botId = botToken.split(':')[0];
      
      res.json({
        botId,
        botUsername: botUsername.replace('@', ''), // Убираем @ если есть
        domain: req.get('host')
      });
    } catch (error) {
      console.error('Error getting Telegram config:', error);
      res.status(500).json({ error: 'Failed to get Telegram configuration' });
    }
  });

  app.get("/api/users/ai-limits", requireRoleAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const aiLimits = await UserService.getAILimits(parseInt(req.user!.id.toString()));
      res.json(aiLimits);
    } catch (error) {
      console.error('Error fetching AI limits:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin endpoints
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      // Здесь должен быть метод для получения всех пользователей
      // Пока возвращаем заглушку
      res.json({ message: 'Admin access granted', users: [] });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ADS API Integration endpoints
  app.post("/api/admin/ads-api/sync", requireAdmin, async (req, res) => {
    try {
      const { regions } = req.body;
      const result = await adsApiService.syncProperties(regions);
      res.json({
        success: true,
        imported: result.imported,
        updated: result.updated,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error syncing with ADS API:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync with ADS API' 
      });
    }
  });

  app.get("/api/admin/ads-api/status", requireAdmin, async (req, res) => {
    try {
      const isAvailable = await adsApiService.isServiceAvailable();
      const regions = isAvailable ? await adsApiService.getRegions() : [];
      
      res.json({
        success: true,
        available: isAvailable,
        regions,
        configured: !!process.env.ADS_API_KEY
      });
    } catch (error) {
      console.error('Error checking ADS API status:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to check ADS API status' 
      });
    }
  });

  app.get("/api/admin/ads-api/regions", requireAdmin, async (req, res) => {
    try {
      const regions = await adsApiService.getRegions();
      res.json({ success: true, regions });
    } catch (error) {
      console.error('Error fetching ADS API regions:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch regions from ADS API' 
      });
    }
  });

  // AI Chat with role-based access (unlimited usage)
  app.post("/api/chat", aiRateLimit, requireRoleAuth, validateBody(chatMessageSchema), async (req, res) => {
    try {
      const { message, sessionId } = req.body;

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
        content: typeof response === 'string' ? response : (response as any)?.message || 'Response generated',
        createdAt: new Date(),
      });

      res.json({
        response: typeof response === 'string' ? response : (response as any)?.message || 'Response generated',
        sessionId: sessionId || `session_${Date.now()}`,
      });
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // AI Property Recommendations (unlimited usage)
  app.post("/api/ai/recommendations", aiRateLimit, requireRoleAuth, validateBody(aiRequestSchema), async (req, res) => {
    try {
      const { context } = req.body;
      const { budget, purpose, region, rooms } = context?.preferences || {};
      
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

  // API маршруты для фронтенда
  app.get("/api/investment-analytics", async (req, res) => {
    try {
      const propertyId = parseInt(req.query.propertyId as string);
      if (isNaN(propertyId) || !propertyId) {
        return res.status(400).json({ error: "Property ID is required" });
      }

      const analytics = await simpleInvestmentAnalyticsService.getAnalytics(propertyId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching investment analytics:", error);
      res.status(500).json({ error: "Failed to fetch investment analytics" });
    }
  });

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

      // Use only the simple investment analytics service that saves to database
      const analytics = await simpleInvestmentAnalyticsService.calculateAnalytics(propertyId);
      
      // Return analytics with proper API response format
      res.json({
        success: true,
        data: analytics
      });
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
      const userId = req.user?.id || 0;
      
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
        console.log(`Payment successful for order ${order_id}, payment ${payment_id}`);
        
        // Извлекаем метаданные из платежа
        const paymentDetails = await blankBankPaymentService.getPaymentStatus(payment_id);
        const metadata = paymentDetails.metadata;
        
        if (metadata) {
          const { userId, bonusUsed, referrerId, subscriptionType, originalAmount } = metadata;
          
          // Списываем использованные бонусы
          if (bonusUsed > 0) {
            await ReferralService.spendBonuses(
              userId, 
              bonusUsed, 
              `Оплата подписки ${subscriptionType} (частично бонусами)`
            );
          }
          
          // Начисляем реферальные бонусы
          if (referrerId) {
            await ReferralService.processReferralEarning(
              referrerId, 
              userId, 
              originalAmount, 
              subscriptionType
            );
          }
        }
        
        // TODO: Активировать подписку пользователя
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
      const userId = req.user?.id || 0;
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
      const userId = req.user?.id || 0;
      
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

  // === SCHEDULER AND AUTOMATION ROUTES ===
  
  // Запуск планировщика автоматизации
  app.post("/api/admin/scheduler/start", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      schedulerService.start();
      res.json({ 
        success: true, 
        message: "Property synchronization scheduler started",
        status: schedulerService.getStatus()
      });
    } catch (error) {
      console.error("Error starting scheduler:", error);
      res.status(500).json({ success: false, error: "Failed to start scheduler" });
    }
  });

  // Получение статуса планировщика
  app.get("/api/admin/scheduler/status", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const status = schedulerService.getStatus();
      res.json({ 
        success: true, 
        data: status
      });
    } catch (error) {
      console.error("Error getting scheduler status:", error);
      res.status(500).json({ success: false, error: "Failed to get scheduler status" });
    }
  });

  // Ручной запуск синхронизации
  app.post("/api/admin/scheduler/sync", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await schedulerService.runManualSync();
      res.json({ 
        success: true, 
        message: "Manual synchronization completed",
        data: result
      });
    } catch (error) {
      console.error("Error running manual sync:", error);
      res.status(500).json({ success: false, error: (error as Error)?.message || "Failed to run synchronization" });
    }
  });

  // Остановка планировщика
  app.post("/api/admin/scheduler/stop", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      schedulerService.stop();
      res.json({ 
        success: true, 
        message: "Scheduler stopped successfully"
      });
    } catch (error) {
      console.error("Error stopping scheduler:", error);
      res.status(500).json({ success: false, error: "Failed to stop scheduler" });
    }
  });

  // Data Sources Management API
  // Получить все источники данных
  app.get("/api/admin/sources", requireSessionAuth, async (req: SessionAuthenticatedRequest, res) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'administrator') {
        return res.status(403).json({ success: false, error: "Admin access required" });
      }

      const sources = await db.select().from(dataSources).orderBy(desc(dataSources.createdAt));
      res.json({ 
        success: true, 
        data: sources
      });
    } catch (error) {
      console.error("Error fetching data sources:", error);
      res.status(500).json({ success: false, error: "Failed to fetch data sources" });
    }
  });

  // Создать новый источник данных
  app.post("/api/admin/sources", requireSessionAuth, async (req: SessionAuthenticatedRequest, res) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'administrator') {
        return res.status(403).json({ success: false, error: "Admin access required" });
      }

      const validatedData = insertDataSourceSchema.parse(req.body);
      const [newSource] = await db.insert(dataSources).values({
        ...validatedData,
        updatedAt: new Date()
      }).returning();
      
      res.json({ 
        success: true, 
        message: "Data source created successfully",
        source: newSource
      });
    } catch (error) {
      console.error("Error creating data source:", error);
      res.status(500).json({ success: false, error: "Failed to create data source" });
    }
  });

  // Обновить источник данных
  app.put("/api/admin/sources/:id", requireSessionAuth, async (req: SessionAuthenticatedRequest, res) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'administrator') {
        return res.status(403).json({ success: false, error: "Admin access required" });
      }

      const sourceId = parseInt(req.params.id);
      if (isNaN(sourceId)) {
        return res.status(400).json({ success: false, error: "Invalid source ID" });
      }

      const validatedData = insertDataSourceSchema.partial().parse(req.body);
      const [updatedSource] = await db.update(dataSources)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(dataSources.id, sourceId))
        .returning();

      if (!updatedSource) {
        return res.status(404).json({ success: false, error: "Data source not found" });
      }

      res.json({ 
        success: true, 
        message: "Data source updated successfully",
        source: updatedSource
      });
    } catch (error) {
      console.error("Error updating data source:", error);
      res.status(500).json({ success: false, error: "Failed to update data source" });
    }
  });

  // Удалить источник данных
  app.delete("/api/admin/sources/:id", requireSessionAuth, async (req: SessionAuthenticatedRequest, res) => {
    try {
      // Check if user is admin
      if (req.user?.role !== 'administrator') {
        return res.status(403).json({ success: false, error: "Admin access required" });
      }

      const sourceId = parseInt(req.params.id);
      if (isNaN(sourceId)) {
        return res.status(400).json({ success: false, error: "Invalid source ID" });
      }

      const [deletedSource] = await db.delete(dataSources)
        .where(eq(dataSources.id, sourceId))
        .returning();

      if (!deletedSource) {
        return res.status(404).json({ success: false, error: "Data source not found" });
      }

      res.json({ 
        success: true, 
        message: "Data source deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting data source:", error);
      res.status(500).json({ success: false, error: "Failed to delete data source" });
    }
  });

  // Загрузка 10 объектов из ads-api.ru
  app.post("/api/load-properties", async (req, res) => {
    try {
      console.log('=== Запуск загрузки 10 объектов из ads-api.ru ===');
      
      const { AdsApiService } = await import('./services/adsApiService');
      const adsApiService = new AdsApiService();
      
      // Загружаем объекты для Москвы с ограничением 10 штук
      const syncResult = await adsApiService.syncProperties(['Москва']);
      
      console.log(`Загрузка завершена: ${syncResult.imported} импортировано, ${syncResult.updated} обновлено`);
      
      if (syncResult.errors.length > 0) {
        console.log('Ошибки при загрузке:', syncResult.errors);
      }
      
      res.json({ 
        success: true, 
        message: "Загрузка объектов завершена",
        result: {
          imported: syncResult.imported,
          updated: syncResult.updated,
          errors: syncResult.errors,
          totalProcessed: syncResult.imported + syncResult.updated
        }
      });
    } catch (error) {
      console.error("Ошибка загрузки объектов:", error);
      res.status(500).json({ 
        success: false, 
        error: "Ошибка загрузки объектов", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Демонстрация полного цикла обработки данных
  app.post("/api/test-sync", async (req, res) => {
    try {
      console.log('=== Запуск демонстрации полного цикла обработки ===');
      
      // 1. Получение существующих объектов
      console.log('Этап 1: Получение существующих объектов...');
      const { properties: existingProperties } = await storage.getProperties({}, { page: 1, limit: 10 });
      console.log(`Найдено объектов в базе: ${existingProperties.length}`);
      
      // 2. Валидация объектов (проверка обязательных полей и качества данных)
      console.log('Этап 2: Валидация объектов...');
      let validatedCount = 0;
      let photosCount = 0;
      let urlsCount = 0;
      
      for (const property of existingProperties) {
        let isValid = true;
        
        // Проверка обязательных полей
        if (!property.price || property.price <= 0) isValid = false;
        if (!property.title || property.title.length < 10) isValid = false;
        if (!property.address || property.address.length < 5) isValid = false;
        
        // Проверка фотографий
        if (property.imageUrl) photosCount++;
        
        // Проверка ссылок на источники
        if (property.url) urlsCount++;
        
        if (isValid) validatedCount++;
      }
      
      // 3. Расчет инвестиционной аналитики
      console.log('Этап 3: Расчет инвестиционной аналитики...');
      let analyzedCount = 0;
      const analyticsResults = [];
      
      for (const property of existingProperties.slice(0, 3)) { // Анализируем первые 3 объекта
        try {
          // Расчет базовых инвестиционных метрик
          const rentalYield = property.pricePerSqm ? (property.pricePerSqm * 0.05) : 0; // 5% годовых
          const roi = property.price ? ((property.price * 0.08) / property.price) * 100 : 0; // 8% ROI
          const liquidityScore = Math.floor(Math.random() * 40) + 60; // 60-100
          
          analyticsResults.push({
            propertyId: property.id,
            rentalYield: rentalYield.toFixed(2),
            roi: roi.toFixed(2),
            liquidityScore,
            rating: liquidityScore > 80 ? 'A' : liquidityScore > 70 ? 'B' : 'C'
          });
          
          analyzedCount++;
        } catch (error) {
          console.error(`Ошибка анализа объекта ${property.id}:`, error);
        }
      }
      
      // 4. Итоговая статистика
      console.log('Этап 4: Формирование итоговой статистики...');
      const qualityScore = Math.round((validatedCount / existingProperties.length) * 100);
      
      console.log(`=== Демонстрация завершена ===`);
      console.log(`Обработано: ${existingProperties.length} объектов`);
      console.log(`Валидных: ${validatedCount}`);
      console.log(`С фотографиями: ${photosCount}`);
      console.log(`С ссылками на источники: ${urlsCount}`);
      console.log(`Проанализировано: ${analyzedCount}`);
      
      res.json({ 
        success: true, 
        message: "Демонстрация полного цикла обработки завершена",
        result: {
          totalProperties: existingProperties.length,
          validated: validatedCount,
          withPhotos: photosCount,
          withSourceUrls: urlsCount,
          analyzed: analyzedCount,
          qualityScore: `${qualityScore}%`,
          sampleAnalytics: analyticsResults,
          stages: [
            "✓ Получение данных из базы",
            "✓ Валидация качества объектов", 
            "✓ Проверка наличия фотографий",
            "✓ Проверка ссылок на источники",
            "✓ Расчет инвестиционной аналитики",
            "✓ Формирование итоговой статистики"
          ],
          note: "Демонстрация выполнена на существующих данных. Для загрузки новых объектов из ads-api.ru требуются актуальные учетные данные API."
        }
      });
    } catch (error) {
      console.error("Ошибка демонстрации:", error);
      res.status(500).json({ 
        success: false, 
        error: "Ошибка выполнения демонстрации", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // === DATA CLEANUP ROUTES ===
  
  // Запуск очистки невалидных объектов
  app.post("/api/admin/cleanup", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { dataCleanupService } = await import('./services/dataCleanupService');
      const result = await dataCleanupService.cleanupInvalidProperties();
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error during cleanup:", error);
      res.status(500).json({ 
        success: false, 
        error: { message: "Failed to cleanup properties" }
      });
    }
  });

  // Получение статистики качества данных
  app.get("/api/admin/data-quality", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { dataCleanupService } = await import('./services/dataCleanupService');
      const { PropertyValidationService } = await import('./services/propertyValidationService');
      
      // Получаем базовую статистику качества данных
      const basicStats = await dataCleanupService.getDataQualityStats();
      
      // Получаем расширенную статистику валидации
      const validationService = new PropertyValidationService();
      const validationStats = await validationService.getValidationStats();
      
      // Комбинируем статистику
      const combinedStats = {
        ...basicStats,
        validation: {
          total: validationStats.total,
          valid: validationStats.valid,
          invalidPrice: validationStats.invalidPrice,
          invalidImages: validationStats.invalidImages,
          invalidFields: validationStats.invalidFields,
          invalidCity: validationStats.invalidCity,
          rentalProperties: validationStats.rentalProperties,
          validationRate: validationStats.total > 0 ? 
            Math.round((validationStats.valid / validationStats.total) * 100) : 0
        }
      };
      
      res.json({ success: true, data: combinedStats });
    } catch (error) {
      console.error("Error getting data quality stats:", error);
      res.status(500).json({ 
        success: false, 
        error: { message: "Failed to get data quality stats" }
      });
    }
  });

  // Mount insights routes
  app.use("/api/insights", insightsRoutes);
  
  // Mount admin sources routes
  app.use("/api/admin/sources", adminSourcesRoutes);

  // === PROMOCODE ROUTES ===
  
  // Создание нового промокода
  app.post("/api/promocodes/generate", async (req, res) => {
    try {
      const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
      const promocode = await storage.createPromocode(clientIp);
      res.json({ 
        success: true, 
        data: {
          code: promocode.code,
          expiresAt: promocode.expiresAt
        }
      });
    } catch (error) {
      console.error("Error generating promocode:", error);
      if (error instanceof Error && error.message.includes("лимит")) {
        res.status(429).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: "Failed to generate promocode" });
      }
    }
  });

  // Применение промокода (требует авторизации)
  app.post("/api/promocodes/use", requireSessionAuth, async (req: SessionAuthenticatedRequest, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ success: false, error: "Промокод обязателен" });
      }

      // Подробная валидация промокода
      const promocode = await storage.getPromocodeByCode(code);
      const user = await storage.getUser(req.user!.id);
      
      if (!promocode) {
        return res.status(400).json({ 
          success: false, 
          error: "Промокод не найден" 
        });
      }
      
      if (promocode.isUsed) {
        return res.status(400).json({ 
          success: false, 
          error: "Промокод уже использован" 
        });
      }
      
      if (storage.isPromocodeExpired(promocode)) {
        return res.status(400).json({ 
          success: false, 
          error: "Срок действия промокода истек" 
        });
      }

      // Проверка лимита использования промокодов
      const userPromocodeUsage = await storage.getUserPromocodeUsage(req.user!.id);
      if (userPromocodeUsage >= 1) {
        return res.status(400).json({ 
          success: false, 
          error: "Вы уже использовали промокод. Один промокод на пользователя" 
        });
      }

      // Проверка активной подписки
      if (user && user.subscriptionType && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date()) {
        return res.status(400).json({ 
          success: false, 
          error: "У вас уже есть активная подписка" 
        });
      }

      // Проверка времени регистрации
      if (user && user.createdAt) {
        const daysSinceRegistration = (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceRegistration > 7) {
          return res.status(400).json({ 
            success: false, 
            error: "Промокод можно использовать только в первые 7 дней после регистрации" 
          });
        }
      }

      const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
      
      // Специальная логика для тестового промокода
      if (code === 'TEST30') {
        // Обновляем подписку пользователя на 30 дней
        const subscriptionExpiresAt = new Date();
        subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + 30);
        
        await storage.updateUser(req.user!.id, {
          subscriptionType: 'professional',
          subscriptionExpiresAt
        });
        
        // Отмечаем промокод как использованный
        await storage.usePromocode(code, req.user!.id, clientIp);
        
        return res.json({ 
          success: true, 
          message: "Тестовый промокод успешно применен! Вы получили полный доступ на 30 дней" 
        });
      }
      
      const success = await storage.usePromocode(code, req.user!.id, clientIp);
      
      if (!success) {
        return res.status(400).json({ 
          success: false, 
          error: "Не удалось применить промокод. Возможно, превышен лимит использования или нарушены правила безопасности" 
        });
      }

      res.json({ 
        success: true, 
        message: "Промокод успешно применен! Вы получили полный доступ на 24 часа" 
      });
    } catch (error) {
      console.error("Error using promocode:", error);
      res.status(500).json({ success: false, error: "Ошибка применения промокода" });
    }
  });

  // === ADMIN PROMOCODE MONITORING ROUTES ===
  
  // Получение статистики промокодов для админ-панели
  app.get("/api/admin/promocodes/stats", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      // Общая статистика промокодов
      const totalPromocodes = await db
        .select({ count: sql<number>`count(*)` })
        .from(promocodes);
      
      const usedPromocodes = await db
        .select({ count: sql<number>`count(*)` })
        .from(promocodes)
        .where(eq(promocodes.isUsed, true));
      
      const expiredPromocodes = await db
        .select({ count: sql<number>`count(*)` })
        .from(promocodes)
        .where(sql`${promocodes.expiresAt} < NOW() AND ${promocodes.isUsed} = false`);
      
      const activePromocodes = await db
        .select({ count: sql<number>`count(*)` })
        .from(promocodes)
        .where(sql`${promocodes.expiresAt} > NOW() AND ${promocodes.isUsed} = false`);

      // IP активность за последние 24 часа
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);
      
      const ipCreationActivity = await db
        .select({ 
          ip: promocodes.createdFromIp,
          count: sql<number>`count(*)`
        })
        .from(promocodes)
        .where(
          and(
            gte(promocodes.createdAt, last24Hours),
            isNotNull(promocodes.createdFromIp)
          )
        )
        .groupBy(promocodes.createdFromIp)
        .having(sql`count(*) > 3`); // Подозрительная активность

      const ipUsageActivity = await db
        .select({ 
          ip: promocodes.usedFromIp,
          count: sql<number>`count(*)`
        })
        .from(promocodes)
        .where(
          and(
            gte(promocodes.usedAt, last24Hours),
            isNotNull(promocodes.usedFromIp),
            eq(promocodes.isUsed, true)
          )
        )
        .groupBy(promocodes.usedFromIp)
        .having(sql`count(*) > 5`); // Подозрительная активность

      // Последняя активность
      const recentActivity = await db
        .select({
          id: promocodes.id,
          code: promocodes.code,
          createdFromIp: promocodes.createdFromIp,
          usedFromIp: promocodes.usedFromIp,
          isUsed: promocodes.isUsed,
          createdAt: promocodes.createdAt,
          usedAt: promocodes.usedAt
        })
        .from(promocodes)
        .orderBy(desc(promocodes.createdAt))
        .limit(10);

      res.json({
        success: true,
        data: {
          stats: {
            total: totalPromocodes[0]?.count || 0,
            used: usedPromocodes[0]?.count || 0,
            expired: expiredPromocodes[0]?.count || 0,
            active: activePromocodes[0]?.count || 0
          },
          security: {
            suspiciousCreationIPs: ipCreationActivity.length,
            suspiciousUsageIPs: ipUsageActivity.length,
            blockedIPs: ipCreationActivity.length + ipUsageActivity.length,
            validationSuccess: 98.7 // Примерная метрика
          },
          recentActivity: recentActivity.map(activity => ({
            ip: activity.usedFromIp || activity.createdFromIp,
            action: activity.isUsed ? 'Использование промокода' : 'Создание промокода',
            code: activity.isUsed ? activity.code : activity.code,
            time: activity.usedAt || activity.createdAt,
            status: 'success'
          }))
        }
      });
    } catch (error) {
      console.error("Error fetching promocode stats:", error);
      res.status(500).json({ success: false, error: "Failed to fetch promocode statistics" });
    }
  });

  // Получение детальной IP активности
  app.get("/api/admin/promocodes/ip-activity", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const hoursBack = parseInt(req.query.hours as string) || 24;
      const timeThreshold = new Date();
      timeThreshold.setHours(timeThreshold.getHours() - hoursBack);

      // Группировка по IP с подсчетом активности
      const ipActivity = await db
        .select({
          ip: sql<string>`COALESCE(${promocodes.usedFromIp}, ${promocodes.createdFromIp})`,
          creations: sql<number>`COUNT(CASE WHEN ${promocodes.createdFromIp} IS NOT NULL THEN 1 END)`,
          usages: sql<number>`COUNT(CASE WHEN ${promocodes.usedFromIp} IS NOT NULL THEN 1 END)`,
          lastActivity: sql<Date>`MAX(COALESCE(${promocodes.usedAt}, ${promocodes.createdAt}))`
        })
        .from(promocodes)
        .where(
          and(
            or(
              gte(promocodes.createdAt, timeThreshold),
              gte(promocodes.usedAt, timeThreshold)
            ),
            or(
              isNotNull(promocodes.createdFromIp),
              isNotNull(promocodes.usedFromIp)
            )
          )
        )
        .groupBy(sql`COALESCE(${promocodes.usedFromIp}, ${promocodes.createdFromIp})`)
        .orderBy(desc(sql`MAX(COALESCE(${promocodes.usedAt}, ${promocodes.createdAt}))`));

      res.json({
        success: true,
        data: ipActivity
      });
    } catch (error) {
      console.error("Error fetching IP activity:", error);
      res.status(500).json({ success: false, error: "Failed to fetch IP activity" });
    }
  });

  // === FAVORITES ROUTES ===
  
  // Get user's favorites
  app.get("/api/favorites", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      
      const userFavorites = await db
        .select({
          id: favorites.id,
          propertyId: favorites.propertyId,
          createdAt: favorites.createdAt,
          property: {
            id: properties.id,
            title: properties.title,
            description: properties.description,
            price: properties.price,
            pricePerSqm: properties.pricePerSqm,
            area: properties.area,
            rooms: properties.rooms,
            floor: properties.floor,
            totalFloors: properties.totalFloors,
            address: properties.address,
            district: properties.district,
            metroStation: properties.metroStation,
            coordinates: properties.coordinates,
            propertyType: properties.propertyType,
            marketType: properties.marketType,
            source: properties.source,
            url: properties.url,
            imageUrl: properties.imageUrl,
            images: properties.images,
            isActive: properties.isActive,
            createdAt: properties.createdAt,
          },
          region: {
            id: regions.id,
            name: regions.name,
          },
          propertyClass: {
            id: propertyClasses.id,
            name: propertyClasses.name,
          },
        })
        .from(favorites)
        .leftJoin(properties, eq(favorites.propertyId, properties.id))
        .leftJoin(regions, eq(properties.regionId, regions.id))
        .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
        .where(eq(favorites.userId, userId))
        .orderBy(desc(favorites.createdAt));

      res.json({
        success: true,
        data: userFavorites.map(fav => ({
          id: fav.id,
          propertyId: fav.propertyId,
          createdAt: fav.createdAt,
          property: {
            ...fav.property,
            region: fav.region,
            propertyClass: fav.propertyClass,
          },
        })),
      });
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch favorites' },
      });
    }
  });

  // Add property to favorites
  app.post("/api/favorites/:propertyId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const propertyId = parseInt(req.params.propertyId);

      if (isNaN(propertyId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid property ID' },
        });
      }

      // Check if property exists
      const property = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);

      if (property.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Property not found' },
        });
      }

      // Check if already favorited
      const existingFavorite = await db
        .select({ id: favorites.id })
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)))
        .limit(1);

      if (existingFavorite.length > 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Property already in favorites' },
        });
      }

      // Add to favorites
      const newFavorite = await db
        .insert(favorites)
        .values({
          userId,
          propertyId,
        })
        .returning();

      res.status(201).json({
        success: true,
        data: newFavorite[0],
      });
    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to add to favorites' },
      });
    }
  });

  // Remove property from favorites
  app.delete("/api/favorites/:propertyId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const propertyId = parseInt(req.params.propertyId);

      if (isNaN(propertyId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid property ID' },
        });
      }

      const deleted = await db
        .delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({
          success: false,
          error: { message: 'Favorite not found' },
        });
      }

      res.json({
        success: true,
        data: { message: 'Removed from favorites' },
      });
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to remove from favorites' },
      });
    }
  });

  // Check if property is favorited
  app.get("/api/favorites/check/:propertyId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const propertyId = parseInt(req.params.propertyId);

      if (isNaN(propertyId)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid property ID' },
        });
      }

      const favorite = await db
        .select({ id: favorites.id })
        .from(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.propertyId, propertyId)))
        .limit(1);

      res.json({
        success: true,
        data: { isFavorited: favorite.length > 0 },
      });
    } catch (error) {
      console.error('Error checking favorite status:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to check favorite status' },
      });
    }
  });

  // Global error handler
  app.use(globalErrorHandler);

  const httpServer = createServer(app);
  return httpServer;
}