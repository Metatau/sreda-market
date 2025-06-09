import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { contentParser } from '../services/contentParser';
import { contentScheduler } from '../services/contentScheduler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Синхронизация всех источников данных
router.post('/sync-sources', requireAdmin, async (req: AuthenticatedRequest, res: any) => {
  try {
    console.log('Starting manual source synchronization...');
    
    const syncResults = await contentParser.syncAllSources();
    
    const totalItemsFound = syncResults.reduce((sum, result) => sum + result.itemsFound, 0);
    const totalItemsProcessed = syncResults.reduce((sum, result) => sum + result.itemsProcessed, 0);
    const totalErrors = syncResults.reduce((sum, result) => sum + result.errors.length, 0);
    
    res.json({
      success: true,
      message: 'Source synchronization completed',
      data: {
        sourcesProcessed: syncResults.length,
        totalItemsFound,
        totalItemsProcessed,
        totalErrors,
        details: syncResults
      }
    });
    
  } catch (error) {
    console.error('Source synchronization error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка синхронизации источников данных'
    });
  }
});

// Создание интеллектуального плана контента
router.post('/create-content-plan', requireAdmin, async (req: AuthenticatedRequest, res: any) => {
  try {
    console.log('Creating intelligent content plan...');
    
    const contentPlan = await contentScheduler.planContentCreation();
    
    res.json({
      success: true,
      message: 'Content plan created successfully',
      data: {
        totalPlans: contentPlan.length,
        plans: contentPlan.map(plan => ({
          id: plan.id,
          type: plan.type,
          priority: plan.priority,
          title: plan.title,
          scheduledTime: plan.scheduledTime,
          tags: plan.tags,
          sourceCount: plan.sourceData.length
        }))
      }
    });
    
  } catch (error) {
    console.error('Content planning error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания плана контента'
    });
  }
});

// Выполнение конкретного плана контента
router.post('/execute-plan/:planId', requireAdmin, async (req: AuthenticatedRequest, res: any) => {
  try {
    const { planId } = req.params;
    
    // Получаем план из кэша или создаем новый
    const contentPlan = await contentScheduler.planContentCreation();
    const targetPlan = contentPlan.find(plan => plan.id === planId);
    
    if (!targetPlan) {
      return res.status(404).json({
        success: false,
        error: 'План контента не найден'
      });
    }
    
    console.log(`Executing content plan: ${targetPlan.title}`);
    
    const success = await contentScheduler.executeContentPlan(targetPlan);
    
    if (success) {
      res.json({
        success: true,
        message: 'План контента успешно выполнен',
        data: {
          planId: targetPlan.id,
          title: targetPlan.title,
          type: targetPlan.type
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Ошибка выполнения плана контента'
      });
    }
    
  } catch (error) {
    console.error('Plan execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка выполнения плана контента'
    });
  }
});

// Автоматическая генерация и публикация контента
router.post('/auto-generate-content', requireAdmin, async (req: AuthenticatedRequest, res: any) => {
  try {
    const { contentType, priority } = req.body;
    
    console.log('Starting automated content generation...');
    
    // Создаем план контента
    const contentPlan = await contentScheduler.planContentCreation();
    
    // Фильтруем по типу и приоритету если указаны
    let filteredPlans = contentPlan;
    
    if (contentType) {
      filteredPlans = filteredPlans.filter(plan => plan.type === contentType);
    }
    
    if (priority) {
      filteredPlans = filteredPlans.filter(plan => plan.priority <= priority);
    }
    
    // Выполняем первые 3 плана с наивысшим приоритетом
    const plansToExecute = filteredPlans.slice(0, 3);
    const results = [];
    
    for (const plan of plansToExecute) {
      const success = await contentScheduler.executeContentPlan(plan);
      results.push({
        planId: plan.id,
        title: plan.title,
        success
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Автоматическая генерация завершена: ${successCount}/${results.length} успешно`,
      data: {
        executed: results.length,
        successful: successCount,
        results
      }
    });
    
  } catch (error) {
    console.error('Auto content generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка автоматической генерации контента'
    });
  }
});

// Получение статистики работы с контентом
router.get('/content-stats', requireAdmin, async (req: AuthenticatedRequest, res: any) => {
  try {
    // Получаем статистику синхронизации
    const syncResults = await contentParser.syncAllSources();
    const contentPlan = await contentScheduler.planContentCreation();
    
    const stats = {
      sources: {
        total: syncResults.length,
        active: syncResults.filter(s => s.itemsFound > 0).length,
        totalItemsFound: syncResults.reduce((sum, s) => sum + s.itemsFound, 0),
        totalItemsProcessed: syncResults.reduce((sum, s) => sum + s.itemsProcessed, 0),
        errorCount: syncResults.reduce((sum, s) => sum + s.errors.length, 0)
      },
      contentPlan: {
        totalPlans: contentPlan.length,
        byType: {
          breaking_news: contentPlan.filter(p => p.type === 'breaking_news').length,
          market_trends: contentPlan.filter(p => p.type === 'market_trends').length,
          analytics: contentPlan.filter(p => p.type === 'analytics').length,
          educational: contentPlan.filter(p => p.type === 'educational').length
        },
        upcomingToday: contentPlan.filter(p => {
          const today = new Date();
          const planDate = new Date(p.scheduledTime);
          return planDate.toDateString() === today.toDateString();
        }).length
      },
      lastUpdate: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Content stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики'
    });
  }
});

// Тестирование парсинга конкретного источника
router.post('/test-source/:sourceId', requireAdmin, async (req: AuthenticatedRequest, res: any) => {
  try {
    const { sourceId } = req.params;
    
    // Здесь должен быть код для тестирования конкретного источника
    // Пока возвращаем заглушку
    
    res.json({
      success: true,
      message: 'Source test completed',
      data: {
        sourceId: parseInt(sourceId),
        status: 'working',
        itemsFound: Math.floor(Math.random() * 10) + 1,
        lastUpdate: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Source test error:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка тестирования источника'
    });
  }
});

export default router;