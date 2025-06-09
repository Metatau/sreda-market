import { generateInsightFromDataSources } from './perplexity';
import { contentParser } from './contentParser';
import { db } from '../db';
import { dataSources, insights } from '../../shared/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

interface ContentPlan {
  id: string;
  type: 'breaking_news' | 'market_trends' | 'analytics' | 'educational';
  priority: number;
  scheduledTime: Date;
  sourceData: any[];
  title: string;
  tags: string[];
  seoScore?: number;
  readabilityScore?: number;
}

interface SEOMetrics {
  title: string;
  metaDescription: string;
  keywords: string[];
  readabilityScore: number;
  seoScore: number;
  headings: string[];
}

export class ContentScheduler {
  private priorities = {
    breaking_news: 1,
    market_trends: 2,
    analytics: 3,
    educational: 4
  };

  private keywordDatabase = [
    'недвижимость москва', 'инвестиции в недвижимость', 'купить квартиру',
    'цены на жилье', 'ипотека 2024', 'новостройки москвы', 'вторичный рынок',
    'коммерческая недвижимость', 'доходность инвестиций', 'жилищный рынок',
    'девелоперы россии', 'строительство жилья', 'рынок недвижимости спб'
  ];

  async planContentCreation(): Promise<ContentPlan[]> {
    console.log('Starting intelligent content planning...');
    
    // Получаем свежие данные из источников
    const syncResults = await contentParser.syncAllSources();
    const allSourceData = await this.aggregateSourceData();
    
    const contentPlan: ContentPlan[] = [];
    
    // Анализируем тренды и создаем план контента
    const trendingTopics = await this.identifyTrendingTopics(allSourceData);
    
    for (const topic of trendingTopics) {
      const plan = await this.createContentPlan(topic, allSourceData);
      if (plan) {
        contentPlan.push(plan);
      }
    }
    
    // Сортируем по приоритету и времени
    return contentPlan.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.scheduledTime.getTime() - b.scheduledTime.getTime();
    });
  }

  private async aggregateSourceData(): Promise<any[]> {
    const sources = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.isActive, true));

    const aggregatedData = [];
    
    for (const source of sources) {
      // Симулируем получение контента из источника
      const sourceContent = {
        sourceId: source.id,
        sourceName: source.name,
        type: source.type,
        tags: source.tags || [],
        lastUpdated: source.lastUpdated,
        // В реальной системе здесь были бы актуальные данные
        sampleData: this.generateSampleDataForSource(source)
      };
      
      aggregatedData.push(sourceContent);
    }
    
    return aggregatedData;
  }

  private generateSampleDataForSource(source: any): any {
    // Генерируем типичные данные для каждого типа источника
    switch (source.type) {
      case 'rss_feed':
        return {
          articles: [
            { title: 'Рынок недвижимости в декабре 2024', publishedAt: new Date() },
            { title: 'Новые ЖК в Москве', publishedAt: new Date() }
          ]
        };
      case 'telegram_channel':
        return {
          messages: [
            { text: 'Цены на жилье выросли на 8%', timestamp: new Date() },
            { text: 'Открытие нового ЖК в районе метро', timestamp: new Date() }
          ]
        };
      default:
        return { data: 'Generic content data' };
    }
  }

  private async identifyTrendingTopics(sourceData: any[]): Promise<string[]> {
    const topicFrequency = new Map<string, number>();
    
    // Анализируем все источники на предмет популярных тем
    for (const source of sourceData) {
      const topics = this.extractTopicsFromSource(source);
      
      for (const topic of topics) {
        topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
      }
    }
    
    // Возвращаем самые популярные темы
    return Array.from(topicFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private extractTopicsFromSource(source: any): string[] {
    const topics = [];
    
    // Извлекаем темы из тегов
    if (source.tags) {
      topics.push(...source.tags);
    }
    
    // Извлекаем темы из названия источника
    const name = source.sourceName.toLowerCase();
    if (name.includes('cian')) topics.push('рынок недвижимости');
    if (name.includes('telegram')) topics.push('новости рынка');
    if (name.includes('аналитика')) topics.push('рыночная аналитика');
    
    return topics;
  }

  private async createContentPlan(topic: string, sourceData: any[]): Promise<ContentPlan | null> {
    const relevantSources = sourceData.filter(source => 
      source.tags?.includes(topic) || 
      source.sourceName.toLowerCase().includes(topic.toLowerCase())
    );

    if (relevantSources.length === 0) return null;

    const contentType = this.determineContentType(topic, relevantSources);
    const priority = this.priorities[contentType];
    const scheduledTime = this.calculateOptimalTime(contentType);
    
    const plan: ContentPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: contentType,
      priority,
      scheduledTime,
      sourceData: relevantSources,
      title: await this.generateTitle(topic, contentType),
      tags: this.generateTags(topic, relevantSources)
    };

    return plan;
  }

  private determineContentType(topic: string, sources: any[]): 'breaking_news' | 'market_trends' | 'analytics' | 'educational' {
    const topicLower = topic.toLowerCase();
    
    // Проверяем на срочные новости
    if (topicLower.includes('срочно') || topicLower.includes('сегодня')) {
      return 'breaking_news';
    }
    
    // Проверяем на аналитику
    if (topicLower.includes('анализ') || topicLower.includes('статистика')) {
      return 'analytics';
    }
    
    // Проверяем на рыночные тренды
    if (topicLower.includes('тренд') || topicLower.includes('рост') || topicLower.includes('изменение')) {
      return 'market_trends';
    }
    
    return 'educational';
  }

  private calculateOptimalTime(contentType: 'breaking_news' | 'market_trends' | 'analytics' | 'educational'): Date {
    const now = new Date();
    
    switch (contentType) {
      case 'breaking_news':
        // Срочные новости - немедленно
        return now;
        
      case 'analytics':
        // Аналитика - утром рабочего дня (9:00)
        const nextWorkingDay = this.getNextWorkingDay();
        nextWorkingDay.setHours(9, 0, 0, 0);
        return nextWorkingDay;
        
      case 'market_trends':
        // Тренды - вечером предыдущего дня (18:00)
        const evening = new Date(now);
        evening.setHours(18, 0, 0, 0);
        if (evening <= now) {
          evening.setDate(evening.getDate() + 1);
        }
        return evening;
        
      case 'educational':
        // Образовательный контент - выходные (10:00)
        const weekend = this.getNextWeekend();
        weekend.setHours(10, 0, 0, 0);
        return weekend;
        
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 день
    }
  }

  private getNextWorkingDay(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    
    // Пропускаем выходные
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }
    
    return date;
  }

  private getNextWeekend(): Date {
    const date = new Date();
    const daysUntilSaturday = (6 - date.getDay()) % 7;
    
    if (daysUntilSaturday === 0 && date.getHours() >= 10) {
      // Если сегодня суббота и уже после 10:00, берем следующую субботу
      date.setDate(date.getDate() + 7);
    } else {
      date.setDate(date.getDate() + daysUntilSaturday);
    }
    
    return date;
  }

  private async generateTitle(topic: string, contentType: string): Promise<string> {
    const templates = {
      breaking_news: [
        `Срочно: ${topic} - последние новости`,
        `${topic}: что происходит сегодня`,
        `Экстренные новости: ${topic}`
      ],
      market_trends: [
        `Тренды рынка: ${topic} в 2024`,
        `${topic} - анализ рыночных изменений`,
        `Куда движется ${topic}?`
      ],
      analytics: [
        `Глубокий анализ: ${topic}`,
        `${topic} - экспертная аналитика`,
        `Исследование рынка: ${topic}`
      ],
      educational: [
        `Гид по ${topic} для инвесторов`,
        `Как понимать ${topic}: полное руководство`,
        `${topic} - базовые знания`
      ]
    };

    const typeTemplates = templates[contentType as keyof typeof templates] || templates.educational;
    return typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
  }

  private generateTags(topic: string, sources: any[]): string[] {
    const baseTags = [topic];
    
    // Добавляем теги из источников
    for (const source of sources) {
      if (source.tags) {
        baseTags.push(...source.tags);
      }
    }
    
    // Добавляем релевантные SEO теги
    const seoTags = this.keywordDatabase.filter(keyword => 
      keyword.toLowerCase().includes(topic.toLowerCase()) ||
      topic.toLowerCase().includes(keyword.toLowerCase())
    );
    
    baseTags.push(...seoTags);
    
    // Удаляем дубликаты и ограничиваем количество
    return [...new Set(baseTags)].slice(0, 8);
  }

  async executeContentPlan(plan: ContentPlan): Promise<boolean> {
    try {
      console.log(`Executing content plan: ${plan.title}`);
      
      // Генерируем инсайт с помощью Perplexity
      const insight = await generateInsightFromDataSources(plan.sourceData);
      
      // Оптимизируем для SEO
      const seoMetrics = await this.optimizeContentForSEO(insight, plan.tags);
      
      // Сохраняем в базу данных
      const [savedInsight] = await db.insert(insights).values({
        title: seoMetrics.title,
        summary: seoMetrics.metaDescription,
        content: insight.content,
        tags: plan.tags,
        publishDate: plan.scheduledTime.toISOString(),
        readTime: Math.ceil(insight.content.length / 1000), // Примерно 1000 символов в минуту
        keyInsights: insight.insights || [],
        chartData: null
      }).returning();
      
      console.log(`Content created successfully: ${savedInsight.title}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to execute content plan ${plan.id}:`, error);
      return false;
    }
  }

  private async optimizeContentForSEO(content: any, targetKeywords: string[]): Promise<SEOMetrics> {
    // Оптимизируем заголовок
    const optimizedTitle = await this.optimizeTitle(content.title, targetKeywords);
    
    // Генерируем мета-описание
    const metaDescription = this.generateMetaDescription(content.content, targetKeywords);
    
    // Извлекаем ключевые слова
    const keywords = this.extractKeywords(content.content, targetKeywords);
    
    // Рассчитываем показатели
    const readabilityScore = this.calculateReadability(content.content);
    const seoScore = this.calculateSEOScore(optimizedTitle, metaDescription, keywords, content.content);
    
    return {
      title: optimizedTitle,
      metaDescription,
      keywords,
      readabilityScore,
      seoScore,
      headings: this.generateOptimizedHeadings(content.content, keywords)
    };
  }

  private async optimizeTitle(title: string, keywords: string[]): Promise<string> {
    // Добавляем год для актуальности
    const currentYear = new Date().getFullYear();
    
    // Выбираем наиболее релевантное ключевое слово
    const primaryKeyword = keywords.find(kw => 
      this.keywordDatabase.includes(kw)
    ) || keywords[0];
    
    // Оптимизируем длину (50-60 символов)
    let optimized = title;
    
    if (!optimized.includes(currentYear.toString())) {
      optimized = `${optimized} ${currentYear}`;
    }
    
    if (primaryKeyword && !optimized.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      optimized = `${primaryKeyword}: ${optimized}`;
    }
    
    // Обрезаем если слишком длинный
    if (optimized.length > 60) {
      optimized = optimized.slice(0, 57) + '...';
    }
    
    return optimized;
  }

  private generateMetaDescription(content: string, keywords: string[]): string {
    // Создаем описание в 150-160 символов
    const sentences = content.split('.').filter(s => s.trim().length > 20);
    let description = sentences[0] || content.slice(0, 100);
    
    // Добавляем ключевое слово если его нет
    const primaryKeyword = keywords[0];
    if (primaryKeyword && !description.toLowerCase().includes(primaryKeyword.toLowerCase())) {
      description = `${primaryKeyword}: ${description}`;
    }
    
    // Обрезаем до нужной длины
    if (description.length > 155) {
      description = description.slice(0, 152) + '...';
    }
    
    return description;
  }

  private extractKeywords(content: string, targetKeywords: string[]): string[] {
    const contentLower = content.toLowerCase();
    const foundKeywords = [];
    
    // Проверяем целевые ключевые слова
    for (const keyword of targetKeywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    }
    
    // Добавляем ключевые слова из базы
    for (const keyword of this.keywordDatabase) {
      if (contentLower.includes(keyword.toLowerCase()) && !foundKeywords.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }
    
    return foundKeywords.slice(0, 10); // Максимум 10 ключевых слов
  }

  private calculateReadability(content: string): number {
    // Упрощенный алгоритм расчета читаемости
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/).filter(w => w.trim().length > 0);
    const avgWordsPerSentence = words.length / sentences.length;
    const avgCharsPerWord = content.replace(/\s/g, '').length / words.length;
    
    // Чем меньше слов в предложении и символов в слове, тем выше читаемость
    const readabilityScore = Math.max(0, Math.min(100, 
      100 - (avgWordsPerSentence * 2) - (avgCharsPerWord * 5)
    ));
    
    return Math.round(readabilityScore);
  }

  private calculateSEOScore(title: string, description: string, keywords: string[], content: string): number {
    let score = 0;
    
    // Проверяем заголовок (25 баллов)
    if (title.length >= 30 && title.length <= 60) score += 10;
    if (keywords.some(kw => title.toLowerCase().includes(kw.toLowerCase()))) score += 15;
    
    // Проверяем описание (25 баллов)
    if (description.length >= 120 && description.length <= 160) score += 10;
    if (keywords.some(kw => description.toLowerCase().includes(kw.toLowerCase()))) score += 15;
    
    // Проверяем контент (25 баллов)
    if (content.length >= 300) score += 10;
    const keywordDensity = this.calculateKeywordDensity(content, keywords);
    if (keywordDensity >= 1 && keywordDensity <= 3) score += 15;
    
    // Проверяем структуру (25 баллов)
    if (content.includes('\n\n')) score += 10; // Есть абзацы
    if (keywords.length >= 3) score += 15; // Достаточно ключевых слов
    
    return Math.round(score);
  }

  private calculateKeywordDensity(content: string, keywords: string[]): number {
    const words = content.toLowerCase().split(/\s+/);
    let keywordCount = 0;
    
    for (const keyword of keywords) {
      const keywordWords = keyword.toLowerCase().split(/\s+/);
      for (let i = 0; i <= words.length - keywordWords.length; i++) {
        const phrase = words.slice(i, i + keywordWords.length).join(' ');
        if (phrase === keywordWords.join(' ')) {
          keywordCount++;
        }
      }
    }
    
    return (keywordCount / words.length) * 100;
  }

  private generateOptimizedHeadings(content: string, keywords: string[]): string[] {
    const headings = [];
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);
    
    for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
      const paragraph = paragraphs[i];
      const sentences = paragraph.split('.').filter(s => s.trim().length > 10);
      
      if (sentences.length > 0) {
        let heading = sentences[0].trim();
        
        // Добавляем ключевое слово если возможно
        const relevantKeyword = keywords.find(kw => 
          paragraph.toLowerCase().includes(kw.toLowerCase())
        );
        
        if (relevantKeyword && !heading.toLowerCase().includes(relevantKeyword.toLowerCase())) {
          heading = `${relevantKeyword}: ${heading}`;
        }
        
        headings.push(heading.slice(0, 80)); // Ограничиваем длину
      }
    }
    
    return headings;
  }
}

export const contentScheduler = new ContentScheduler();