import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, type AuthenticatedRequest } from '../middleware/unifiedAuth';

const router = Router();

// Validation schemas
const insightFiltersSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  tags: z.string().optional(),
  search: z.string().optional(),
  page: z.string().default('1'),
  limit: z.string().default('12')
});

// Get insights with filters
router.get('/', async (req: any, res: any) => {
  try {
    const filters = insightFiltersSchema.parse(req.query);
    const page = parseInt(filters.page);
    const limit = parseInt(filters.limit);
    const offset = (page - 1) * limit;

    // Parse filters
    const searchFilters: any = {};
    
    if (filters.date_from) {
      searchFilters.dateFrom = new Date(filters.date_from);
    }
    
    if (filters.date_to) {
      searchFilters.dateTo = new Date(filters.date_to);
    }
    
    if (filters.tags) {
      searchFilters.tags = filters.tags.split(',').map(tag => tag.trim());
    }
    
    if (filters.search) {
      searchFilters.search = filters.search.trim();
    }

    const insights = await storage.getInsights(searchFilters, { page, limit: limit });
    
    res.json({
      success: true,
      data: {
        insights: insights.insights,
        totalPages: Math.ceil(insights.total / limit),
        currentPage: page,
        total: insights.total
      }
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения аналитических заметок'
    });
  }
});

// Get single insight
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const insight = await storage.getInsight(parseInt(id));
    
    if (!insight) {
      return res.status(404).json({
        success: false,
        error: 'Аналитическая заметка не найдена'
      });
    }
    
    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    console.error('Error fetching insight:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения аналитической заметки'
    });
  }
});

// Get available tags
router.get('/tags', async (req: any, res: any) => {
  try {
    const tags = await storage.getInsightTags();
    
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error fetching insight tags:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения тегов'
    });
  }
});

// Admin endpoints for managing insights
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: any) => {
  try {
    if (req.user?.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        error: 'Недостаточно прав доступа'
      });
    }

    const insightData = req.body;
    const insight = await storage.createInsight(insightData);
    
    res.status(201).json({
      success: true,
      data: insight
    });
  } catch (error) {
    console.error('Error creating insight:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания аналитической заметки'
    });
  }
});

router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: any) => {
  try {
    if (req.user?.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        error: 'Недостаточно прав доступа'
      });
    }

    const { id } = req.params;
    const updateData = req.body;
    
    const insight = await storage.updateInsight(parseInt(id), updateData);
    
    if (!insight) {
      return res.status(404).json({
        success: false,
        error: 'Аналитическая заметка не найдена'
      });
    }
    
    res.json({
      success: true,
      data: insight
    });
  } catch (error) {
    console.error('Error updating insight:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления аналитической заметки'
    });
  }
});

router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: any) => {
  try {
    if (req.user?.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        error: 'Недостаточно прав доступа'
      });
    }

    const { id } = req.params;
    
    const success = await storage.deleteInsight(parseInt(id));
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Аналитическая заметка не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Аналитическая заметка удалена'
    });
  } catch (error) {
    console.error('Error deleting insight:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка удаления аналитической заметки'
    });
  }
});

export default router;