# SREDA Market - Руководство разработчика

## Обзор архитектуры

SREDA Market - это полнофункциональное веб-приложение для анализа инвестиций в российскую недвижимость, построенное на современном стеке технологий с использованием TypeScript, React, Express.js и PostgreSQL.

### Технологический стек

**Frontend:**
- React 18 с TypeScript
- Wouter для маршрутизации
- TanStack Query для управления состоянием API
- Tailwind CSS + shadcn/ui для стилизации
- Mapbox GL JS для интерактивных карт
- Framer Motion для анимаций

**Backend:**
- Node.js с Express.js
- TypeScript для типизации
- Drizzle ORM для работы с базой данных
- PostgreSQL как основная БД
- Passport.js для аутентификации
- OpenAI API для AI-функциональности

**Инфраструктура:**
- Vite для сборки и разработки
- Drizzle Kit для миграций БД
- WebSocket для real-time функций
- Stripe для платежных операций

## Структура проекта

```
├── client/                 # Frontend приложение
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── pages/         # Страницы приложения
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Утилиты и конфигурация
│   │   └── types/         # TypeScript типы
├── server/                # Backend приложение
│   ├── services/          # Бизнес-логика сервисов
│   ├── auth/             # Система аутентификации
│   ├── routes.ts         # API маршруты
│   ├── storage.ts        # Интерфейс хранения данных
│   └── db.ts             # Конфигурация БД
├── shared/               # Общие типы и схемы
│   └── schema.ts         # Drizzle схема БД
└── docs/                 # Документация
```

## Модель данных

### Основные сущности

#### Properties (Объекты недвижимости)
```typescript
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  address: text("address").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  pricePerSqm: decimal("price_per_sqm", { precision: 10, scale: 2 }),
  area: varchar("area", { length: 50 }),
  rooms: integer("rooms"),
  floor: integer("floor"),
  totalFloors: integer("total_floors"),
  propertyType: varchar("property_type", { length: 50 }),
  marketType: propertyMarketTypeEnum("market_type"),
  regionId: integer("region_id").references(() => regions.id),
  propertyClassId: integer("property_class_id").references(() => propertyClasses.id),
  coordinates: text("coordinates"),
  imageUrl: text("image_url"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### Investment Analytics (Инвестиционная аналитика)
```typescript
export const investmentAnalytics = pgTable("investment_analytics", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id),
  roi: decimal("roi", { precision: 5, scale: 2 }),
  paybackPeriod: decimal("payback_period", { precision: 4, scale: 1 }),
  monthlyRentalIncome: decimal("monthly_rental_income", { precision: 10, scale: 2 }),
  annualYield: decimal("annual_yield", { precision: 5, scale: 2 }),
  liquidityScore: integer("liquidity_score"),
  investmentRating: varchar("investment_rating", { length: 10 }),
  riskLevel: varchar("risk_level", { length: 20 }),
  recommendedStrategy: varchar("recommended_strategy", { length: 50 }),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  expiresAt: timestamp("expires_at").defaultNow(),
});
```

### Связи между таблицами

```typescript
export const propertiesRelations = relations(properties, ({ one, many }) => ({
  region: one(regions, {
    fields: [properties.regionId],
    references: [regions.id],
  }),
  propertyClass: one(propertyClasses, {
    fields: [properties.propertyClassId],
    references: [propertyClasses.id],
  }),
  analytics: one(propertyAnalytics, {
    fields: [properties.id],
    references: [propertyAnalytics.propertyId],
  }),
  investmentAnalytics: one(investmentAnalytics, {
    fields: [properties.id],
    references: [investmentAnalytics.propertyId],
  }),
}));
```

## Backend архитектура

### Система сервисов

#### Storage Interface
Централизованный интерфейс для всех операций с данными:

```typescript
export interface IStorage {
  // Regions
  getRegions(): Promise<Region[]>;
  getRegion(id: number): Promise<Region | undefined>;
  
  // Properties
  getProperties(filters?: PropertyFilters, pagination?: Pagination): Promise<{ properties: PropertyWithRelations[]; total: number }>;
  getProperty(id: number): Promise<PropertyWithRelations | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  searchProperties(query: string, filters?: PropertyFilters): Promise<PropertyWithRelations[]>;
  
  // Analytics
  getPropertyAnalytics(propertyId: number): Promise<PropertyAnalytics | undefined>;
  getRegionAnalytics(regionId: number): Promise<RegionAnalytics>;
  
