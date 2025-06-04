import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function generateAIResponse(userMessage: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Вы - ИИ-консультант по недвижимости для российского рынка. 
          Специализируетесь на инвестиционной недвижимости в крупных городах России.
          Отвечайте на русском языке, давайте практические советы по покупке и инвестированию в недвижимость.
          Учитывайте классификацию: Эконом, Стандарт, Комфорт, Бизнес, Элит.
          Рассматривайте города: Москва, СПб, Новосибирск, Екатеринбург, Казань и другие.`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    return response.choices[0].message.content || "Извините, не удалось получить ответ.";
  } catch (error) {
    console.error("OpenAI API error:", error);
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
    
    Ответьте в JSON формате:
    {
      "recommendations": "подробные рекомендации",
      "filters": {
        "regionId": номер_региона_или_null,
        "propertyClassId": номер_класса_или_null,
        "minPrice": минимальная_цена_или_null,
        "maxPrice": максимальная_цена_или_null,
        "rooms": количество_комнат_или_null
      },
      "reasoning": "объяснение выбора"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Вы - эксперт по российской недвижимости. Отвечайте только в JSON формате."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      recommendations: result.recommendations || "Рекомендации не найдены",
      filters: result.filters || {},
      reasoning: result.reasoning || "Анализ не выполнен"
    };
  } catch (error) {
    console.error("OpenAI recommendations error:", error);
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
    Проанализируйте инвестиционную привлекательность недвижимости:
    - Цена: ${property.price.toLocaleString()} руб
    - Цена за м²: ${property.pricePerSqm.toLocaleString()} руб/м²
    - Площадь: ${property.area} м²
    - Регион: ${property.region}
    - Класс: ${property.propertyClass}
    
    Ответьте в JSON формате:
    {
      "investmentRating": "A+/A/B+/B/C+/C",
      "roi": процент_годовой_доходности,
      "liquidityScore": оценка_ликвидности_от_1_до_10,
      "marketTrend": "растущий/стабильный/падающий",
      "analysis": "подробный анализ инвестиционной привлекательности"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Вы - аналитик инвестиций в недвижимость России. Отвечайте только в JSON формате."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
      temperature: 0.2
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      investmentRating: result.investmentRating || "C",
      roi: result.roi || 0,
      liquidityScore: result.liquidityScore || 5,
      marketTrend: result.marketTrend || "стабильный",
      analysis: result.analysis || "Анализ недоступен"
    };
  } catch (error) {
    console.error("OpenAI investment analysis error:", error);
    throw new Error("Ошибка при анализе инвестиций");
  }
}