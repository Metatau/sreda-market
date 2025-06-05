# SREDA Market - Руководство администратора

## Обзор системы

SREDA Market - это производственная платформа для анализа инвестиций в недвижимость, требующая профессионального развертывания и управления. Система построена на Node.js/Express backend с React frontend и PostgreSQL базой данных.

## Системные требования

### Минимальные требования
- **CPU:** 2 vCPU
- **RAM:** 4 GB
- **Диск:** 50 GB SSD
- **ОС:** Ubuntu 22.04 LTS или CentOS 8+
- **Node.js:** 20.x LTS
- **PostgreSQL:** 16+

### Рекомендуемые требования для production
- **CPU:** 4 vCPU
- **RAM:** 8 GB
- **Диск:** 100 GB SSD
- **Backup:** Отдельный диск для резервных копий
- **Сетевая пропускная способность:** 1 Gbps

## Установка и настройка

### 1. Подготовка сервера

#### Обновление системы
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl wget git build-essential -y
```

#### Установка Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Проверка версии
```

#### Установка PostgreSQL 16
```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install postgresql-16 postgresql-client-16 -y
```

#### Настройка PostgreSQL
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создание базы данных
sudo -u postgres createuser --interactive
sudo -u postgres createdb sreda_market
sudo -u postgres psql -c "ALTER USER sreda_user PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sreda_market TO sreda_user;"
```

### 2. Развертывание приложения

#### Клонирование и установка
```bash
# Создание пользователя для приложения
sudo useradd -m -s /bin/bash sreda
sudo su - sreda

# Клонирование репозитория
git clone https://github.com/your-org/sreda-market.git
cd sreda-market

# Установка зависимостей
npm install

# Сборка приложения
npm run build
```

#### Настройка переменных окружения
```bash
# Создание файла конфигурации
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://sreda_user:secure_password@localhost:5432/sreda_market

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_USERNAME=your_bot_username

# External APIs
ADS_API_KEY=your-ads-api-key
ADS_API_URL=https://ads-api.ru/main

# Security
SESSION_SECRET=your-very-secure-session-secret-min-32-chars

# Stripe Configuration (опционально)
STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key
EOF

# Установка правильных прав доступа
chmod 600 .env
```

#### Инициализация базы данных
```bash
# Применение схемы базы данных
npm run db:push

# Проверка подключения
psql $DATABASE_URL -c "SELECT version();"
```

### 3. Настройка системного сервиса

#### Создание systemd service
```bash
sudo tee /etc/systemd/system/sreda-market.service > /dev/null << EOF
[Unit]
Description=SREDA Market Application
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=sreda
WorkingDirectory=/home/sreda/sreda-market
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=sreda-market

[Install]
WantedBy=multi-user.target
EOF

# Активация и запуск службы
sudo systemctl daemon-reload
sudo systemctl enable sreda-market
sudo systemctl start sreda-market

# Проверка статуса
sudo systemctl status sreda-market
```

### 4. Настройка веб-сервера (Nginx)

#### Установка Nginx
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
```

#### Конфигурация для SREDA Market
```bash
sudo tee /etc/nginx/sites-available/sreda-market << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Main proxy configuration
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Static files
    location /static/ {
        alias /home/sreda/sreda-market/dist/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Активация конфигурации
sudo ln -s /etc/nginx/sites-available/sreda-market /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL сертификат (Let's Encrypt)

```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение SSL сертификата
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Настройка автообновления
sudo crontab -e
# Добавить строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## Управление базой данных

### Резервное копирование

#### Ежедневный backup script
```bash
sudo tee /usr/local/bin/backup-sreda.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/sreda-market"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="sreda_market"
DB_USER="sreda_user"

# Создание директории если не существует
mkdir -p $BACKUP_DIR

# Backup базы данных
pg_dump -U $DB_USER -h localhost -d $DB_NAME | gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Backup файлов приложения
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" -C /home/sreda sreda-market

# Удаление старых backup'ов (старше 30 дней)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /usr/local/bin/backup-sreda.sh

# Настройка cron для ежедневного backup'а
sudo crontab -e
# Добавить строку:
# 0 2 * * * /usr/local/bin/backup-sreda.sh >> /var/log/sreda-backup.log 2>&1
```

