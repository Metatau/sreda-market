import { db } from './server/db.js';
import { properties } from './shared/schema.js';

async function runAdsSync() {
  console.log('=== Запуск синхронизации с ADS API ===');
  
  const baseUrl = 'https://ads-api.ru/main';
  const apiKey = process.env.ADS_API_KEY;
  const userEmail = 'monostud.io@yandex.ru';
  
  if (!apiKey) {
    console.error('ADS_API_KEY не найден');
    return;
  }
  
  console.log('API ключ найден, начинаем загрузку...');
  
  // Параметры для получения квартир из Москвы
  const queryParams = new URLSearchParams({
    user: userEmail,
    token: apiKey,
    format: 'json',
    category_id: '1', // Недвижимость
    subcategory_id: '1', // Квартиры (не комнаты)
    city: 'Москва',
    limit: '100',
    price_min: '1000000', // Минимальная цена для исключения комнат
    rooms_min: '1' // Минимум 1 комната
  });
  
  try {
    const response = await fetch(`${baseUrl}/api?${queryParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SREDA-Market/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Получено объявлений: ${data.data.length}`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const adsProperty of data.data) {
      try {
        // Фильтруем только квартиры и студии
        const cat2 = (adsProperty.cat2 || '').toLowerCase();
        const title = (adsProperty.title || '').toLowerCase();
        
        const isApartment = cat2 === 'квартиры' || 
                           title.includes('студия') ||
                           title.includes('квартир');
        
        if (!isApartment) {
          skipped++;
          continue;
        }
        
        // Извлекаем координаты
        let lat = 55.7558; // Москва по умолчанию
        let lng = 37.6176;
        
        if (adsProperty.coords && adsProperty.coords.lat && adsProperty.coords.lng) {
          lat = parseFloat(adsProperty.coords.lat);
          lng = parseFloat(adsProperty.coords.lng);
        }
        
        // Создаем объект недвижимости для базы данных
        const propertyData = {
          externalId: String(adsProperty.id),
          regionId: 1, // Москва
          propertyClassId: 1, // Эконом класс по умолчанию
          title: String(adsProperty.title || 'Без названия'),
          description: String(adsProperty.description || 'Описание отсутствует'),
          price: parseInt(adsProperty.price) || 0,
          pricePerSqm: 0,
          area: String(adsProperty.params?.['Площадь'] || '50'),
          rooms: parseInt(adsProperty.params?.['Комнат в квартире']) || 1,
          floor: parseInt(adsProperty.params?.['Этаж']) || 1,
          totalFloors: parseInt(adsProperty.params?.['Этажей в доме']) || 5,
          address: String(adsProperty.address || adsProperty.city || 'Москва'),
          coordinates: `POINT(${lng} ${lat})`,
          imageUrl: adsProperty.images?.[0]?.imgurl || null,
          images: adsProperty.images ? JSON.stringify(adsProperty.images.map(img => img.imgurl)) : null,
          propertyType: 'квартира',
          marketType: 'secondary', // Using valid enum value
          url: adsProperty.url || null,
          source: 'ads-api.ru',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Вычисляем цену за м²
        const area = parseFloat(propertyData.area) || 50;
        propertyData.pricePerSqm = area > 0 ? Math.round(propertyData.price / area) : 0;
        
        // Сохраняем в базу данных
        await db.insert(properties).values(propertyData)
          .onConflictDoUpdate({
            target: properties.externalId,
            set: {
              price: propertyData.price,
              pricePerSqm: propertyData.pricePerSqm,
              updatedAt: new Date(),
              isActive: true
            }
          });
        
        imported++;
        console.log(`Импортирован объект ${imported}: ${propertyData.title}`);
        
      } catch (error) {
        console.error(`Ошибка при обработке объекта ${adsProperty.id}:`, error.message);
      }
    }
    
    console.log('\n=== РЕЗУЛЬТАТ СИНХРОНИЗАЦИИ ===');
    console.log(`Импортировано квартир: ${imported}`);
    console.log(`Пропущено объектов: ${skipped}`);
    console.log('Синхронизация завершена успешно');
    
  } catch (error) {
    console.error('Ошибка синхронизации:', error);
  }
}

runAdsSync().then(() => process.exit(0));