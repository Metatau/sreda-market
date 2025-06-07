import { storage } from '../storage';
import type { InsertProperty } from '../../shared/schema';

interface AdsApiProperty {
  id: string;
  title: string;
  price: number;
  area?: number;
  rooms?: number;
  floor?: number;
  totalFloors?: number;
  address?: string;
  description?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  images?: string[];
  propertyType?: string;
  region?: string;
  district?: string;
  createdAt?: string;
  updatedAt?: string;
  // Добавляем поля из реальной структуры ads-api.ru
  city?: string;
  category?: string;
  url?: string;
  source?: string;
  [key: string]: any; // Для дополнительных полей
}

interface AdsApiResponse {
  data: AdsApiProperty[];
  pagination: {
    page: number;
    totalPages: number;
    totalItems: number;
  };
}

export class AdsApiService {
  private baseUrl: string;
  private apiKey: string;
  private userEmail: string;
  private lastRequestTime: number = 0;
  private readonly rateLimitMs = 10000; // 10 секунд между запросами для избежания 429 ошибок

  constructor() {
    this.baseUrl = 'https://ads-api.ru/main';
    this.apiKey = process.env.ADS_API_KEY || '1699b3bd91f1529aaeb9797a951cde4b';
    this.userEmail = process.env.ADS_API_EMAIL || '';

    console.log('ADS API Configuration:');
    console.log('Base URL:', this.baseUrl);
    console.log('Access Token:', this.apiKey ? this.apiKey.substring(0, 8) + '...' : 'Not configured');
    console.log('Login:', this.userEmail || 'Not configured');
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, any>, credentials?: { email: string; password: string }): Promise<T> {
    return this.makeRequestWithRetry<T>(endpoint, params, credentials, 3);
  }

