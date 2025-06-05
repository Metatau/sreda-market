// Тестовая синхронизация для получения 10 объектов недвижимости
import { AdsApiService } from './server/services/adsApiService.js';
import { PropertyValidationService } from './server/services/propertyValidationService.js';
import { InvestmentCalculationService } from './server/services/investmentCalculationService.js';
import { storage } from './server/storage.js';

async function runTestSync() {
  console.log('Запуск тестовой синхронизации...');
  
  try {
    const adsApiService = new AdsApiService();
    const validationService = new PropertyValidationService();
    const investmentService = new InvestmentCalculationService();
    
    // Получаем данные из ads-api.ru
    console.log('Получение данных из ads-api.ru...');
    const syncResult = await adsApiService.syncProperties(['Сочи', 'Екатеринбург']);
    console.log(`Импортировано: ${syncResult.imported}, Обновлено: ${syncResult.updated}`);
    
    // Запускаем валидацию
    console.log('Запуск валидации объектов...');
    const validationResult = await validationService.validateAllProperties();
    console.log(`Валидация завершена: ${validationResult.validated} объектов`);
    
    // Запускаем расчет инвестиционной аналитики
    console.log('Расчет инвестиционной аналитики...');
    const analyticsResult = await investmentService.calculateForAllProperties();
    console.log(`Аналитика рассчитана для ${analyticsResult.calculated} объектов`);
    
    // Показываем итоговые данные
    const properties = await storage.getProperties();
    console.log(`Общее количество активных объектов: ${properties.properties.length}`);
    
    console.log('Тестовая синхронизация завершена успешно!');
    
  } catch (error) {
    console.error('Ошибка при синхронизации:', error);
  }
}

runTestSync();