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
  
  // Список разрешенных городов для загрузки объектов
  private allowedCities = [
    'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Нижний Новгород',
    'Казань', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону', 'Уфа', 'Красноярск',
    'Воронеж', 'Пермь', 'Волгоград', 'Краснодар', 'Саратов', 'Тюмень', 'Тольятти',
    'Ижевск', 'Барнаул', 'Ульяновск', 'Иркутск', 'Хабаровск', 'Ярославль',
    'Владивосток', 'Махачкала', 'Томск', 'Оренбург', 'Кемерово', 'Новокузнецк',
    'Рязань', 'Набережные Челны', 'Астрахань', 'Пенза', 'Липецк', 'Тула',
    'Киров', 'Чебоксары', 'Калининград', 'Курск', 'Улан-Удэ', 'Ставрополь',
    'Сочи', 'Тверь', 'Магнитогорск', 'Иваново', 'Брянск', 'Белгород', 'Сургут'
  ];

  /**
   * Проверяет, находится ли объект в разрешенном городе
   */
  private async isFromAllowedCity(property: PropertyWithRelations): Promise<boolean> {
    // Проверяем регион из базы данных
    if (property.region) {
      return this.allowedCities.includes(property.region.name);
    }

    // Если региона нет, проверяем по адресу
    if (property.address) {
      const address = property.address.toLowerCase();
      return this.allowedCities.some(city => 
        address.includes(city.toLowerCase()) || 
        address.includes(`г. ${city.toLowerCase()}`) ||
        address.includes(`город ${city.toLowerCase()}`)
      );
    }

    return false;
  }

  /**
   * Валидирует объект недвижимости по всем критериям
   */
  async validateProperty(property: PropertyWithRelations): Promise<boolean> {
    // 1. Проверка разрешенного города
    if (!(await this.isFromAllowedCity(property))) {
      console.log(`Property ${property.id} rejected: not from allowed city`);
      return false;
    }

    // 2. Проверка что объект предназначен для продажи (не аренды)
    if (!this.isForSale(property)) {
      console.log(`Property ${property.id} rejected: rental property, only sale properties allowed`);
      return false;
    }

    // 3. Проверка наличия достаточного количества фотографий
    if (!this.hasValidImages(property)) {
      console.log(`Property ${property.id} rejected: insufficient images`);
      return false;
    }

    // 4. Проверка цены относительно рыночной
    if (!await this.isValidPrice(property)) {
      console.log(`Property ${property.id} rejected: price deviation >20% from market`);
      return false;
    }

    // 5. Проверка обязательных полей
    if (!this.hasRequiredFields(property)) {
      console.log(`Property ${property.id} rejected: missing required fields`);
      return false;
    }

    return true;
  }

  /**
   * Проверяет что объект предназначен для продажи (не аренды)
   */
  private isForSale(property: PropertyWithRelations): boolean {
    // РАСШИРЕННЫЙ список ключевых слов указывающих на аренду
    const rentalKeywords = [
      'аренда', 'сдам', 'сдается', 'сдаю', 'снять', 'сниму', 'снимем',
      'арендовать', 'арендую', 'в аренду', 'долгосрочная аренда',
      'посуточно', 'на сутки', 'суточная аренда', 'краткосрочная аренда',
      'съем', 'съём', 'rental', 'rent', 'месяц', 'мес.', 'мес',
      'в месяц', '/мес', 'помесячно', 'ежемесячно', 'за месяц',
      'руб/мес', 'руб./мес', 'р/мес', 'р./мес', '₽/мес', '₽./мес',
      'тыс.руб/мес', 'тысяч в месяц', 'тыс/мес', 'тыс в месяц',
      'сдаётся', 'сдается в аренду', 'для аренды', 'под аренду',
      'на длительный срок', 'долгосрочно', 'квартира в аренду',
      'комната в аренду', 'студия в аренду', 'жилье в аренду'
    ];

    // Ключевые слова указывающие на продажу
    const saleKeywords = [
      'продам', 'продается', 'продаю', 'продажа', 'купить',
      'приобрести', 'владение', 'собственность', 'покупка',
      'sale', 'sell', 'млн', 'миллионов', 'тыс.'
    ];

    const title = property.title?.toLowerCase() || '';
    const description = property.description?.toLowerCase() || '';
    const fullText = `${title} ${description}`;

    // Проверяем наличие слов указывающих на аренду
    const hasRentalKeywords = rentalKeywords.some(keyword => 
      fullText.includes(keyword.toLowerCase())
    );

    // Если найдены признаки аренды, отклоняем
    if (hasRentalKeywords) {
      return false;
    }

    // Дополнительная проверка по цене - аренда обычно дешевле продажи
    const price = property.price || 0;
    
    // Если цена слишком низкая для продажи (менее 500,000 руб.), возможно это аренда
    if (price < 500000) {
      // Проверяем есть ли явные признаки продажи
      const hasSaleKeywords = saleKeywords.some(keyword => 
        fullText.includes(keyword.toLowerCase())
      );
      
      // Если цена низкая и нет явных признаков продажи, отклоняем
      if (!hasSaleKeywords) {
        return false;
      }
    }

    // URL может содержать информацию о типе объявления
    const url = property.url?.toLowerCase() || '';
    if (url.includes('rent') || url.includes('arenda') || url.includes('sdam')) {
      return false;
    }

    // По умолчанию считаем что это продажа
    return true;
  }

  /**
   * Проверяет наличие достаточного количества фотографий (минимум 2)
   */
  private hasValidImages(property: PropertyWithRelations): boolean {
    const imageUrl = property.imageUrl;
    
    if (!imageUrl) return false;
    
    let imageList: string[] = [];
    
    if (typeof imageUrl === 'string') {
      try {
        const parsed = JSON.parse(imageUrl);
        if (Array.isArray(parsed)) {
          imageList = parsed;
        } else if (parsed.imgurl) {
          imageList = [parsed.imgurl];
        } else if (typeof parsed === 'string') {
          imageList = [parsed];
        }
      } catch {
        // Если не JSON, считаем что это одна ссылка
        imageList = imageUrl.split(',').map(url => url.trim()).filter(url => url.length > 0);
      }
    }

    // Фильтруем валидные URL изображений
    const validImages = imageList.filter(url => {
      if (!url || typeof url !== 'string') return false;
      
      // Проверяем что это валидный URL изображения
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const lowerUrl = url.toLowerCase();
      
      return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
             lowerUrl.includes('image') || 
             lowerUrl.includes('photo') ||
             lowerUrl.includes('cdn-cian') ||
             lowerUrl.includes('imgurl');
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
      
      // Допустимое отклонение: ±20% от средней цены
      const minAllowedPrice = avgPrice * 0.8;
      const maxAllowedPrice = avgPrice * 1.2;

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
    invalidCity: number;
    rentalProperties: number;
  }> {
    const { properties } = await storage.getProperties({}, { page: 1, perPage: 10000 });
    
    let valid = 0;
    let invalidPrice = 0;
    let invalidImages = 0;
    let invalidFields = 0;
    let invalidCity = 0;
    let rentalProperties = 0;

    for (const property of properties) {
      if (!(await this.isFromAllowedCity(property))) {
        invalidCity++;
        continue;
      }

      if (!this.isForSale(property)) {
        rentalProperties++;
        continue;
      }

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
      invalidFields,
      invalidCity,
      rentalProperties
    };
  }
}