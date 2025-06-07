import { AI_SYSTEM_PROMPT } from "./aiPrompt";
import { aiCacheService } from "./aiCacheService";

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const MODEL = 'llama-3.1-sonar-small-128k-online';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations?: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function callPerplexityAPI(messages: PerplexityMessage[], temperature = 0.7, maxTokens = 1000): Promise<string> {
  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
      top_p: 0.9,
      return_images: false,
      return_related_questions: false,
      search_recency_filter: "month",
      top_k: 0,
      stream: false,
      presence_penalty: 0,
      frequency_penalty: 1
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Perplexity API error:', response.status, errorText);
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data: PerplexityResponse = await response.json();
  return data.choices[0]?.message?.content || "Извините, не удалось получить ответ.";
}

export async function generateAIResponse(userMessage: string, context?: any): Promise<string> {
  // Improved cache key that includes context
  const cacheKey = `${userMessage}:${JSON.stringify(context || {})}`;
  const cachedResponse = aiCacheService.get(cacheKey, context);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const messages: PerplexityMessage[] = [
      {
        role: "system",
        content: AI_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: userMessage
      }
    ];

    const aiResponse = await callPerplexityAPI(messages, 0.7, 1000);
    
    // Cache the response for 1 hour
    aiCacheService.set(cacheKey, aiResponse, context, 60 * 60 * 1000);
    
    return aiResponse;
  } catch (error) {
    console.error("Perplexity API error:", error);
    throw new Error("Ошибка при обращении к ИИ-сервису");
  }
}

export async function generatePropertyRecommendations(preferences: {
  budget?: number;
  purpose?: string;
  region?: string;
  rooms?: number;
}): Promise<{
  recommendations: string;
  filters: any;
  reasoning: string;
}> {
  try {
    const prompt = `
    На основе предпочтений пользователя создайте рекомендации по недвижимости в России:
    - Бюджет: ${preferences.budget ? `${preferences.budget.toLocaleString()} рублей` : "не указан"}
    - Цель: ${preferences.purpose || "не указана"}
    - Регион: ${preferences.region || "любой"}
    - Количество комнат: ${preferences.rooms || "любое"}
    
    Используйте актуальную информацию о рынке недвижимости России для анализа.
    
    Ответьте в JSON формате:
    {
      "recommendations": "подробные рекомендации с учетом текущего состояния рынка",
      "filters": {
        "regionId": номер_региона_или_null,
        "propertyClassId": номер_класса_или_null,
        "minPrice": минимальная_цена_или_null,
        "maxPrice": максимальная_цена_или_null,
        "rooms": количество_комнат_или_null
      },
      "reasoning": "объяснение выбора на основе актуальных рыночных данных"
    }
    `;

    const messages: PerplexityMessage[] = [
      {
        role: "system",
        content: "Вы - эксперт по российской недвижимости с доступом к актуальным рыночным данным. Отвечайте только в JSON формате, используя самую свежую информацию о рынке недвижимости."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const responseText = await callPerplexityAPI(messages, 0.3, 1500);
    
    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response from AI");
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return {
      recommendations: result.recommendations || "Рекомендации не найдены",
      filters: result.filters || {},
      reasoning: result.reasoning || "Анализ не выполнен"
    };
  } catch (error) {
    console.error("Perplexity recommendations error:", error);
    throw new Error("Ошибка при генерации рекомендаций");
  }
}

export async function analyzePropertyInvestment(property: {
  price: number;
  pricePerSqm: number;
  region: string;
  propertyClass: string;
  area: number;
}): Promise<{
  investmentRating: string;
  roi: number;
  liquidityScore: number;
  marketTrend: string;
  analysis: string;
}> {
  try {
    const prompt = `
    Проанализируйте инвестиционную привлекательность недвижимости с учетом актуальных рыночных условий в России:
    - Цена: ${property.price.toLocaleString()} руб
    - Цена за м²: ${property.pricePerSqm.toLocaleString()} руб/м²
    - Площадь: ${property.area} м²
    - Регион: ${property.region}
    - Класс: ${property.propertyClass}
    
    Используйте самую актуальную информацию о рынке недвижимости, процентных ставках, экономической ситуации в России.
    
    Ответьте в JSON формате:
    {
      "investmentRating": "A+/A/B+/B/C+/C",
      "roi": процент_годовой_доходности,
      "liquidityScore": оценка_ликвидности_от_1_до_10,
      "marketTrend": "растущий/стабильный/падающий",
      "analysis": "подробный анализ инвестиционной привлекательности с учетом актуальных рыночных данных"
    }
    `;

    const messages: PerplexityMessage[] = [
      {
        role: "system",
        content: "Вы - аналитик инвестиций в недвижимость России с доступом к актуальным рыночным данным, статистике и экономическим показателям. Отвечайте только в JSON формате."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const responseText = await callPerplexityAPI(messages, 0.2, 1500);
    
    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response from AI");
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return {
      investmentRating: result.investmentRating || "C",
      roi: result.roi || 0,
      liquidityScore: result.liquidityScore || 5,
      marketTrend: result.marketTrend || "стабильный",
      analysis: result.analysis || "Анализ недоступен"
    };
  } catch (error) {
    console.error("Perplexity investment analysis error:", error);
    throw new Error("Ошибка при анализе инвестиций");
  }
}

export async function generateInsightFromDataSources(sourceData: any[]): Promise<{
  title: string;
  content: string;
  tags: string[];
  insights: string[];
}> {
  try {
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

    const messages: PerplexityMessage[] = [
      {
        role: "system",
        content: "Вы - аналитик рынка недвижимости России с доступом к актуальной информации. Создавайте инсайты на основе реальных рыночных данных и трендов. Отвечайте только в JSON формате."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const responseText = await callPerplexityAPI(messages, 0.4, 2000);
    
    // Extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON response from AI");
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return {
      title: result.title || "Аналитический инсайт",
      content: result.content || "Контент недоступен",
      tags: result.tags || ["недвижимость", "анализ"],
      insights: result.insights || ["Данные обрабатываются"]
    };
  } catch (error) {
    console.error("Perplexity insight generation error:", error);
    throw new Error("Ошибка при генерации инсайта");
  }
}