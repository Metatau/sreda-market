import { adsApiService } from './server/services/adsApiService';

async function simpleSync() {
  try {
    console.log('Starting simple property sync...');
    
    // Просто запускаем синхронизацию для Москвы
    const result = await adsApiService.syncProperties(['Москва']);
    
    console.log('\n=== SYNC RESULTS ===');
    console.log(`Imported: ${result.imported} properties`);
    console.log(`Updated: ${result.updated} properties`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\nFirst 5 errors:');
      result.errors.slice(0, 5).forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('Sync completed!');
    
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

simpleSync();