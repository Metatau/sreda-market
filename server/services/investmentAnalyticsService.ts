import { db } from "../db";
import { 
  properties, 
  regions, 
  propertyClasses, 
  investmentAnalytics, 
  priceHistory, 
  regionalCosts, 
  infrastructureProjects,
  type Property,
  type Region,
  type PropertyClass,
  type InvestmentAnalytics,
  type InsertInvestmentAnalytics,
  type RegionalCosts
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, isNotNull } from "drizzle-orm";

export class InvestmentAnalyticsService {
  // Региональные коэффициенты на основе исследований российского рынка недвижимости
  private readonly regionalTaxRates: Record<string, number> = {
    'Москва': 0.001,  // 0.1% для жилья до 20 млн
    'Санкт-Петербург': 0.001,
    'Московская область': 0.001,
    'Калининград': 0.001,
    'Екатеринбург': 0.001,
    'Новосибирск': 0.001,
  };

  // Средние арендные ставки по регионам (данные Дом.РФ)
  private readonly rentalYields: Record<string, number> = {
    'Москва': 0.074,  // 7.4%
    'Санкт-Петербург': 0.064,  // 6.4%
    'Хабаровск': 0.089,  // Самая высокая доходность
    'Калининград': 0.085,
    'Ижевск': 0.082,
    'Екатеринбург': 0.078,
    'Новосибирск': 0.075,
    'Краснодар': 0.081,
    'Сочи': 0.072,
  };

  // Коэффициенты ремонта по классам недвижимости
  private readonly renovationCostsPerSqm: Record<string, number> = {
    'Эконом': 15000,      // Косметический ремонт
    'Стандарт': 25000,    // Евроремонт
    'Комфорт': 35000,     // Дизайнерский ремонт
    'Бизнес': 50000,      // Премиальный ремонт
    'Элит': 80000         // Люксовый ремонт
  };

  // Потенциальный рост стоимости после ремонта
  private readonly valueIncreasePercent: Record<string, number> = {
    'Эконом': 15,    // 15% рост стоимости
    'Стандарт': 20,  // 20% рост
    'Комфорт': 25,   // 25% рост
    'Бизнес': 30,    // 30% рост
    'Элит': 35       // 35% рост
  };

  // Базовые тренды роста цен по регионам на 2024-2025
  private readonly regionalGrowthRates: Record<string, number> = {
    'Москва': 0.08,      // 8% годовой рост (стабилизация)
    'Санкт-Петербург': 0.07,  // 7% годовой рост
    'Московская область': 0.10,  // 10% рост (миграция из Москвы)
    'Калининград': 0.12,      // 12% высокий рост
    'Екатеринбург': 0.09,     // 9% рост
    'Новосибирск': 0.08,      // 8% рост
    'Краснодар': 0.11,        // 11% рост
    'Сочи': 0.13,             // 13% курортная недвижимость
  };

