import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key" 
});

export async function generateAIResponse(userMessage: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Вы - AI-консультант по недвижимости для сервиса SREDA Market. Вы специализируетесь на российском рынке недвижимости, особенно в следующих регионах: Москва, Санкт-Петербург, Московская область, Ленинградская область, Калининград, Казань, Пермь, Екатеринбург, Сочи, Краснодар, Уфа, Новосибирск, Красноярск, Тюмень.

Вы помогаете пользователям:
- Найти подходящую недвижимость для инвестиций
- Анализировать рынок и тренды
- Рассчитывать доходность и ROI
- Выбирать между классами недвижимости (Эконом, Стандарт, Комфорт, Бизнес, Элит)
- Давать советы по инвестиционным стратегиям

Отвечайте кратко, конкретно и полезно. Используйте данные о ценах за квадратный метр для разных классов:
- Эконом: до 80,000 ₽/м²
- Стандарт: 80,000-120,000 ₽/м²
- Комфорт: 120,000-180,000 ₽/м²
- Бизнес: 180,000-300,000 ₽/м²
- Элит: 300,000+ ₽/м²`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Извините, не удалось обработать ваш запрос.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "Извините, произошла ошибка при обработке вашего запроса. Попробуйте позже.";
  }
}

export async function generateAIPropertyRecommendations(preferences: {
  budget?: number;
  regionId?: number;
  investmentGoals?: string;
  riskTolerance?: string;
}): Promise<{ recommendations: string; filters: any }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `Вы - эксперт по инвестициям в недвижимость. На основе предпочтений пользователя, сгенерируйте рекомендации и предложите фильтры для поиска. Ответьте в формате JSON с полями "recommendations" (текст рекомендаций) и "filters" (объект с фильтрами для поиска).`
        },
        {
          role: "user",
          content: `Пользователь ищет недвижимость для инвестиций со следующими параметрами:
          Бюджет: ${preferences.budget ? `${preferences.budget.toLocaleString()} ₽` : 'не указан'}
          Регион: ${preferences.regionId ? `ID ${preferences.regionId}` : 'любой'}
          Цели инвестиций: ${preferences.investmentGoals || 'не указаны'}
          Толерантность к риску: ${preferences.riskTolerance || 'не указана'}
          
          Дайте рекомендации и предложите подходящие фильтры.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      recommendations: result.recommendations || "Рекомендации не найдены",
      filters: result.filters || {},
    };
  } catch (error) {
    console.error("OpenAI recommendations error:", error);
    return {
      recommendations: "Не удалось сгенерировать рекомендации. Попробуйте изменить параметры поиска.",
      filters: {},
    };
  }
}
