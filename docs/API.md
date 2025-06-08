# API Documentation - SredaMarket

## Обзор API

SredaMarket предоставляет RESTful API для доступа к данным о недвижимости, аналитике и пользовательским функциям. API построен на Express.js с TypeScript и использует PostgreSQL с PostGIS для геопространственных данных.

### Базовый URL
```
Production: https://sredamarket.ru/api
Development: http://localhost:5000/api
```

### Аутентификация

API использует сессионную аутентификацию с поддержкой JWT токенов.

```javascript
// Заголовки запроса
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <jwt_token>" // для API ключей
}
```

## Endpoints

### Аутентификация

#### POST /api/auth/login
Аутентификация пользователя через логин и пароль.

**Запрос:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "Иван",
      "lastName": "Петров",
      "role": "user",
      "isEmailVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### POST /api/auth/register
Регистрация нового пользователя.

**Запрос:**
```json
{
  "username": "username",
  "email": "user@example.com",
  "password": "secure_password",
  "firstName": "Иван",
  "lastName": "Петров",
  "telegramHandle": "@username"
}
```

#### GET /api/auth/user
Получение информации о текущем пользователе.

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "Иван",
    "lastName": "Петров",
    "role": "user",
    "subscription": "premium",
    "aiRequestsUsed": 45,
    "aiRequestsLimit": 100
  }
}
```

#### POST /api/auth/logout
Завершение сессии пользователя.

### Недвижимость

#### GET /api/properties
Получение списка объектов недвижимости с фильтрацией.

**Параметры запроса:**
- `page` (number): Номер страницы (по умолчанию 1)
- `limit` (number): Количество объектов на странице (по умолчанию 10)
- `region_id` (number): ID региона
- `property_class_id` (number): ID класса недвижимости
- `market_type` (string): Тип рынка (primary/secondary)
- `min_price` (number): Минимальная цена
- `max_price` (number): Максимальная цена
- `min_area` (number): Минимальная площадь
- `max_area` (number): Максимальная площадь
- `rooms` (number): Количество комнат
- `sort_by` (string): Сортировка (price, area, date, roi)
- `sort_order` (string): Порядок сортировки (asc/desc)

**Пример запроса:**
```
GET /api/properties?region_id=1&min_price=5000000&max_price=10000000&sort_by=price&sort_order=asc
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": 1,
        "title": "2-комнатная квартира в центре",
        "price": 7500000,
        "pricePerSqm": 150000,
        "area": 50,
        "rooms": 2,
        "floor": 5,
        "totalFloors": 10,
        "address": "ул. Тверская, 15",
        "coordinates": "POINT(37.6176 55.7558)",
        "propertyType": "apartment",
        "marketType": "secondary",
        "yearBuilt": 2018,
        "region": {
          "id": 1,
          "name": "Москва"
        },
        "propertyClass": {
          "id": 3,
          "name": "Бизнес"
        },
        "analytics": {
          "averagePrice": 145000,
          "pricePerSqmChange": 5.2,
          "demandIndex": 0.85
        },
        "investmentAnalytics": {
          "roi": 8.5,
          "liquidityScore": 0.75,
          "investmentRating": 4.2
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pages": 25,
      "total": 247,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### GET /api/properties/:id
Получение детальной информации об объекте недвижимости.

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "2-комнатная квартира в центре",
    "description": "Просторная квартира с отличным ремонтом...",
    "price": 7500000,
    "pricePerSqm": 150000,
    "area": 50,
    "livingArea": 30,
    "kitchenArea": 12,
    "rooms": 2,
    "floor": 5,
    "totalFloors": 10,
    "address": "ул. Тверская, 15",
    "coordinates": "POINT(37.6176 55.7558)",
    "propertyType": "apartment",
    "marketType": "secondary",
    "yearBuilt": 2018,
    "wallMaterial": "brick",
    "ceilingHeight": 3.2,
    "hasBalcony": true,
    "hasParking": false,
    "images": [
      "https://example.com/image1.jpg",
      "https://example.com/image2.jpg"
    ],
    "region": {
      "id": 1,
      "name": "Москва",
      "coordinates": [55.7558, 37.6176]
    },
    "propertyClass": {
      "id": 3,
      "name": "Бизнес",
      "description": "Качественное жилье в хороших районах"
    },
    "analytics": {
      "averagePrice": 145000,
      "pricePerSqmChange": 5.2,
      "demandIndex": 0.85,
      "timeOnMarket": 45,
      "viewsCount": 234
    },
    "investmentAnalytics": {
      "roi": 8.5,
      "paybackPeriod": 11.8,
      "liquidityScore": 0.75,
      "investmentRating": 4.2,
      "rentalYield": 7.2,
      "appreciationForecast": 12.5
    }
  }
}
```

### Регионы

#### GET /api/regions
Получение списка всех регионов.

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Москва",
      "coordinates": [55.7558, 37.6176],
      "timezone": "Europe/Moscow",
      "isActive": true,
      "propertyCount": 1247
    },
    {
      "id": 2,
      "name": "Санкт-Петербург",
      "coordinates": [59.9311, 30.3609],
      "timezone": "Europe/Moscow",
      "isActive": true,
      "propertyCount": 856
    }
  ]
}
```