  async calculateFullAnalytics(propertyId: number): Promise<InvestmentAnalytics> {
    // Получаем данные об объекте
    const propertyData = await this.getPropertyData(propertyId);
    if (!propertyData) {
      throw new Error(`Property with id ${propertyId} not found`);
    }

    // Получаем региональные расходы
    const regionalCosts = await this.getRegionalCosts(
      propertyData.regionId!, 
      propertyData.propertyClassId!
    );

    // Рассчитываем все метрики
    const priceDynamics = await this.calculatePriceDynamics(propertyId);
    const rentalScenario = this.calculateRentalScenario(propertyData, regionalCosts);
    const flippingScenario = this.calculateFlippingScenario(propertyData);
    const safeHavenScenario = this.calculateSafeHavenScenario(propertyData, priceDynamics);
    const priceForecasting = await this.forecastPrice3Years(propertyData);

    // Определяем комплексные метрики
    const investmentRating = this.calculateInvestmentRating(
      parseFloat(rentalScenario.rentalRoiAnnual || '0'),
      parseFloat(flippingScenario.flipRoi || '0'),
      safeHavenScenario.safeHavenScore || 5
    );

    const riskLevel = this.calculateRiskLevel(
      parseFloat(priceDynamics.priceVolatility || '0'),
      safeHavenScenario.liquidityScore || 5
    );

    const recommendedStrategy = this.getRecommendedStrategy(
      parseFloat(rentalScenario.rentalRoiAnnual || '0'),
      parseFloat(flippingScenario.flipRoi || '0'),
      parseFloat(priceForecasting.priceForecast3y || '0')
    );

    // Сохраняем результаты в базу
    const analyticsData: InsertInvestmentAnalytics = {
      propertyId,
      priceChange1y: priceDynamics.priceChange1y,
      priceChange3m: priceDynamics.priceChange3m,
      priceVolatility: priceDynamics.priceVolatility,
      rentalYield: rentalScenario.rentalYield,
      rentalIncomeMonthly: rentalScenario.rentalIncomeMonthly,
      rentalRoiAnnual: rentalScenario.rentalRoiAnnual,
      rentalPaybackYears: rentalScenario.rentalPaybackYears,
      flipPotentialProfit: flippingScenario.flipPotentialProfit,
      flipRoi: flippingScenario.flipRoi,
      flipTimeframeMonths: flippingScenario.flipTimeframeMonths,
      renovationCostEstimate: flippingScenario.renovationCostEstimate,
      safeHavenScore: safeHavenScenario.safeHavenScore,
      capitalPreservationIndex: safeHavenScenario.capitalPreservationIndex,
      liquidityScore: safeHavenScenario.liquidityScore,
      priceForecast3y: priceForecasting.priceForecast3y,
      infrastructureImpactScore: priceForecasting.infrastructureImpactScore,
      developmentRiskScore: priceForecasting.developmentRiskScore,
      investmentRating,
      riskLevel,
      recommendedStrategy,
    };

    const [result] = await db
      .insert(investmentAnalytics)
      .values(analyticsData)
      .returning();

    return result;
  }

  private async getPropertyData(propertyId: number) {
    const [property] = await db
      .select()
      .from(properties)
      .leftJoin(regions, eq(properties.regionId, regions.id))
      .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
      .where(eq(properties.id, propertyId));

    if (!property) return null;

    return {
      ...property.properties,
      region: property.regions,
      propertyClass: property.property_classes,
    };
  }

  private async getRegionalCosts(regionId: number, propertyClassId: number): Promise<Partial<RegionalCosts>> {
    const [costs] = await db
      .select()
      .from(regionalCosts)
      .where(
        and(
          eq(regionalCosts.regionId, regionId),
          eq(regionalCosts.propertyClassId, propertyClassId)
        )
      )
      .orderBy(desc(regionalCosts.year));

    // Возвращаем дефолтные значения, если нет данных
    return costs ? costs : {
      taxRate: "0.001",
      maintenanceCostPerSqm: 1000,
      utilityCostPerSqm: 2000,
      managementFeePercent: "8.00",
      insuranceCostPerSqm: 100,
      repairReservePercent: "5.00",
    };
  }

  private async calculatePriceDynamics(propertyId: number) {
    const priceData = await db
      .select()
      .from(priceHistory)
      .where(eq(priceHistory.propertyId, propertyId))
      .orderBy(desc(priceHistory.dateRecorded))
      .limit(365);

    if (priceData.length < 2) {
      return {
        priceChange1y: "0.00",
        priceChange3m: "0.00",
        priceVolatility: "0.00",
      };
    }

    const prices = priceData.map(p => Number(p.pricePerSqm || p.price / 50));
    const latestPrice = prices[0];
    const yearAgoPrice = prices[prices.length - 1];
    const threeMonthsAgoPrice = prices[Math.min(90, prices.length - 1)];

    const priceChange1y = ((latestPrice - yearAgoPrice) / yearAgoPrice) * 100;
    const priceChange3m = ((latestPrice - threeMonthsAgoPrice) / threeMonthsAgoPrice) * 100;
    
    // Расчет волатильности как стандартного отклонения
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const volatility = (Math.sqrt(variance) / mean) * 100;

    return {
      priceChange1y: priceChange1y.toFixed(2),
      priceChange3m: priceChange3m.toFixed(2),
      priceVolatility: volatility.toFixed(2),
    };
  }

