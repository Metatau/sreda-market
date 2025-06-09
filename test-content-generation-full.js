
const fetch = require('node-fetch');
const { generateInsightFromDataSources } = require('./server/services/perplexity.js');

const API_BASE = 'http://localhost:5000/api';
const ADMIN_TOKEN = 'test-admin-token'; // Заглушка для тестирования

// Тестовые данные источников
const TEST_SOURCES = [
  {
    name: "ЦИАН Новости",
    description: "Новости рынка недвижимости с портала ЦИАН",
    type: "website",
    config: {
      websiteUrl: "https://www.cian.ru/news/",
      cssSelectors: [".news-item-title", ".news-item-content", ".news-item-date"]
    },
    tags: ["новости", "ЦИАН", "недвижимость", "рынок"],
    frequency: "daily"
  },
  {
    name: "Telegram Канал РосНедвижимость",
    description: "Аналитические материалы о российском рынке недвижимости",
    type: "telegram_channel",
    config: {
      channelUrl: "https://t.me/rosnedvizhimost",
      channelUsername: "@rosnedvizhimost"
    },
    tags: ["telegram", "аналитика", "недвижимость", "инвестиции"],
    frequency: "hourly"
  },
  {
    name: "RSS Лента Коммерсант Недвижимость",
    description: "RSS лента новостей недвижимости от Коммерсанта",
    type: "rss_feed",
    config: {
      rssUrl: "https://www.kommersant.ru/RSS/section-realty.xml"
    },
    tags: ["RSS", "Коммерсант", "новости", "недвижимость"],
    frequency: "daily"
  }
];

// Функция для создания тестового источника
async function createTestSource(sourceData) {
  try {
    console.log(`📝 Создаем тестовый источник: ${sourceData.name}`);
    
    const response = await fetch(`${API_BASE}/admin/sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({
        ...sourceData,
        isActive: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create source: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Источник "${sourceData.name}" создан с ID: ${result.data.id}`);
    return result.data;
  } catch (error) {
    console.error(`❌ Ошибка создания источника "${sourceData.name}":`, error.message);
    return null;
  }
}

