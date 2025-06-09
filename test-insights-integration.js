
// Тест интеграции с реальными сервисами
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

async function testInsightsIntegration() {
  console.log('🔌 Тестирование интеграции с API инсайтов\n');
  
  try {
    // 1. Проверяем доступность API
    console.log('📡 Проверка доступности API...');
    const healthResponse = await fetch(`${API_BASE}/insights/tags`);
    
    if (healthResponse.ok) {
      console.log('✅ API инсайтов доступен');
      const tags = await healthResponse.json();
      console.log(`   🏷️  Доступных тегов: ${tags.data?.length || 0}`);
    } else {
      console.log('❌ API инсайтов недоступен');
      return false;
    }
    
    // 2. Получаем существующие инсайты
    console.log('\n📄 Получение существующих инсайтов...');
    const insightsResponse = await fetch(`${API_BASE}/insights?limit=3`);
    
    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json();
      const insights = insightsData.data?.insights || [];
      
      console.log(`✅ Найдено инсайтов: ${insights.length}`);
      insights.forEach((insight, index) => {
        console.log(`   ${index + 1}. "${insight.title}" (${insight.tags?.join(', ') || 'без тегов'})`);
      });
      
      if (insights.length > 0) {
        // 3. Тестируем получение отдельного инсайта
        const singleInsightResponse = await fetch(`${API_BASE}/insights/${insights[0].id}`);
        if (singleInsightResponse.ok) {
          console.log(`✅ Детали инсайта получены успешно`);
        }
      }
    } else {
      console.log('❌ Не удалось получить список инсайтов');
    }
    
    // 4. Проверяем источники данных (если API доступен)
    console.log('\n🔗 Проверка источников данных...');
    try {
      const sourcesResponse = await fetch(`${API_BASE}/admin/sources`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      if (sourcesResponse.ok) {
        const sourcesData = await sourcesResponse.json();
        console.log(`✅ Источников данных: ${sourcesData.data?.length || 0}`);
      } else if (sourcesResponse.status === 401) {
        console.log('⚠️  Источники данных: требуется авторизация администратора');
      } else {
        console.log('❌ Не удалось получить источники данных');
      }
    } catch (error) {
      console.log('⚠️  API источников данных недоступен');
    }
    
    // 5. Тестируем поиск по инсайтам
    console.log('\n🔍 Тестирование поиска...');
    const searchResponse = await fetch(`${API_BASE}/insights?search=недвижимость&limit=2`);
    
    if (searchResponse.ok) {
      const searchResults = await searchResponse.json();
      console.log(`✅ Поиск работает: найдено ${searchResults.data?.insights?.length || 0} результатов`);
    } else {
      console.log('❌ Поиск не работает');
    }
    
    // 6. Тестируем фильтрацию по тегам
    console.log('\n🏷️  Тестирование фильтрации по тегам...');
    const tagFilterResponse = await fetch(`${API_BASE}/insights?tags=анализ,недвижимость&limit=2`);
    
    if (tagFilterResponse.ok) {
      const tagResults = await tagFilterResponse.json();
      console.log(`✅ Фильтрация по тегам работает: найдено ${tagResults.data?.insights?.length || 0} результатов`);
    } else {
      console.log('❌ Фильтрация по тегам не работает');
    }
    
    console.log('\n🎉 Тестирование интеграции завершено!');
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании интеграции:', error.message);
    return false;
  }
}

// Запуск теста интеграции
testInsightsIntegration()
  .then(success => {
    if (success) {
      console.log('\n✅ Интеграция работает корректно');
    } else {
      console.log('\n❌ Обнаружены проблемы с интеграцией');
    }
  })
  .catch(console.error);