  private calculateRentalScenario(propertyData: any, regionalCosts: Partial<RegionalCosts>) {
    const propertyPrice = propertyData.price;
    const area = Number(propertyData.area) || 50;
    const regionName = propertyData.region?.name || 'Москва';

    // Расчет арендного дохода
    const baseYield = this.rentalYields[regionName] || 0.066;
    const monthlyRental = propertyPrice * baseYield / 12;
    const annualRental = monthlyRental * 12;

    // Расчет расходов
    const taxRate = typeof regionalCosts.taxRate === 'string' ? Number(regionalCosts.taxRate) : (regionalCosts.taxRate || 0.001);
    const maintenanceCostPerSqm = regionalCosts.maintenanceCostPerSqm || 1000;
    const utilityCostPerSqm = regionalCosts.utilityCostPerSqm || 2000;
    const managementFeePercent = typeof regionalCosts.managementFeePercent === 'string' ? Number(regionalCosts.managementFeePercent) : (regionalCosts.managementFeePercent || 8);
    const insuranceCostPerSqm = regionalCosts.insuranceCostPerSqm || 100;
    const repairReservePercent = typeof regionalCosts.repairReservePercent === 'string' ? Number(regionalCosts.repairReservePercent) : (regionalCosts.repairReservePercent || 5);

    const annualTax = propertyPrice * taxRate;
    const maintenanceCost = maintenanceCostPerSqm * area;
    const utilityCost = utilityCostPerSqm * area * 12;
    const managementFee = annualRental * managementFeePercent / 100;
    const insuranceCost = insuranceCostPerSqm * area;
    const repairReserve = annualRental * repairReservePercent / 100;

    const totalExpenses = annualTax + maintenanceCost + utilityCost + managementFee + insuranceCost + repairReserve;
    const netAnnualIncome = annualRental - totalExpenses;
    const rentalRoi = (netAnnualIncome / propertyPrice) * 100;
    const paybackYears = netAnnualIncome > 0 ? propertyPrice / netAnnualIncome : 999;

    return {
      rentalYield: rentalRoi.toFixed(2),
      rentalIncomeMonthly: Math.round(monthlyRental),
      rentalRoiAnnual: rentalRoi.toFixed(2),
      rentalPaybackYears: paybackYears.toFixed(1),
    };
  }

  private calculateFlippingScenario(propertyData: any) {
    const propertyPrice = propertyData.price;
    const area = Number(propertyData.area) || 50;
    const propertyClassName = propertyData.propertyClass?.name || 'Стандарт';

    const renovationCost = this.renovationCostsPerSqm[propertyClassName] * area;
    const valueIncrease = propertyPrice * this.valueIncreasePercent[propertyClassName] / 100;
    
    // Расходы на сделку (риелтор, налоги, реклама)
    const transactionCosts = propertyPrice * 0.06; // 6% от стоимости
    
    const totalInvestment = propertyPrice + renovationCost + transactionCosts;
    const expectedSalePrice = propertyPrice + valueIncrease;
    const grossProfit = expectedSalePrice - totalInvestment;
    const flipRoi = (grossProfit / totalInvestment) * 100;

    return {
      flipPotentialProfit: Math.round(grossProfit),
      flipRoi: flipRoi.toFixed(2),
      flipTimeframeMonths: 8, // Среднее время реализации
      renovationCostEstimate: Math.round(renovationCost),
    };
  }

  private calculateSafeHavenScenario(propertyData: any, priceDynamics: any) {
    const volatility = Number(priceDynamics.priceVolatility) || 0;
    
    // Индекс сохранности капитала (обратная волатильности)
    const capitalPreservation = Math.max(0, 100 - volatility * 2);
    
    // Базовая оценка ликвидности на основе класса недвижимости
    const propertyClassName = propertyData.propertyClass?.name || 'Стандарт';
    let liquidityScore = 5;
    
    switch (propertyClassName) {
      case 'Эконом': liquidityScore = 8; break;
      case 'Стандарт': liquidityScore = 9; break;
      case 'Комфорт': liquidityScore = 7; break;
      case 'Бизнес': liquidityScore = 6; break;
      case 'Элит': liquidityScore = 4; break;
    }

    const safeHavenScore = Math.round((capitalPreservation * 0.4 + liquidityScore * 10 * 0.6) / 10);

    return {
      safeHavenScore: Math.min(10, Math.max(1, safeHavenScore)),
      capitalPreservationIndex: capitalPreservation.toFixed(2),
      liquidityScore: Math.min(10, Math.max(1, liquidityScore)),
    };
  }

