const { storage } = require('../storage');

class PropertyValidationService {
  
  /**
   * Валидирует объект недвижимости по всем критериям
   */
  async validateProperty(property) {
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
  hasValidImages(property) {
    // Получаем изображения из поля description или images
    const description = property.description || '';
    const imageUrls = [];
    
    // Ищем ссылки на изображения в описании
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;
    const matches = description.match(urlRegex);
    
    if (matches) {
      imageUrls.push(...matches);
    }

    // Проверяем поле images если оно есть
    if (property.images) {
      try {
        let images = property.images;
        if (typeof images === 'string') {
          images = JSON.parse(images);
        }
        if (Array.isArray(images)) {
          imageUrls.push(...images);
        }
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }

    return imageUrls.length >= 2;
  }

  /**
   * Проверяет валидность цены относительно рыночной
   */
  async isValidPrice(property) {
    try {
      const marketData = await this.getMarketPriceData(
        property.regionId,
        property.propertyClassId,
        property.rooms,
        property.marketType
      );

      if (!marketData || marketData.count < 3) {
        // Если недостаточно данных для сравнения, считаем цену валидной
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
  async getMarketPriceData(regionId, propertyClassId, rooms, marketType) {
    try {
      const filters = { regionId };
      
      if (propertyClassId) filters.propertyClassId = propertyClassId;
      if (rooms) filters.rooms = rooms;
      if (marketType) filters.marketType = marketType;

      const { properties } = await storage.getProperties(filters, { page: 1, perPage: 1000 });

      if (properties.length === 0) {
        return null;
      }

      const prices = properties.map(p => p.price).filter(price => price > 0);

      if (prices.length === 0) {
        return null;
      }

      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      return {
        avgPrice,
        minPrice,
        maxPrice,
        count: prices.length
      };
    } catch (error) {
      console.error('Error getting market price data:', error);
      return null;
    }
  }

  /**
   * Проверяет наличие обязательных полей
   */
  hasRequiredFields(property) {
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

    return true;
  }
}

module.exports = { PropertyValidationService };