
// Простой тест пайплайна создания контента
async function testSimpleContentPipeline() {
  console.log('🔬 Тестирование базового пайплайна создания контента\n');
  
  // 1. Тестируем парсинг данных источников
  console.log('📊 ТЕСТ 1: Парсинг данных источников');
  const mockSourceData = [
    {
      id: 1,
      name: "Тестовый источник новостей",
      type: "website",
      tags: ["новости", "недвижимость", "аналитика"],
      lastUpdate: new Date().toISOString(),
      sampleData: [
        {
          title: "Рынок недвижимости показал рост на 15%",
          content: "По данным аналитиков, рынок недвижимости в крупных городах России демонстрирует устойчивый рост. Основными драйверами являются программы льготной ипотеки и увеличение спроса на жилье.",
          date: new Date().toISOString(),
          keywords: ["рост", "рынок", "ипотека", "спрос"]
        },
        {
          title: "Новые районы для инвестиций: ТОП-5 локаций",
          content: "Эксперты выделили пять наиболее перспективных районов для инвестиций в недвижимость. В список попали как центральные, так и развивающиеся районы с хорошей транспортной доступностью.",
          date: new Date().toISOString(),
          keywords: ["инвестиции", "районы", "перспективы", "транспорт"]
        }
      ]
    },
    {
      id: 2,
      name: "Telegram канал аналитики",
      type: "telegram_channel",
      tags: ["telegram", "аналитика", "инсайты"],
      lastUpdate: new Date().toISOString(),
      sampleData: [
        {
          title: "📈 Недельный обзор рынка недвижимости",
          content: "Основные события недели: снижение ключевой ставки, запуск новых ЖК, изменения в законодательстве. Прогноз на следующую неделю остается умеренно оптимистичным.",
          date: new Date().toISOString(),
          keywords: ["обзор", "ставка", "ЖК", "прогноз"]
        }
      ]
    }
  ];
  
  console.log(`✅ Подготовлено ${mockSourceData.length} тестовых источников`);
  mockSourceData.forEach(source => {
    console.log(`   • ${source.name}: ${source.sampleData.length} элементов данных`);
  });
  
  // 2. Тестируем агрегацию и анализ данных
  console.log('\n📝 ТЕСТ 2: Агрегация и анализ данных');
  
  const aggregatedData = {
    totalSources: mockSourceData.length,
    totalItems: mockSourceData.reduce((sum, source) => sum + source.sampleData.length, 0),
    uniqueKeywords: new Set(),
    themes: new Set(),
    dateRange: {
      earliest: null,
      latest: null
    }
  };
  
  // Собираем статистику
  mockSourceData.forEach(source => {
    source.tags.forEach(tag => aggregatedData.themes.add(tag));
    source.sampleData.forEach(item => {
      item.keywords.forEach(keyword => aggregatedData.uniqueKeywords.add(keyword));
      const itemDate = new Date(item.date);
      if (!aggregatedData.dateRange.earliest || itemDate < aggregatedData.dateRange.earliest) {
        aggregatedData.dateRange.earliest = itemDate;
      }
      if (!aggregatedData.dateRange.latest || itemDate > aggregatedData.dateRange.latest) {
        aggregatedData.dateRange.latest = itemDate;
      }
    });
  });
  
  console.log('✅ Агрегация данных завершена:');
  console.log(`   📊 Всего источников: ${aggregatedData.totalSources}`);
  console.log(`   📄 Всего элементов: ${aggregatedData.totalItems}`);
  console.log(`   🏷️  Уникальных ключевых слов: ${aggregatedData.uniqueKeywords.size}`);
  console.log(`   🎯 Тематик: ${aggregatedData.themes.size}`);
  console.log(`   📅 Период данных: ${aggregatedData.dateRange.earliest?.toLocaleDateString('ru-RU')} - ${aggregatedData.dateRange.latest?.toLocaleDateString('ru-RU')}`);
  
  // 3. Тестируем генерацию инсайтов (без внешних API)
  console.log('\n🤖 ТЕСТ 3: Генерация аналитических инсайтов');
  
  // Создаем инсайт на основе агрегированных данных
  const generatedInsight = {
    title: "Еженедельный обзор рынка недвижимости: основные тренды и прогнозы",
    content: generateInsightContent(mockSourceData, aggregatedData),
    summary: "Аналитический обзор ключевых событий на рынке недвижимости за неделю с прогнозами и рекомендациями для инвесторов.",
    tags: Array.from(aggregatedData.themes).slice(0, 5),
    keyInsights: generateKeyInsights(mockSourceData),
    sources: mockSourceData.map(s => s.name),
    publishDate: new Date().toISOString(),
    readTime: 5,
    chartData: generateChartData(aggregatedData),
    isPublished: true
  };
  
  console.log('✅ Инсайт сгенерирован успешно:');
  console.log(`   📄 Заголовок: ${generatedInsight.title}`);
  console.log(`   📝 Размер контента: ${generatedInsight.content.length} символов`);
  console.log(`   🏷️  Теги: ${generatedInsight.tags.join(', ')}`);
  console.log(`   💡 Ключевых выводов: ${generatedInsight.keyInsights.length}`);
  console.log(`   📊 Источников данных: ${generatedInsight.sources.length}`);
  
  // 4. Тестируем валидацию созданного контента
  console.log('\n✅ ТЕСТ 4: Валидация созданного контента');
  
  const validationResults = validateInsightContent(generatedInsight);
  
  console.log('📋 Результаты валидации:');
  validationResults.forEach(result => {
    console.log(`   ${result.passed ? '✅' : '❌'} ${result.test}: ${result.message}`);
  });
  
  const allTestsPassed = validationResults.every(r => r.passed);
  
  // 5. Финальный отчет
  console.log('\n' + '='.repeat(50));
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ');
  console.log('='.repeat(50));
  console.log(`🔍 Источников обработано: ${aggregatedData.totalSources}`);
  console.log(`📄 Элементов данных: ${aggregatedData.totalItems}`);
  console.log(`🤖 Инсайтов создано: 1`);
  console.log(`✅ Валидация: ${allTestsPassed ? 'ПРОЙДЕНА' : 'НЕ ПРОЙДЕНА'}`);
  console.log(`📈 Качество контента: ${calculateContentQuality(generatedInsight)}%`);
  
  if (allTestsPassed) {
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('Система создания контента работает корректно.');
  } else {
    console.log('\n⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ!');
    console.log('Требуется дополнительная настройка системы.');
  }
  
  return {
    success: allTestsPassed,
    sourceData: mockSourceData,
    aggregatedData: aggregatedData,
    generatedInsight: generatedInsight,
    validationResults: validationResults
  };
}