  // User management
  getUser(id: number): Promise<User | undefined>;
  updateSubscription(userId: number, type: string, expiresAt: Date): Promise<void>;
}
```

#### Investment Analytics Service
Сложная система расчета инвестиционной привлекательности:

```typescript
export class InvestmentAnalyticsService {
  async calculateInvestmentMetrics(propertyId: number): Promise<InvestmentAnalytics> {
    const property = await this.getPropertyWithDetails(propertyId);
    
    // Расчет базовых метрик
    const roi = await this.calculateROI(property);
    const paybackPeriod = await this.calculatePaybackPeriod(property);
    const liquidityScore = await this.calculateLiquidityScore(property);
    
    // Анализ рисков
    const riskLevel = await this.assessRiskLevel(property);
    const investmentRating = this.determineInvestmentRating(roi, riskLevel, liquidityScore);
    
    return {
      roi,
      paybackPeriod,
      liquidityScore,
      riskLevel,
      investmentRating,
      recommendedStrategy: this.getRecommendedStrategy(property, roi, riskLevel)
    };
  }
}
```

### API Routes Structure

```typescript
// Properties
app.get("/api/properties", async (req, res) => {
  const filters = extractFilters(req.query);
  const pagination = extractPagination(req.query);
  const result = await storage.getProperties(filters, pagination);
  res.json({ success: true, data: result });
});

// Investment Analytics
app.post("/api/properties/:id/analyze-investment", requireAuth, async (req, res) => {
  const propertyId = parseInt(req.params.id);
  const analytics = await investmentAnalyticsService.calculateInvestmentMetrics(propertyId);
  res.json({ success: true, data: analytics });
});

// AI Chat
app.post("/api/chat", requireAuth, async (req, res) => {
  const { message, sessionId } = req.body;
  const response = await aiService.processMessage(message, sessionId, req.user);
  res.json({ success: true, data: response });
});
```

## Frontend архитектура

### Component Structure

#### Custom Hooks
```typescript
// useProperties hook
export function useProperties(filters?: SearchFilters, page = 1, perPage = 20) {
  return useQuery({
    queryKey: ['/api/properties', filters, page, perPage],
    queryFn: () => apiRequest(`/api/properties?${buildQueryString({ ...filters, page, per_page: perPage })}`),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// useInvestmentAnalytics hook
export function useInvestmentAnalytics(propertyId: number) {
  return useQuery({
    queryKey: ['/api/investment-analytics', propertyId],
    queryFn: () => apiRequest(`/api/investment-analytics/${propertyId}`),
    enabled: propertyId > 0,
  });
}
```

#### State Management с TanStack Query
```typescript
// Query Client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

// Mutation для расчета аналитики
export function useCalculateInvestmentAnalytics() {
  return useMutation({
    mutationFn: (propertyId: number) => 
      apiRequest(`/api/properties/${propertyId}/analyze-investment`, {
        method: 'POST',
      }),
    onSuccess: (data, propertyId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/investment-analytics', propertyId] 
      });
    },
  });
}
```

### Component Examples

#### PropertyCard Component
```typescript
interface PropertyCardProps {
  property: Property;
  onAnalyzeClick?: (property: Property) => void;
  showInvestmentMetrics?: boolean;
}

export function PropertyCard({ property, onAnalyzeClick, showInvestmentMetrics }: PropertyCardProps) {
  const { data: analytics } = useInvestmentAnalytics(property.id);
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        {/* Property details */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{property.title}</h3>
          <p className="text-gray-600">{property.address}</p>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-green-600">
              {property.price.toLocaleString()} ₽
            </span>
            {property.pricePerSqm && (
              <span className="text-sm text-gray-500">
                {property.pricePerSqm.toLocaleString()} ₽/м²
              </span>
            )}
          </div>
        </div>
        
        {/* Investment metrics */}
        {showInvestmentMetrics && analytics && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span>ROI:</span>
              <Badge variant={analytics.roi >= 8 ? "default" : "secondary"}>
                {analytics.roi}%
              </Badge>
            </div>
          </div>
        )}
        
        <Button 
          onClick={() => onAnalyzeClick?.(property)}
          className="w-full mt-4"
        >
          Анализ инвестиций
        </Button>
      </CardContent>
    </Card>
  );
}
```

## AI Integration

### OpenAI Service
```typescript
export class AIService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }
  
  async processMessage(message: string, sessionId: string, user: User): Promise<ChatMessage> {
    // Проверка лимитов пользователя
    const canUse = await this.checkUserQuota(user.id);
    if (!canUse) {
      throw new Error('AI quota exceeded');
    }
    
    // Получение контекста чата
    const chatHistory = await storage.getChatHistory(sessionId, 10);
    
    // Формирование промпта
    const systemPrompt = this.buildSystemPrompt(user);
    const messages = this.buildMessageHistory(chatHistory, message);
    
    // Запрос к OpenAI
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    // Сохранение в БД
    await this.incrementUserUsage(user.id);
    const chatMessage = await storage.saveChatMessage({
      sessionId,
      role: "assistant",
      content: response.choices[0].message.content,
    });
    
    return chatMessage;
  }
}
```

## Настройка окружения разработки

### Требования
- Node.js 20+
- PostgreSQL 16+
- TypeScript 5+

### Установка зависимостей
```bash
# Установка пакетов
npm install

