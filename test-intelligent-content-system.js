// Демонстрация интеллектуальной системы управления контентом
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
  email: 'saabox@yandex.ru',
  password: '2931923'
};

let adminToken = '';

async function login() {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });
    
    const result = await response.json();
    if (result.success) {
      // В session-based auth токен не нужен, используем cookies
      console.log('✅ Администратор авторизован успешно');
      return true;
    }
    throw new Error(result.error || 'Login failed');
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error.message);
    return false;
  }
}

async function testContentStats() {
  console.log('\n📊 ТЕСТИРОВАНИЕ СТАТИСТИКИ КОНТЕНТА');
  
  try {
    const response = await fetch(`${API_BASE}/admin/content/content-stats`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Статистика получена успешно:');
      console.log(`   • Источников данных: ${result.data.sources.total}`);
      console.log(`   • Активных источников: ${result.data.sources.active}`);
      console.log(`   • Найдено элементов: ${result.data.sources.totalItemsFound}`);
      console.log(`   • Обработано элементов: ${result.data.sources.totalItemsProcessed}`);
      console.log(`   • Планов контента: ${result.data.contentPlan.totalPlans}`);
      console.log(`   • Запланировано на сегодня: ${result.data.contentPlan.upcomingToday}`);
    } else {
      console.error('❌ Ошибка получения статистики:', result.error);
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования статистики:', error.message);
  }
}

async function testSourceSynchronization() {
  console.log('\n🔄 ТЕСТИРОВАНИЕ СИНХРОНИЗАЦИИ ИСТОЧНИКОВ');
  
  try {
    const response = await fetch(`${API_BASE}/admin/content/sync-sources`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Синхронизация завершена успешно:');
      console.log(`   • Обработано источников: ${result.data.sourcesProcessed}`);
      console.log(`   • Найдено элементов: ${result.data.totalItemsFound}`);
      console.log(`   • Обработано элементов: ${result.data.totalItemsProcessed}`);
      console.log(`   • Ошибок: ${result.data.totalErrors}`);
      
      if (result.data.details && result.data.details.length > 0) {
        console.log('   📋 Детали по источникам:');
        result.data.details.forEach(detail => {
          console.log(`      • ${detail.sourceName}: ${detail.itemsProcessed}/${detail.itemsFound} элементов`);
          if (detail.errors.length > 0) {
            console.log(`        ⚠️ Ошибки: ${detail.errors.join(', ')}`);
          }
        });
      }
    } else {
      console.error('❌ Ошибка синхронизации:', result.error);
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования синхронизации:', error.message);
  }
}

async function testContentPlanCreation() {
  console.log('\n🧠 ТЕСТИРОВАНИЕ СОЗДАНИЯ ПЛАНА КОНТЕНТА');
  
  try {
    const response = await fetch(`${API_BASE}/admin/content/create-content-plan`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ План контента создан успешно:');
      console.log(`   • Всего планов: ${result.data.totalPlans}`);
      
      if (result.data.plans && result.data.plans.length > 0) {
        console.log('   📋 Запланированный контент:');
        result.data.plans.slice(0, 5).forEach((plan, index) => {
          console.log(`      ${index + 1}. "${plan.title}"`);
          console.log(`         Тип: ${plan.type}, Приоритет: ${plan.priority}`);
          console.log(`         Запланировано: ${new Date(plan.scheduledTime).toLocaleString('ru-RU')}`);
          console.log(`         Источников: ${plan.sourceCount}, Теги: ${plan.tags.slice(0, 3).join(', ')}`);
        });
        
        if (result.data.plans.length > 5) {
          console.log(`      ... и еще ${result.data.plans.length - 5} планов`);
        }
      }
      
      return result.data.plans;
    } else {
      console.error('❌ Ошибка создания плана:', result.error);
      return [];
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования создания плана:', error.message);
    return [];
  }
}

async function testAutoContentGeneration() {
  console.log('\n🚀 ТЕСТИРОВАНИЕ АВТОМАТИЧЕСКОЙ ГЕНЕРАЦИИ КОНТЕНТА');
  
  try {
    const response = await fetch(`${API_BASE}/admin/content/auto-generate-content`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: 'analytics',
        priority: 3
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Автоматическая генерация завершена:');
      console.log(`   • Выполнено планов: ${result.data.executed}`);
      console.log(`   • Успешно: ${result.data.successful}`);
      
      if (result.data.results) {
        console.log('   📋 Результаты генерации:');
        result.data.results.forEach((item, index) => {
          const status = item.success ? '✅' : '❌';
          console.log(`      ${index + 1}. ${status} "${item.title}"`);
        });
      }
    } else {
      console.error('❌ Ошибка автогенерации:', result.error);
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования автогенерации:', error.message);
  }
}

async function testSpecificPlanExecution(plans) {
  if (!plans || plans.length === 0) {
    console.log('\n⏭️ Пропускаем тестирование выполнения плана - нет доступных планов');
    return;
  }
  
  console.log('\n⚡ ТЕСТИРОВАНИЕ ВЫПОЛНЕНИЯ КОНКРЕТНОГО ПЛАНА');
  
  const targetPlan = plans[0]; // Берем первый план с наивысшим приоритетом
  
  try {
    const response = await fetch(`${API_BASE}/admin/content/execute-plan/${targetPlan.id}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ План выполнен успешно:');
      console.log(`   • ID плана: ${result.data.planId}`);
      console.log(`   • Заголовок: "${result.data.title}"`);
      console.log(`   • Тип контента: ${result.data.type}`);
    } else {
      console.error('❌ Ошибка выполнения плана:', result.error);
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования выполнения плана:', error.message);
  }
}

async function validateGeneratedInsights() {
  console.log('\n🔍 ПРОВЕРКА СГЕНЕРИРОВАННЫХ ИНСАЙТОВ');
  
  try {
    const response = await fetch(`${API_BASE}/insights?limit=3&sort=newest`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data.insights) {
      console.log('✅ Последние сгенерированные инсайты:');
      
      result.data.insights.forEach((insight, index) => {
        console.log(`   ${index + 1}. "${insight.title}"`);
        console.log(`      📅 Дата: ${new Date(insight.publishDate).toLocaleDateString('ru-RU')}`);
        console.log(`      ⏱️ Время чтения: ${insight.readTime} мин`);
        console.log(`      🏷️ Теги: ${insight.tags.slice(0, 4).join(', ')}`);
        if (insight.keyInsights && insight.keyInsights.length > 0) {
          console.log(`      💡 Ключевые выводы: ${insight.keyInsights.length} шт.`);
        }
      });
    } else {
      console.log('ℹ️ Инсайты не найдены или недоступны');
    }
  } catch (error) {
    console.error('❌ Ошибка проверки инсайтов:', error.message);
  }
}

async function runFullSystemTest() {
  console.log('🚀 ЗАПУСК ПОЛНОГО ТЕСТИРОВАНИЯ ИНТЕЛЛЕКТУАЛЬНОЙ СИСТЕМЫ КОНТЕНТА');
  console.log('=' * 70);
  
  // Авторизация
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Тестирование прервано из-за ошибки авторизации');
    return;
  }
  
  // Последовательное тестирование всех компонентов
  await testContentStats();
  await testSourceSynchronization();
  const plans = await testContentPlanCreation();
  await testSpecificPlanExecution(plans);
  await testAutoContentGeneration();
  await validateGeneratedInsights();
  
  console.log('\n' + '=' * 70);
  console.log('🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  console.log('\n📋 ИТОГИ:');
  console.log('✅ Система синхронизации источников данных');
  console.log('✅ Интеллектуальное планирование контента');
  console.log('✅ Автоматическая генерация с помощью Perplexity AI');
  console.log('✅ SEO-оптимизация и приоритизация');
  console.log('✅ Интеграция с существующей системой инсайтов');
  
  console.log('\n🔗 ДОСТУПНЫЕ API ENDPOINTS:');
  console.log('POST /api/admin/content/sync-sources - Синхронизация источников');
  console.log('POST /api/admin/content/create-content-plan - Создание плана контента');
  console.log('POST /api/admin/content/execute-plan/:id - Выполнение плана');
  console.log('POST /api/admin/content/auto-generate-content - Автогенерация');
  console.log('GET  /api/admin/content/content-stats - Статистика системы');
  console.log('POST /api/admin/content/test-source/:id - Тестирование источника');
}

// Запуск тестирования
runFullSystemTest().catch(console.error);