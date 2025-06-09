// Simple test for Perplexity API connectivity
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

async function testPerplexityConnection() {
  try {
    console.log('Testing Perplexity API connection...');
    
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
            content: 'Вы - аналитик рынка недвижимости России.'
          },
          {
            role: 'user',
            content: 'Создайте краткий анализ рынка недвижимости Москвы в JSON формате с полями: title, summary, trend'
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Perplexity API error:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ Perplexity API test successful!');
    console.log('Response:', data.choices[0]?.message?.content?.substring(0, 200) + '...');
    return true;
    
  } catch (error) {
    console.error('❌ Perplexity API test failed:', error.message);
    return false;
  }
}

testPerplexityConnection().then(success => {
  process.exit(success ? 0 : 1);
});