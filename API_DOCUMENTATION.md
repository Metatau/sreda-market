# SREDA.MARKET API Documentation

## 🌍 Base URL
```
Development: http://localhost:5000
Production: https://your-domain.com
```

## 🔐 Authentication
All authenticated endpoints require a valid session. The API uses session-based authentication with secure cookies.

### Session Headers
```http
Cookie: connect.sid=<session-id>
Content-Type: application/json
```

---

## 📋 API Endpoints Overview

### 🔑 Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - User logout
- `POST /api/auth/telegram` - Telegram authentication

### 🏠 Properties
- `GET /api/properties` - List properties with filters
- `GET /api/properties/:id` - Get property details
- `POST /api/properties` - Create property (Admin)
- `PUT /api/properties/:id` - Update property (Admin)
- `DELETE /api/properties/:id` - Delete property (Admin)

### 📊 Analytics
- `GET /api/analytics/overview` - Market overview
- `GET /api/analytics/trends` - Market trends
- `GET /api/analytics/districts` - District analysis
- `POST /api/analytics/custom` - Custom analytics query

### 💰 Investment Analytics
- `GET /api/investment-analytics/:propertyId` - Property investment analysis
- `POST /api/investment-analytics/calculate` - Calculate investment metrics
- `GET /api/investment-analytics/comparison` - Compare multiple properties

### 🗺️ Map & Geospatial
- `GET /api/map/properties` - Properties for map display
- `POST /api/map/search` - Geospatial search
- `GET /api/map/heatmap` - Heatmap data
- `GET /api/map/districts` - District boundaries

### 🌍 Regions
- `GET /api/regions` - List all regions
- `GET /api/regions/:id` - Get region details
- `POST /api/regions` - Create region (Admin)

### 🏷️ Property Classes
- `GET /api/property-classes` - List property classes
- `GET /api/property-classes/:id` - Get class details

### 💬 AI Chat
- `POST /api/chat` - Send message to AI assistant
- `GET /api/chat/history/:sessionId` - Get chat history

### ❤️ Favorites
- `GET /api/favorites` - Get user favorites
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites/:propertyId` - Remove from favorites

### 🎫 Promocodes
- `POST /api/promocodes/generate` - Generate promocode
- `POST /api/promocodes/use` - Use promocode
- `GET /api/promocodes/status` - Check promocode status

### 👑 Admin Panel
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/users` - Manage users
- `GET /api/admin/properties` - Manage properties
- `POST /api/admin/sync` - Sync external data
- `GET /api/admin/analytics` - Admin analytics

### 🛠️ System
- `GET /api/health` - Health check
- `GET /api/scheduler/status` - Scheduler status
- `POST /api/sync-ads` - Manual ADS API sync

---

## 📖 Detailed Endpoints

### 🔑 Authentication Endpoints

#### POST /api/auth/login
**Description**: Authenticate user with email and password

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "client"
    }
  }
}
```

**Rate Limit**: 5 requests per 15 minutes per IP

---

#### POST /api/auth/register
**Description**: Register new user account

**Request**:
```json
{
  "username": "johndoe",
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "telegramHandle": "@johndoe",
  "referralCode": "FRIEND123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "client"
    }
  }
}
```

**Rate Limit**: 3 requests per 15 minutes per IP

---

#### GET /api/auth/profile
**Description**: Get current user profile
**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "client",
      "bonusBalance": "150.00",
      "subscriptionType": "premium",
      "aiQueriesUsed": 15
    }
  }
}
```

---

### 🏠 Property Endpoints

#### GET /api/properties
**Description**: Get properties with optional filtering and pagination

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `regionId` (number): Filter by region
- `propertyClassId` (number): Filter by property class
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `minArea` (number): Minimum area in sqm
- `maxArea` (number): Maximum area in sqm
- `rooms` (number): Number of rooms
- `marketType` (string): 'secondary' | 'new_construction'
- `sortBy` (string): 'price' | 'area' | 'createdAt' | 'pricePerSqm'
- `sortOrder` (string): 'asc' | 'desc'
- `search` (string): Search in title and address

**Example Request**:
```
GET /api/properties?regionId=1&minPrice=5000000&maxPrice=15000000&rooms=2&sortBy=price&sortOrder=asc&page=1&limit=20
```

