import https from 'https';

async function testAdsConnection() {
  console.log('=== Тестирование соединения с ADS API ===');
  
  const apiKey = process.env.ADS_API_KEY;
  if (!apiKey) {
    console.error('❌ ADS_API_KEY не найден в переменных окружения');
    return;
  }
  
  console.log('✅ API ключ найден:', apiKey.substring(0, 8) + '...');
  
  const userEmail = 'monostud.io@yandex.ru';
  const queryParams = new URLSearchParams({
    user: userEmail,
    token: apiKey,
    format: 'json',
    category_id: '1', // Недвижимость
    limit: '10'
  });
  
  const options = {
    hostname: 'ads-api.ru',
    port: 443,
    path: `/main/api?${queryParams.toString()}`,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'SREDA-Market/1.0'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`Статус ответа: ${res.statusCode}`);
      console.log('Заголовки:', res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Ответ от API:', data);
        resolve(data);
      });
    });
    
    req.on('error', (error) => {
      console.error('Ошибка соединения:', error);
      reject(error);
    });
    
    req.end();
  });
}

testAdsConnection()
  .then(() => console.log('✅ Тест завершен'))
  .catch((error) => console.error('❌ Тест не пройден:', error));