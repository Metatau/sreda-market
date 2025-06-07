import { AdsApiService } from './server/services/adsApiService';
import { storage } from './server/storage';

async function quickSync() {
  try {
    console.log('Starting quick property sync for 20 apartments...');
    
    const adsApiService = new AdsApiService();
    
    // Фокусируемся только на Москве для быстрого результата
    const cities = ['Москва'];
    
    let totalImported = 0;
    const targetCount = 20;
    
    for (const city of cities) {
      if (totalImported >= targetCount) break;
      
      console.log(`\nSyncing properties for city: ${city}`);
      
      try {
        // Увеличиваем лимит для большего выбора объектов
        const response = await adsApiService.fetchProperties({
          city: city,
          limit: 200
        });
        
        if (!response.data || response.data.length === 0) {
          console.log(`No data received for ${city}`);
          continue;
        }
        
        console.log(`Processing ${response.data.length} properties from ADS API for city: ${city}`);
        
        let processedCount = 0;
        let importedCount = 0;
        
        for (const adsProperty of response.data) {
          if (totalImported >= targetCount) break;
          
          processedCount++;
          
          try {
            // Быстрая предварительная фильтрация
            const title = (adsProperty.title || '').toLowerCase();
            const priceMetric = (adsProperty.price_metric || '').toLowerCase();
            const price = adsProperty.price || 0;
            
            // Пропускаем очевидную аренду
            if (priceMetric.includes('месяц') || 
                priceMetric.includes('мес') ||
                title.includes('сдам') ||
                title.includes('аренда') ||
                price < 1000000) {
              continue;
            }
            
            // Пропускаем не квартиры
            if (!title.includes('квартира') && 
                !title.includes('-к кв.') && 
                !title.includes('студия')) {
              continue;
            }
            
            // Проверяем наличие изображений
            const images = adsProperty.images || [];
            if (!Array.isArray(images) || images.length === 0) {
              continue;
            }
            
            console.log(`Found potential apartment: ${title.substring(0, 50)}... Price: ${price}`);
            
            // Используем метод синхронизации одного объекта
            try {
              const result = await adsApiService.syncProperties(['Москва']);
              if (result.imported > 0) {
                console.log(`✓ Successfully imported property: ${title.substring(0, 50)}...`);
                importedCount++;
                totalImported++;
              }
            } catch (conversionError) {
              console.log(`Import failed for ${adsProperty.id}: ${conversionError.message}`);
              continue;
            }
            
          } catch (error) {
            // Тихо пропускаем ошибки конвертации
            continue;
          }
        }
        
        console.log(`City ${city} completed: processed ${processedCount}, imported ${importedCount}`);
        
      } catch (error) {
        console.error(`Error syncing ${city}:`, error.message);
        continue;
      }
    }
    
    console.log(`\n=== QUICK SYNC COMPLETED ===`);
    console.log(`Total imported: ${totalImported} properties`);
    
    // Проверяем финальное количество
    const finalProperties = await storage.getProperties({});
    console.log(`Total properties in database: ${finalProperties.properties.length}`);
    
  } catch (error) {
    console.error('Quick sync failed:', error);
  }
}

// Запускаем быструю синхронизацию
quickSync();