#### Восстановление из backup'а
```bash
# Остановка приложения
sudo systemctl stop sreda-market

# Восстановление БД
gunzip -c /backup/sreda-market/db_backup_YYYYMMDD_HHMMSS.sql.gz | psql -U sreda_user -d sreda_market

# Восстановление файлов
cd /home/sreda
tar -xzf /backup/sreda-market/app_backup_YYYYMMDD_HHMMSS.tar.gz

# Перезапуск приложения
sudo systemctl start sreda-market
```

### Мониторинг базы данных

#### Проверка производительности
```sql
-- Размер базы данных
SELECT pg_size_pretty(pg_database_size('sreda_market'));

-- Самые медленные запросы
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Активные соединения
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Размер таблиц
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Мониторинг и логирование

### Системные логи

#### Настройка логирования приложения
```bash
# Конфигурация rsyslog для приложения
sudo tee /etc/rsyslog.d/50-sreda-market.conf << EOF
# SREDA Market Application Logs
:programname, isequal, "sreda-market" /var/log/sreda-market/application.log
& stop
EOF

sudo mkdir -p /var/log/sreda-market
sudo chown syslog:adm /var/log/sreda-market
sudo systemctl restart rsyslog
```

#### Ротация логов
```bash
sudo tee /etc/logrotate.d/sreda-market << EOF
/var/log/sreda-market/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 syslog adm
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF
```

### Мониторинг производительности

#### Установка htop и iotop
```bash
sudo apt install htop iotop nethogs -y
```

#### Мониторинг ресурсов приложения
```bash
# Создание скрипта мониторинга
sudo tee /usr/local/bin/sreda-monitor.sh << 'EOF'
#!/bin/bash
echo "=== SREDA Market System Monitor ==="
echo "Date: $(date)"
echo ""

echo "=== Application Status ==="
systemctl is-active sreda-market
echo ""

echo "=== Memory Usage ==="
ps aux | grep -E "(node|postgres)" | grep -v grep
echo ""

echo "=== Disk Usage ==="
df -h /
echo ""

echo "=== Database Connections ==="
sudo -u postgres psql -d sreda_market -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"
echo ""

echo "=== Load Average ==="
uptime
echo ""
EOF

sudo chmod +x /usr/local/bin/sreda-monitor.sh
```

### Алерты и уведомления

#### Email уведомления при проблемах
```bash
# Установка mailutils
sudo apt install mailutils -y

# Скрипт проверки здоровья системы
sudo tee /usr/local/bin/sreda-healthcheck.sh << 'EOF'
#!/bin/bash
ADMIN_EMAIL="admin@your-domain.com"
APP_URL="https://your-domain.com"

# Проверка работы приложения
if ! systemctl is-active --quiet sreda-market; then
    echo "СРОЧНО: Приложение SREDA Market остановлено!" | mail -s "SREDA Market DOWN" $ADMIN_EMAIL
fi

# Проверка доступности сайта
if ! curl -f -s $APP_URL > /dev/null; then
    echo "СРОЧНО: Сайт SREDA Market недоступен!" | mail -s "SREDA Market Site DOWN" $ADMIN_EMAIL
fi

# Проверка места на диске
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "ВНИМАНИЕ: Диск заполнен на $DISK_USAGE%" | mail -s "SREDA Market Disk Full" $ADMIN_EMAIL
fi

# Проверка памяти
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "ВНИМАНИЕ: Память заполнена на $MEM_USAGE%" | mail -s "SREDA Market Memory High" $ADMIN_EMAIL
fi
EOF

sudo chmod +x /usr/local/bin/sreda-healthcheck.sh

# Настройка cron для проверки каждые 5 минут
sudo crontab -e
# Добавить строку:
# */5 * * * * /usr/local/bin/sreda-healthcheck.sh
```

## Безопасность

### Настройка файрвола

```bash
# Установка и настройка UFW
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Разрешение необходимых портов
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Ограничение SSH соединений
sudo ufw limit ssh

sudo ufw status
```

### Настройка fail2ban

```bash
# Установка fail2ban
sudo apt install fail2ban -y

