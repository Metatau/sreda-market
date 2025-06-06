#!/bin/bash

# Создание векторных тайлов из GeoJSON данных
# Требует установленного Tippecanoe

set -e

# Проверка наличия необходимых инструментов
command -v tippecanoe >/dev/null 2>&1 || { 
    echo "Ошибка: tippecanoe не установлен." >&2
    echo "Установка на Ubuntu/Debian: sudo apt-get install tippecanoe" >&2
    echo "Установка на macOS: brew install tippecanoe" >&2
    exit 1
}

# Проверка наличия исходных данных
if [ ! -f "data/export/properties.geojson" ]; then
    echo "Ошибка: файл properties.geojson не найден. Запустите export-geojson.sh сначала." >&2
    exit 1
fi

echo "Создание векторных тайлов для объектов недвижимости..."

# Создание директории для тайлов
mkdir -p data/tiles

# Создание тайлов для объектов недвижимости
tippecanoe -o data/tiles/properties.mbtiles \
    --name="SREDA Market Properties" \
    --description="Объекты недвижимости SREDA Market" \
    --attribution="© SREDA Market" \
    --maximum-zoom=18 \
    --minimum-zoom=4 \
    --base-zoom=12 \
    --cluster-distance=50 \
    --cluster-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --drop-densest-as-needed \
    --force \
    data/export/properties.geojson

echo "Тайлы объектов созданы: data/tiles/properties.mbtiles"

# Создание конфигурации для веб-сервера
cat > data/tiles/style.json << EOF
{
    "version": 8,
    "name": "SREDA Market",
    "sources": {
        "properties": {
            "type": "vector",
            "url": "mbtiles://properties.mbtiles"
        }
    },
    "layers": [
        {
            "id": "properties-circle",
            "type": "circle",
            "source": "properties",
            "source-layer": "properties",
            "paint": {
                "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    4, 2,
                    12, 6,
                    18, 12
                ],
                "circle-color": [
                    "interpolate",
                    ["linear"],
                    ["get", "price"],
                    0, "#ffffcc",
                    5000000, "#feb24c",
                    10000000, "#fd8d3c", 
                    20000000, "#f03b20",
                    50000000, "#bd0026"
                ],
                "circle-opacity": 0.8,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#ffffff"
            }
        }
    ]
}
EOF

echo "Конфигурация стиля создана: data/tiles/style.json"
echo "Создание векторных тайлов завершено успешно!"