#### GET /api/regions/:id/analytics
Получение аналитики по региону.

**Ответ:**
```json
{
  "success": true,
  "data": {
    "regionId": 1,
    "totalProperties": 1247,
    "averagePrice": 8500000,
    "averagePricePerSqm": 165000,
    "priceChange30d": 3.2,
    "priceChange90d": 8.7,
    "priceChange1y": 15.4,
    "demandIndex": 0.82,
    "liquidityIndex": 0.75,
    "investmentRating": 4.3,
    "propertyTypeDistribution": {
      "apartment": 0.85,
      "house": 0.10,
      "commercial": 0.05
    },
    "priceRangeDistribution": {
      "under_5m": 0.25,
      "5m_10m": 0.45,
      "10m_20m": 0.25,
      "over_20m": 0.05
    }
  }
}
```

### Классы недвижимости

#### GET /api/property-classes
Получение списка классов недвижимости.

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Эконом",
      "description": "Доступное жилье с базовой отделкой",
      "minPricePerSqm": 80000,
      "maxPricePerSqm": 120000
    },
    {
      "id": 2,
      "name": "Комфорт",
      "description": "Качественное жилье средней ценовой категории",
      "minPricePerSqm": 120000,
      "maxPricePerSqm": 180000
    }
  ]
}
```

### Аналитика

#### GET /api/analytics/market
Получение общей рыночной аналитики.

**Параметры запроса:**
- `region_id` (number): ID региона для фильтрации
- `period` (string): Период анализа (30d, 90d, 1y)

**Ответ:**
```json
{
  "success": true,
  "data": {
    "totalProperties": 15247,
    "averagePrice": 9200000,
    "priceChange": 4.2,
    "marketTrends": {
      "demand": 0.78,
      "supply": 0.65,
      "liquidity": 0.72
    },
    "regionComparison": [
      {
        "regionId": 1,
        "regionName": "Москва",
        "averagePrice": 12500000,
        "priceChange": 5.1,
        "roi": 7.8
      }
    ],
    "priceHistory": [
      {
        "date": "2024-01-01",
        "averagePrice": 8800000
      },
      {
        "date": "2024-02-01",
        "averagePrice": 9100000
      }
    ]
  }
}
```

#### GET /api/analytics/investment
Получение инвестиционной аналитики.

**Параметры запроса:**
- `property_id` (number): ID объекта для анализа
- `investment_amount` (number): Сумма инвестиций
- `rental_income` (number): Ожидаемый доход от аренды

**Ответ:**
```json
{
  "success": true,
  "data": {
    "propertyId": 1,
    "investmentMetrics": {
      "roi": 8.5,
      "paybackPeriod": 11.8,
      "npv": 1250000,
      "irr": 9.2
    },
    "riskAssessment": {
      "liquidity": "high",
      "marketVolatility": "medium",
      "locationRisk": "low",
      "overallRisk": "medium-low"
    },
    "recommendations": [
      "Объект имеет высокий потенциал роста стоимости",
      "Рекомендуется для долгосрочных инвестиций",
      "Низкий риск ликвидности"
    ]
  }
}
```

### Избранное

#### GET /api/favorites
Получение списка избранных объектов пользователя.

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "propertyId": 123,
      "addedAt": "2024-01-15T10:30:00.000Z",
      "notes": "Интересный объект для инвестиций",
      "property": {
        "id": 123,
        "title": "2-комнатная квартира",
        "price": 7500000,
        "address": "ул. Тверская, 15"
      }
    }
  ]
}
```

#### POST /api/favorites/:propertyId
Добавление объекта в избранное.

**Запрос:**
```json
{
  "notes": "Интересный объект для инвестиций"
}
```

#### DELETE /api/favorites/:propertyId
Удаление объекта из избранного.

### AI Консультант

#### POST /api/ai/chat
Отправка сообщения AI консультанту.

**Запрос:**
```json
{
  "message": "Какая средняя доходность от недвижимости в Москве?",
  "context": {
    "propertyId": 123,
    "regionId": 1
  }
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "response": "Средняя доходность от сдачи недвижимости в аренду в Москве составляет 6-8% годовых...",
    "suggestions": [
      "Показать аналитику по району",
      "Сравнить с другими городами",
      "Рассчитать ROI для конкретного объекта"
    ],
    "tokensUsed": 150
  }
}
```

