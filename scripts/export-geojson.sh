#!/bin/bash

# Экспорт данных о недвижимости из PostgreSQL в GeoJSON формат
# Требует установленного GDAL/OGR

set -e

# Проверка наличия необходимых инструментов
command -v ogr2ogr >/dev/null 2>&1 || { 
    echo "Ошибка: ogr2ogr не установлен. Установите GDAL." >&2
    exit 1
}

# Получение переменных окружения
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Ошибка: DATABASE_URL не задан в переменных окружения" >&2
    exit 1
fi

echo "Экспорт данных о недвижимости в GeoJSON..."

# Создание директории для экспорта
mkdir -p data/export

# Экспорт основных данных о свойствах
ogr2ogr -f GeoJSON data/export/properties.geojson \
    "$DATABASE_URL" \
    -sql "SELECT 
        p.id,
        p.title,
        p.price,
        p.price_per_sqm,
        p.rooms,
        p.total_area,
        p.living_area,
        p.kitchen_area,
        p.floor,
        p.floors_total,
        p.property_type,
        p.market_type,
        p.address,
        p.district,
        p.metro_distance,
        p.is_active,
        r.name as region_name,
        pc.name as property_class,
        ST_X(ST_Transform(ST_GeomFromText('POINT(' || 
            SPLIT_PART(p.coordinates, ',', 2) || ' ' || 
            SPLIT_PART(p.coordinates, ',', 1) || ')', 4326), 4326)) as longitude,
        ST_Y(ST_Transform(ST_GeomFromText('POINT(' || 
            SPLIT_PART(p.coordinates, ',', 2) || ' ' || 
            SPLIT_PART(p.coordinates, ',', 1) || ')', 4326), 4326)) as latitude
    FROM properties p
    LEFT JOIN regions r ON p.region_id = r.id
    LEFT JOIN property_classes pc ON p.property_class_id = pc.id
    WHERE p.coordinates IS NOT NULL 
        AND p.coordinates != ''
        AND p.is_active = true
    ORDER BY p.id"

echo "Экспорт завершен: data/export/properties.geojson"

# Создание метаданных
cat > data/export/metadata.json << EOF
{
    "export_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "version": "1.0",
    "files": {
        "properties": {
            "file": "properties.geojson",
            "description": "Объекты недвижимости с координатами и характеристиками",
            "format": "GeoJSON"
        }
    },
    "coordinate_system": "WGS84 (EPSG:4326)",
    "encoding": "UTF-8"
}
EOF

echo "Метаданные созданы: data/export/metadata.json"
echo "Экспорт данных завершен успешно!"