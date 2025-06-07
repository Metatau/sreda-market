const { AdsApiService } = require('./server/services/adsApiService.ts');

async function syncProperties() {
  try {
    console.log('Starting property synchronization...');
    
    const adsApiService = new AdsApiService();
    
    // Загружаем объекты для основных городов
    const cities = [
      'Москва',
      'Санкт-Петербург', 
      'Новосибирск',
      'Екатеринбург',
      'Казань',
      'Уфа',
      'Красноярск',
      'Пермь',
      'Калининград',
      'Тюмень',
      'Сочи'
    ];
    
    console.log(`Syncing properties for ${cities.length} cities...`);
    
    const result = await adsApiService.syncProperties(cities);
    
    console.log('\n=== SYNCHRONIZATION RESULTS ===');
    console.log(`Imported: ${result.imported} new properties`);
    console.log(`Updated: ${result.updated} existing properties`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors encountered:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\nSynchronization completed successfully!');
    
  } catch (error) {
    console.error('Synchronization failed:', error);
    process.exit(1);
  }
}

// Запускаем синхронизацию
syncProperties();