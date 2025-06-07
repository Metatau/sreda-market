import { db } from './server/db';
import { properties, regions, propertyClasses } from './shared/schema';
import { nanoid } from 'nanoid';

// Координаты центров российских городов
const CITY_COORDINATES = {
  'Москва': [55.7558, 37.6176],
  'Санкт-Петербург': [59.9311, 30.3609],
  'Новосибирск': [55.0084, 82.9357],
  'Екатеринбург': [56.8431, 60.6454],
  'Казань': [55.8304, 49.0661],
  'Уфа': [54.7388, 55.9721],
  'Красноярск': [56.0184, 92.8672],
  'Пермь': [58.0105, 56.2502],
  'Калининград': [54.7065, 20.4522],
  'Тюмень': [57.1522, 65.5343],
  'Сочи': [43.6028, 39.7342]
} as const;

// Типовые адреса и названия улиц для разных городов
const STREET_NAMES = {
  'Москва': ['ул. Тверская', 'пр. Мира', 'ул. Арбат', 'ул. Ленинский проспект', 'ул. Садовая'],
  'Санкт-Петербург': ['Невский проспект', 'ул. Рубинштейна', 'пр. Ленина', 'ул. Достоевского', 'Васильевский остров'],
  'Новосибирск': ['ул. Ленина', 'пр. Красный', 'ул. Советская', 'ул. Горького', 'пр. Димитрова'],
  'Екатеринбург': ['ул. Ленина', 'ул. 8 Марта', 'пр. Ленина', 'ул. Малышева', 'ул. Радищева'],
  'Казань': ['ул. Баумана', 'ул. Пушкина', 'пр. Ямашева', 'ул. Петербургская', 'ул. Тукая'],
  'Уфа': ['ул. Ленина', 'ул. Советская', 'пр. Октября', 'ул. Заки Валиди', 'ул. Гагарина'],
  'Красноярск': ['пр. Мира', 'ул. Ленина', 'ул. Киренского', 'пр. Красноярский рабочий', 'ул. Алексеева'],
  'Пермь': ['ул. Ленина', 'ул. Комсомольский проспект', 'ул. Петропавловская', 'ул. Куйбышева', 'ул. Сибирская'],
  'Калининград': ['пр. Мира', 'ул. Ленинский проспект', 'ул. Советская', 'ул. Багратиона', 'пл. Победы'],
  'Тюмень': ['ул. Ленина', 'ул. Республики', 'ул. Первомайская', 'ул. Геологоразведчиков', 'ул. Широтная'],
  'Сочи': ['ул. Навагинская', 'Курортный проспект', 'ул. Войкова', 'ул. Горького', 'пр. Победы']
};

// Генерируем случайные координаты в радиусе от центра города
function generateRandomCoordinates(cityName: keyof typeof CITY_COORDINATES): [number, number] {
  const [baseLat, baseLng] = CITY_COORDINATES[cityName];
  const radiusKm = 15; // радиус 15 км от центра
  const radiusInDegrees = radiusKm / 111; // примерно 111 км в 1 градусе
  
  const lat = baseLat + (Math.random() - 0.5) * 2 * radiusInDegrees;
  const lng = baseLng + (Math.random() - 0.5) * 2 * radiusInDegrees;
  
  return [lat, lng];
}

// Генерируем реалистичный адрес
function generateAddress(cityName: keyof typeof STREET_NAMES): string {
  const streets = STREET_NAMES[cityName];
  const street = streets[Math.floor(Math.random() * streets.length)];
  const houseNumber = Math.floor(Math.random() * 200) + 1;
  const building = Math.random() > 0.7 ? `к${Math.floor(Math.random() * 5) + 1}` : '';
  
  return `${street}, д. ${houseNumber}${building}`;
}

