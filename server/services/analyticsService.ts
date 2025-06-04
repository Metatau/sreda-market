import { storage } from "../storage";

export class AnalyticsService {
  async getDistrictAnalytics(regionId?: number) {
    return await storage.getDistrictAnalytics(regionId);
  }

  async getMarketOverview(regionId?: number) {
    const properties = await storage.getProperties({ regionId, limit: 1000 });
    const districts = await storage.getDistrictAnalytics(regionId);

    const totalProperties = properties.total;
    const avgPrice = properties.properties.reduce((sum, p) => sum + p.price, 0) / properties.properties.length;
    const avgPricePerSqm = properties.properties.reduce((sum, p) => sum + (p.pricePerSqm || 0), 0) / properties.properties.length;
    
    // Calculate average ROI from analytics
    const avgRoi = properties.properties
      .filter(p => p.analytics?.roi)
      .reduce((sum, p) => sum + Number(p.analytics!.roi), 0) / 
      properties.properties.filter(p => p.analytics?.roi).length || 12.3;

    return {
      totalProperties,
      avgPrice: Math.round(avgPrice),
      avgPricePerSqm: Math.round(avgPricePerSqm),
      avgRoi: Math.round(avgRoi * 100) / 100,
      districtCount: districts.length,
      priceRange: {
        min: Math.min(...properties.properties.map(p => p.price)),
        max: Math.max(...properties.properties.map(p => p.price)),
      },
    };
  }

  async getInvestmentMap(regionId?: number) {
    const districts = await storage.getDistrictAnalytics(regionId);
    
    return districts.map(district => ({
      district: district.district,
      avgPrice: Math.round(Number(district.avgPrice)),
      avgPricePerSqm: Math.round(Number(district.avgPricePerSqm)),
      totalProperties: Number(district.totalProperties),
      avgRoi: Math.round(Number(district.avgRoi || 10) * 100) / 100,
      investmentScore: this.calculateInvestmentScore(district),
    }));
  }

  private calculateInvestmentScore(district: any): number {
    const roi = Number(district.avgRoi || 10);
    const pricePerSqm = Number(district.avgPricePerSqm);
    const propertyCount = Number(district.totalProperties);

    // Score based on ROI (40%), price accessibility (30%), market liquidity (30%)
    const roiScore = Math.min(roi / 20 * 40, 40); // Max 40 points
    const priceScore = Math.max(30 - (pricePerSqm / 300000 * 30), 0); // Cheaper is better
    const liquidityScore = Math.min(propertyCount / 50 * 30, 30); // More properties = more liquid

    return Math.round(roiScore + priceScore + liquidityScore);
  }

  async getPriceHistory(regionId?: number, days: number = 30) {
    // Mock price history data - in real app would come from historical data
    const dates = [];
    const prices = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
      
      // Generate realistic price trend
      const basePrice = 180000;
      const trend = Math.sin(i / 10) * 5000 + Math.random() * 3000;
      prices.push(Math.round(basePrice + trend));
    }

    return {
      dates,
      prices,
      change: prices[prices.length - 1] - prices[0],
      changePercent: ((prices[prices.length - 1] - prices[0]) / prices[0] * 100).toFixed(2),
    };
  }
}

export const analyticsService = new AnalyticsService();
