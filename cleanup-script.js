const { exec } = require('child_process');

async function runCleanup() {
  console.log('Запуск очистки данных...');
  
  // Выполняем SQL запрос для удаления объектов без фотографий
  const removeQuery = `
    DELETE FROM properties 
    WHERE is_active = true 
    AND (image_url IS NULL OR image_url = '' OR image_url = '{}');
  `;
  
  console.log('Удаляем объекты без фотографий...');
  
  exec(`psql "${process.env.DATABASE_URL}" -c "${removeQuery}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Ошибка при удалении:', error);
      return;
    }
    
    console.log('Результат удаления:', stdout);
    
    // Проверяем статистику после очистки
    const statsQuery = `
      SELECT 
        COUNT(*) as total_properties,
        COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' AND image_url != '{}' THEN 1 END) as with_images,
        COUNT(CASE WHEN image_url IS NULL OR image_url = '' OR image_url = '{}' THEN 1 END) as without_images
      FROM properties 
      WHERE is_active = true;
    `;
    
    exec(`psql "${process.env.DATABASE_URL}" -c "${statsQuery}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Ошибка при получении статистики:', error);
        return;
      }
      
      console.log('Статистика после очистки:');
      console.log(stdout);
    });
  });
}

runCleanup();