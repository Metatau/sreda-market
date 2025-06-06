#!/bin/bash

# Загрузка векторных тайлов в Mapbox Studio
# Требует Mapbox CLI и действующий токен

set -e

# Проверка наличия Mapbox CLI
command -v mapbox >/dev/null 2>&1 || { 
    echo "Ошибка: Mapbox CLI не установлен." >&2
    echo "Установка: npm install -g @mapbox/mapbox-cli" >&2
    exit 1
}

# Проверка переменных окружения
if [ -z "$MAPBOX_ACCESS_TOKEN" ]; then
    echo "Ошибка: MAPBOX_ACCESS_TOKEN не задан в переменных окружения" >&2
    echo "Получите токен на https://account.mapbox.com/access-tokens/" >&2
    exit 1
fi

if [ -z "$MAPBOX_USERNAME" ]; then
    echo "Ошибка: MAPBOX_USERNAME не задан в переменных окружения" >&2
    echo "Укажите ваш username от Mapbox" >&2
    exit 1
fi

# Проверка наличия тайлов
if [ ! -f "data/tiles/properties.mbtiles" ]; then
    echo "Ошибка: файл properties.mbtiles не найден." >&2
    echo "Запустите create-tiles.sh сначала." >&2
    exit 1
fi

echo "Загрузка векторных тайлов в Mapbox Studio..."

# Настройка Mapbox CLI
export MAPBOX_ACCESS_TOKEN=$MAPBOX_ACCESS_TOKEN

# Создание уникального ID для tileset
TILESET_ID="${MAPBOX_USERNAME}.sreda-properties-$(date +%Y%m%d-%H%M%S)"

echo "Создание tileset: $TILESET_ID"

# Загрузка тайлов
mapbox upload "$TILESET_ID" data/tiles/properties.mbtiles

echo "Загрузка завершена!"
echo "Tileset ID: $TILESET_ID"
echo "URL для использования: mapbox://$TILESET_ID"

# Создание конфигурационного файла
cat > data/tiles/mapbox-config.json << EOF
{
    "tileset_id": "$TILESET_ID",
    "url": "mapbox://$TILESET_ID",
    "username": "$MAPBOX_USERNAME",
    "upload_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "source_file": "properties.mbtiles",
    "status": "uploaded"
}
EOF

echo "Конфигурация сохранена: data/tiles/mapbox-config.json"

# Обновление переменных окружения
if [ -f .env ]; then
    # Удаляем старую переменную если есть
    sed -i '/^VITE_MAPBOX_TILESET_ID=/d' .env
    # Добавляем новую
    echo "VITE_MAPBOX_TILESET_ID=$TILESET_ID" >> .env
    echo "Переменная VITE_MAPBOX_TILESET_ID добавлена в .env"
else
    echo "VITE_MAPBOX_TILESET_ID=$TILESET_ID" > .env
    echo "Создан файл .env с переменной VITE_MAPBOX_TILESET_ID"
fi

echo ""
echo "Следующие шаги:"
echo "1. Дождитесь завершения обработки в Mapbox Studio (5-15 минут)"
echo "2. Перезапустите приложение для применения новой переменной"
echo "3. Tileset будет автоматически использован картой"