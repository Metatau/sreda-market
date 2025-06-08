import { AdsApiService } from './server/services/adsApiService.js';

async function testDirectSync() {
  console.log('=== Прямое тестирование синхронизации с ADS API ===');
  
  try {
    console.log('Инициализация ADS API сервиса...');
    const adsService = new AdsApiService();
    
    console.log('Запуск синхронизации для Москвы и Санкт-Петербурга...');
    const regions = ['Москва', 'Санкт-Петербург'];
    
    const result = await adsService.syncProperties(regions);
    
    console.log('\n=== РЕЗУЛЬТАТ СИНХРОНИЗАЦИИ ===');
    console.log(`✅ Импортировано объектов: ${result.imported}`);
    console.log(`🔄 Обновлено объектов: ${result.updated}`);
    console.log(`❌ Ошибок: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n📝 Детали ошибок:');
      result.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }
    
    console.log('\n✨ Синхронизация завершена успешно!');
    
  } catch (error) {
    console.error('\n💥 Критическая ошибка при синхронизации:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  process.exit(0);
}

testDirectSync();