import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireSessionAdmin, type SessionAuthenticatedRequest } from '../middleware/sessionAuth';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();

// Multer configuration for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.xlsx', '.csv', '.txt', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'));
    }
  }
});

// Validation schemas
const sourceConfigSchema = z.object({
  channelUrl: z.string().optional(),
  channelUsername: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  cssSelectors: z.array(z.string()).optional(),
  rssUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  fileType: z.string().optional(),
  fileSize: z.number().optional(),
  uploadedAt: z.date().optional(),
  keywords: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional()
});

const createSourceSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  type: z.enum(['telegram_channel', 'website', 'rss_feed', 'uploaded_file', 'spreadsheet', 'pdf_document']),
  config: sourceConfigSchema,
  tags: z.array(z.string()).default([]),
  frequency: z.enum(['hourly', 'daily', 'weekly']).default('daily')
});

// Get all data sources
router.get('/', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res: any) => {
  try {
    const { type, isActive, tags } = req.query;
    
    const filters: any = {};
    if (type) filters.type = type as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (tags) filters.tags = (tags as string).split(',');

    const sources = await storage.getDataSources(filters);
    
    res.json({
      success: true,
      data: sources
    });
  } catch (error) {
    console.error('Error fetching data sources:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения источников данных'
    });
  }
});

// Get single data source
router.get('/:id', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res: any) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    
    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID источника'
      });
    }
    
    const source = await storage.getDataSource(numId);
    
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Источник данных не найден'
      });
    }
    
    res.json({
      success: true,
      data: source
    });
  } catch (error) {
    console.error('Error fetching data source:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения источника данных'
    });
  }
});

// Create new data source
router.post('/', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res: any) => {
  try {
    console.log('Creating data source - request body:', JSON.stringify(req.body, null, 2));
    
    const validatedData = createSourceSchema.parse(req.body);
    console.log('Validated data:', JSON.stringify(validatedData, null, 2));
    
    const source = await storage.createDataSource({
      ...validatedData,
      isActive: true,
      lastUpdated: null
    });
    
    console.log('Created source:', JSON.stringify(source, null, 2));
    
    res.status(201).json({
      success: true,
      data: source
    });
  } catch (error) {
    console.error('Error creating data source:', error);
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Ошибка создания источника данных'
    });
  }
});

// Update data source
router.put('/:id', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res: any) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    
    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID источника'
      });
    }
    
    const validatedData = createSourceSchema.partial().parse(req.body);
    
    const source = await storage.updateDataSource(numId, validatedData);
    
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Источник данных не найден'
      });
    }
    
    res.json({
      success: true,
      data: source
    });
  } catch (error) {
    console.error('Error updating data source:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: error.errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления источника данных'
    });
  }
});

// Delete data source
router.delete('/:id', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res: any) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    
    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID источника'
      });
    }
    
    const success = await storage.deleteDataSource(numId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Источник данных не найден'
      });
    }
    
    res.json({
      success: true,
      message: 'Источник данных удален'
    });
  } catch (error) {
    console.error('Error deleting data source:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка удаления источника данных'
    });
  }
});

// Toggle data source status
router.post('/:id/toggle', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res: any) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    
    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID источника'
      });
    }
    
    const success = await storage.toggleDataSourceStatus(numId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Источник данных не найден'
      });
    }
    
    res.json({
      success: true,
      message: 'Статус источника изменен'
    });
  } catch (error) {
    console.error('Error toggling data source status:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка изменения статуса источника'
    });
  }
});

// Upload file for data source
router.post('/upload', requireSessionAdmin, upload.single('file'), async (req: SessionAuthenticatedRequest, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Файл не был загружен'
      });
    }

    const fileInfo = {
      originalName: req.file.originalname,
      fileName: req.file.filename,
      fileType: path.extname(req.file.originalname),
      fileSize: req.file.size,
      uploadedAt: new Date()
    };

    res.json({
      success: true,
      data: fileInfo
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки файла'
    });
  }
});

// Validate source URL/channel
router.post('/validate', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res: any) => {
  try {
    const { type, config } = req.body;
    
    let isValid = false;
    let message = '';
    
    switch (type) {
      case 'website':
        if (config.websiteUrl) {
          try {
            const url = new URL(config.websiteUrl);
            isValid = true;
            message = 'URL действителен';
          } catch {
            message = 'Некорректный URL';
          }
        }
        break;
        
      case 'rss_feed':
        if (config.rssUrl) {
          try {
            const url = new URL(config.rssUrl);
            isValid = true;
            message = 'RSS URL действителен';
          } catch {
            message = 'Некорректный RSS URL';
          }
        }
        break;
        
      case 'telegram_channel':
        if (config.channelUrl || config.channelUsername) {
          isValid = true;
          message = 'Telegram канал указан';
        } else {
          message = 'Укажите URL или username канала';
        }
        break;
        
      default:
        message = 'Неподдерживаемый тип источника';
    }
    
    res.json({
      success: true,
      data: {
        isValid,
        message
      }
    });
  } catch (error) {
    console.error('Error validating source:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка валидации источника'
    });
  }
});

// Get source data preview
router.get('/:id/preview', requireSessionAdmin, async (req: SessionAuthenticatedRequest, res: any) => {
  try {
    const { id } = req.params;
    const numId = parseInt(id, 10);
    
    if (isNaN(numId)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный ID источника'
      });
    }
    
    const source = await storage.getDataSource(numId);
    
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Источник данных не найден'
      });
    }
    
    // Mock preview data for demonstration
    const previewData = {
      type: source.type,
      lastUpdate: source.lastUpdated,
      itemsCount: Math.floor(Math.random() * 100) + 10,
      sampleItems: [
        { title: 'Пример данных 1', date: new Date().toISOString() },
        { title: 'Пример данных 2', date: new Date().toISOString() },
        { title: 'Пример данных 3', date: new Date().toISOString() }
      ]
    };
    
    res.json({
      success: true,
      data: previewData
    });
  } catch (error) {
    console.error('Error getting source preview:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения предпросмотра данных'
    });
  }
});

export default router;