#### GET /api/ai/limits
Получение информации о лимитах AI запросов.

**Ответ:**
```json
{
  "success": true,
  "data": {
    "requestsUsed": 45,
    "requestsLimit": 100,
    "resetDate": "2024-02-01T00:00:00.000Z",
    "subscription": "premium"
  }
}
```

### Платежи

#### POST /api/payments/create
Создание платежа для подписки.

**Запрос:**
```json
{
  "plan": "premium",
  "duration": "monthly",
  "currency": "RUB"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_1234567890",
    "clientSecret": "pi_1234567890_secret_abcd",
    "amount": 1990,
    "currency": "RUB"
  }
}
```

#### POST /api/payments/webhook
Webhook для обработки событий Stripe.

### Промокоды

#### POST /api/promocodes/use
Использование промокода.

**Запрос:**
```json
{
  "code": "WELCOME2024"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "discount": 50,
    "discountType": "percentage",
    "validUntil": "2024-12-31T23:59:59.000Z",
    "applied": true
  }
}
```

## Ошибки

### Коды ошибок

- `400` - Bad Request (неверные параметры запроса)
- `401` - Unauthorized (не авторизован)
- `403` - Forbidden (недостаточно прав)
- `404` - Not Found (ресурс не найден)
- `422` - Unprocessable Entity (ошибка валидации)
- `429` - Too Many Requests (превышен лимит запросов)
- `500` - Internal Server Error (внутренняя ошибка сервера)

### Формат ошибок

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Неверные параметры запроса",
    "details": {
      "field": "email",
      "reason": "Некорректный формат email"
    }
  }
}
```

## Rate Limiting

API имеет ограничения на количество запросов:

- **Гости**: 100 запросов в час
- **Зарегистрированные пользователи**: 1000 запросов в час
- **Premium пользователи**: 5000 запросов в час

Заголовки ответа содержат информацию о лимитах:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Пагинация

Для endpoints, возвращающих списки, используется пагинация:

**Параметры:**
- `page` - номер страницы (начиная с 1)
- `limit` - количество элементов на странице (по умолчанию 10, максимум 100)

**Формат ответа:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pages": 25,
    "total": 247,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Фильтрация и сортировка

### Фильтрация

Большинство endpoints поддерживают фильтрацию через параметры запроса:

```
GET /api/properties?region_id=1&min_price=5000000&property_type=apartment
```

### Сортировка

Используйте параметры `sort_by` и `sort_order`:

```
GET /api/properties?sort_by=price&sort_order=desc
```

Доступные поля для сортировки:
- `price` - цена
- `area` - площадь
- `date` - дата публикации
- `roi` - доходность
- `popularity` - популярность

## WebSocket API

Для real-time обновлений используется WebSocket соединение:

### Подключение
```javascript
const ws = new WebSocket('wss://sredamarket.ru/ws');
```

### Подписка на обновления
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'property_updates',
  filters: {
    region_id: 1,
    price_range: [5000000, 10000000]
  }
}));
```

### Получение обновлений
```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'property_update') {
    console.log('Обновление объекта:', data.property);
  }
};
```

## SDK и библиотеки

### JavaScript/TypeScript
```bash
npm install @sredamarket/sdk
```

```javascript
import { SredaMarketClient } from '@sredamarket/sdk';

const client = new SredaMarketClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://sredamarket.ru/api'
});

const properties = await client.properties.search({
  region_id: 1,
  min_price: 5000000
});
```

### Python
```bash
pip install sredamarket-python
```

```python
from sredamarket import SredaMarketClient

client = SredaMarketClient(api_key='your_api_key')
properties = client.properties.search(region_id=1, min_price=5000000)
```

## Примеры использования

### Поиск недвижимости с фильтрами
```javascript
const response = await fetch('/api/properties?' + new URLSearchParams({
  region_id: 1,
  min_price: 5000000,
  max_price: 10000000,
  rooms: 2,
  sort_by: 'roi',
  sort_order: 'desc'
}));

const data = await response.json();
console.log(`Найдено ${data.data.pagination.total} объектов`);
```

### Получение аналитики по объекту
```javascript
const analytics = await fetch(`/api/analytics/investment?property_id=123&investment_amount=8000000`);
const data = await analytics.json();
console.log(`ROI: ${data.data.investmentMetrics.roi}%`);
```

### Работа с AI консультантом
```javascript
const aiResponse = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Стоит ли покупать квартиру в Москве сейчас?',
    context: { regionId: 1 }
  })
});

const data = await aiResponse.json();
console.log(data.data.response);
```

---

Для получения дополнительной помощи обращайтесь к технической поддержке: api-support@sredamarket.ru