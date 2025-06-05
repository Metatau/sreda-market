import cron from 'node-cron';
import { AdsApiService } from './adsApiService';
import { PropertyValidationService } from './propertyValidationService';
import { InvestmentCalculationService } from './investmentCalculationService';
import { storage } from '../storage';

export class SchedulerService {
  private adsApiService: AdsApiService;
  private validationService: PropertyValidationService;
  private investmentService: InvestmentCalculationService;
  private isRunning: boolean = false;

  constructor() {
    this.adsApiService = new AdsApiService();
    this.validationService = new PropertyValidationService();
    this.investmentService = new InvestmentCalculationService();
  }

  public start(): void {
    console.log('Starting property synchronization scheduler...');

    // Ежедневная синхронизация в 00:00 московского времени (UTC+3)
    // Cron выражение: 0 0 21 * * * (21:00 UTC = 00:00 MSK)
    cron.schedule('0 0 21 * * *', async () => {
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
        const isValid = await this.validationService.validateProperty(property);
        
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

  private async removeInvalidProperty(propertyId: number): Promise<void> {
    try {
      // Удаляем связанные записи
      await storage.db.delete(storage.schema.propertyAnalytics)
        .where(storage.schema.propertyAnalytics.propertyId.eq(propertyId));
      
      await storage.db.delete(storage.schema.investmentAnalytics)
        .where(storage.schema.investmentAnalytics.propertyId.eq(propertyId));
      
      await storage.db.delete(storage.schema.priceHistory)
        .where(storage.schema.priceHistory.propertyId.eq(propertyId));

      // Удаляем основную запись
      await storage.db.delete(storage.schema.properties)
        .where(storage.schema.properties.id.eq(propertyId));

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
        await this.investmentService.calculateForProperty(property.id);
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
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // 00:00 следующего дня
    
    return {
      isRunning: this.isRunning,
      nextRun: tomorrow.toISOString()
    };
  }
}

export const schedulerService = new SchedulerService();