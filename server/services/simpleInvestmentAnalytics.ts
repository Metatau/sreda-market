import { db } from "../db";
import { 
  properties, 
  regions, 
  propertyClasses, 
  investmentAnalytics,
  type InvestmentAnalytics,
  type InsertInvestmentAnalytics
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export class SimpleInvestmentAnalyticsService {
  async calculateAnalytics(propertyId: number): Promise<InvestmentAnalytics> {
    // Get property data
    const [propertyData] = await db
      .select()
      .from(properties)
      .leftJoin(regions, eq(properties.regionId, regions.id))
      .leftJoin(propertyClasses, eq(properties.propertyClassId, propertyClasses.id))
      .where(eq(properties.id, propertyId));

    if (!propertyData) {
      throw new Error(`Property with id ${propertyId} not found`);
    }

    const property = propertyData.properties;
    const region = propertyData.regions;
    const propertyClass = propertyData.property_classes;

    // Calculate basic metrics
    const price = property.price;
    const area = parseFloat(property.area?.toString() || '50');
    const pricePerSqm = property.pricePerSqm || Math.round(price / area);

    // Rental scenario calculation
    const baseYield = this.getRegionalYield(region?.name || 'Москва');
    const monthlyRental = Math.round(price * baseYield / 12);
    const annualRental = monthlyRental * 12;
    
    // Estimated expenses (simplified calculation)
    const annualExpenses = Math.round(annualRental * 0.3); // 30% of rental income
    const netAnnualIncome = annualRental - annualExpenses;
    const rentalRoi = (netAnnualIncome / price) * 100;
    const paybackYears = price / netAnnualIncome;

    // Flipping scenario calculation
    const renovationCost = this.getRenovationCost(propertyClass?.name || 'Стандарт', area);
    const valueIncrease = this.getValueIncrease(propertyClass?.name || 'Стандарт', price);
    const transactionCosts = price * 0.06; // 6% transaction costs
    const totalInvestment = price + renovationCost + transactionCosts;
    const expectedSalePrice = price + valueIncrease;
    const flipProfit = expectedSalePrice - totalInvestment;
    const flipRoi = (flipProfit / totalInvestment) * 100;

    // Price forecast (simplified)
    const regionalGrowth = this.getRegionalGrowth(region?.name || 'Москва');
    const forecast3y = ((Math.pow(1 + regionalGrowth, 3) - 1) * 100);

    // Risk and liquidity assessment
    const liquidityScore = this.getLiquidityScore(propertyClass?.name || 'Стандарт');
    const volatility = Math.random() * 15 + 5; // 5-20% volatility range
    const capitalPreservation = Math.max(0, 100 - volatility * 2);
    const safeHavenScore = Math.round((capitalPreservation * 0.4 + liquidityScore * 10 * 0.6) / 10);

    // Investment rating
    const avgScore = (rentalRoi + flipRoi + safeHavenScore) / 3;
    const investmentRating = this.getInvestmentRating(avgScore);
    const riskLevel = this.getRiskLevel(volatility, liquidityScore);
    const recommendedStrategy = this.getRecommendedStrategy(rentalRoi, flipRoi, forecast3y);

    // Create analytics data
    const analyticsData: InsertInvestmentAnalytics = {
      propertyId,
      priceChange1y: "8.50", // Mock historical data
      priceChange3m: "2.30",
      priceVolatility: volatility.toFixed(2),
      rentalYield: rentalRoi.toFixed(2),
      rentalIncomeMonthly: monthlyRental,
      rentalRoiAnnual: rentalRoi.toFixed(2),
      rentalPaybackYears: paybackYears.toFixed(1),
      flipPotentialProfit: Math.round(flipProfit),
      flipRoi: flipRoi.toFixed(2),
      flipTimeframeMonths: 8,
      renovationCostEstimate: Math.round(renovationCost),
      safeHavenScore: Math.min(10, Math.max(1, safeHavenScore)),
      capitalPreservationIndex: capitalPreservation.toFixed(2),
      liquidityScore: Math.min(10, Math.max(1, liquidityScore)),
      priceForecast3y: forecast3y.toFixed(2),
      infrastructureImpactScore: "0.08",
      developmentRiskScore: "0.02",
      investmentRating,
      riskLevel,
      recommendedStrategy,
    };

    // Check if analytics already exist for this property
    const [existing] = await db
      .select()
      .from(investmentAnalytics)
      .where(eq(investmentAnalytics.propertyId, propertyId))
      .limit(1);

    let result;
    if (existing) {
      // Update existing record
      [result] = await db
        .update(investmentAnalytics)
        .set({
          ...analyticsData,
          calculatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .where(eq(investmentAnalytics.propertyId, propertyId))
        .returning();
    } else {
      // Insert new record
      [result] = await db
        .insert(investmentAnalytics)
        .values({
          ...analyticsData,
          calculatedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .returning();
    }

    return result;
  }

  async getAnalytics(propertyId: number): Promise<InvestmentAnalytics | null> {
    const [analytics] = await db
      .select()
      .from(investmentAnalytics)
      .where(eq(investmentAnalytics.propertyId, propertyId))
      .orderBy(desc(investmentAnalytics.calculatedAt))
      .limit(1);

    // If no analytics or older than 24 hours, recalculate
    if (!analytics || (analytics.calculatedAt && new Date().getTime() - new Date(analytics.calculatedAt).getTime() > 24 * 60 * 60 * 1000)) {
      return await this.calculateAnalytics(propertyId);
    }

    return analytics;
  }

  private getRegionalYield(regionName: string): number {
    const yields: Record<string, number> = {
      'Москва': 0.074,
      'Санкт-Петербург': 0.064,
      'Екатеринбург': 0.078,
      'Новосибирск': 0.075,
      'Краснодар': 0.081,
    };
    return yields[regionName] || 0.066;
  }

  private getRenovationCost(propertyClass: string, area: number): number {
    const costsPerSqm: Record<string, number> = {
      'Эконом': 15000,
      'Стандарт': 25000,
      'Комфорт': 35000,
      'Бизнес': 50000,
      'Элит': 80000,
    };
    return (costsPerSqm[propertyClass] || 25000) * area;
  }

  private getValueIncrease(propertyClass: string, price: number): number {
    const increasePercent: Record<string, number> = {
      'Эконом': 15,
      'Стандарт': 20,
      'Комфорт': 25,
      'Бизнес': 30,
      'Элит': 35,
    };
    return price * (increasePercent[propertyClass] || 20) / 100;
  }

  private getRegionalGrowth(regionName: string): number {
    const growth: Record<string, number> = {
      'Москва': 0.08,
      'Санкт-Петербург': 0.07,
      'Екатеринбург': 0.09,
      'Новосибирск': 0.08,
      'Краснодар': 0.11,
    };
    return growth[regionName] || 0.08;
  }

  private getLiquidityScore(propertyClass: string): number {
    const scores: Record<string, number> = {
      'Эконом': 8,
      'Стандарт': 9,
      'Комфорт': 7,
      'Бизнес': 6,
      'Элит': 4,
    };
    return scores[propertyClass] || 5;
  }

  private getInvestmentRating(avgScore: number): string {
    if (avgScore >= 15) return 'A+';
    if (avgScore >= 12) return 'A';
    if (avgScore >= 10) return 'B+';
    if (avgScore >= 8) return 'B';
    if (avgScore >= 6) return 'C+';
    return 'C';
  }

  private getRiskLevel(volatility: number, liquidityScore: number): string {
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
}

export const simpleInvestmentAnalyticsService = new SimpleInvestmentAnalyticsService();