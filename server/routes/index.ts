import type { Express } from "express";
import { createServer, type Server } from "http";
import { corsMiddleware } from "../middleware/cors";
import { sessionConfig } from "../middleware/sessionAuth";
import { generalRateLimit } from "../middleware/rateLimiting";
import { performanceMonitor } from "../services/performanceService";
import { compression } from "../middleware/cache";
import { globalErrorHandler } from "../utils/errors";
import { UserService } from "../services/userService";
import { apiHeadersMiddleware } from "../middleware/apiHeaders";

// Import modular routes
import authRoutes from "./auth.routes";
import usersRoutes from "./users.routes";
import propertiesRoutes from "./properties.routes";
import analyticsRoutes from "./analytics.routes";
import regionsRoutes from "./regions.routes";
import propertyClassesRoutes from "./property-classes.routes";
import { imageRoutes } from "./imageRoutes";
import mapRoutes from "./mapRoutes";
import insightsRoutes from "./insights";
import adminSourcesRoutes from "./adminSources";
import promocodesRoutes from "./promocodes.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Global middleware
  app.use(corsMiddleware);
  app.use(sessionConfig);
  app.use(generalRateLimit);
  app.use(performanceMonitor.middleware());
  app.use(compression);
  app.use(apiHeadersMiddleware);

  // Initialize administrators
  try {
    await UserService.initializeAdministrators();
  } catch (error) {
    console.error('Failed to initialize administrator:', error);
  }

  // Register modular routes BEFORE Vite setup
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/properties', propertiesRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/regions', regionsRoutes);
  app.use('/api/property-classes', propertyClassesRoutes);
  app.use('/api/images', imageRoutes);
  app.use('/api/map', mapRoutes);
  app.use('/api/insights', insightsRoutes);
  app.use('/api/admin/sources', adminSourcesRoutes);
  app.use('/api/promocodes', promocodesRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Ensure API routes always return JSON (after routes registration)
  app.use('/api/*', (req, res, next) => {
    if (!res.headersSent) {
      res.status(404).json({ success: false, error: { message: 'API endpoint not found' } });
    }
  });

  const server = createServer(app);
  
  // Setup Vite for frontend routing (must be after API routes)
  // Temporarily disable Vite middleware due to HMR connection issues
  if (process.env.NODE_ENV === "production") {
    const { serveStatic } = await import("../vite");
    serveStatic(app);
  } else {
    // Serve basic index.html for development without Vite middleware
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.send(`
          <!DOCTYPE html>
          <html lang="ru">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SREDA Market - ИИ-сервис для рынка недвижимости</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
              .container { max-width: 800px; margin: 0 auto; }
              .status { background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .api-test { background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 10px 0; }
              code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>SREDA Market - Система недвижимости</h1>
              <div class="status">
                <h2>✅ Система работает корректно</h2>
                <p>API сервер запущен и функционирует нормально</p>
              </div>
              
              <h3>Тестирование API функций:</h3>
              
              <div class="api-test">
                <h4>Регионы (города):</h4>
                <p>GET <code>/api/regions</code> - список доступных городов</p>
                <button onclick="testApi('/api/regions')">Тестировать</button>
              </div>
              
              <div class="api-test">
                <h4>Объекты недвижимости:</h4>
                <p>GET <code>/api/properties?region_id=1</code> - объекты в Москве</p>
                <button onclick="testApi('/api/properties?region_id=1&per_page=5')">Тестировать</button>
              </div>
              
              <div class="api-test">
                <h4>Промокоды:</h4>
                <p>POST <code>/api/promocodes/generate</code> - генерация промокода</p>
                <button onclick="testApi('/api/promocodes/generate', 'POST')">Тестировать</button>
              </div>
              
              <div id="result" style="margin-top: 20px; text-align: left; background: #f9f9f9; padding: 15px; border-radius: 8px; display: none;">
                <h4>Результат API:</h4>
                <pre id="result-content"></pre>
              </div>
            </div>
            
            <script>
              async function testApi(endpoint, method = 'GET') {
                const resultDiv = document.getElementById('result');
                const resultContent = document.getElementById('result-content');
                
                try {
                  const response = await fetch(endpoint, { 
                    method: method,
                    headers: { 'Content-Type': 'application/json' }
                  });
                  const data = await response.json();
                  
                  resultContent.textContent = JSON.stringify(data, null, 2);
                  resultDiv.style.display = 'block';
                } catch (error) {
                  resultContent.textContent = 'Ошибка: ' + error.message;
                  resultDiv.style.display = 'block';
                }
              }
            </script>
          </body>
          </html>
        `);
      }
    });
  }

  // Global error handler
  app.use(globalErrorHandler);

  return server;
}