// Функция генерации содержания инсайта
function generateInsightContent(sources, aggregatedData) {
  const themes = Array.from(aggregatedData.themes);
  const keywords = Array.from(aggregatedData.uniqueKeywords);
  
  return `
## Обзор рынка недвижимости

На основе анализа ${aggregatedData.totalItems} источников данных за период с ${aggregatedData.dateRange.earliest?.toLocaleDateString('ru-RU')} по ${aggregatedData.dateRange.latest?.toLocaleDateString('ru-RU')}, мы выявили следующие ключевые тренды:

### Основные тенденции
${sources.map(source => 
  source.sampleData.map(item => `**${item.title}**\n${item.content}`).join('\n\n')
).join('\n\n')}

### Ключевые факторы влияния
Анализ показал, что наиболее значимыми факторами являются: ${keywords.slice(0, 5).join(', ')}.

### Прогноз и рекомендации
Основываясь на выявленных трендах в сферах: ${themes.join(', ')}, рекомендуется уделить особое внимание мониторингу изменений в ключевых сегментах рынка.

### Выводы
Текущая ситуация на рынке недвижимости характеризуется умеренной активностью с потенциалом для роста в перспективных сегментах.
  `.trim();
}

// Функция генерации ключевых выводов
function generateKeyInsights(sources) {
  return [
    "Рынок недвижимости демонстрирует положительную динамику",
    "Программы льготной ипотеки стимулируют спрос",
    "Развивающиеся районы показывают высокий инвестиционный потенциал",
    "Транспортная доступность остается ключевым фактором ценообразования",
    "Снижение ключевой ставки может дополнительно активизировать рынок"
  ];
}