**Response**:
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": 1,
        "title": "2-комнатная квартира в центре",
        "description": "Просторная квартира с отличным ремонтом",
        "price": 8500000,
        "pricePerSqm": 150000,
        "area": "56.70",
        "rooms": 2,
        "floor": 5,
        "totalFloors": 12,
        "address": "ул. Пушкина, д. 10",
        "district": "Центральный",
        "metroStation": "Площадь Революции",
        "coordinates": "55.7558,37.6176",
        "propertyType": "apartment",
        "marketType": "secondary",
        "imageUrl": "https://example.com/image.jpg",
        "images": ["image1.jpg", "image2.jpg"],
        "buildYear": 2018,
        "metroDistance": 300,
        "createdAt": "2024-01-15T10:30:00Z",
        "region": {
          "id": 1,
          "name": "Москва",
          "regionType": "city"
        },
        "propertyClass": {
          "id": 2,
          "name": "Бизнес",
          "minPricePerSqm": 120000,
          "maxPricePerSqm": 200000
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### GET /api/properties/:id
**Description**: Get detailed property information including analytics

**Response**:
```json
{
  "success": true,
  "data": {
    "property": {
      "id": 1,
      "title": "2-комнатная квартира в центре",
      "description": "Просторная квартира с отличным ремонтом",
      "price": 8500000,
      "pricePerSqm": 150000,
      "area": "56.70",
      "totalArea": "60.50",
      "livingArea": "45.20",
      "kitchenArea": "12.50",
      "rooms": 2,
      "floor": 5,
      "totalFloors": 12,
      "address": "ул. Пушкина, д. 10",
      "district": "Центральный",
      "metroStation": "Площадь Революции",
      "coordinates": "55.7558,37.6176",
      "propertyType": "apartment",
      "marketType": "secondary",
      "imageUrl": "https://example.com/image.jpg",
      "images": ["image1.jpg", "image2.jpg"],
      "buildYear": 2018,
      "metroDistance": 300,
      "phone": "+7 (999) 123-45-67",
      "url": "https://ads-source.com/property/123",
      "source": "ads-api.ru",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-16T14:20:00Z",
      "region": {
        "id": 1,
        "name": "Москва",
        "regionType": "city",
        "timezone": "Europe/Moscow"
      },
      "propertyClass": {
        "id": 2,
        "name": "Бизнес",
        "minPricePerSqm": 120000,
        "maxPricePerSqm": 200000,
        "description": "Квартиры бизнес-класса"
      },
      "analytics": {
        "roi": "8.50",
        "rentalYield": "6.20",
        "liquidityScore": 8,
        "investmentScore": 7,
        "investmentRating": "B+",
        "marketTrend": "growing"
      },
      "investmentAnalytics": {
        "rentalYield": "6.20",
        "rentalIncomeMonthly": 45000,
        "rentalRoiAnnual": "6.35",
        "rentalPaybackYears": "15.75",
        "flipPotentialProfit": 1200000,
        "flipRoi": "14.10",
        "flipTimeframeMonths": 18,
        "renovationCostEstimate": 800000,
        "safeHavenScore": 7,
        "liquidityScore": 8,
        "priceForecast3y": "12.50",
        "investmentRating": "B+",
        "riskLevel": "moderate",
        "recommendedStrategy": "rental"
      }
    }
  }
}
```

---

### 📊 Analytics Endpoints

#### GET /api/analytics/overview
**Description**: Get market overview analytics

**Query Parameters**:
- `regionId` (number): Filter by region
- `propertyClassId` (number): Filter by property class
- `period` (string): 'week' | 'month' | 'quarter' | 'year'

**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProperties": 12543,
      "averagePrice": 9850000,
      "averagePricePerSqm": 145000,
      "medianPrice": 8200000,
      "priceGrowth": {
        "week": "0.8%",
        "month": "2.3%",
        "quarter": "7.1%",
        "year": "15.4%"
      },
      "marketActivity": {
        "newListings": 156,
        "totalViews": 45230,
        "averageDaysOnMarket": 45
      },
      "regionBreakdown": [
        {
          "regionId": 1,
          "regionName": "Москва",
          "count": 8945,
          "averagePrice": 12500000,
          "priceGrowth": "16.2%"
        }
      ],
      "classBreakdown": [
        {
          "classId": 1,
          "className": "Эконом",
          "count": 4521,
          "averagePrice": 6800000,
          "priceGrowth": "12.8%"
        }
      ]
    }
  }
}
```

---

### 💰 Investment Analytics Endpoints

#### GET /api/investment-analytics/:propertyId
**Description**: Get comprehensive investment analysis for a property

**Response**:
```json
{
  "success": true,
  "data": {
    "analysis": {
      "propertyId": 1,
      "calculatedAt": "2024-01-16T15:30:00Z",
      "rentalScenario": {
        "yield": "6.20",
        "monthlyIncome": 45000,
        "annualRoi": "6.35",
        "paybackYears": "15.75",
        "totalReturn5y": "2.1M",
        "risks": ["market_volatility", "tenant_turnover"],
        "recommendation": "Подходит для долгосрочной аренды"
      },
      "flipScenario": {
        "potentialProfit": 1200000,
        "roi": "14.10",
        "timeframeMonths": 18,
        "renovationCost": 800000,
        "marketingCost": 150000,
        "totalInvestment": 9450000,
        "risks": ["market_downturn", "renovation_overrun"],
        "recommendation": "Высокий потенциал при правильном ремонте"
      },
      "safeHavenScenario": {
        "score": 7,
        "capitalPreservation": "8.5",
        "liquidityScore": 8,
        "inflationHedge": "good",
        "recommendation": "Надежное сохранение капитала"
      },
      "forecast3y": {
        "priceGrowth": "12.50",
        "marketTrend": "growing",
        "infrastructureImpact": "positive",
        "developmentRisk": "low",
        "overallRating": "B+"
      },
      "comparativeAnalysis": {
        "vsRegionAverage": {
          "pricePerSqm": "+15%",
          "roi": "+8%",
          "liquidity": "+12%"
        },
        "vsClass": {
          "pricePerSqm": "+3%",
          "roi": "+5%",
          "liquidity": "average"
        }
      }
    }
  }
}
```

---

### 🗺️ Map Endpoints

#### GET /api/map/properties
**Description**: Get properties optimized for map display

**Query Parameters**:
- `bounds` (string): Map bounds in format "sw_lat,sw_lng,ne_lat,ne_lng"
- `zoom` (number): Map zoom level (affects clustering)
- `filters` (object): Same filters as /api/properties

**Response**:
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": 1,
        "coordinates": "55.7558,37.6176",
        "price": 8500000,
        "pricePerSqm": 150000,
        "rooms": 2,
        "area": "56.70",
        "title": "2-комнатная квартира в центре",
        "district": "Центральный",
        "investmentRating": "B+"
      }
    ],
    "clusters": [
      {
        "coordinates": "55.7600,37.6200",
        "count": 25,
        "averagePrice": 9200000,
        "priceRange": {
          "min": 6500000,
          "max": 15000000
        }
      }
    ],
    "heatmapData": [
      {
        "coordinates": "55.7558,37.6176",
        "intensity": 0.8,
        "value": 150000
      }
    ]
  }
}
```