// Функция для получения списка источников
async function getSourcesList() {
  try {
    console.log('📋 Получаем список источников данных...');
    
    const response = await fetch(`${API_BASE}/admin/sources`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sources: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Найдено источников: ${result.data.length}`);
    
    result.data.forEach(source => {
      console.log(`   • ${source.name} (${source.type}) - ${source.isActive ? 'Активен' : 'Неактивен'}`);
    });
    
    return result.data;
  } catch (error) {
    console.error('❌ Ошибка получения списка источников:', error.message);
    return [];
  }
}

// Функция для симуляции сбора данных из источников
async function simulateDataCollection(sources) {
  console.log('🔄 Симулируем сбор данных из источников...');
  
  const collectedData = sources.map(source => {
    // Генерируем тестовые данные в зависимости от типа источника
    let mockData = [];
    
    switch (source.type) {
      case 'website':
        mockData = [
          {
            title: "Цены на недвижимость в Москве выросли на 12% за квартал",
            content: "Аналитики зафиксировали значительный рост цен на жилье в столице...",
            date: new Date().toISOString(),
            source: source.name,
            url: source.config.websiteUrl
          },
          {
            title: "Новые районы для инвестиций: топ-5 перспективных локаций",
            content: "Экспертный обзор самых привлекательных районов для инвестиций...",
            date: new Date().toISOString(),
            source: source.name,
            url: source.config.websiteUrl
          }
        ];
        break;
        
      case 'telegram_channel':
        mockData = [
          {
            title: "📈 Рынок недвижимости: итоги недели",
            content: "Основные тренды и изменения на рынке недвижимости за прошедшую неделю...",
            date: new Date().toISOString(),
            source: source.name,
            channel: source.config.channelUsername
          },
          {
            title: "💰 Инвестиционная стратегия на 2025 год",
            content: "Рекомендации экспертов по инвестированию в недвижимость в новом году...",
            date: new Date().toISOString(),
            source: source.name,
            channel: source.config.channelUsername
          }
        ];
        break;
        
      case 'rss_feed':
        mockData = [
          {
            title: "Ипотечные ставки достигли исторического минимума",
            content: "Банки снижают ставки по ипотеке в ответ на изменения ключевой ставки ЦБ...",
            date: new Date().toISOString(),
            source: source.name,
            rssUrl: source.config.rssUrl
          }
        ];
        break;
    }
    
    console.log(`   📊 Из источника "${source.name}" собрано ${mockData.length} элементов данных`);
    
    return {
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      tags: source.tags,
      data: mockData,
      collectedAt: new Date().toISOString()
    };
  });
  
  return collectedData;
}

// Функция для генерации инсайтов на основе собранных данных
async function generateInsightsFromCollectedData(collectedData) {
  console.log('🤖 Генерируем аналитические инсайты на основе собранных данных...');
  
  try {
    // Подготавливаем данные для отправки в AI сервис
    const sourceDataForAI = collectedData.map(item => ({
      id: item.sourceId,
      name: item.sourceName,
      type: item.sourceType,
      tags: item.tags,
      recentData: item.data.map(d => ({
        title: d.title,
        content: d.content,
        date: d.date
      }))
    }));
    
    // Генерируем инсайт с помощью Perplexity
    const generatedInsight = await generateInsightFromDataSources(sourceDataForAI);
    
    console.log('✅ Инсайт успешно сгенерирован!');
    console.log(`   📄 Заголовок: ${generatedInsight.title}`);
    console.log(`   📝 Размер контента: ${generatedInsight.content.length} символов`);
    console.log(`   🏷️  Теги: ${generatedInsight.tags.join(', ')}`);
    console.log(`   💡 Ключевые выводы: ${generatedInsight.insights.length}`);
    
    return generatedInsight;
  } catch (error) {
    console.error('❌ Ошибка генерации инсайта:', error.message);
    return null;
  }
}

// Функция для создания карточки инсайта в системе
async function createInsightCard(insightData, sourceData) {
  try {
    console.log('💾 Сохраняем сгенерированный инсайт в систему...');
    
    const insightPayload = {
      title: insightData.title,
      content: insightData.content,
      summary: insightData.content.substring(0, 200) + '...',
      tags: insightData.tags,
      insights: insightData.insights,
      sources: sourceData.map(s => s.sourceName),
      isPublished: true,
      publishDate: new Date().toISOString(),
      readTime: Math.ceil(insightData.content.length / 1000) // Примерное время чтения
    };
    
    const response = await fetch(`${API_BASE}/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify(insightPayload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create insight: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Карточка инсайта создана с ID: ${result.data.id}`);
    return result.data;
  } catch (error) {
    console.error('❌ Ошибка создания карточки инсайта:', error.message);
    return null;
  }
}

// Функция для проверки созданных инсайтов
async function verifyCreatedInsights() {
  try {
    console.log('🔍 Проверяем созданные инсайты...');
    
    const response = await fetch(`${API_BASE}/insights?limit=5`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch insights: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Найдено инсайтов: ${result.data.insights.length}`);
    
    result.data.insights.forEach((insight, index) => {
      console.log(`   ${index + 1}. "${insight.title}"`);
      console.log(`      📅 Дата: ${new Date(insight.publishDate).toLocaleDateString('ru-RU')}`);
      console.log(`      🏷️  Теги: ${insight.tags.join(', ')}`);
      console.log(`      📖 Время чтения: ${insight.readTime} мин`);
    });
    
    return result.data.insights;
  } catch (error) {
    console.error('❌ Ошибка проверки инсайтов:', error.message);
    return [];
  }
}

// Основная функция тестирования
async function runContentGenerationTest() {
  console.log('🚀 Запуск комплексного теста системы обновления контента\n');
  
  try {
    // 1. Создаем тестовые источники данных
    console.log('=== ЭТАП 1: Создание тестовых источников ===');
    const createdSources = [];
    
    for (const sourceData of TEST_SOURCES) {
      const source = await createTestSource(sourceData);
      if (source) {
        createdSources.push(source);
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Пауза между запросами
    }
    
    if (createdSources.length === 0) {
      console.log('❌ Не удалось создать ни одного источника. Используем существующие...');
    }
    
    // 2. Получаем список всех источников
    console.log('\n=== ЭТАП 2: Получение списка источников ===');
    const allSources = await getSourcesList();
    
    if (allSources.length === 0) {
      console.log('❌ Источники данных не найдены. Тест прерван.');
      return false;
    }
    
    // 3. Симулируем сбор данных из источников
    console.log('\n=== ЭТАП 3: Сбор данных из источников ===');
    const activeSources = allSources.filter(s => s.isActive).slice(0, 3); // Берем первые 3 активных
    const collectedData = await simulateDataCollection(activeSources);
    
    // 4. Генерируем инсайты на основе собранных данных
    console.log('\n=== ЭТАП 4: Генерация аналитических инсайтов ===');
    const generatedInsight = await generateInsightsFromCollectedData(collectedData);
    
    if (!generatedInsight) {
      console.log('❌ Не удалось сгенерировать инсайт. Тест прерван.');
      return false;
    }
    
    // 5. Создаем карточку инсайта в системе
    console.log('\n=== ЭТАП 5: Создание карточки инсайта ===');
    const createdInsight = await createInsightCard(generatedInsight, collectedData);
    
    if (!createdInsight) {
      console.log('❌ Не удалось создать карточку инсайта.');
      return false;
    }
    
    // 6. Проверяем результат
    console.log('\n=== ЭТАП 6: Проверка результатов ===');
    const insights = await verifyCreatedInsights();
    
    // Финальный отчет
    console.log('\n' + '='.repeat(60));
    console.log('📊 ОТЧЕТ О ТЕСТИРОВАНИИ СИСТЕМЫ ОБНОВЛЕНИЯ КОНТЕНТА');
    console.log('='.repeat(60));
    console.log(`✅ Источников создано: ${createdSources.length}`);
    console.log(`✅ Источников использовано: ${activeSources.length}`);
    console.log(`✅ Элементов данных собрано: ${collectedData.reduce((sum, item) => sum + item.data.length, 0)}`);
    console.log(`✅ Инсайтов сгенерировано: 1`);
    console.log(`✅ Карточек создано: 1`);
    console.log(`✅ Общее количество инсайтов в системе: ${insights.length}`);
    
    console.log('\n🎉 Тест завершен успешно! Система обновления контента работает корректно.');
    return true;
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка в процессе тестирования:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Функция для тестирования автоматического расписания
async function testScheduledUpdates() {
  console.log('\n🕐 Тестирование системы автоматического обновления по расписанию...');
  
  try {
    // Проверяем статус планировщика
    const response = await fetch(`${API_BASE}/admin/scheduler/status`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    if (response.ok) {
      const status = await response.json();
      console.log('✅ Статус планировщика:');
      console.log(`   📅 Ежедневная синхронизация: ${status.data.schedule.dailySync}`);
      console.log(`   🔄 Периодическая валидация: ${status.data.schedule.periodicValidation}`);
      console.log(`   ⚙️  Состояние: ${status.data.isRunning ? 'Запущен' : 'Остановлен'}`);
    } else {
      console.log('⚠️  Не удалось получить статус планировщика');
    }
    
    // Симулируем принудительный запуск синхронизации
    console.log('\n🔄 Запуск принудительной синхронизации...');
    const syncResponse = await fetch(`${API_BASE}/admin/scheduler/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    });
    
    if (syncResponse.ok) {
      const syncResult = await syncResponse.json();
      console.log('✅ Принудительная синхронизация завершена:');
      console.log(`   📥 Импортировано: ${syncResult.data.imported || 0}`);
      console.log(`   🔄 Обновлено: ${syncResult.data.updated || 0}`);
      console.log(`   🗑️  Удалено: ${syncResult.data.removed || 0}`);
    } else {
      console.log('⚠️  Принудительная синхронизация недоступна или завершилась с ошибкой');
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования планировщика:', error.message);
  }
}

// Запуск полного теста
async function main() {
  console.log('🧪 КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ ОБНОВЛЕНИЯ КОНТЕНТА');
  console.log('=' + '='.repeat(58));
  
  const testResult = await runContentGenerationTest();
  
  if (testResult) {
    await testScheduledUpdates();
  }
  
  console.log('\n📋 Тестирование завершено. Проверьте логи выше для анализа результатов.');
}

// Запуск теста
main().catch(console.error);
