import { storage } from "../storage";
import { getPropertyRecommendations } from "./openai";

export class PropertyService {
  async searchProperties(filters: any) {
    return await storage.getProperties(filters);
  }

  async getPropertyById(id: number) {
    return await storage.getProperty(id);
  }

  async getMapData(filters?: { regionId?: number; propertyClassId?: number }) {
    return await storage.getMapData(filters);
  }

  async getAIRecommendations(query: string) {
    const regions = await storage.getRegions();
    const propertyClasses = await storage.getPropertyClasses();
    
    const regionNames = regions.map(r => r.name);
    const classNames = propertyClasses.map(c => c.name);

    const recommendations = await getPropertyRecommendations(
      query,
      regionNames,
      classNames
    );

    // Convert recommendations to search filters
    const searchFilters: any = {};

    // Map districts to regions
    if (recommendations.recommendations.districts.length > 0) {
      const region = regions.find(r => 
        recommendations.recommendations.districts.some(d => 
          r.name.toLowerCase().includes(d.toLowerCase()) ||
          d.toLowerCase().includes(r.name.toLowerCase())
        )
      );
      if (region) {
        searchFilters.regionId = region.id;
      }
    }

    // Map property classes
    if (recommendations.recommendations.propertyClass.length > 0) {
      const propertyClass = propertyClasses.find(c =>
        recommendations.recommendations.propertyClass.some(rc =>
          c.name.toLowerCase().includes(rc.toLowerCase())
        )
      );
      if (propertyClass) {
        searchFilters.propertyClassId = propertyClass.id;
      }
    }

    // Set price range
    if (recommendations.recommendations.priceRange.min > 0) {
      searchFilters.minPrice = recommendations.recommendations.priceRange.min;
    }
    if (recommendations.recommendations.priceRange.max > 0) {
      searchFilters.maxPrice = recommendations.recommendations.priceRange.max;
    }

    // Search with AI-derived filters
    const searchResults = await this.searchProperties(searchFilters);

    return {
      recommendations,
      properties: searchResults.properties.slice(0, 10), // Limit to top 10
      filters: searchFilters,
    };
  }

  async calculateInvestmentMetrics(propertyId: number) {
    const property = await storage.getProperty(propertyId);
    if (!property) {
      throw new Error("Property not found");
    }

    // Simple ROI calculation
    const estimatedRent = Math.round(property.price * 0.006); // 0.6% of price per month
    const monthlyExpenses = Math.round(property.price * 0.002); // 0.2% for expenses
    const netMonthlyIncome = estimatedRent - monthlyExpenses;
    const annualIncome = netMonthlyIncome * 12;
    const roi = (annualIncome / property.price) * 100;

    // Liquidity score based on property class and location
    let liquidityScore = 5;
    if (property.propertyClass?.name === "Эконом") liquidityScore = 8;
    if (property.propertyClass?.name === "Стандарт") liquidityScore = 9;
    if (property.propertyClass?.name === "Комфорт") liquidityScore = 7;
    if (property.propertyClass?.name === "Бизнес") liquidityScore = 6;
    if (property.propertyClass?.name === "Элит") liquidityScore = 4;

    // Price growth estimation
    const priceGrowthRate = Math.random() * 15 + 5; // 5-20% range

    return {
      propertyId,
      estimatedRent,
      monthlyExpenses,
      netMonthlyIncome,
      annualIncome,
      roi: Math.round(roi * 100) / 100,
      liquidityScore,
      priceGrowthRate: Math.round(priceGrowthRate * 100) / 100,
      paybackPeriod: Math.round((property.price / annualIncome) * 100) / 100,
    };
  }
}

export const propertyService = new PropertyService();
