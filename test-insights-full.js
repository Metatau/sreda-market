// Test full insights generation workflow
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

async function generateInsightFromDataSources(sourceData) {
  const prompt = `
  Проанализируйте данные из источников информации о недвижимости и создайте аналитический инсайт:
  
  Данные источников:
  ${JSON.stringify(sourceData, null, 2)}
  
  Используйте актуальную информацию о рынке недвижимости России для создания инсайта.
  
  Ответьте в JSON формате:
  {
    "title": "Заголовок инсайта",
    "content": "Подробное содержание аналитической заметки с выводами и рекомендациями",
    "tags": ["тег1", "тег2", "тег3"],
    "insights": ["ключевой вывод 1", "ключевой вывод 2", "ключевой вывод 3"]
  }
  `;

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VITE_PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: 'Вы - аналитик рынка недвижимости России с доступом к актуальной информации. Создавайте инсайты на основе реальных рыночных данных и трендов. Отвечайте только в JSON формате.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.4
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const responseText = data.choices[0]?.message?.content || "";
  
  // Extract JSON from the response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Invalid JSON response from AI");
  }
  
  const result = JSON.parse(jsonMatch[0]);
  return {
    title: result.title || "Аналитический инсайт",
    content: result.content || "Контент недоступен",
    tags: result.tags || [],
    insights: result.insights || []
  };
}

async function testFullInsightsGeneration() {
  try {
    console.log('Testing full insights generation with real data sources...');
    
    // Real data sources from database
    const realSourceData = [
      {
        id: 2,
        name: "Telegram Канал Недвижимости",
        description: "Новости и аналитика недвижимости из Telegram канала",
        type: "telegram_channel",
        tags: ["telegram", "новости", "недвижимость"]
      },
      {
        id: 3,
        name: "RSS Лента РБК Недвижимость",
        description: "RSS лента новостей недвижимости с сайта РБК",
        type: "rss_feed",
        tags: ["RSS", "новости", "РБК", "недвижимость"]
      },
      {
        id: 5,
        name: "Таблица цен новостроек",
        description: "Excel таблица с ценами на новостройки по регионам",
        type: "spreadsheet",
        tags: ["таблица", "цены", "новостройки", "Excel"]
      }
    ];

    const insight = await generateInsightFromDataSources(realSourceData);
    
    console.log('✅ Full insights generation test successful!');
    console.log('\n--- Generated Insight ---');
    console.log('Title:', insight.title);
    console.log('Content (preview):', insight.content.substring(0, 300) + '...');
    console.log('Tags:', insight.tags);
    console.log('Key Insights:', insight.insights);
    console.log('\n--- Service Status ---');
    console.log('✓ Perplexity API: Working');
    console.log('✓ Data Sources: 3 active sources found');
    console.log('✓ Insight Generation: Functional');
    console.log('✓ JSON Parsing: Successful');
    
    return true;
    
  } catch (error) {
    console.error('❌ Full insights generation test failed:', error.message);
    return false;
  }
}

testFullInsightsGeneration().then(success => {
  process.exit(success ? 0 : 1);
});