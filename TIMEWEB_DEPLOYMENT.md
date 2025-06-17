# SREDA.MARKET Deployment Guide for Timeweb.cloud

## 🎯 Overview
This guide provides step-by-step instructions for deploying the SREDA.MARKET real estate platform to Timeweb.cloud hosting infrastructure.

**Platform**: Timeweb.cloud VPS  
**Architecture**: Docker-based monorepo deployment  
**Database**: PostgreSQL with PostGIS extension  
**Cache**: Redis for sessions and caching  

---

## 📋 Prerequisites

### Timeweb.cloud Account Setup
1. **VPS Configuration Recommendation**:
   - **CPU**: 2-4 cores
   - **RAM**: 4-8 GB
   - **Storage**: 50-100 GB SSD
   - **OS**: Ubuntu 22.04 LTS
   - **Network**: 1 Gbps

2. **Additional Services**:
   - PostgreSQL instance (or self-hosted)
   - Redis instance (or self-hosted)
   - SSL certificate
   - Domain name configuration

### Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install PostgreSQL client (for database setup)
sudo apt install postgresql-client

# Install Redis CLI (for cache testing)
sudo apt install redis-tools

# Install Nginx (for reverse proxy)
sudo apt install nginx

# Install Certbot (for SSL)
sudo apt install certbot python3-certbot-nginx
```

---

## 🗄️ Database Setup

### PostgreSQL with PostGIS

#### Option 1: Timeweb.cloud Database Service
1. **Create PostgreSQL instance** in Timeweb.cloud control panel
2. **Enable PostGIS extension**:
```sql
-- Connect to your database
psql -h your-db-host -U your-db-user -d your-database

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify installation
SELECT PostGIS_Version();
```

#### Option 2: Self-hosted PostgreSQL
```bash
# Install PostgreSQL and PostGIS
sudo apt install postgresql postgresql-contrib postgis postgresql-15-postgis-3

# Create database and user
sudo -u postgres psql
CREATE DATABASE sreda_market;
CREATE USER sreda_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE sreda_market TO sreda_user;
ALTER USER sreda_user CREATEDB;

# Enable PostGIS
\c sreda_market
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
\q

# Configure PostgreSQL for production
sudo nano /etc/postgresql/15/main/postgresql.conf
```

**PostgreSQL Configuration** (`postgresql.conf`):
```conf
# Memory Settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection Settings
max_connections = 100
listen_addresses = 'localhost'

# Performance Settings
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_statement = 'mod'
log_min_duration_statement = 1000
```

### Redis Setup
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf
```

**Redis Configuration**:
```conf
# Security
requirepass your-redis-password
bind 127.0.0.1

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
```

---

## 🚀 Application Deployment

### 1. Project Setup
```bash
# Create application directory
sudo mkdir -p /opt/sreda-market
cd /opt/sreda-market

# Clone repository
git clone https://github.com/your-repo/sreda-market.git .

# Set ownership
sudo chown -R $USER:$USER /opt/sreda-market
```

### 2. Environment Configuration
```bash
# Create production environment file
nano .env.production
```

**.env.production**:
```env
# Application
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://sreda_user:your-secure-password@localhost:5432/sreda_market

# Redis
REDIS_URL=redis://:your-redis-password@localhost:6379/0

# Security
SESSION_SECRET=your-super-secure-session-secret-at-least-32-characters-long
CORS_ORIGIN=https://yourdomain.com

# External APIs
OPENAI_API_KEY=your-openai-api-key
VITE_PERPLEXITY_API_KEY=your-perplexity-api-key
ADS_API_KEY=your-ads-api-key
ADS_API_URL=https://ads-api.ru/main

# Telegram (Optional)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_USERNAME=your-telegram-bot-username

# Logging
LOG_LEVEL=info

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/opt/sreda-market/uploads

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### 3. Optimized Dockerfile for Production
```dockerfile
# Production-optimized Dockerfile
FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install security updates
RUN apk update && apk upgrade

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sreda -u 1001

# Create directories
WORKDIR /app
RUN mkdir -p /app/uploads /app/logs && \
    chown -R sreda:nodejs /app

# Copy built application
COPY --from=builder --chown=sreda:nodejs /app/dist ./dist
COPY --from=builder --chown=sreda:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=sreda:nodejs /app/package*.json ./

# Switch to non-root user
USER sreda

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["node", "dist/index.js"]
```

### 4. Docker Compose Configuration
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: sreda-market-app
    restart: unless-stopped
    ports:
      - "127.0.0.1:5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis
    networks:
      - sreda-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgis/postgis:15-3.3-alpine
    container_name: sreda-market-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: sreda_market
      POSTGRES_USER: sreda_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/migrations:/docker-entrypoint-initdb.d
    ports:
      - "127.0.0.1:5432:5432"
    networks:
      - sreda-network

  redis:
    image: redis:7-alpine
    container_name: sreda-market-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "127.0.0.1:6379:6379"
    networks:
      - sreda-network

  nginx:
    image: nginx:alpine
    container_name: sreda-market-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - /var/log/nginx:/var/log/nginx
    depends_on:
      - app
    networks:
      - sreda-network

volumes:
  postgres_data:
  redis_data:

networks:
  sreda-network:
    driver: bridge
```

### 5. Build and Deploy
```bash
# Build application
docker-compose -f docker-compose.production.yml build

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f app
```

---

## 🌐 Nginx Configuration

### Nginx Reverse Proxy Setup
```nginx
# /opt/sreda-market/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:5000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # HSTS
        add_header Strict-Transport-Security "max-age=63072000" always;

        # API rate limiting
        location /api/auth/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeout settings
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Static files
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Cache static files
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
                proxy_pass http://app;
            }
        }

        # Health check
        location /health {
            access_log off;
            proxy_pass http://app/api/health;
        }
    }
}
```

---

**Last Updated**: January 16, 2024  
**Version**: 1.0  
**Contact**: admin@sreda.market