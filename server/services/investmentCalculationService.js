const { storage } = require('../storage');
const { db } = require('../db');
const { investmentAnalytics, propertyAnalytics } = require('../../shared/schema');
const { eq } = require('drizzle-orm');

class InvestmentCalculationService {
  
  /**
   * Рассчитывает инвестиционную аналитику для конкретного объекта
   */
  async calculateForProperty(propertyId) {
    try {
      const property = await storage.getProperty(propertyId);
      if (!property) {
        throw new Error(`Property ${propertyId} not found`);
      }

      const analytics = await this.calculateInvestmentMetrics(property);
      
      // Сохраняем аналитику
      await this.saveInvestmentAnalytics(propertyId, analytics);
      
      console.log(`Investment analytics calculated for property ${propertyId}`);
    } catch (error) {
      console.error(`Error calculating investment analytics for property ${propertyId}:`, error);
      throw error;
    }
  }

  /**
   * Рассчитывает инвестиционные метрики
   */
  async calculateInvestmentMetrics(property) {
    // Базовые расчёты
    const monthlyRent = await this.estimateMonthlyRent(property);
    const yearlyRent = monthlyRent * 12;
    const purchasePrice = property.price;
    
    // ROI (Return on Investment)
    const grossROI = purchasePrice > 0 ? (yearlyRent / purchasePrice) * 100 : 0;
    
    // Операционные расходы (примерно 25% от арендной платы)
    const operatingExpenses = yearlyRent * 0.25;
    const netYearlyIncome = yearlyRent - operatingExpenses;
    const netROI = purchasePrice > 0 ? (netYearlyIncome / purchasePrice) * 100 : 0;

    // Срок окупаемости
    const paybackPeriod = netYearlyIncome > 0 ? purchasePrice / netYearlyIncome : 0;

    // Оценка ликвидности (1-10)
    const liquidityScore = this.calculateLiquidityScore(property);

    // Инвестиционный рейтинг
    const investmentRating = this.calculateInvestmentRating(netROI, liquidityScore, paybackPeriod);

    // Прогноз роста цен
    const priceGrowthForecast = this.calculatePriceGrowthForecast(property);

    // Риск-рейтинг
    const riskRating = this.calculateRiskRating(property);

    return {
      monthlyRent: Math.round(monthlyRent),
      yearlyRent: Math.round(yearlyRent),
      grossROI: Math.round(grossROI * 100) / 100,
      netROI: Math.round(netROI * 100) / 100,
      operatingExpenses: Math.round(operatingExpenses),
      paybackPeriod: Math.round(paybackPeriod * 10) / 10,
      liquidityScore: Math.round(liquidityScore * 10) / 10,
      investmentRating,
      priceGrowthForecast: Math.round(priceGrowthForecast * 100) / 100,
      riskRating,
      calculatedAt: new Date()
    };
  }

  /**
   * Оценивает месячную арендную плату
   */
  async estimateMonthlyRent(property) {
    const region = property.region;
    if (!region) return 0;

    // Базовые коэффициенты аренды по регионам (% от стоимости в месяц)
    const rentCoefficients = {
      'Москва': 0.005,
      'Санкт-Петербург': 0.006,
      'Новосибирск': 0.008,
      'Екатеринбург': 0.007,
      'Казань': 0.008,
      'Уфа': 0.009,
      'Красноярск': 0.009,
      'Пермь': 0.009,
      'Калининград': 0.007,
      'Сочи': 0.004,
      'Тюмень': 0.008
    };

    const baseCoefficient = rentCoefficients[region.name] || 0.008;
    
    // Корректировки по типу рынка
    let marketTypeMultiplier = 1.0;
    if (property.marketType === 'new_construction') {
      marketTypeMultiplier = 1.1; // Новостройки на 10% дороже в аренде
    }

    // Корректировки по классу недвижимости
    let classMultiplier = 1.0;
    if (property.propertyClass) {
      const classMultipliers = {
        'Эконом': 0.9,
        'Стандарт': 1.0,
        'Комфорт': 1.15,
        'Бизнес': 1.3,
        'Элит': 1.5
      };
      classMultiplier = classMultipliers[property.propertyClass.name] || 1.0;
    }

    return property.price * baseCoefficient * marketTypeMultiplier * classMultiplier;
  }

