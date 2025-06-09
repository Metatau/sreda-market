// Тест Perplexity API для AI-анализа районов
const API_KEY = process.env.VITE_PERPLEXITY_API_KEY;
const API_BASE = 'https://api.perplexity.ai';

async function testPerplexityAPI() {
  console.log('🔧 Тестирование Perplexity API...');
  console.log('API Key присутствует:', !!API_KEY);
  
  if (!API_KEY || API_KEY === 'your-perplexity-api-key-here') {
    console.error('❌ API ключ Perplexity не настроен или использует placeholder');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Ты эксперт по анализу российского рынка недвижимости.'
          },
          {
            role: 'user',
            content: 'Проанализируй район Москвы - Канатчиково. Краткий анализ в 2-3 предложениях.'
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    console.log('🌐 Статус ответа:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ошибка API:', response.status, response.statusText);
      console.error('❌ Детали ошибки:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API работает успешно');
    console.log('📊 Результат анализа:', data.choices[0]?.message?.content?.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Ошибка подключения к Perplexity:', error.message);
  }
}

testPerplexityAPI();