---

### 💬 AI Chat Endpoints

#### POST /api/chat
**Description**: Send message to AI assistant
**Authentication**: Required

**Request**:
```json
{
  "message": "Посоветуй квартиру для инвестиций в Москве до 10 миллионов",
  "sessionId": "chat-session-123",
  "context": {
    "propertyId": 1,
    "filters": {
      "regionId": 1,
      "maxPrice": 10000000
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "response": "Основываясь на ваших критериях, рекомендую обратить внимание на следующие варианты...",
    "sessionId": "chat-session-123",
    "suggestions": [
      {
        "propertyId": 15,
        "title": "1-комнатная квартира у метро",
        "reasoning": "Высокая ликвидность и стабильный спрос на аренду"
      }
    ],
    "usedTokens": 150,
    "remainingQueries": 85
  }
}
```

**Rate Limit**: 10 requests per minute per user

---

## 🔧 Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message in Russian",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field error"
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `422` - Unprocessable Entity (validation failed)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## 🚀 Rate Limiting

### Default Limits
- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 login attempts per 15 minutes per IP
- **Registration**: 3 attempts per 15 minutes per IP
- **AI Chat**: 10 requests per minute per user
- **Map API**: 2000 requests per minute per IP
- **Admin API**: 500 requests per minute (authenticated admin)

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642345678
Retry-After: 60
```

---

## 🔒 Security Considerations

### Authentication
- Session-based authentication with secure cookies
- CSRF protection enabled
- Rate limiting on authentication endpoints
- Password strength requirements (minimum 6 characters)

### Data Validation
- All inputs validated with Zod schemas
- SQL injection prevention with parameterized queries
- XSS protection with proper encoding

### Privacy
- Personal data handled according to GDPR
- User consent for cookies and data processing
- Secure password hashing with bcrypt

---

## 📋 Development Notes

### Database Schema
- Uses Drizzle ORM with PostgreSQL
- PostGIS extension for geospatial queries
- Proper indexing for performance
- Foreign key constraints for data integrity

### Caching Strategy
- API response caching for static data
- Session storage in memory (production should use Redis)
- Query result caching for expensive operations

### Monitoring
- Health check endpoint for load balancer
- Performance monitoring middleware
- Error logging and tracking

---

**Last Updated**: January 16, 2024  
**API Version**: 1.0  
**Contact**: support@sreda.market