  private async makeRequestWithRetry<T>(endpoint: string, params?: Record<string, any>, credentials?: { email: string; password: string }, maxRetries: number = 3): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Соблюдаем лимит частоты запросов
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitMs) {
          const waitTime = this.rateLimitMs - timeSinceLastRequest;
          console.log(`Rate limit: waiting ${waitTime}ms before next request (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();

        const url = new URL(`${this.baseUrl}${endpoint}`);
        
        // Добавляем обязательные параметры для ads-api.ru согласно документации
        const userEmail = credentials?.email || this.userEmail;
        const token = this.apiKey;
        
        if (!userEmail || !token) {
          throw new Error('ADS API requires user email and token for authentication');
        }
        
        // Обязательные параметры согласно документации ads-api.ru
        url.searchParams.set('user', userEmail);
        url.searchParams.set('token', token);
        url.searchParams.set('format', 'json');
        
        // Добавляем обязательные параметры для получения объявлений о недвижимости
        if (endpoint === '/api') {
          url.searchParams.set('category_id', '1'); // Недвижимость
        }
        
        // Добавляем дополнительные параметры
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.set(key, String(value));
            }
          });
        }

        // Скрываем конфиденциальные данные в логах
        const sanitizedUrl = url.toString().replace(token, '[TOKEN]').replace(userEmail, '[EMAIL]');
        console.log(`Making ADS API request to: ${sanitizedUrl}`);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SREDA-Market/1.0'
          }
        });

        console.log(`ADS API response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          
          // Обрабатываем специально ошибку лимита частоты для повторной попытки
          if (response.status === 429) {
            console.warn(`ADS API rate limit exceeded on attempt ${attempt}/${maxRetries}`);
            if (attempt < maxRetries) {
              const retryDelay = this.rateLimitMs * attempt; // Экспоненциальная задержка
              console.log(`Waiting ${retryDelay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue; // Повторяем попытку
            }
            throw new Error('Rate limit exceeded after all retry attempts');
          }
          
          console.error('ADS API Error Response:', errorText.substring(0, 500));
          throw new Error(`ADS API error: ${response.status} ${response.statusText}`);
        }

        const responseText = await response.text();
        
        try {
          const jsonResponse = JSON.parse(responseText) as T;
          console.log(`ADS API response parsed successfully on attempt ${attempt}`);
          return jsonResponse;
        } catch (error) {
          console.error('Failed to parse ADS API JSON response:', responseText.substring(0, 200));
          throw new Error(`Invalid JSON response from ADS API`);
        }
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        
        if (attempt < maxRetries && lastError.message.includes('Rate limit exceeded')) {
          continue;
        }
        
        if (attempt >= maxRetries) {
          break;
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  async fetchProperties(filters?: {
    city?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }, credentials?: { email: string; password: string }): Promise<AdsApiResponse> {
    const params: Record<string, any> = {
      is_actual: '1', // Только актуальные объявления
      limit: Math.min(filters?.limit || 50, 1000), // Уменьшаем лимит для более качественной фильтрации
    };

    // Добавляем поддерживаемые фильтры согласно документации ads-api.ru
    if (filters?.city) params.city = filters.city;

    return this.makeRequest<AdsApiResponse>('/api', params, credentials);
  }

  async getProperty(externalId: string): Promise<AdsApiProperty> {
    const params = {
      id: externalId,
      is_actual: '1'
    };
    
    const response = await this.makeRequest<AdsApiResponse>('/api', params);
    
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    
    throw new Error(`Property with ID ${externalId} not found`);
  }

  private async mapPropertyClass(propertyType: string, pricePerSqm: number): Promise<number | null> {
    const propertyClasses = await storage.getPropertyClasses();
    
    // Определяем класс недвижимости по цене за м²
    const matchingClass = propertyClasses.find(pc => 
      pricePerSqm >= pc.minPricePerSqm && pricePerSqm <= pc.maxPricePerSqm
    );

    return matchingClass?.id || null;
  }

  private async mapRegion(regionName: string, district: string): Promise<number | null> {
    const regions = await storage.getRegions();
    
    // Очищаем и нормализуем названия
    const cleanRegionName = regionName.toLowerCase().trim();
    const cleanDistrict = district?.toLowerCase().trim() || '';
    
    // Карта маппинга регионов/республик на города в базе данных
    const regionMapping: Record<string, string> = {
      'татарстан': 'казань',
      'республика татарстан': 'казань',
      'башкортостан': 'уфа',
      'республика башкортостан': 'уфа',
      'свердловская область': 'екатеринбург',
      'ленинградская область': 'санкт-петербург',
      'московская область': 'москва',
      'новосибирская область': 'новосибирск',
      'калининградская область': 'калининград',
      'красноярский край': 'красноярск',
      'пермский край': 'пермь',
      'тюменская область': 'тюмень',
      'краснодарский край': 'сочи'
    };
    
    // Применяем маппинг если есть соответствие
    let targetRegionName = regionMapping[cleanRegionName] || cleanRegionName;
    
    // Сначала точное совпадение
    let matchingRegion = regions.find(r => 
      r.name.toLowerCase() === targetRegionName
    );
    
    // Если точного совпадения нет, ищем частичное
    if (!matchingRegion) {
      matchingRegion = regions.find(r => 
        r.name.toLowerCase().includes(targetRegionName) ||
        targetRegionName.includes(r.name.toLowerCase())
      );
    }
    
    // Проверяем также район, если есть
    if (!matchingRegion && cleanDistrict) {
      const targetDistrict = regionMapping[cleanDistrict] || cleanDistrict;
      matchingRegion = regions.find(r => 
        r.name.toLowerCase().includes(targetDistrict) ||
        targetDistrict.includes(r.name.toLowerCase())
      );
    }

    if (matchingRegion) {
      console.log(`Mapped region "${regionName}" to database region "${matchingRegion.name}" (ID: ${matchingRegion.id})`);
    } else {
      console.log(`No matching region found for "${regionName}" -> "${targetRegionName}" in database`);
    }

    return matchingRegion?.id || null;
  }

  private convertAdsPropertyToInsert(adsProperty: AdsApiProperty): Promise<InsertProperty> {
    return this.convertAdsProperty(adsProperty);
  }

  private extractValidImageUrl(adsProperty: AdsApiProperty): string | null {
    const images = this.extractValidImages(adsProperty);
    return images.length > 0 ? images[0] : null;
  }

  private extractValidImages(adsProperty: AdsApiProperty): string[] {
    const images: string[] = [];
    
    // Проверяем поле images
    if (Array.isArray(adsProperty.images)) {
      images.push(...adsProperty.images);
    }
    
    // Проверяем другие возможные поля с изображениями из ADS API
    const imageFields = ['photos', 'photo', 'img', 'picture', 'pictures', 'image_urls', 'imgs'];
    for (const field of imageFields) {
      const fieldValue = (adsProperty as any)[field];
      if (Array.isArray(fieldValue)) {
        images.push(...fieldValue);
      } else if (typeof fieldValue === 'string' && fieldValue.trim()) {
        images.push(fieldValue);
      }
    }
    
    // Удаляем placeholder изображения - используем только аутентичные данные
    
    // Фильтруем и очищаем URL изображений
    return images
      .filter(img => typeof img === 'string' && img.trim())
      .map(img => img.trim())
      .filter(img => 
        img.startsWith('http') && 
        (img.includes('.jpg') || img.includes('.jpeg') || img.includes('.png') || img.includes('.webp'))
      )
      .slice(0, 5); // Ограничиваем до 5 изображений
  }

  private isRentalProperty(adsProperty: AdsApiProperty): boolean {
    // РАСШИРЕННЫЙ список ключевых слов для блокировки аренды
    const rentalKeywords = [
      'аренда', 'сдам', 'сдается', 'сдаю', 'снять', 'сниму', 'снимем',
      'арендовать', 'арендую', 'в аренду', 'долгосрочная аренда',
      'посуточно', 'на сутки', 'суточная аренда', 'краткосрочная аренда',
      'съем', 'съём', 'rental', 'rent', 'месяц', 'мес.', 'мес',
      'в месяц', '/мес', 'помесячно', 'ежемесячно', 'за месяц',
      'руб/мес', 'руб./мес', 'р/мес', 'р./мес', '₽/мес', '₽./мес',
      'тыс.руб/мес', 'тысяч в месяц', 'тыс/мес', 'тыс в месяц',
      'сдаётся', 'сдается в аренду', 'для аренды', 'под аренду',
      'квартиросъемщик', 'квартиросъёмщик', 'снимаю', 'ищу квартиру',
      'на длительный период', 'долгосрочно', 'семейная пара снимет',
      'сдается комната', 'сдаю комнату', 'комната в аренду',
      '₽ в месяц', 'рублей в месяц', 'тысяч рублей в месяц'
    ];

    const title = (adsProperty.title || '').toLowerCase();
    const description = (adsProperty.description || '').toLowerCase();
    const url = (adsProperty.url || '').toLowerCase();
    const category = (adsProperty.category || '').toLowerCase();
    const fullText = `${title} ${description} ${url} ${category}`;

    // СТРОГАЯ проверка на наличие слов указывающих на аренду
    const hasRentalKeywords = rentalKeywords.some(keyword => 
      fullText.includes(keyword.toLowerCase())
    );

    // Проверяем категорию в данных API
    if (category.includes('аренда') || category.includes('rent') || category.includes('сдам')) {
      return true;
    }

    // Проверяем цену - слишком низкая для продажи квартир
    const price = adsProperty.price || 0;
    const tooLowForSale = price < 500000; // Снижаем минимум до 500k

    // Проверяем метрику цены - если указана "в месяц", это точно аренда
    const priceMetric = (adsProperty.price_metric || '').toLowerCase();
    const hasMonthlyMetric = priceMetric.includes('месяц') || priceMetric.includes('мес');

    // Проверяем тип недвижимости в данных API - самый надежный индикатор
    const nedvigimostType = (adsProperty.nedvigimost_type || '').toLowerCase();
    const isRentalType = nedvigimostType.includes('сдам') || nedvigimostType.includes('аренда');

    // Ключевые слова продажи
    const saleKeywords = ['продам', 'продается', 'продажа', 'купить', 'приобрести', 'собственность', 'млн'];
    const hasSaleKeywords = saleKeywords.some(keyword => fullText.includes(keyword));

    // Для высоких цен (>5млн) игнорируем некоторые признаки аренды
    const highPrice = price > 5000000;

    // Это аренда если:
    // 1. Тип недвижимости указывает на аренду (самый надежный)
    // 2. Метрика цены "в месяц" (очень надежный) 
    // 3. Есть ключевые слова аренды И цена не очень высокая
    // 4. Цена слишком низкая для продажи без явных признаков продажи
    return isRentalType || hasMonthlyMetric || 
           (hasRentalKeywords && !highPrice) || 
           (tooLowForSale && !hasSaleKeywords);
  }

  determineMarketType(adsProperty: AdsApiProperty): 'secondary' | 'new_construction' {
    const title = (adsProperty.title || '').toLowerCase();
    const description = (adsProperty.description || '').toLowerCase();
    const combined = title + ' ' + description;

    // Ключевые слова для новостроек
    const newConstructionKeywords = [
      'новостройка', 'новострой', 'от застройщика', 'первичный рынок', 
      'новый дом', 'сдача дома', 'готовность', 'ввод в эксплуатацию',
      'первичная продажа', 'от девелопера', 'жк ', 'жилой комплекс',
      'строящийся', 'новое строительство', 'сданный дом'
    ];

    // Ключевые слова для вторичного рынка
    const secondaryKeywords = [
      'вторичка', 'вторичный рынок', 'от собственника', 
      'продам квартиру', 'хорошее состояние', 'косметический ремонт',
      'евроремонт', 'требует ремонта', 'после ремонта', 'жилое состояние'
    ];

    // Проверяем год постройки - если есть и недавний, то скорее всего новостройка
    const currentYear = new Date().getFullYear();
    const buildYear = this.extractBuildYear(combined);
    if (buildYear && buildYear >= currentYear - 3) {
      return 'new_construction';
    }

    // Проверяем ключевые слова для новостроек
    const hasNewConstructionKeywords = newConstructionKeywords.some(keyword => 
      combined.includes(keyword)
    );

    // Проверяем ключевые слова для вторичного рынка
    const hasSecondaryKeywords = secondaryKeywords.some(keyword => 
      combined.includes(keyword)
    );

    if (hasNewConstructionKeywords && !hasSecondaryKeywords) {
      return 'new_construction';
    }

    if (hasSecondaryKeywords && !hasNewConstructionKeywords) {
      return 'secondary';
    }

    // По умолчанию считаем вторичным рынком
    return 'secondary';
  }

  private extractBuildYear(text: string): number | null {
    // Ищем упоминания года постройки в тексте
    const yearMatches = text.match(/(?:построен|построенного|года постройки|год постройки).*?(\d{4})/);
    if (yearMatches && yearMatches[1]) {
      const year = parseInt(yearMatches[1], 10);
      if (year >= 1950 && year <= new Date().getFullYear() + 2) {
        return year;
      }
    }
    return null;
  }

  private async convertAdsProperty(adsProperty: AdsApiProperty): Promise<InsertProperty> {
    // Дополнительная проверка типа недвижимости - только квартиры
    const title = (adsProperty.title || '').toLowerCase().trim();
    
    // Исключаем дома, гаражи, участки, коммерческую недвижимость
    const isExcluded = title.includes('дом ') || 
                      title.includes('участок ') || 
                      title.includes('гараж ') ||
                      title.includes('помещение ') ||
                      title.includes('офис ') ||
                      title.includes('склад ') ||
                      title.includes('магазин ');

    // Проверяем, что это именно квартира
    const isApartment = title.includes('-к кв.') || 
                       title.includes('квартира') ||
                       title.includes('студия');

    if (isExcluded || !isApartment) {
      throw new Error(`Property title "${title}" is not an apartment (only apartments allowed)`);
    }

    // Дополнительная проверка региона на уровне конвертации с картой соответствий
    const allowedRegions = await storage.getRegions();
    const allowedRegionNames = allowedRegions.map(r => r.name.toLowerCase());
    
    // Извлекаем регион с той же логикой, что и в syncProperties
    const cityField = (adsProperty.city || '').toLowerCase().trim();
    const regionField = (adsProperty.region || '').toLowerCase().trim();
    
    // Извлекаем регион из поля city если оно содержит "область"
    let propertyRegion = regionField;
    if (cityField.includes('область')) {
      const parts = cityField.split(',');
      if (parts.length > 0) {
        propertyRegion = parts[0].trim();
      }
    }
    
    // Если регион все еще пустой, используем city
    if (!propertyRegion) {
      propertyRegion = cityField;
    }
    
    // Карта соответствий регионов
    const regionMapping: Record<string, string> = {
      'москва': 'москва',
      'московская область': 'москва', // Московская область относится к Москве
      'санкт-петербург': 'санкт-петербург',
      'ленинградская область': 'санкт-петербург',
      'новосибирск': 'новосибирск',
      'новосибирская область': 'новосибирск',
      'екатеринбург': 'екатеринбург',
      'свердловская область': 'екатеринбург',
      'казань': 'казань',
      'татарстан': 'казань',
      'республика татарстан': 'казань',
      'уфа': 'уфа',
      'башкортостан': 'уфа',
      'республика башкортостан': 'уфа',
      'красноярск': 'красноярск',
      'красноярский край': 'красноярск',
      'пермь': 'пермь',
      'пермский край': 'пермь',
      'калининград': 'калининград',
      'калининградская область': 'калининград',
      'тюмень': 'тюмень',
      'тюменская область': 'тюмень',
      'сочи': 'сочи',
      'краснодарский край': 'сочи'
    };

    const mappedRegion = regionMapping[propertyRegion];
    const isValidRegion = mappedRegion && allowedRegionNames.includes(mappedRegion);
    
    console.log(`ConvertAdsProperty debug for region "${propertyRegion}":`);
    console.log(`  Mapped region: "${mappedRegion}"`);
    console.log(`  Is valid: ${isValidRegion}`);
    console.log(`  Allowed regions: ${allowedRegionNames.join(', ')}`);
    
    if (!isValidRegion) {
      throw new Error(`Property region "${propertyRegion}" is not in the allowed regions list`);
    }

    // Проверяем обязательные поля
    if (!adsProperty.id || !adsProperty.title) {
      throw new Error('Missing required fields: id or title');
    }

    // Безопасная обработка числовых значений
    const area = typeof adsProperty.area === 'number' ? adsProperty.area : 50;
    const price = typeof adsProperty.price === 'number' ? adsProperty.price : 0;
    const pricePerSqm = area > 0 ? Math.round(price / area) : 0;
    
    const regionName = adsProperty.region || adsProperty.city || 'Неизвестный регион';
    const regionId = await this.mapRegion(regionName, adsProperty.district || '');
    const propertyClassId = await this.mapPropertyClass(
      adsProperty.propertyType || adsProperty.category || 'квартира',
      pricePerSqm
    );

    // Безопасная обработка координат
    const defaultLat = 55.7558;
    const defaultLng = 37.6176;
    const lat = adsProperty.coordinates?.lat || defaultLat;
    const lng = adsProperty.coordinates?.lng || defaultLng;

    return {
      externalId: String(adsProperty.id),
      regionId,
      propertyClassId,
      title: String(adsProperty.title),
      description: String(adsProperty.description || 'Описание отсутствует'),
      price,
      pricePerSqm,
      area: String(area),
      rooms: typeof adsProperty.rooms === 'number' ? adsProperty.rooms : 1,
      floor: typeof adsProperty.floor === 'number' ? adsProperty.floor : 1,
      totalFloors: typeof adsProperty.totalFloors === 'number' ? adsProperty.totalFloors : 5,
      address: String(adsProperty.address || regionName),
      coordinates: `POINT(${lng} ${lat})`,
      imageUrl: this.extractValidImageUrl(adsProperty),
      images: this.extractValidImages(adsProperty),
      propertyType: String(adsProperty.propertyType || adsProperty.category || 'квартира'),
      marketType: this.determineMarketType(adsProperty),
      url: adsProperty.url || null,
      source: adsProperty.source || 'ads-api.ru',
      isActive: true,
      createdAt: adsProperty.createdAt ? new Date(adsProperty.createdAt) : new Date(),
      updatedAt: adsProperty.updatedAt ? new Date(adsProperty.updatedAt) : new Date(),
    };
  }

  async syncProperties(cities?: string[], credentials?: { email: string; password: string }): Promise<{
    imported: number;
    updated: number;
    errors: string[];
  }> {
    if (!this.apiKey) {
      throw new Error('ADS API key not configured');
    }

    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    try {
      // Получаем строгий список регионов из базы данных приложения
      const allowedRegions = await storage.getRegions();
      const allowedCityNames = allowedRegions.map(r => r.name.toLowerCase());
      
      console.log('Allowed cities from database:', allowedCityNames);

      // Загружаем ВСЕ утвержденные города (не ограничиваем для тестирования)
      const citiesToSync = cities || allowedCityNames;
      
      for (const city of citiesToSync) {
        console.log(`Syncing properties for city: ${city}`);
        const filters = { 
          city: city,
          limit: 100 // Увеличиваем лимит для полноценной загрузки
        };
        const response = await this.fetchProperties(filters, credentials);

        console.log(`Processing ${response.data.length} properties from ADS API for city: ${city}`);
        
        for (let i = 0; i < response.data.length; i++) {
        const adsProperty = response.data[i];
        
        try {
          console.log(`Processing property ${i + 1}/${response.data.length}: ${adsProperty.id || 'unknown ID'}`);
          
          // Логируем структуру первого объекта для понимания
          if (i === 0) {
            console.log('Sample property structure:', Object.keys(adsProperty));
            console.log('Property data:', JSON.stringify(adsProperty, null, 2).substring(0, 500));
          }

          // СТРОГАЯ ФИЛЬТРАЦИЯ: проверяем тип недвижимости - только квартиры
          const title = (adsProperty.title || '').toLowerCase().trim();
          const propertyType = (adsProperty.propertyType || adsProperty.category || '').toLowerCase().trim();
          
          // Исключаем дома, гаражи, участки, коммерческую недвижимость
          const isExcluded = title.includes('дом ') || 
                            title.includes('участок ') || 
                            title.includes('гараж ') ||
                            title.includes('помещение ') ||
                            title.includes('офис ') ||
                            title.includes('склад ') ||
                            title.includes('магазин ');

          // Проверяем, что это именно квартира
          const isApartment = title.includes('-к кв.') || 
                             title.includes('квартира') ||
                             title.includes('студия');

          if (isExcluded || !isApartment) {
            console.log(`Skipping property ${adsProperty.id}: title "${title}" is not an apartment`);
            continue;
          }

          // СТРОГАЯ ФИЛЬТРАЦИЯ: проверяем регион объекта с улучшенным сопоставлением
          const cityField = (adsProperty.city || '').toLowerCase().trim();
          const regionField = (adsProperty.region || '').toLowerCase().trim();
          
          // Извлекаем регион из поля city если оно содержит "область"
          let propertyRegion = regionField;
          if (cityField.includes('область')) {
            const parts = cityField.split(',');
            if (parts.length > 0) {
              propertyRegion = parts[0].trim();
            }
          }
          
          // Если регион все еще пустой, используем city
          if (!propertyRegion) {
            propertyRegion = cityField;
          }
          
          // Создаем карту соответствий для точного сопоставления
          const regionMapping: Record<string, string> = {
            'москва': 'москва',
            'московская область': 'москва', // Московская область относится к Москве
            'санкт-петербург': 'санкт-петербург',
            'ленинградская область': 'санкт-петербург',
            'новосибирск': 'новосибирск',
            'новосибирская область': 'новосибирск',
            'екатеринбург': 'екатеринбург',
            'свердловская область': 'екатеринбург',
            'казань': 'казань',
            'татарстан': 'казань',
            'республика татарстан': 'казань',
            'уфа': 'уфа',
            'башкортостан': 'уфа',
            'республика башкортостан': 'уфа',
            'красноярск': 'красноярск',
            'красноярский край': 'красноярск',
            'пермь': 'пермь',
            'пермский край': 'пермь',
            'калининград': 'калининград',
            'калининградская область': 'калининград',
            'тюмень': 'тюмень',
            'тюменская область': 'тюмень',
            'сочи': 'сочи',
            'краснодарский край': 'сочи'
          };

          const mappedRegion = regionMapping[propertyRegion];
          const isAllowedRegion = mappedRegion && allowedCityNames.includes(mappedRegion);

          console.log(`Debug region mapping for property ${adsProperty.id}:`);
          console.log(`  Original city field: "${adsProperty.city}"`);
          console.log(`  Original region field: "${adsProperty.region}"`);
          console.log(`  Processed region: "${propertyRegion}"`);
          console.log(`  Mapped region: "${mappedRegion}"`);
          console.log(`  Is allowed: ${isAllowedRegion}`);
          console.log(`  Allowed cities: ${allowedCityNames.join(', ')}`);

          if (!isAllowedRegion) {
            console.log(`Skipping property ${adsProperty.id}: region "${propertyRegion}" not in allowed list`);
            continue;
          }

          // КРИТИЧЕСКАЯ ПРОВЕРКА: блокируем аренду до создания объекта
          const isRental = this.isRentalProperty(adsProperty);
          if (isRental) {
            console.log(`Skipping property ${adsProperty.id}: detected as rental property`);
            continue;
          }

          // ПРОВЕРКА: изображения (необязательная для первоначальной загрузки)
          const hasValidImages = this.extractValidImages(adsProperty).length > 0;
          if (!hasValidImages) {
            console.log(`Property ${adsProperty.id}: no images found, but proceeding anyway`);
          }

          console.log(`Region "${propertyRegion}" is allowed, processing property`);
          const propertyData = await this.convertAdsProperty(adsProperty);
          
          // Проверяем, существует ли объект
          const existingProperties = await storage.getProperties({});
          const existingProperty = existingProperties.properties.find(p => 
            p.externalId === adsProperty.id
          );

          if (existingProperty) {
            // Обновляем существующий объект
            // TODO: Реализовать обновление через storage
            updated++;
          } else {
            // Создаем новый объект
            const newProperty = await storage.createProperty(propertyData);
            imported++;
            
            // АВТОМАТИЧЕСКИ рассчитываем инвестиционный рейтинг для нового объекта
            try {
              console.log(`Calculating investment analytics for new property ${newProperty.id}`);
              
              // Используем прямой импорт schedulerService для расчета аналитики
              const schedulerModule = await import('./schedulerService');
              const schedulerInstance = new schedulerModule.SchedulerService();
              await schedulerInstance.calculatePropertyAnalytics(newProperty.id);
              
              console.log(`Investment analytics calculated for property ${newProperty.id}`);
            } catch (analyticsError) {
              console.error(`Failed to calculate analytics for property ${newProperty.id}:`, analyticsError);
              // Не прерываем загрузку, продолжаем с следующим объектом
            }
          }
        } catch (error) {
          const propertyId = adsProperty?.id || `index-${i}`;
          console.error(`Error processing property ${propertyId}:`, error);
          console.error('Property data that caused error:', JSON.stringify(adsProperty, null, 2).substring(0, 500));
          errors.push(`Property ${propertyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      }

      console.log(`ADS API sync completed: ${imported} imported, ${updated} updated, ${errors.length} errors`);
    } catch (error) {
      errors.push(`ADS API sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { imported, updated, errors };
  }

  async getStatus(): Promise<{ available: boolean; configured: boolean; regions: string[] }> {
    const configured = !!this.apiKey;
    
    if (!configured) {
      return { available: false, configured: false, regions: [] };
    }

    // Для демонстрации возвращаем статус "настроен, но требует активной подписки"
    const mockRegions = [
      'Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 
      'Казань', 'Нижний Новгород', 'Челябинск', 'Самара'
    ];

    return { 
      available: false, 
      configured: true, 
      regions: mockRegions 
    };
  }

  async testApiEndpoints(): Promise<{ working: string[]; failed: string[] }> {
    // Тестируем официальные endpoints согласно документации ads-api.ru
    const testEndpoints = [
      '/api',           // Основной endpoint для получения объявлений
      '/apigetcheckfeed' // Endpoint для проверки актуальности
    ];
    
    const working: string[] = [];
    const failed: string[] = [];
    
    for (const endpoint of testEndpoints) {
      try {
        console.log(`Testing ADS API endpoint: ${endpoint}`);
        
        // Для /api тестируем с минимальными параметрами
        const params = endpoint === '/api' ? { limit: 1 } : {};
        
        const response = await this.makeRequest<any>(endpoint, params);
        working.push(endpoint);
        console.log(`✓ Endpoint ${endpoint} works`);
        
        // Логируем структуру ответа
        if (response && typeof response === 'object') {
          console.log(`Response structure for ${endpoint}:`, Object.keys(response));
          if (response.data && Array.isArray(response.data)) {
            console.log(`Data array length: ${response.data.length}`);
          }
        }
      } catch (error) {
        failed.push(endpoint);
        console.log(`✗ Endpoint ${endpoint} failed:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    return { working, failed };
  }

  async getRegions(credentials?: { email: string; password: string }): Promise<string[]> {
    // Сначала тестируем endpoints если это первый запрос
    const testResults = await this.testApiEndpoints();
    console.log('API Test Results:', testResults);
    
    // Попробуем найти regions в рабочих endpoints
    for (const endpoint of testResults.working) {
      try {
        const response = await this.makeRequest<any>(endpoint);
        
        // Ищем данные о регионах в ответе
        if (Array.isArray(response)) {
          return response;
        } else if (response && typeof response === 'object') {
          if ('regions' in response && Array.isArray(response.regions)) {
            return response.regions;
          }
          if ('cities' in response && Array.isArray(response.cities)) {
            return response.cities;
          }
          if ('data' in response && Array.isArray(response.data)) {
            return response.data;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    // Возвращаем заглушку если API недоступен
    return ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск'];
  }

  async isServiceAvailable(): Promise<boolean> {
    try {
      if (!this.apiKey || !this.userEmail) {
        console.log('ADS API credentials missing - API Key:', !!this.apiKey, 'Email:', !!this.userEmail);
        return false;
      }
      
      // Тестируем основной API endpoint с минимальными параметрами
      console.log('Testing ADS API availability with credentials...');
      console.log('API Key present:', !!this.apiKey);
      console.log('Email present:', !!this.userEmail);
      
      try {
        const response = await this.makeRequest<any>('/api', { limit: 1 });
        
        // Проверяем что ответ содержит ожидаемую структуру
        const isValid = response && (
          Array.isArray(response) || 
          (typeof response === 'object' && response.data)
        );
        
        console.log(`ADS API availability test: ${isValid ? 'SUCCESS' : 'FAILED'}`);
        console.log('Response structure:', typeof response, Object.keys(response || {}));
        return isValid;
      } catch (apiError) {
        console.error('ADS API request failed:', apiError instanceof Error ? apiError.message : String(apiError));
        
        // Если это ошибка аутентификации, возможно нужны обновленные ключи
        if (apiError instanceof Error && (
          apiError.message.includes('401') || 
          apiError.message.includes('403') || 
          apiError.message.includes('authentication')
        )) {
          console.log('Authentication error detected - credentials may be invalid');
        }
        
        return false;
      }
    } catch (error) {
      console.error('ADS API availability test failed:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}

export const adsApiService = new AdsApiService();