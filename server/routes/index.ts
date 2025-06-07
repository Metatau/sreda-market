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

  // API demonstration page
  app.get('/api-demo', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SREDA Market - API Demo</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 2rem; }
        .content { padding: 30px; }
        .status { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center; }
        .api-section { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #2563eb; }
        .result { margin-top: 20px; background: #fefefe; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; display: none; }
        .result pre { background: #f8fafc; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>SREDA Market</h1>
            <p>Российская платформа недвижимости - Демонстрация API</p>
        </div>
        <div class="content">
            <div class="status">
                <h2>Система работает корректно</h2>
                <p>Все API функции доступны для тестирования</p>
            </div>
            <div class="grid">
                <div class="api-section">
                    <h3>Регионы</h3>
                    <p>Список доступных городов</p>
                    <button class="btn" onclick="testApi('/api/regions')">Загрузить регионы</button>
                </div>
                <div class="api-section">
                    <h3>Недвижимость</h3>
                    <p>Объекты в разных городах</p>
                    <button class="btn" onclick="testApi('/api/properties?region_id=1&per_page=3')">Москва</button>
                    <button class="btn" onclick="testApi('/api/properties?region_id=2&per_page=3')">СПб</button>
                </div>
                <div class="api-section">
                    <h3>Промокоды</h3>
                    <p>Генерация с защитой от спама</p>
                    <button class="btn" onclick="testApi('/api/promocodes/generate', 'POST')">Генерировать</button>
                </div>
                <div class="api-section">
                    <h3>Система</h3>
                    <p>Статус и классы недвижимости</p>
                    <button class="btn" onclick="testApi('/api/health')">Статус</button>
                    <button class="btn" onclick="testApi('/api/property-classes')">Классы</button>
                </div>
            </div>
            <div id="result" class="result">
                <h4>Результат API</h4>
                <pre id="result-content"></pre>
            </div>
        </div>
    </div>
    <script>
        async function testApi(endpoint, method = 'GET') {
            const resultDiv = document.getElementById('result');
            const resultContent = document.getElementById('result-content');
            try {
                const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' } });
                const data = await response.json();
                let formatted = JSON.stringify(data, null, 2);
                if (data.success && data.data) {
                    if (Array.isArray(data.data)) formatted = \`Элементов: \${data.data.length}\\n\\n\` + formatted;
                    if (data.data.total) formatted = \`Всего в базе: \${data.data.total}\\n\\n\` + formatted;
                }
                resultContent.textContent = formatted;
                resultDiv.style.display = 'block';
                resultDiv.scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                resultContent.textContent = 'Ошибка: ' + error.message;
                resultDiv.style.display = 'block';
            }
        }
        window.addEventListener('load', () => setTimeout(() => testApi('/api/health'), 500));
    </script>
</body>
</html>
    `);
  });

  // Ensure API routes always return JSON (after routes registration)
  app.use('/api/*', (req, res, next) => {
    if (!res.headersSent) {
      res.status(404).json({ success: false, error: { message: 'API endpoint not found' } });
    }
  });

  const server = createServer(app);
  
  // Setup Vite for frontend routing (must be after API routes)
  if (process.env.NODE_ENV === "development") {
    const { setupVite } = await import("../vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("../vite");
    serveStatic(app);
  }

  // Global error handler
  app.use(globalErrorHandler);

  return server;
}