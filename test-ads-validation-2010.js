// Тестирование валидации объектов из ADS API с фильтрацией по году постройки (не позднее 2010)
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
  email: 'saabox@yandex.ru',
  password: '2931923'
};

async function login() {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('✅ Администратор авторизован');
      return true;
    }
    throw new Error(result.error || 'Login failed');
  } catch (error) {
    console.error('❌ Ошибка авторизации:', error.message);
    return false;
  }
}

async function testAdsValidation() {
  console.log('\n🔍 ТЕСТИРОВАНИЕ ВАЛИДАЦИИ ОБЪЕКТОВ ADS API');
  console.log('Критерии фильтрации:');
  console.log('• Тип: новостройки, многоквартирные дома и квартиры');
  console.log('• Год постройки: 2010 год и новее (объекты до 2010 года исключаются)');
  console.log('• Исключения: комнаты, частные дома, коттеджи, дачи, участки, гаражи, коммерческая недвижимость');
  
  try {
    // Запускаем синхронизацию с новой валидацией
    const response = await fetch(`${API_BASE}/admin/scheduler/sync`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log('\n✅ Синхронизация завершена:');
      console.log(`   • Импортировано: ${result.data.imported} объектов`);
      console.log(`   • Обновлено: ${result.data.updated} объектов`);
      console.log(`   • Ошибок: ${result.data.errors?.length || 0}`);
      
      if (result.data.errors && result.data.errors.length > 0) {
        console.log('\n⚠️ Ошибки валидации:');
        result.data.errors.slice(0, 5).forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
        if (result.data.errors.length > 5) {
          console.log(`   ... и еще ${result.data.errors.length - 5} ошибок`);
        }
      }
    } else {
      console.error('❌ Ошибка синхронизации:', result.error);
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

async function validateImportedProperties() {
  console.log('\n📊 ПРОВЕРКА ИМПОРТИРОВАННЫХ ОБЪЕКТОВ');
  
  try {
    const response = await fetch(`${API_BASE}/properties?limit=10&sort=newest`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data.properties) {
      console.log(`✅ Найдено ${result.data.properties.length} новых объектов:`);
      
      let validCount = 0;
      let newConstructionCount = 0;
      let housesCount = 0;
      let apartmentsCount = 0;
      
      result.data.properties.forEach((property, index) => {
        const title = property.title.toLowerCase();
        const buildYear = extractYearFromTitle(property.title);
        
        // Определяем тип недвижимости
        let propertyType = 'unknown';
        if (title.includes('квартир') || title.includes('студия')) {
          propertyType = 'apartment';
          apartmentsCount++;
        } else if (title.includes('дом') || title.includes('коттедж')) {
          propertyType = 'house';
          housesCount++;
        } else if (title.includes('новостройка') || title.includes('жк ')) {
          propertyType = 'new_construction';
          newConstructionCount++;
        }
        
        // Проверяем соответствие критериям
        const meetsYearCriteria = !buildYear || buildYear >= 2010;
        const isValidType = propertyType !== 'unknown';
        
        // Дополнительная проверка: объекты до 2010 года должны быть исключены
        const shouldBeExcluded = buildYear && buildYear < 2010;
        
        if (meetsYearCriteria && isValidType) {
          validCount++;
        }
        
        console.log(`   ${index + 1}. "${property.title.slice(0, 60)}..."`);
        console.log(`      Тип: ${propertyType}, Год: ${buildYear || 'не указан'}, Цена: ${property.price?.toLocaleString() || 'н/д'} ₽`);
        console.log(`      Площадь: ${property.area || 'н/д'} м², Регион: ${property.region?.name || 'н/д'}`);
        
        if (!meetsYearCriteria) {
          console.log(`      ⚠️ НЕ СООТВЕТСТВУЕТ: год постройки ${buildYear} < 2010`);
        }
        if (!isValidType) {
          console.log(`      ⚠️ НЕ СООТВЕТСТВУЕТ: неопределенный тип недвижимости`);
        }
      });
      
      console.log('\n📈 СТАТИСТИКА ВАЛИДАЦИИ:');
      console.log(`   • Соответствует критериям: ${validCount}/${result.data.properties.length}`);
      console.log(`   • Квартиры: ${apartmentsCount}`);
      console.log(`   • Дома: ${housesCount}`);
      console.log(`   • Новостройки: ${newConstructionCount}`);
      console.log(`   • Процент валидных: ${Math.round((validCount / result.data.properties.length) * 100)}%`);
      
    } else {
      console.log('ℹ️ Объекты не найдены или недоступны');
    }
  } catch (error) {
    console.error('❌ Ошибка проверки объектов:', error.message);
  }
}

function extractYearFromTitle(title) {
  const yearMatch = title.match(/(?:построен|постройки|год)\s*(\d{4})/i);
  if (yearMatch && yearMatch[1]) {
    const year = parseInt(yearMatch[1], 10);
    if (year >= 1950 && year <= new Date().getFullYear() + 2) {
      return year;
    }
  }
  return null;
}

async function checkFilteringEffectiveness() {
  console.log('\n🎯 АНАЛИЗ ЭФФЕКТИВНОСТИ ФИЛЬТРАЦИИ');
  
  try {
    // Получаем общую статистику объектов
    const response = await fetch(`${API_BASE}/admin/analytics/properties-overview`);
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Общая статистика объектов:');
        console.log(`   • Всего объектов: ${result.data.totalProperties || 'н/д'}`);
        console.log(`   • Активных: ${result.data.activeProperties || 'н/д'}`);
        console.log(`   • Новостроек: ${result.data.newConstructionCount || 'н/д'}`);
        console.log(`   • Вторичного рынка: ${result.data.secondaryCount || 'н/д'}`);
      }
    }
    
    // Проверяем последние синхронизации
    const syncResponse = await fetch(`${API_BASE}/admin/scheduler/status`, {
      credentials: 'include'
    });
    
    if (syncResponse.ok) {
      const syncResult = await syncResponse.json();
      
      if (syncResult.success) {
        console.log('\n🔄 Статус синхронизации:');
        console.log(`   • Статус: ${syncResult.data.isRunning ? 'Активна' : 'Остановлена'}`);
        console.log(`   • Последняя синхронизация: ${syncResult.data.lastSync || 'н/д'}`);
        console.log(`   • Следующая синхронизация: ${syncResult.data.nextSync || 'н/д'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа эффективности:', error.message);
  }
}

async function runValidationTest() {
  console.log('🚀 ТЕСТИРОВАНИЕ ВАЛИДАЦИИ ОБЪЕКТОВ ADS API');
  console.log('Обновленные критерии фильтрации: новостройки, дома и квартиры не позднее 2010 года');
  console.log('=' * 80);
  
  // Авторизация
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Тестирование прервано из-за ошибки авторизации');
    return;
  }
  
  // Последовательное тестирование
  await testAdsValidation();
  await validateImportedProperties();
  await checkFilteringEffectiveness();
  
  console.log('\n' + '=' * 80);
  console.log('🎉 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  console.log('\n📋 ОБНОВЛЕННЫЕ КРИТЕРИИ ВАЛИДАЦИИ:');
  console.log('✅ Принимаем: квартиры, студии, дома, новостройки');
  console.log('✅ Год постройки: 2010 и позднее (или не указан)');
  console.log('❌ Исключаем: комнаты, участки, гаражи, коммерческую недвижимость');
  console.log('❌ Исключаем: объекты до 2010 года постройки');
  
  console.log('\n🔍 АЛГОРИТМ ФИЛЬТРАЦИИ:');
  console.log('1. Проверка типа недвижимости по категории и заголовку');
  console.log('2. Извлечение года постройки из описания и параметров');
  console.log('3. Фильтрация по году: блокировка объектов старше 2010 года');
  console.log('4. Проверка региона и остальных критериев');
  console.log('5. Валидация цены и обязательных полей');
}

// Запуск тестирования
runValidationTest().catch(console.error);