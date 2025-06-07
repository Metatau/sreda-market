import { db } from './server/db';
import { properties, investmentAnalytics } from './shared/schema';
import { SimpleInvestmentAnalyticsService } from './server/services/simpleInvestmentAnalytics';

async function calculateAnalyticsForAllProperties() {
  try {
    console.log('Запускаем автоматический расчет инвестиционной аналитики...');
    
    const analyticsService = new SimpleInvestmentAnalyticsService();
    
    // Получаем все активные объекты недвижимости
    const allProperties = await db.select().from(properties).where(properties.isActive);
    
    console.log(`Найдено ${allProperties.length} активных объектов для расчета аналитики`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const property of allProperties) {
      try {
        console.log(`Рассчитываем аналитику для объекта ${property.id}: ${property.title}`);
        
        // Проверяем, есть ли уже аналитика для этого объекта
        const existingAnalytics = await db
          .select()
          .from(investmentAnalytics)
          .where(investmentAnalytics.propertyId.eq(property.id))
          .limit(1);
        
        if (existingAnalytics.length === 0) {
          await analyticsService.calculateAnalytics(property.id);
          successCount++;
          console.log(`✅ Аналитика рассчитана для объекта ${property.id}`);
        } else {
          console.log(`⏭️ Аналитика уже существует для объекта ${property.id}`);
        }
        
        // Пауза между расчетами
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Ошибка расчета аналитики для объекта ${property.id}:`, error);
      }
    }
    
    console.log('\n=== РАСЧЕТ АНАЛИТИКИ ЗАВЕРШЕН ===');
    console.log(`Успешно рассчитано: ${successCount} объектов`);
    console.log(`Ошибок: ${errorCount}`);
    
    // Проверяем общее количество записей аналитики
    const totalAnalytics = await db.select().from(investmentAnalytics);
    console.log(`Всего записей аналитики в базе: ${totalAnalytics.length}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('Критическая ошибка при расчете аналитики:', error);
    process.exit(1);
  }
}

calculateAnalyticsForAllProperties();