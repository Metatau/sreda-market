// Тестовый скрипт для синхронизации с ADS API
const { AdsApiService } = require('./server/services/adsApiService.ts');

async function testAdsSync() {
  console.log('=== Тестовая синхронизация с ADS API ===');
  
  try {
    const adsService = new AdsApiService();
    
    // Тестируем загрузку данных для Москвы за последние 30 дней
    const cities = ['Москва', 'Санкт-Петербург'];
    
    console.log('Начинаем синхронизацию для городов:', cities);
    
    const result = await adsService.syncProperties(cities);
    
    console.log('=== Результат синхронизации ===');
    console.log(`Импортировано: ${result.imported}`);
    console.log(`Обновлено: ${result.updated}`);
    console.log(`Ошибок: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('Ошибки:');
      result.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.error('Ошибка при синхронизации:', error);
  }
}

testAdsSync();