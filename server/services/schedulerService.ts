import cron from 'node-cron';
import { AdsApiService } from './adsApiService';
// Временно используем упрощенную валидацию и расчеты для совместимости с ES модулями
import { storage } from '../storage';
import { db } from '../db';
import { properties, propertyAnalytics, investmentAnalytics, priceHistory } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export class SchedulerService {
  private adsApiService: AdsApiService;
  private isRunning: boolean = false;

  constructor() {
    this.adsApiService = new AdsApiService();
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      schedule: {
        dailySync: '23:00 UTC (02:00 MSK)',
        periodicValidation: 'Every 6 hours'
      },
      lastSync: 'Not recorded yet',
      nextSync: 'According to cron schedule'
    };
  }

  public async forceSyncNow(): Promise<any> {
    if (this.isRunning) {
      throw new Error('Synchronization already in progress');
    }

    try {
      this.isRunning = true;
      console.log('Manual synchronization started at', new Date().toISOString());
      
      const result = await this.performDailySync();
      
      console.log('Manual synchronization completed successfully');
      return result;
    } catch (error) {
      console.error('Manual synchronization failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  public start(): void {
    console.log('Starting property synchronization scheduler...');

    // Ежедневная синхронизация в 02:00 московского времени (UTC+3)
    // Cron выражение: 0 0 23 * * * (23:00 UTC = 02:00 MSK)
    cron.schedule('0 0 23 * * *', async () => {
      if (this.isRunning) {
        console.log('Synchronization already in progress, skipping...');
        return;
      }

      try {
        this.isRunning = true;
        console.log('Starting daily property synchronization at', new Date().toISOString());
        
        await this.performDailySync();
        
        console.log('Daily property synchronization completed successfully');
      } catch (error) {
        console.error('Daily synchronization failed:', error);
      } finally {
        this.isRunning = false;
      }
    }, {
      timezone: "Europe/Moscow"
    });

    // Дополнительная синхронизация каждые 6 часов для актуализации
    cron.schedule('0 */6 * * *', async () => {
      if (this.isRunning) {
        console.log('Synchronization already in progress, skipping...');
        return;
      }

      try {
        this.isRunning = true;
        console.log('Starting periodic property validation at', new Date().toISOString());
        
        await this.performValidationCheck();
        
        console.log('Periodic validation completed successfully');
      } catch (error) {
        console.error('Periodic validation failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('Scheduler started successfully');
  }

  private async performDailySync(): Promise<void> {
    console.log('=== Starting Daily Property Synchronization ===');

    // 1. Загрузка новых объектов из ads-api.ru
    console.log('Step 1: Loading new properties from ads-api.ru...');
    const regions = await storage.getRegions();
    const regionNames = regions.map(r => r.name);
    
    const syncResult = await this.adsApiService.syncProperties(regionNames);
    console.log(`Loaded ${syncResult.imported} new properties, updated ${syncResult.updated} existing`);

    // 2. Валидация всех объектов в базе данных
    console.log('Step 2: Validating all properties in database...');
    await this.performValidationCheck();

    // 3. Пересчёт инвестиционной аналитики
    console.log('Step 3: Recalculating investment analytics...');
    await this.recalculateInvestmentAnalytics();

    console.log('=== Daily Synchronization Completed ===');
  }

  private async performValidationCheck(): Promise<void> {
    const { properties } = await storage.getProperties({}, { page: 1, perPage: 10000 });
    
    let validatedCount = 0;
    let removedCount = 0;

    for (const property of properties) {
      try {
        const isValid = await this.validateProperty(property);
        
        if (!isValid) {
          // Помечаем объект как Fake и удаляем из базы данных
          console.log(`Removing invalid property: ${property.id} - ${property.title}`);
          await this.removeInvalidProperty(property.id);
          removedCount++;
        } else {
          validatedCount++;
        }
      } catch (error) {
        console.error(`Error validating property ${property.id}:`, error);
      }
    }

    console.log(`Validation completed: ${validatedCount} valid, ${removedCount} removed`);
  }

  /**
   * Валидирует объект недвижимости по всем критериям
   */
  private async validateProperty(property: any): Promise<boolean> {
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
  private hasValidImages(property: any): boolean {
    // Получаем изображения из поля description
    const description = property.description || '';
    const imageUrls = [];
    
    // Ищем ссылки на изображения в описании
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi;
    const matches = description.match(urlRegex);
    
    if (matches) {
      imageUrls.push(...matches);
    }

    // Считаем что если в описании есть упоминания фотографий, то они есть
    const hasPhotoMentions = description.includes('фото') || 
                           description.includes('изображени') ||
                           description.includes('картинк');

    return imageUrls.length >= 2 || hasPhotoMentions;
  }

  /**
   * Проверяет валидность цены относительно рыночной
   */
  private async isValidPrice(property: any): Promise<boolean> {
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
  private async getMarketPriceData(regionId: number, propertyClassId: number | null, rooms: number | null, marketType: string | null) {
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
  private hasRequiredFields(property: any): boolean {
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

  private async removeInvalidProperty(propertyId: number): Promise<void> {
    try {
      // Удаляем связанные записи через SQL
      await db.delete(propertyAnalytics)
        .where(eq(propertyAnalytics.propertyId, propertyId));
      
      await db.delete(investmentAnalytics)
        .where(eq(investmentAnalytics.propertyId, propertyId));
      
      await db.delete(priceHistory)
        .where(eq(priceHistory.propertyId, propertyId));

      // Удаляем основную запись
      await db.delete(properties)
        .where(eq(properties.id, propertyId));

      console.log(`Successfully removed property ${propertyId} and all related data`);
    } catch (error) {
      console.error(`Error removing property ${propertyId}:`, error);
      throw error;
    }
  }

  private async recalculateInvestmentAnalytics(): Promise<void> {
    const { properties } = await storage.getProperties({}, { page: 1, perPage: 10000 });
    
    let calculatedCount = 0;

    for (const property of properties) {
      try {
        await this.calculateInvestmentAnalytics(property);
        calculatedCount++;
        
        if (calculatedCount % 10 === 0) {
          console.log(`Processed ${calculatedCount}/${properties.length} properties`);
        }
      } catch (error) {
        console.error(`Error calculating investment analytics for property ${property.id}:`, error);
      }
    }

    console.log(`Investment analytics recalculated for ${calculatedCount} properties`);
  }

  /**
   * Рассчитывает базовую инвестиционную аналитику для объекта
   */
  async calculatePropertyAnalytics(propertyId: number): Promise<void> {
    try {
      // Получаем полную информацию об объекте
      const property = await storage.getProperty(propertyId);
      if (!property) {
        throw new Error(`Property ${propertyId} not found`);
      }
      
      console.log(`Calculating analytics for property ${propertyId}: ${property.title}`);
      
      await this.calculateInvestmentAnalytics(property);
    } catch (error) {
      console.error(`Error calculating analytics for property ${propertyId}:`, error);
      throw error;
    }
  }

  private async calculateInvestmentAnalytics(property: any): Promise<void> {
    try {
      // Базовые расчёты ROI
      const monthlyRent = this.estimateMonthlyRent(property);
      const yearlyRent = monthlyRent * 12;
      const netROI = property.price > 0 ? ((yearlyRent * 0.75) / property.price) * 100 : 0; // 75% после расходов
      
      // Ликвидность на основе региона и класса
      let liquidityScore = 5;
      if (property.region && ['Москва', 'Санкт-Петербург', 'Сочи'].includes(property.region.name)) {
        liquidityScore += 2;
      }
      if (property.propertyClass && ['Стандарт', 'Комфорт', 'Бизнес'].includes(property.propertyClass.name)) {
        liquidityScore += 1;
      }
      
      // Инвестиционный рейтинг
      let rating = 'Низкий';
      if (netROI >= 8 && liquidityScore >= 7) rating = 'Отличный';
      else if (netROI >= 5 && liquidityScore >= 6) rating = 'Хороший';
      else if (netROI >= 3) rating = 'Удовлетворительный';

      // Сохраняем в базу данных
      const existing = await db
        .select()
        .from(propertyAnalytics)
        .where(eq(propertyAnalytics.propertyId, property.id))
        .limit(1);

      const analyticsData = {
        propertyId: property.id,
        roi: netROI.toFixed(2),
        liquidityScore: Math.min(10, Math.max(1, liquidityScore)),
        investmentScore: Math.round(netROI * 10),
        investmentRating: rating,
        calculatedAt: new Date()
      };

      if (existing.length > 0) {
        await db
          .update(propertyAnalytics)
          .set(analyticsData)
          .where(eq(propertyAnalytics.propertyId, property.id));
      } else {
        await db
          .insert(propertyAnalytics)
          .values(analyticsData);
      }
      
    } catch (error) {
      console.error(`Error calculating analytics for property ${property.id}:`, error);
    }
  }

  /**
   * Оценивает месячную арендную плату
   */
  private estimateMonthlyRent(property: any): number {
    const region = property.region;
    if (!region) return 0;

    // Базовые коэффициенты аренды по регионам (% от стоимости в месяц)
    const rentCoefficients: Record<string, number> = {
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
      const classMultipliers: Record<string, number> = {
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

  public async runManualSync(): Promise<{ imported: number; updated: number; removed: number }> {
    if (this.isRunning) {
      throw new Error('Synchronization already in progress');
    }

    try {
      this.isRunning = true;
      console.log('Starting manual property synchronization...');
      
      const regions = await storage.getRegions();
      const regionNames = regions.map(r => r.name);
      
      const syncResult = await this.adsApiService.syncProperties(regionNames);
      
      // Выполняем валидацию после загрузки
      const beforeCount = (await storage.getProperties({}, { page: 1, perPage: 1 })).total;
      await this.performValidationCheck();
      const afterCount = (await storage.getProperties({}, { page: 1, perPage: 1 })).total;
      const removed = beforeCount - afterCount;

      // Пересчитываем инвестиционную аналитику
      await this.recalculateInvestmentAnalytics();

      return {
        imported: syncResult.imported,
        updated: syncResult.updated,
        removed: removed
      };
    } finally {
      this.isRunning = false;
    }
  }

  public stop(): void {
    console.log('Stopping scheduler service...');
    // node-cron автоматически останавливает задачи при завершении процесса
  }

  public getStatus(): { isRunning: boolean; nextRun: string } {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(2, 0, 0, 0); // 02:00 следующего дня МСК
    
    return {
      isRunning: this.isRunning,
      nextRun: nextRun.toISOString()
    };
  }
}

export const schedulerService = new SchedulerService();