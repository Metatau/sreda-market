# Доступные NPM скрипты

## Основные команды

### `npm run dev`
Запуск приложения в режиме разработки
- Запускает backend сервер с hot reload
- Запускает frontend dev server
- Открывает приложение на localhost:5000

### `npm run build`
Сборка приложения для production
- Компилирует TypeScript
- Собирает frontend assets
- Оптимизирует для production

### `npm start`
Запуск production сервера
- Запускает скомпилированное приложение
- Требует предварительной сборки

## База данных

### `npm run db:push`
Применение изменений схемы к базе данных
- Создает новые таблицы
- Обновляет существующие структуры
- Безопасно применяет миграции

### `npm run db:studio`
Открытие Drizzle Studio для управления базой данных
- Веб-интерфейс для просмотра данных
- Возможность редактирования записей
- Визуализация схемы базы данных

## Дополнительные скрипты

### Векторные тайлы
```bash
# Экспорт данных в GeoJSON
./scripts/export-geojson.sh

# Создание векторных тайлов
./scripts/create-tiles.sh

# Загрузка в Mapbox Studio
./scripts/upload-to-mapbox.sh
```

### Утилиты разработки
```bash
# Проверка типов TypeScript
npx tsc --noEmit

# Линтинг кода
npx eslint . --ext .ts,.tsx

# Форматирование кода
npx prettier --write .
```

### Мониторинг
```bash
# Проверка статуса приложения
curl http://localhost:5000/api/tiles/status

# Проверка здоровья системы
curl http://localhost:5000/health
```