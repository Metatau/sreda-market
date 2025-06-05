import { storage } from '../storage';
import type { Property, PropertyWithRelations } from '../storage';

interface MarketPriceData {
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  count: number;
  pricePerSqm: number;
}

export class PropertyValidationService {
  
  /**
   * Валидирует объект недвижимости по всем критериям
   */
  async validateProperty(property: PropertyWithRelations): Promise<boolean> {
    // 1. Проверка наличия достаточного количества фотографий
    if (!this.hasValidImages(property)) {
      console.log(`Property ${property.id} rejected: insufficient images`);
      return false;
    }

    // 2. Проверка цены относительно рыночной
    if (!await this.isValidPrice(property)) {
      console.log(`Property ${property.id} rejected: price deviation from market`);
      return false;
    }

    // 3. Проверка обязательных полей
    if (!this.hasRequiredFields(property)) {
      console.log(`Property ${property.id} rejected: missing required fields`);
      return false;
    }

    return true;
  }

  /**
   * Проверяет наличие достаточного количества фотографий (минимум 2)
   */
  private hasValidImages(property: PropertyWithRelations): boolean {
    const images = property.images;
    
    if (!images) return false;
    
    let imageList: string[] = [];
    
    if (typeof images === 'string') {
      try {
        imageList = JSON.parse(images);
      } catch {
        // Если не JSON, считаем что это одна ссылка
        imageList = images.split(',').map(url => url.trim()).filter(url => url.length > 0);
      }
    } else if (Array.isArray(images)) {
      imageList = images;
    }

    // Фильтруем валидные URL изображений
    const validImages = imageList.filter(url => {
      if (!url || typeof url !== 'string') return false;
      
      // Проверяем что это валидный URL изображения
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const lowerUrl = url.toLowerCase();
      
      return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
             lowerUrl.includes('image') || 
             lowerUrl.includes('photo');
    });

    return validImages.length >= 2;
  }

  /**
   * Проверяет валидность цены относительно рыночной
   */
  private async isValidPrice(property: PropertyWithRelations): Promise<boolean> {
    try {
      const marketData = await this.getMarketPriceData(
        property.regionId,
        property.propertyClassId,
        property.rooms,
        property.marketType
      );

      if (!marketData || marketData.count < 3) {
        // Если недостаточно данных для сравнения, пропускаем валидацию цены
        return true;
      }

      const propertyPrice = property.price;
      const avgPrice = marketData.avgPrice;
      
      // Допустимое отклонение: ±50% от средней цены
      const minAllowedPrice = avgPrice * 0.5;
      const maxAllowedPrice = avgPrice * 1.5;

      const isValidPrice = propertyPrice >= minAllowedPrice && propertyPrice <= maxAllowedPrice;

      if (!isValidPrice) {
        console.log(`Price validation failed for property ${property.id}:`);
        console.log(`Property price: ${propertyPrice}, Market avg: ${avgPrice}`);
        console.log(`Allowed range: ${minAllowedPrice} - ${maxAllowedPrice}`);
      }

      return isValidPrice;
    } catch (error) {
      console.error(`Error validating price for property ${property.id}:`, error);
      // В случае ошибки считаем цену валидной
      return true;
    }
  }

  /**
   * Получает рыночные данные по ценам для сравнения
   */
  private async getMarketPriceData(
    regionId: number,
    propertyClassId: number | null,
    rooms: number | null,
    marketType: string | null
  ): Promise<MarketPriceData | null> {
    try {
      const filters: any = { regionId };
      
      if (propertyClassId) filters.propertyClassId = propertyClassId;
      if (rooms) filters.rooms = rooms;
      if (marketType) filters.marketType = marketType;

      const { properties } = await storage.getProperties(filters, { page: 1, perPage: 1000 });

      if (properties.length === 0) {
        return null;
      }

      const prices = properties.map(p => p.price).filter(price => price > 0);
      const pricesPerSqm = properties
        .filter(p => p.area && p.area > 0)
        .map(p => p.price / p.area!)
        .filter(price => price > 0);

      if (prices.length === 0) {
        return null;
      }

      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPricePerSqm = pricesPerSqm.length > 0 
        ? pricesPerSqm.reduce((sum, price) => sum + price, 0) / pricesPerSqm.length 
        : 0;

      return {
        avgPrice,
        minPrice,
        maxPrice,
        count: prices.length,
        pricePerSqm: avgPricePerSqm
      };
    } catch (error) {
      console.error('Error getting market price data:', error);
      return null;
    }
  }

  /**
   * Проверяет наличие обязательных полей
   */
  private hasRequiredFields(property: PropertyWithRelations): boolean {
    // Обязательные поля для валидного объекта
    const requiredFields = [
      property.title,
      property.price,
      property.address,
      property.regionId
    ];

    const hasAllRequired = requiredFields.every(field => 
      field !== null && field !== undefined && field !== ''
    );

    if (!hasAllRequired) {
      console.log(`Property ${property.id} missing required fields`);
      return false;
    }

    // Проверка валидности цены
    if (property.price <= 0 || property.price > 1000000000) {
      console.log(`Property ${property.id} has invalid price: ${property.price}`);
      return false;
    }

    // Проверка валидности площади (если указана)
    if (property.area && (property.area <= 0 || property.area > 1000)) {
      console.log(`Property ${property.id} has invalid area: ${property.area}`);
      return false;
    }

    // Проверка валидности этажа (если указан)
    if (property.floor && property.totalFloors) {
      if (property.floor > property.totalFloors || property.floor <= 0) {
        console.log(`Property ${property.id} has invalid floor data: ${property.floor}/${property.totalFloors}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Получает статистику валидации для отчетности
   */
  async getValidationStats(): Promise<{
    total: number;
    valid: number;
    invalidPrice: number;
    invalidImages: number;
    invalidFields: number;
  }> {
    const { properties } = await storage.getProperties({}, { page: 1, perPage: 10000 });
    
    let valid = 0;
    let invalidPrice = 0;
    let invalidImages = 0;
    let invalidFields = 0;

    for (const property of properties) {
      if (!this.hasRequiredFields(property)) {
        invalidFields++;
        continue;
      }

      if (!this.hasValidImages(property)) {
        invalidImages++;
        continue;
      }

      if (!await this.isValidPrice(property)) {
        invalidPrice++;
        continue;
      }

      valid++;
    }

    return {
      total: properties.length,
      valid,
      invalidPrice,
      invalidImages,
      invalidFields
    };
  }
}