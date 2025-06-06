# Настройка векторных тайлов для SREDA Market

## Обзор

Векторные тайлы значительно улучшают производительность карты при работе с большими объемами данных о недвижимости. Они обеспечивают быструю загрузку, плавное масштабирование и эффективное кэширование.

## Установка инструментов

### 1. GDAL/OGR (для экспорта из PostgreSQL)

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install gdal-bin
```

#### macOS:
```bash
brew install gdal
```

#### Windows:
Скачайте с https://gdal.org/download.html

### 2. Tippecanoe (для создания тайлов)

#### Ubuntu/Debian:
```bash
sudo apt-get install tippecanoe
```

#### macOS:
```bash
brew install tippecanoe
```

#### Сборка из исходников:
```bash
git clone https://github.com/mapbox/tippecanoe.git
cd tippecanoe
make -j
sudo make install
```

## Создание векторных тайлов

### Шаг 1: Экспорт данных
```bash
./scripts/export-geojson.sh
```

Этот скрипт:
- Извлекает данные о недвижимости из PostgreSQL
- Преобразует координаты в правильный формат
- Создает GeoJSON файл с метаданными

### Шаг 2: Генерация тайлов
```bash
./scripts/create-tiles.sh
```

Этот скрипт:
- Создает векторные тайлы (.mbtiles) из GeoJSON
- Настраивает кластеризацию
- Оптимизирует для разных масштабов

## Обслуживание тайлов

### Вариант 1: tileserver-gl (рекомендуется)

#### Установка:
```bash
npm install -g @mapbox/tileserver-gl
```

#### Запуск:
```bash
tileserver-gl data/tiles/properties.mbtiles --port 8080
```

#### Docker:
```bash
docker run -it -v $(pwd)/data/tiles:/data -p 8080:80 maptiler/tileserver-gl
```

### Вариант 2: martin

#### Установка:
```bash
cargo install martin
```

#### Запуск:
```bash
martin data/tiles/properties.mbtiles --listen-addresses 0.0.0.0:8080
```

### Вариант 3: Интеграция в приложение

API маршруты уже настроены в `server/routes/tiles.routes.ts`:
- `GET /api/tiles` - список доступных тайлов
- `GET /api/tiles/:tileset/metadata` - метаданные тайлов
- `GET /api/tiles/status` - статус системы

## Интеграция с картой

### Автоматическое определение
Карта автоматически определяет наличие векторных тайлов и переключается на их использование.

### Ручная настройка
```javascript
import { vectorTileService } from '@/services/vectorTiles';

// Добавление источника тайлов
vectorTileService.addVectorSource(map, 'properties-tiles');

// Добавление слоев
vectorTileService.addClusterLayer(map, 'properties-tiles');

// Настройка обработчиков событий
vectorTileService.setupEventHandlers(map, (feature) => {
    console.log('Clicked property:', feature.properties);
});
```

## Обновление данных

### Автоматическое обновление
```bash
# Создайте cron задачу для регулярного обновления
0 2 * * * cd /path/to/sreda-market && ./scripts/export-geojson.sh && ./scripts/create-tiles.sh
```

### Ручное обновление
```bash
# Экспорт новых данных
./scripts/export-geojson.sh

# Пересоздание тайлов
./scripts/create-tiles.sh

# Перезапуск сервера тайлов (если используется)
sudo systemctl restart tileserver-gl
```

## Мониторинг

### Проверка статуса
```bash
curl http://localhost:5000/api/tiles/status
```

### Проверка метаданных
```bash
curl http://localhost:5000/api/tiles/properties/metadata
```

### Размер файлов
```bash
ls -lh data/tiles/
```

## Оптимизация

### Для больших датасетов:
```bash
tippecanoe -o properties.mbtiles \
    --maximum-zoom=16 \
    --minimum-zoom=4 \
    --cluster-distance=60 \
    --drop-fraction-as-needed \
    --simplification=10 \
    properties.geojson
```

### Для высокой детализации:
```bash
tippecanoe -o properties.mbtiles \
    --maximum-zoom=20 \
    --minimum-zoom=6 \
    --no-feature-limit \
    --no-tile-size-limit \
    properties.geojson
```

## Устранение неполадок

### Ошибка "ogr2ogr not found"
```bash
# Проверьте установку GDAL
ogr2ogr --version

# Если не установлен, установите:
sudo apt-get install gdal-bin  # Ubuntu
brew install gdal              # macOS
```

### Ошибка "tippecanoe not found"
```bash
# Проверьте установку
tippecanoe --version

# Установите если нужно
sudo apt-get install tippecanoe  # Ubuntu
brew install tippecanoe          # macOS
```

### Пустой GeoJSON файл
- Проверьте подключение к базе данных
- Убедитесь что есть активные объекты с координатами
- Проверьте формат координат в базе данных

### Большой размер тайлов
- Увеличьте `--cluster-distance`
- Добавьте `--drop-fraction-as-needed`
- Уменьшите `--maximum-zoom`

## Производительность

### Ожидаемые результаты:
- **10,000 объектов**: ~1-2 MB тайлов
- **100,000 объектов**: ~5-10 MB тайлов  
- **1,000,000 объектов**: ~20-50 MB тайлов

### Время загрузки:
- **Обычные данные**: 2-5 секунд первая загрузка
- **Векторные тайлы**: <1 секунда после кэширования
- **Масштабирование**: мгновенное с тайлами