# Конфигурация для Nginx
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-noproxy]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Обновления безопасности

```bash
# Автоматические обновления безопасности
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades

# Конфигурация автообновлений
sudo tee /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
```

## Масштабирование

### Горизонтальное масштабирование

#### Load Balancer (Nginx upstream)
```nginx
upstream sreda_backend {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://sreda_backend;
        # ... остальная конфигурация
    }
}
```

#### PM2 для управления процессами
```bash
# Установка PM2
npm install -g pm2

# Конфигурация PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'sreda-market',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/sreda-market/err.log',
    out_file: '/var/log/sreda-market/out.log',
    log_file: '/var/log/sreda-market/combined.log',
    time: true
  }]
};
EOF

# Запуск с PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Репликация базы данных

```bash
# Настройка master-slave репликации PostgreSQL
# На master сервере:
sudo -u postgres psql -c "CREATE USER replicator REPLICATION LOGIN CONNECTION LIMIT 1 ENCRYPTED PASSWORD 'repl_password';"

# В postgresql.conf:
# wal_level = replica
# max_wal_senders = 3
# max_replication_slots = 3

# В pg_hba.conf:
# host replication replicator slave_ip/32 md5
```

## Устранение неполадок

### Частые проблемы

#### Приложение не запускается
```bash
# Проверка логов
sudo journalctl -u sreda-market -f

# Проверка портов
sudo netstat -tlnp | grep :5000

# Проверка конфигурации
cd /home/sreda/sreda-market
npm run check
```

#### Проблемы с базой данных
```bash
# Проверка соединения
psql $DATABASE_URL -c "SELECT version();"

# Проверка активных соединений
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Перезапуск PostgreSQL
sudo systemctl restart postgresql
```

#### Высокая нагрузка
```bash
# Анализ процессов
htop
iotop -o

# Проверка медленных запросов
sudo -u postgres psql -d sreda_market -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### Процедуры экстренного восстановления

#### Быстрое восстановление сервиса
```bash
#!/bin/bash
# Скрипт экстренного восстановления

echo "Запуск процедуры экстренного восстановления..."

# Остановка служб
sudo systemctl stop sreda-market
sudo systemctl stop nginx

# Проверка и восстановление БД
sudo -u postgres pg_isready || sudo systemctl restart postgresql

# Проверка файловой системы
sudo fsck -f /

# Очистка логов
sudo truncate -s 0 /var/log/sreda-market/*.log

# Перезапуск служб
sudo systemctl start nginx
sudo systemctl start sreda-market

# Проверка статуса
sleep 10
curl -f https://your-domain.com || echo "ОШИБКА: Сайт недоступен"

echo "Процедура восстановления завершена"
```

## Обслуживание

### Регулярные задачи

#### Еженедельные задачи
```bash
# Очистка временных файлов
sudo find /tmp -type f -atime +7 -delete

# Анализ БД
sudo -u postgres psql -d sreda_market -c "ANALYZE;"

# Проверка целостности БД
sudo -u postgres psql -d sreda_market -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database;"
```

#### Ежемесячные задачи
```bash
# Полная проверка системы
sudo apt update && sudo apt list --upgradable

# Очистка старых логов
sudo find /var/log -type f -name "*.log" -mtime +30 -delete

# Проверка дискового пространства
df -h
```

### Планы обновления

#### Обновление приложения
```bash
#!/bin/bash
# Скрипт обновления SREDA Market

cd /home/sreda/sreda-market

# Создание backup'а перед обновлением
/usr/local/bin/backup-sreda.sh

# Остановка приложения
sudo systemctl stop sreda-market

# Получение обновлений
git pull origin main

# Установка зависимостей
npm install

# Применение миграций БД
npm run db:push

# Сборка проекта
npm run build

# Запуск приложения
sudo systemctl start sreda-market

# Проверка работоспособности
sleep 15
curl -f https://your-domain.com || echo "ОШИБКА: Обновление неуспешно"

echo "Обновление завершено"
```

---

*Данное руководство обеспечивает надежное развертывание и поддержку платформы SREDA Market в производственной среде.*