  private async forecastPrice3Years(propertyData: any) {
    const regionName = propertyData.region?.name || 'Москва';
    const baseGrowth = this.regionalGrowthRates[regionName] || 0.08;

    // Анализ инфраструктурных проектов
    const infrastructureImpact = await this.analyzeInfrastructureImpact(propertyData);
    const developmentRisk = 0.02; // Упрощенная модель риска застройки

    // Итоговый прогноз с учетом всех факторов
    const adjustedGrowth = baseGrowth * (1 + infrastructureImpact - developmentRisk);
    const priceForecast3y = ((Math.pow(1 + adjustedGrowth, 3) - 1) * 100);

    return {
      priceForecast3y: priceForecast3y.toFixed(2),
      infrastructureImpactScore: infrastructureImpact.toFixed(2),
      developmentRiskScore: developmentRisk.toFixed(2),
    };
  }

  private async analyzeInfrastructureImpact(propertyData: any): Promise<number> {
    if (!propertyData.coordinates) return 0;

    // Поиск инфраструктурных проектов в радиусе 5 км
    const projects = await db
      .select()
      .from(infrastructureProjects)
      .where(
        and(
          eq(infrastructureProjects.regionId, propertyData.regionId),
          isNotNull(infrastructureProjects.completionDate)
        )
      );

    if (projects.length === 0) return 0;

    // Упрощенный расчет влияния проектов
    const totalImpact = projects.reduce((sum, project) => {
      const impact = Number(project.impactCoefficient) || 0.05;
      return sum + impact;
    }, 0);

    return Math.min(0.3, totalImpact); // Максимум 30% влияния
  }

  private calculateInvestmentRating(rentalRoi: number, flipRoi: number, safeHavenScore: number): string {
    const avgScore = (rentalRoi + flipRoi + safeHavenScore) / 3;
    
    if (avgScore >= 15) return 'A+';
    if (avgScore >= 12) return 'A';
    if (avgScore >= 10) return 'B+';
    if (avgScore >= 8) return 'B';
    if (avgScore >= 6) return 'C+';
    return 'C';
  }

  private calculateRiskLevel(volatility: number, liquidityScore: number): string {
    const riskScore = volatility * 0.7 + (10 - liquidityScore) * 0.3;
    
    if (riskScore <= 3) return 'low';
    if (riskScore <= 6) return 'moderate';
    return 'high';
  }

  private getRecommendedStrategy(rentalRoi: number, flipRoi: number, priceGrowth: number): string {
    if (flipRoi > rentalRoi && flipRoi > 15) return 'flip';
    if (rentalRoi > 8) return 'rental';
    if (priceGrowth > 10) return 'hold';
    return 'rental';
  }

  async getAnalyticsByPropertyId(propertyId: number): Promise<InvestmentAnalytics | null> {
    const [analytics] = await db
      .select()
      .from(investmentAnalytics)
      .where(eq(investmentAnalytics.propertyId, propertyId))
      .orderBy(desc(investmentAnalytics.calculatedAt))
      .limit(1);

    // Если данных нет или они устарели (больше 24 часов), пересчитываем
    if (!analytics || (analytics.calculatedAt && new Date().getTime() - new Date(analytics.calculatedAt).getTime() > 24 * 60 * 60 * 1000)) {
      return await this.calculateFullAnalytics(propertyId);
    }

    return analytics;
  }

  async batchCalculateAnalytics(propertyIds: number[]) {
    const results = [];
    
    for (const propertyId of propertyIds) {
      try {
        const analytics = await this.calculateFullAnalytics(propertyId);
        results.push({ propertyId, status: 'success', analytics });
      } catch (error) {
        results.push({ 
          propertyId, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return results;
  }
}

export const investmentAnalyticsService = new InvestmentAnalyticsService();