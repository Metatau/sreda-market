import type { PerplexityInsights, Demographics, EconomicData, InfrastructureData } from '@/components/Map/types/geospatial';

// Интерфейсы для специфических типов данных от Perplexity
export interface DemographicInsights {
  population_analysis: string;
  age_structure: string;
  income_patterns: string;
  lifestyle_trends: string;
}

export interface EconomicAnalysis {
  market_conditions: string;
  price_trends: string;
  investment_climate: string;
  economic_drivers: string[];
}

export interface InfrastructureAnalysis {
  development_plans: string[];
  infrastructure_quality: string;
  accessibility_assessment: string;
  future_improvements: string[];
}

export interface MarketAnalysis {
  demand_patterns: string;
  supply_analysis: string;
  competition_landscape: string;
  market_outlook: string;
}

export interface DistrictForecast {
  development_prospects: string[];
  risk_factors: string[];
  growth_potential: string;
  timeline: string;
}

export class PerplexityService {
  private static readonly API_BASE = 'https://api.perplexity.ai';
  private static readonly API_KEY = import.meta.env.VITE_PERPLEXITY_API_KEY;
  
  // Кэш для избежания повторных запросов (важно для платного API)
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 минут

  /**
   * Получение демографических данных района
   */
  static async getDemographicInsights(
    location: string, 
    city: string
  ): Promise<DemographicInsights> {
    const cacheKey = `demographics_${city}_${location}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const prompt = `Проанализируй демографическую ситуацию в районе ${location}, город ${city}, Россия. 
    Предоставь информацию о:
    1. Численности и плотности населения
    2. Возрастной структуре жителей
    3. Уровне доходов и социальном составе
    4. Образе жизни и предпочтениях местных жителей
    
    Ответ должен быть структурированным и содержать конкретные данные.`;

    try {
      const response = await this.queryPerplexity(prompt);
      const insights: DemographicInsights = {
        population_analysis: response.choices[0]?.message?.content || '',
        age_structure: this.extractSection(response.choices[0]?.message?.content, 'возрастной структуре'),
        income_patterns: this.extractSection(response.choices[0]?.message?.content, 'доходов'),
        lifestyle_trends: this.extractSection(response.choices[0]?.message?.content, 'образе жизни')
      };
      
      this.setCachedData(cacheKey, insights);
      return insights;
    } catch (error) {
      console.error('Perplexity demographic insights error:', error);
      throw new Error('Не удалось получить демографические данные');
    }
  }

  /**
   * Анализ экономической ситуации в районе
   */
  static async getEconomicAnalysis(
    location: string, 
    city: string
  ): Promise<EconomicAnalysis> {
    const cacheKey = `economics_${city}_${location}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const prompt = `Проанализируй экономическую ситуацию и рынок недвижимости в районе ${location}, город ${city}, Россия.
    Изучи:
    1. Текущие рыночные условия и цены на недвижимость
    2. Тренды изменения стоимости жилья за последние 2-3 года
    3. Инвестиционную привлекательность района
    4. Основные экономические драйверы развития района
    
    Предоставь данные с конкретными цифрами и аналитикой.`;

    try {
      const response = await this.queryPerplexity(prompt);
      const content = response.choices[0]?.message?.content || '';
      
      const analysis: EconomicAnalysis = {
        market_conditions: content,
        price_trends: this.extractSection(content, 'цены|стоимость|тренды'),
        investment_climate: this.extractSection(content, 'инвестиц'),
        economic_drivers: this.extractDrivers(content)
      };
      
      this.setCachedData(cacheKey, analysis);
      return analysis;
    } catch (error) {
      console.error('Perplexity economic analysis error:', error);
      throw new Error('Не удалось получить экономический анализ');
    }
  }