// Генерируем описание недвижимости
function generateDescription(rooms: number, area: number, marketType: string): string {
  const descriptions = [
    `${rooms}-комнатная квартира площадью ${area} м². Хорошее состояние, развитая инфраструктура.`,
    `Просторная ${rooms}-комнатная квартира ${area} м². Удобная планировка, близко к метро.`,
    `Уютная ${rooms}-комнатная квартира площадью ${area} кв.м. Тихий район, хорошая транспортная доступность.`,
    `${rooms}-комнатная квартира ${area} м² в ${marketType === 'new_construction' ? 'новом доме' : 'обжитом районе'}. Отличное предложение для семьи.`
  ];
  
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

async function populateTestData() {
  try {
    console.log('Загружаем тестовые данные недвижимости...');

    // Получаем существующие регионы и классы недвижимости
    const existingRegions = await db.select().from(regions);
    const existingPropertyClasses = await db.select().from(propertyClasses);
    
    console.log(`Найдено регионов: ${existingRegions.length}`);
    console.log(`Найдено классов недвижимости: ${existingPropertyClasses.length}`);

    const propertiesData = [];
    let totalGenerated = 0;

    // Для каждого региона генерируем по 20 объектов (10 вторичка + 10 новостроек)
    for (const region of existingRegions) {
      const cityName = region.name as keyof typeof CITY_COORDINATES;
      
      if (!CITY_COORDINATES[cityName]) {
        console.log(`Пропускаем ${region.name} - нет координат`);
        continue;
      }

      console.log(`Генерируем данные для ${region.name}...`);
      
      // Генерируем 10 объектов вторичного рынка
      for (let i = 0; i < 10; i++) {
        const rooms = Math.floor(Math.random() * 4) + 1; // 1-4 комнаты
        const area = 30 + rooms * 15 + Math.floor(Math.random() * 20); // площадь зависит от комнат
        const floor = Math.floor(Math.random() * 16) + 1; // 1-16 этаж
        const totalFloors = Math.max(floor + Math.floor(Math.random() * 10), floor);
        const propertyClass = existingPropertyClasses[Math.floor(Math.random() * existingPropertyClasses.length)];
        
        // Цена зависит от класса недвижимости и площади
        const basePricePerSqm = propertyClass.minPricePerSqm + 
          Math.random() * (propertyClass.maxPricePerSqm - propertyClass.minPricePerSqm);
        const price = Math.floor(basePricePerSqm * area);
        
        const [lat, lng] = generateRandomCoordinates(cityName);
        
        propertiesData.push({
          externalId: `test_secondary_${region.id}_${i}`,
          title: `${rooms}-комнатная квартира, ${area} м²`,
          price,
          pricePerSqm: Math.floor(price / area),
          area,
          rooms,
          floor,
          totalFloors,
          address: generateAddress(cityName),
          description: generateDescription(rooms, area, 'secondary'),
          latitude: lat,
          longitude: lng,
          regionId: region.id,
          propertyClassId: propertyClass.id,
          propertyType: 'apartment',
          marketType: 'secondary' as const,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        totalGenerated++;
      }
      
      // Генерируем 10 объектов нового строительства
      for (let i = 0; i < 10; i++) {
        const rooms = Math.floor(Math.random() * 4) + 1;
        const area = 35 + rooms * 17 + Math.floor(Math.random() * 25);
        const floor = Math.floor(Math.random() * 20) + 1; // новостройки выше
        const totalFloors = Math.max(floor + Math.floor(Math.random() * 8), floor);
        const propertyClass = existingPropertyClasses[Math.floor(Math.random() * existingPropertyClasses.length)];
        
        // Новостройки дороже на 10-20%
        const basePricePerSqm = propertyClass.minPricePerSqm * 1.15 + 
          Math.random() * (propertyClass.maxPricePerSqm - propertyClass.minPricePerSqm);
        const price = Math.floor(basePricePerSqm * area);
        
        const [lat, lng] = generateRandomCoordinates(cityName);
        
        propertiesData.push({
          id: nanoid(),
          externalId: `test_new_${region.id}_${i}`,
          title: `${rooms}-комнатная квартира в новостройке, ${area} м²`,
          price,
          pricePerSqm: Math.floor(price / area),
          area,
          rooms,
          floor,
          totalFloors,
          address: generateAddress(cityName),
          description: generateDescription(rooms, area, 'new_construction'),
          latitude: lat,
          longitude: lng,
          regionId: region.id,
          propertyClassId: propertyClass.id,
          propertyType: 'apartment',
          marketType: 'new_construction' as const,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        totalGenerated++;
      }
    }

    // Вставляем данные в базу порциями
    console.log(`Сохраняем ${totalGenerated} объектов в базу данных...`);
    
    const batchSize = 50;
    for (let i = 0; i < propertiesData.length; i += batchSize) {
      const batch = propertiesData.slice(i, i + batchSize);
      await db.insert(properties).values(batch);
      console.log(`Сохранено ${Math.min(i + batchSize, propertiesData.length)} из ${propertiesData.length} объектов`);
    }

    // Проверяем результат
    const finalCount = await db.select().from(properties);
    
    console.log('\n=== ЗАГРУЗКА ЗАВЕРШЕНА ===');
    console.log(`Всего сгенерировано: ${totalGenerated} объектов`);
    console.log(`Объектов в базе данных: ${finalCount.length}`);
    console.log(`По регионам:`);
    
    for (const region of existingRegions) {
      if (CITY_COORDINATES[region.name as keyof typeof CITY_COORDINATES]) {
        console.log(`  ${region.name}: 20 объектов (10 вторичка + 10 новостроек)`);
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('Ошибка при загрузке тестовых данных:', error);
    process.exit(1);
  }
}

populateTestData();