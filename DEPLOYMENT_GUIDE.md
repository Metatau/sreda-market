# Руководство по развертыванию SREDA Market

## Обзор системы

SREDA Market - это комплексная AI-платформа для анализа рынка недвижимости в России с продвинутыми возможностями картографии и аналитики.

## Архитектура

### Backend
- **Express.js** с TypeScript
- **PostgreSQL** база данных с PostGIS
- **Drizzle ORM** для работы с данными
- **Модульная архитектура** роутов и сервисов
- **IP-валидация** и система защиты от мошенничества

### Frontend
- **React 18** с TypeScript
- **TanStack Query** для управления состоянием
- **Tailwind CSS** + **shadcn/ui** компоненты
- **Mapbox GL JS** для интерактивных карт

### Карты и геоданные
- **Mapbox** для базовых карт и геокодирования
- **Векторные тайлы** для высокопроизводительного отображения
- **Кластеризация** и тепловые карты
- **Поиск адресов** с автодополнением

## Предварительные требования

### Системные требования
- Node.js 18+ 
- PostgreSQL 14+ с PostGIS
- Доступ к Mapbox API
- 4GB+ RAM для production

### Внешние сервисы
- **Mapbox** - карты и геокодирование
- **Telegram Bot API** - авторизация через Telegram
- **ADS API** - данные о недвижимости

## Установка и настройка

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd sreda-market
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка базы данных
```sql
-- Создание базы данных
CREATE DATABASE sreda_market;

-- Подключение к базе и установка PostGIS
\c sreda_market;
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 4. Переменные окружения
Создайте файл `.env`:
```bash
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/sreda_market

# Mapbox
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
VITE_MAPBOX_TILESET_ID=username.tileset_id  # Опционально для облачных тайлов

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username

# ADS API
ADS_API_TOKEN=your_ads_api_token
ADS_API_LOGIN=your_ads_login

# OpenAI (опционально)
OPENAI_API_KEY=your_openai_key

# Environment
NODE_ENV=production
PORT=5000
```

### 5. Инициализация базы данных
```bash
npm run db:push
```

### 6. Сборка приложения
```bash
npm run build
```

## Развертывание

### Production сервер

#### 1. PM2 (рекомендуется)
```bash
# Установка PM2
npm install -g pm2

# Создание ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'sreda-market',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
}
EOF

# Запуск
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 2. Docker
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]
```

```bash
# Сборка и запуск
docker build -t sreda-market .
docker run -d --name sreda-market \
  --env-file .env \
  -p 5000:5000 \
  sreda-market
```

### Nginx конфигурация
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Кэширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Настройка карт

### Базовая конфигурация
1. Получите токен Mapbox на https://account.mapbox.com/
2. Добавьте токен в переменные окружения
3. Перезапустите приложение

### Векторные тайлы (для больших объемов данных)

#### Локальные тайлы
```bash
# Установка инструментов
sudo apt-get install gdal-bin tippecanoe

# Создание тайлов
./scripts/export-geojson.sh
./scripts/create-tiles.sh

# Запуск сервера тайлов
npm install -g @mapbox/tileserver-gl
tileserver-gl data/tiles/properties.mbtiles --port 8080
```

#### Облачные тайлы (Mapbox Studio)
```bash
# Установка Mapbox CLI
npm install -g @mapbox/mapbox-cli

# Настройка
export MAPBOX_ACCESS_TOKEN=your_token
export MAPBOX_USERNAME=your_username

# Загрузка
./scripts/upload-to-mapbox.sh
```

## Мониторинг и обслуживание

### Логирование
```bash
# PM2 логи
pm2 logs sreda-market

# Файловые логи
tail -f logs/combined.log
```

### Мониторинг производительности
```bash
# PM2 мониторинг
pm2 monit

# Состояние базы данных
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"
```

### Обновление данных
```bash
# Синхронизация с ADS API
curl -X POST http://localhost:5000/api/admin/scheduler/sync

# Проверка статуса
curl http://localhost:5000/api/admin/scheduler/status
```

## Система безопасности промокодов

### IP-валидация и защита от мошенничества
Платформа включает комплексную систему защиты промокодов:

- **IP-отслеживание**: Все действия с промокодами логируются с IP-адресами
- **Лимиты создания**: Максимум 3 промокода в час с одного IP
- **Лимиты использования**: Максимум 5 применений в день с одного IP
- **Предотвращение самоприменения**: Блокировка использования с создавшего IP

### Мониторинг безопасности
```bash
# Проверка статистики промокодов
curl http://localhost:5000/api/admin/promocodes/stats

# Анализ IP-активности
curl http://localhost:5000/api/admin/promocodes/ip-activity
```

### Административная панель
- Секция "Промокоды" в админ-панели для мониторинга
- Метрики безопасности в реальном времени
- Отслеживание подозрительной активности

### Резервное копирование
```bash
# База данных
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Файлы тайлов
tar -czf tiles_backup_$(date +%Y%m%d).tar.gz data/tiles/
```

## Масштабирование

### Горизонтальное масштабирование
- Используйте PM2 cluster mode
- Настройте load balancer (Nginx, HAProxy)
- Разделите базу данных (master/slave)

### Оптимизация производительности
- Включите сжатие gzip в Nginx
- Настройте CDN для статических файлов
- Используйте векторные тайлы для больших данных
- Настройте кэширование запросов

## Безопасность

### SSL/TLS
```bash
# Certbot для Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Брандмауэр
```bash
# UFW настройка
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Переменные окружения
- Никогда не коммитьте `.env` файлы
- Используйте секреты менеджеры в production
- Регулярно ротируйте API ключи

## Устранение неполадок

### Общие проблемы

#### Карта не загружается
1. Проверьте токен Mapbox
2. Убедитесь в доступности CDN Mapbox
3. Проверьте консоль браузера на ошибки

#### Медленная работа базы данных
1. Добавьте индексы на координаты
2. Оптимизируйте запросы через EXPLAIN
3. Настройте connection pooling

#### Ошибки синхронизации данных
1. Проверьте ADS API ключи
2. Убедитесь в корректности endpoints
3. Проверьте сетевое соединение

### Логи и диагностика
```bash
# Состояние приложения
pm2 status

# Системные ресурсы
htop
df -h
free -m

# Сетевое соединение
netstat -tlnp | grep :5000
```

## Поддержка

### Документация
- `README.md` - основная документация
- `MAP_FEATURES.md` - функции карты
- `VECTOR_TILES_SETUP.md` - настройка тайлов
- `REFACTORING_SUMMARY.md` - архитектурные изменения

### Контакты
Для технической поддержки обращайтесь к команде разработки с логами и описанием проблемы.