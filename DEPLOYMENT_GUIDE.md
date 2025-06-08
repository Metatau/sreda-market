# Руководство по развертыванию SredaMarket

Это подробное руководство по развертыванию платформы SredaMarket в production среде.

## Предварительные требования

### Системные требования
- **Сервер**: Linux Ubuntu 20.04+ или CentOS 8+
- **CPU**: Минимум 2 vCPU (рекомендуется 4+ vCPU)
- **RAM**: Минимум 4GB (рекомендуется 8GB+)
- **Диск**: Минимум 50GB SSD
- **Сеть**: Стабильное интернет-соединение

### Программное обеспечение
- **Node.js**: v20.x LTS
- **PostgreSQL**: v15+ с PostGIS 3.3+
- **nginx**: v1.20+ (для reverse proxy)
- **certbot**: для SSL сертификатов
- **Git**: для клонирования репозитория

## Подготовка сервера

### 1. Обновление системы
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Установка Node.js
```bash
# Установка через NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверка версии
node --version
npm --version
```

### 3. Установка PostgreSQL с PostGIS
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib postgis postgresql-15-postgis-3 -y

# Запуск и включение автозапуска
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создание пользователя и базы данных
sudo -u postgres psql
CREATE USER sredamarket WITH PASSWORD 'secure_password';
CREATE DATABASE sredamarket_prod OWNER sredamarket;
\c sredamarket_prod;
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
\q
```

### 4. Установка nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Развертывание приложения

### 1. Клонирование репозитория
```bash
cd /opt
sudo git clone https://github.com/username/sreda-market.git
sudo chown -R $USER:$USER sreda-market
cd sreda-market
```

### 2. Установка зависимостей
```bash
npm ci --production
```

### 3. Настройка переменных окружения
```bash
sudo cp .env.example .env.production
sudo nano .env.production
```

Пример production конфигурации:
```env
# Database
DATABASE_URL=postgresql://sredamarket:secure_password@localhost:5432/sredamarket_prod
PGHOST=localhost
PGPORT=5432
PGUSER=sredamarket
PGPASSWORD=secure_password
PGDATABASE=sredamarket_prod

# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
SESSION_SECRET=your_very_secure_session_secret_here
JWT_SECRET=your_jwt_secret_here

# External APIs
OPENAI_API_KEY=your_openai_api_key
ADS_API_TOKEN=your_ads_api_token
ADS_API_LOGIN=your_ads_api_login
MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Payment
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Analytics
YANDEX_METRIKA_ID=your_metrika_id

# Domain
DOMAIN=yourdomain.com
```

### 4. Инициализация базы данных
```bash
npm run db:push
npm run db:seed # если необходимо
```

### 5. Сборка приложения
```bash
npm run build
```

## Настройка nginx

### 1. Создание конфигурации сайта
```bash
sudo nano /etc/nginx/sites-available/sredamarket
```

Содержимое файла:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Static files
    location /assets/ {
        alias /opt/sreda-market/client/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
```

### 2. Включение сайта
```bash
sudo ln -s /etc/nginx/sites-available/sredamarket /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL сертификаты

### 1. Установка Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Получение сертификата
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. Автоматическое обновление
```bash
sudo crontab -e
# Добавить строку:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Настройка systemd сервиса

### 1. Создание сервиса
```bash
sudo nano /etc/systemd/system/sredamarket.service
```

Содержимое файла:
```ini
[Unit]
Description=SredaMarket Node.js Application
Documentation=https://github.com/username/sreda-market
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/sreda-market
Environment=NODE_ENV=production
EnvironmentFile=/opt/sreda-market/.env.production
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=sredamarket

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/sreda-market/logs /opt/sreda-market/uploads

[Install]
WantedBy=multi-user.target
```

### 2. Запуск сервиса
```bash
sudo systemctl daemon-reload
sudo systemctl enable sredamarket
sudo systemctl start sredamarket
sudo systemctl status sredamarket
```

## Мониторинг и логирование

### 1. Настройка логирования
```bash
# Создание директории для логов
sudo mkdir -p /var/log/sredamarket
sudo chown ubuntu:ubuntu /var/log/sredamarket

# Настройка logrotate
sudo nano /etc/logrotate.d/sredamarket
```

Содержимое файла logrotate:
```
/var/log/sredamarket/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        systemctl reload sredamarket
    endscript
}
```

### 2. Мониторинг производительности
```bash
# Установка htop для мониторинга системы
sudo apt install htop -y

# Установка ncdu для анализа дискового пространства
sudo apt install ncdu -y

# Мониторинг логов в реальном времени
sudo journalctl -fu sredamarket
```

## Резервное копирование

### 1. Скрипт резервного копирования базы данных
```bash
sudo nano /opt/backup-db.sh
```

Содержимое скрипта:
```bash
#!/bin/bash

# Настройки
DB_NAME="sredamarket_prod"
DB_USER="sredamarket"
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Создание директории для бэкапов
mkdir -p $BACKUP_DIR

# Создание бэкапа
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Backup created: db_backup_$DATE.sql.gz"
```

```bash
sudo chmod +x /opt/backup-db.sh
```

### 2. Автоматическое резервное копирование
```bash
sudo crontab -e
# Добавить строки:
0 2 * * * /opt/backup-db.sh
0 3 * * 0 tar -czf /opt/backups/app_backup_$(date +\%Y\%m\%d).tar.gz /opt/sreda-market --exclude=node_modules
```

## Производительность и оптимизация

### 1. Оптимизация PostgreSQL
```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Рекомендуемые настройки:
```
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100

# WAL settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

### 2. Настройка файрвола
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

## Безопасность

### 1. Обновления безопасности
```bash
# Автоматические обновления безопасности
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 2. Мониторинг безопасности
```bash
# Установка fail2ban
sudo apt install fail2ban -y

# Настройка fail2ban для nginx
sudo nano /etc/fail2ban/jail.local
```

Содержимое jail.local:
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true

[nginx-noproxy]
enabled = true
```

## Обслуживание

### 1. Обновление приложения
```bash
cd /opt/sreda-market
sudo systemctl stop sredamarket
git pull origin main
npm ci --production
npm run build
npm run db:push # если есть новые миграции
sudo systemctl start sredamarket
```

### 2. Мониторинг здоровья системы
```bash
# Проверка состояния сервисов
sudo systemctl status nginx postgresql sredamarket

# Проверка использования ресурсов
htop
df -h
free -h

# Проверка логов
sudo journalctl -fu sredamarket --since "1 hour ago"
```

## Устранение неполадок

### Общие проблемы

1. **Приложение не запускается**
   ```bash
   sudo journalctl -fu sredamarket
   sudo systemctl status sredamarket
   ```

2. **Проблемы с базой данных**
   ```bash
   sudo -u postgres psql -c "SELECT version();"
   sudo systemctl status postgresql
   ```

3. **Проблемы с nginx**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

4. **SSL сертификаты**
   ```bash
   sudo certbot certificates
   sudo certbot renew --dry-run
   ```

### Контакты для поддержки

- Техническая поддержка: tech@sredamarket.ru
- Экстренные ситуации: +7 (XXX) XXX-XX-XX
- Документация: https://docs.sredamarket.ru

---

Данное руководство обеспечивает надежное и безопасное развертывание платформы SredaMarket в production среде.