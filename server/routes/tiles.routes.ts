import { Router } from 'express';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

/**
 * Обслуживание векторных тайлов
 * GET /api/tiles/:tileset/:z/:x/:y.pbf
 */
router.get('/tiles/:tileset/:z/:x/:y.pbf', async (req: Request, res: Response) => {
  try {
    const { tileset, z, x, y } = req.params;
    const tilesDir = path.join(process.cwd(), 'data', 'tiles');
    const tilesetPath = path.join(tilesDir, `${tileset}.mbtiles`);

    // Проверка существования tileset
    if (!fs.existsSync(tilesetPath)) {
      return res.status(404).json({
        success: false,
        error: 'Tileset not found'
      });
    }

    // Здесь должна быть логика извлечения тайла из .mbtiles файла
    // Для production рекомендуется использовать специализированные сервера тайлов
    // как tileserver-gl, martin или tegola
    
    res.status(501).json({
      success: false,
      error: 'Tile serving not implemented. Use tileserver-gl for production.'
    });

  } catch (error) {
    console.error('Tile serving error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Получение метаданных tileset
 * GET /api/tiles/:tileset/metadata
 */
router.get('/tiles/:tileset/metadata', async (req: Request, res: Response) => {
  try {
    const { tileset } = req.params;
    const tilesDir = path.join(process.cwd(), 'data', 'tiles');
    const tilesetPath = path.join(tilesDir, `${tileset}.mbtiles`);

    if (!fs.existsSync(tilesetPath)) {
      return res.status(404).json({
        success: false,
        error: 'Tileset not found'
      });
    }

    // Базовые метаданные
    const stats = fs.statSync(tilesetPath);
    
    res.json({
      success: true,
      data: {
        name: tileset,
        format: 'pbf',
        bounds: [-180, -85.0511, 180, 85.0511], // World bounds
        center: [37.6176, 55.7558, 10], // Moscow center
        minzoom: 4,
        maxzoom: 18,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      }
    });

  } catch (error) {
    console.error('Metadata error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Список доступных tileset'ов
 * GET /api/tiles
 */
router.get('/tiles', async (req: Request, res: Response) => {
  try {
    const tilesDir = path.join(process.cwd(), 'data', 'tiles');
    
    if (!fs.existsSync(tilesDir)) {
      return res.json({
        success: true,
        data: []
      });
    }

    const files = fs.readdirSync(tilesDir);
    const tilesets = files
      .filter(file => file.endsWith('.mbtiles'))
      .map(file => {
        const name = path.basename(file, '.mbtiles');
        const stats = fs.statSync(path.join(tilesDir, file));
        
        return {
          name,
          file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      });

    res.json({
      success: true,
      data: tilesets
    });

  } catch (error) {
    console.error('Tiles list error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Статус системы тайлов
 * GET /api/tiles/status
 */
router.get('/tiles/status', async (req: Request, res: Response) => {
  try {
    const tilesDir = path.join(process.cwd(), 'data', 'tiles');
    const exportDir = path.join(process.cwd(), 'data', 'export');
    
    const status = {
      tiles_directory_exists: fs.existsSync(tilesDir),
      export_directory_exists: fs.existsSync(exportDir),
      available_tilesets: [] as string[],
      available_exports: [] as string[],
      tools: {
        ogr2ogr: false,
        tippecanoe: false
      }
    };

    // Проверка доступных tilesets
    if (status.tiles_directory_exists) {
      const files = fs.readdirSync(tilesDir);
      status.available_tilesets = files.filter(file => file.endsWith('.mbtiles'));
    }

    // Проверка доступных экспортов
    if (status.export_directory_exists) {
      const files = fs.readdirSync(exportDir);
      status.available_exports = files.filter(file => file.endsWith('.geojson'));
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export { router as tilesRoutes };