# Настройка базы данных
npm run db:push

# Запуск в режиме разработки
npm run dev
```

### Переменные окружения
```env
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/sreda_market
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=...
STRIPE_SECRET_KEY=sk_test_...
ADS_API_KEY=...
SESSION_SECRET=your-secret-key
```

## Testing Strategy

### Unit Tests
```typescript
// Example test for investment calculation
describe('InvestmentAnalyticsService', () => {
  it('should calculate ROI correctly', async () => {
    const service = new InvestmentAnalyticsService();
    const property = mockProperty({ price: 5000000, monthlyRent: 50000 });
    
    const analytics = await service.calculateInvestmentMetrics(property.id);
    
    expect(analytics.roi).toBeCloseTo(12.0);
    expect(analytics.paybackPeriod).toBeCloseTo(8.3);
  });
});
```

### Integration Tests
```typescript
// API endpoint testing
describe('Properties API', () => {
  it('should return filtered properties', async () => {
    const response = await request(app)
      .get('/api/properties')
      .query({ region_id: 1, min_price: 1000000 })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.properties).toHaveLength(greaterThan(0));
  });
});
```

## Производительность и оптимизация

### Database Optimization
```sql
-- Индексы для быстрого поиска
CREATE INDEX idx_properties_region_price ON properties(region_id, price);
CREATE INDEX idx_properties_active_created ON properties(is_active, created_at);
CREATE INDEX idx_investment_analytics_property ON investment_analytics(property_id);
```

### Caching Strategy
```typescript
// Redis кэширование для частых запросов
export class CacheService {
  async getRegionAnalytics(regionId: number): Promise<RegionAnalytics> {
    const cacheKey = `region_analytics:${regionId}`;
    let analytics = await redis.get(cacheKey);
    
    if (!analytics) {
      analytics = await this.calculateRegionAnalytics(regionId);
      await redis.setex(cacheKey, 3600, JSON.stringify(analytics)); // 1 hour
    }
    
    return JSON.parse(analytics);
  }
}
```

## Безопасность

### Authentication Middleware
```typescript
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function requireRole(role: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

### Input Validation
```typescript
// Zod схемы для валидации
export const PropertyFiltersSchema = z.object({
  regionId: z.number().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  rooms: z.number().min(1).max(10).optional(),
  propertyType: z.string().optional(),
});

// Использование в роутах
app.get("/api/properties", async (req, res) => {
  const filters = PropertyFiltersSchema.parse(req.query);
  // ... остальная логика
});
```

## Развертывание

### Production Build
```bash
# Сборка проекта
npm run build

# Запуск в production
NODE_ENV=production npm start
```

### Docker Configuration
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## Мониторинг и логирование

### Logging System
```typescript
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export function log(message: string, level: LogLevel = LogLevel.INFO, source = "express") {
  const timestamp = new Date().toISOString();
  const levelName = LogLevel[level];
  console.log(`[${timestamp}] [${source}] [${levelName}] ${message}`);
}
```

### Error Handling
```typescript
export function globalErrorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  log(`Error: ${err.message}`, LogLevel.ERROR);
  
  if (err instanceof ZodError) {
    return res.status(400).json({ 
      error: 'Validation error', 
      details: err.errors 
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
}
```

---

*Данное руководство предоставляет полное понимание архитектуры SREDA Market для эффективной разработки и поддержки платформы.*