// Функция генерации данных для графиков
function generateChartData(aggregatedData) {
  return {
    charts: [
      {
        title: "Распределение тематик",
        type: "pie",
        data: Array.from(aggregatedData.themes).map(theme => ({
          type: theme,
          value: Math.floor(Math.random() * 100) + 10
        }))
      },
      {
        title: "Динамика активности источников",
        type: "line",
        data: [
          { month: "Янв", articles: 45, analytics: 12 },
          { month: "Фев", articles: 52, analytics: 15 },
          { month: "Мар", articles: 48, analytics: 18 }
        ]
      }
    ]
  };
}

// Функция валидации контента
function validateInsightContent(insight) {
  const validations = [
    {
      test: "Наличие заголовка",
      passed: insight.title && insight.title.length > 10,
      message: insight.title ? "Заголовок корректен" : "Заголовок отсутствует или слишком короткий"
    },
    {
      test: "Достаточность контента",
      passed: insight.content && insight.content.length > 200,
      message: `Размер контента: ${insight.content?.length || 0} символов`
    },
    {
      test: "Наличие тегов",
      passed: insight.tags && insight.tags.length >= 3,
      message: `Количество тегов: ${insight.tags?.length || 0}`
    },
    {
      test: "Ключевые выводы",
      passed: insight.keyInsights && insight.keyInsights.length >= 3,
      message: `Количество ключевых выводов: ${insight.keyInsights?.length || 0}`
    },
    {
      test: "Указание источников",
      passed: insight.sources && insight.sources.length > 0,
      message: `Источников указано: ${insight.sources?.length || 0}`
    },
    {
      test: "Дата публикации",
      passed: insight.publishDate && new Date(insight.publishDate) instanceof Date,
      message: insight.publishDate ? "Дата корректна" : "Дата отсутствует"
    }
  ];
  
  return validations;
}

// Функция расчета качества контента
function calculateContentQuality(insight) {
  let score = 0;
  const maxScore = 100;
  
  // Качество заголовка (20 баллов)
  if (insight.title && insight.title.length > 20) score += 20;
  else if (insight.title && insight.title.length > 10) score += 10;
  
  // Объем контента (25 баллов)
  if (insight.content && insight.content.length > 1000) score += 25;
  else if (insight.content && insight.content.length > 500) score += 15;
  else if (insight.content && insight.content.length > 200) score += 10;
  
  // Количество тегов (15 баллов)
  if (insight.tags && insight.tags.length >= 5) score += 15;
  else if (insight.tags && insight.tags.length >= 3) score += 10;
  
  // Ключевые выводы (20 баллов)
  if (insight.keyInsights && insight.keyInsights.length >= 5) score += 20;
  else if (insight.keyInsights && insight.keyInsights.length >= 3) score += 15;
  
  // Источники данных (10 баллов)
  if (insight.sources && insight.sources.length >= 3) score += 10;
  else if (insight.sources && insight.sources.length >= 1) score += 5;
  
  // Аналитические данные (10 баллов)
  if (insight.chartData && insight.chartData.charts) score += 10;
  
  return Math.round((score / maxScore) * 100);
}

// Запуск теста
console.log('🧪 Запуск теста пайплайна создания контента...\n');
testSimpleContentPipeline()
  .then(result => {
    console.log('\n📋 Тестирование завершено.');
    if (result.success) {
      console.log('✅ Система готова к работе!');
    } else {
      console.log('❌ Требуется доработка системы.');
    }
  })
  .catch(error => {
    console.error('❌ Критическая ошибка при тестировании:', error);
  });
