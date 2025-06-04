import { storage } from "../storage";
import type { PropertyClass } from "@shared/schema";

export async function classifyProperty(pricePerSqm: number): Promise<PropertyClass | null> {
  try {
    const propertyClasses = await storage.getPropertyClasses();
    
    for (const propertyClass of propertyClasses) {
      if (pricePerSqm >= propertyClass.minPricePerSqm && pricePerSqm <= propertyClass.maxPricePerSqm) {
        return propertyClass;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error classifying property:", error);
    return null;
  }
}

export function calculateROI(price: number, monthlyRent: number, expenses: number = 0): number {
  const annualIncome = (monthlyRent - expenses) * 12;
  return (annualIncome / price) * 100;
}

export function calculateLiquidityScore(
  region: string,
  propertyClass: string,
  floor: number,
  totalFloors: number,
  metroDistance?: number
): number {
  let score = 5; // Base score

  // Region factor
  if (['Москва', 'Санкт-Петербург'].includes(region)) {
    score += 2;
  } else if (['Московская область', 'Ленинградская область'].includes(region)) {
    score += 1;
  }

  // Property class factor
  switch (propertyClass) {
    case 'Элит':
      score += 1;
      break;
    case 'Бизнес':
      score += 2;
      break;
    case 'Комфорт':
      score += 2;
      break;
    case 'Стандарт':
      score += 1;
      break;
    case 'Эконом':
      score += 0;
      break;
  }

  // Floor factor
  if (floor > 1 && floor < totalFloors && floor <= 7) {
    score += 1;
  }

  // Metro distance factor
  if (metroDistance && metroDistance <= 10) {
    score += 1;
  }

  return Math.min(Math.max(score, 1), 10);
}

export function estimateMarketTrend(propertyClass: string, region: string): string {
  // Simplified market trend estimation
  const majorCities = ['Москва', 'Санкт-Петербург'];
  const growthClasses = ['Бизнес', 'Элит'];
  
  if (majorCities.includes(region) && growthClasses.includes(propertyClass)) {
    return 'growing';
  } else if (majorCities.includes(region)) {
    return 'stable';
  } else {
    return 'uncertain';
  }
}
