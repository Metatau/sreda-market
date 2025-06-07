import { AdsApiService } from './server/services/adsApiService';
import { storage } from './server/storage';
import { db } from './server/db';
import { properties } from './shared/schema';

async function quickLoadProperties() {
  try {
    console.log('Starting quick property load...');
    
    const adsApiService = new AdsApiService();
    
    // Российские города с их ID
    const cities = [
      { name: 'Москва', id: 1 },
      { name: 'Санкт-Петербург', id: 2 },
      { name: 'Новосибирск', id: 3 },
      { name: 'Екатеринбург', id: 4 },
      { name: 'Казань', id: 5 },
      { name: 'Уфа', id: 11 },
      { name: 'Красноярск', id: 12 },
      { name: 'Пермь', id: 13 },
      { name: 'Калининград', id: 35 },
      { name: 'Тюмень', id: 36 },
      { name: 'Сочи', id: 37 }
    ];
    
    let totalLoaded = 0;
    
    for (const city of cities) {
      console.log(`\nLoading properties for ${city.name}...`);
      
      try {
        // Загружаем ограниченное количество объектов для каждого города
        const result = await adsApiService.syncPropertiesForCity(city.name, 20);
        
        console.log(`${city.name}: loaded ${result.imported} properties`);
        totalLoaded += result.imported;
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error loading properties for ${city.name}:`, error);
      }
    }
    
    // Проверяем общее количество загруженных объектов
    const finalCount = await db.select().from(properties);
    
    console.log(`\n=== QUICK LOAD COMPLETED ===`);
    console.log(`Total properties loaded: ${totalLoaded}`);
    console.log(`Properties in database: ${finalCount.length}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('Quick load failed:', error);
    process.exit(1);
  }
}

quickLoadProperties();