  /**
   * Получение информации о развитии инфраструктуры
   */
  static async getInfrastructureDevelopment(
    location: string, 
    city: string
  ): Promise<InfrastructureAnalysis> {
    const cacheKey = `infrastructure_${city}_${location}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const prompt = `Изучи инфраструктурное развитие района ${location}, город ${city}, Россия.
    Проанализируй:
    1. Планы развития инфраструктуры (транспорт, школы, больницы, торговые центры)
    2. Качество существующей инфраструктуры
    3. Транспортную доступность и связанность с другими районами
    4. Планируемые улучшения и сроки их реализации
    
    Укажи конкретные проекты и их статус реализации.`;

    try {
      const response = await this.queryPerplexity(prompt);
      const content = response.choices[0]?.message?.content || '';
      
      const analysis: InfrastructureAnalysis = {
        development_plans: this.extractPlans(content),
        infrastructure_quality: this.extractSection(content, 'качество|состояние'),
        accessibility_assessment: this.extractSection(content, 'доступность|транспорт'),
        future_improvements: this.extractPlans(content, 'планируемые|будущие|перспективы')
      };
      
      this.setCachedData(cacheKey, analysis);
      return analysis;
    } catch (error) {
      console.error('Perplexity infrastructure analysis error:', error);
      throw new Error('Не удалось получить анализ инфраструктуры');
    }
  }

  /**
   * Анализ рынка недвижимости в районе
   */
  static async getRealEstateMarketAnalysis(
    location: string, 
    city: string
  ): Promise<MarketAnalysis> {
    const cacheKey = `realestate_${city}_${location}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const prompt = `Проведи детальный анализ рынка недвижимости в районе ${location}, город ${city}, Россия.
    Исследуй:
    1. Паттерны спроса на различные типы жилья
    2. Предложение на рынке (новостройки, вторичка)
    3. Конкурентную среду среди застройщиков и агентств
    4. Прогноз развития рынка на ближайшие 1-2 года
    
    Предоставь аналитику с конкретными данными и цифрами.`;

    try {
      const response = await this.queryPerplexity(prompt);
      const content = response.choices[0]?.message?.content || '';
      
      const analysis: MarketAnalysis = {
        demand_patterns: this.extractSection(content, 'спрос|потребность'),
        supply_analysis: this.extractSection(content, 'предложение|новостройки|вторичка'),
        competition_landscape: this.extractSection(content, 'конкуренц|застройщик'),
        market_outlook: this.extractSection(content, 'прогноз|перспективы|будущее')
      };
      
      this.setCachedData(cacheKey, analysis);
      return analysis;
    } catch (error) {
      console.error('Perplexity real estate analysis error:', error);
      throw new Error('Не удалось получить анализ рынка недвижимости');
    }
  }

  /**
   * Прогнозы развития района
   */
  static async getDistrictForecast(
    location: string, 
    city: string
  ): Promise<DistrictForecast> {
    const cacheKey = `forecast_${city}_${location}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const prompt = `Составь прогноз развития района ${location}, город ${city}, Россия на ближайшие 3-5 лет.
    Проанализируй:
    1. Перспективы развития и роста района
    2. Потенциальные риски и угрозы
    3. Потенциал роста стоимости недвижимости
    4. Временные рамки ключевых изменений
    
    Предоставь объективный прогноз с обоснованием.`;

    try {
      const response = await this.queryPerplexity(prompt);
      const content = response.choices[0]?.message?.content || '';
      
      const forecast: DistrictForecast = {
        development_prospects: this.extractPlans(content, 'перспективы|развитие|рост'),
        risk_factors: this.extractPlans(content, 'риски|угрозы|проблемы'),
        growth_potential: this.extractSection(content, 'потенциал|возможности'),
        timeline: this.extractSection(content, 'сроки|время|период')
      };
      
      this.setCachedData(cacheKey, forecast);
      return forecast;
    } catch (error) {
      console.error('Perplexity district forecast error:', error);
      throw new Error('Не удалось получить прогноз развития района');
    }
  }

  /**
   * Базовый метод для запросов к Perplexity API
   */
  private static async queryPerplexity(
    prompt: string, 
    model: string = 'llama-3.1-sonar-small-128k-online'
  ): Promise<any> {
    if (!this.API_KEY) {
      throw new Error('Perplexity API key не настроен');
    }

    const response = await fetch(`${this.API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Ты эксперт по анализу российского рынка недвижимости. Предоставляй точные, актуальные данные с конкретными цифрами и фактами.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Получение кэшированных данных
   */
  private static getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Сохранение данных в кэш
   */
  private static setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Извлечение секции из текста по ключевым словам
   */
  private static extractSection(content: string, keywords: string): string {
    const lines = content.split('\n');
    const keywordRegex = new RegExp(keywords, 'i');
    
    for (let i = 0; i < lines.length; i++) {
      if (keywordRegex.test(lines[i])) {
        // Возвращаем текущую строку и следующие 2-3 строки
        return lines.slice(i, i + 3).join(' ').trim();
      }
    }
    
    // Если не найдено, возвращаем первые 100 символов
    return content.substring(0, 100) + '...';
  }

  /**
   * Извлечение списка планов/проектов из текста
   */
  private static extractPlans(content: string, keywords?: string): string[] {
    const plans: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^\d+\./) || trimmed.startsWith('•') || trimmed.startsWith('-')) {
        plans.push(trimmed.replace(/^\d+\.\s*|^[•-]\s*/, ''));
      }
    }
    
    return plans.length > 0 ? plans : [content.substring(0, 150) + '...'];
  }

  /**
   * Извлечение экономических драйверов из текста
   */
  private static extractDrivers(content: string): string[] {
    const drivers: string[] = [];
    const keywordRegex = /драйвер|фактор|причина|развитие|рост/i;
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (keywordRegex.test(line)) {
        drivers.push(line.trim());
      }
    }
    
    return drivers.length > 0 ? drivers : ['Общее экономическое развитие региона'];
  }
}