  /**
   * Рассчитывает показатель ликвидности (1-10)
   */
  calculateLiquidityScore(property) {
    let score = 5; // Базовый показатель

    // Корректировка по региону
    const liquidRegions = ['Москва', 'Санкт-Петербург', 'Сочи'];
    if (property.region && liquidRegions.includes(property.region.name)) {
      score += 2;
    }

    // Корректировка по классу недвижимости
    if (property.propertyClass) {
      const classScores = {
        'Эконом': -1,
        'Стандарт': 0,
        'Комфорт': 1,
        'Бизнес': 1.5,
        'Элит': -0.5 // Элитная недвижимость менее ликвидна
      };
      score += classScores[property.propertyClass.name] || 0;
    }

    // Корректировка по типу рынка
    if (property.marketType === 'new_construction') {
      score += 0.5;
    }

    // Корректировка по площади
    if (property.area) {
      if (property.area >= 40 && property.area <= 80) {
        score += 1; // Оптимальная площадь
      } else if (property.area > 100) {
        score -= 0.5; // Большие квартиры менее ликвидны
      }
    }

    return Math.max(1, Math.min(10, score));
  }

  /**
   * Определяет инвестиционный рейтинг
   */
  calculateInvestmentRating(netROI, liquidityScore, paybackPeriod) {
    let score = 0;

    // Оценка ROI
    if (netROI >= 8) score += 3;
    else if (netROI >= 5) score += 2;
    else if (netROI >= 3) score += 1;

    // Оценка ликвидности
    if (liquidityScore >= 8) score += 2;
    else if (liquidityScore >= 6) score += 1;

    // Оценка периода окупаемости
    if (paybackPeriod <= 12) score += 2;
    else if (paybackPeriod <= 20) score += 1;

    if (score >= 6) return 'Отличный';
    if (score >= 4) return 'Хороший';
    if (score >= 2) return 'Удовлетворительный';
    return 'Низкий';
  }

  /**
   * Прогнозирует рост цен на недвижимость
   */
  calculatePriceGrowthForecast(property) {
    // Базовые прогнозы роста по регионам (% в год)
    const growthRates = {
      'Москва': 3.5,
      'Санкт-Петербург': 4.0,
      'Новосибирск': 5.0,
      'Екатеринбург': 4.5,
      'Казань': 4.8,
      'Уфа': 4.0,
      'Красноярск': 4.2,
      'Пермь': 3.8,
      'Калининград': 5.5,
      'Сочи': 6.0,
      'Тюмень': 4.5
    };

    const baseGrowth = property.region ? growthRates[property.region.name] || 4.0 : 4.0;

    // Корректировка для новостроек
    if (property.marketType === 'new_construction') {
      return baseGrowth + 0.5;
    }

    return baseGrowth;
  }

  /**
   * Рассчитывает риск-рейтинг инвестиции
   */
  calculateRiskRating(property) {
    let riskScore = 0;

    // Риск по региону
    const lowRiskRegions = ['Москва', 'Санкт-Петербург'];
    const mediumRiskRegions = ['Новосибирск', 'Екатеринбург', 'Казань', 'Сочи'];
    
    if (property.region) {
      if (lowRiskRegions.includes(property.region.name)) {
        riskScore += 1;
      } else if (mediumRiskRegions.includes(property.region.name)) {
        riskScore += 2;
      } else {
        riskScore += 3;
      }
    }

    // Риск по типу рынка
    if (property.marketType === 'new_construction') {
      riskScore += 1; // Новостройки более рискованы
    }

    // Риск по классу недвижимости
    if (property.propertyClass) {
      if (property.propertyClass.name === 'Элит') {
        riskScore += 2;
      } else if (property.propertyClass.name === 'Эконом') {
        riskScore += 1;
      }
    }

    if (riskScore <= 2) return 'Низкий';
    if (riskScore <= 4) return 'Средний';
    return 'Высокий';
  }

  /**
   * Сохраняет инвестиционную аналитику
   */
  async saveInvestmentAnalytics(propertyId, analytics) {
    try {
      // Проверяем, существует ли запись в property_analytics
      const existing = await db
        .select()
        .from(propertyAnalytics)
        .where(eq(propertyAnalytics.propertyId, propertyId))
        .limit(1);

      const analyticsData = {
        propertyId,
        roi: analytics.netROI.toString(),
        liquidityScore: Math.round(analytics.liquidityScore),
        investmentScore: Math.round(analytics.netROI * 10), // Преобразуем ROI в инвестиционный балл
        investmentRating: analytics.investmentRating,
        priceGrowthRate: analytics.priceGrowthForecast.toString(),
        calculatedAt: analytics.calculatedAt
      };

      if (existing.length > 0) {
        // Обновляем существующую запись
        await db
          .update(propertyAnalytics)
          .set(analyticsData)
          .where(eq(propertyAnalytics.propertyId, propertyId));
      } else {
        // Создаём новую запись
        await db
          .insert(propertyAnalytics)
          .values(analyticsData);
      }
    } catch (error) {
      console.error(`Error saving investment analytics for property ${propertyId}:`, error);
      throw error;
    }
  }
}

module.exports = { InvestmentCalculationService };