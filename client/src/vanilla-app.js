// Vanilla JavaScript приложение без React для тестирования
function createApp() {
  const root = document.getElementById('root');
  
  // Создаем основную структуру
  const app = document.createElement('div');
  app.style.cssText = `
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    font-family: Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
  `;
  
  // Заголовок
  const title = document.createElement('h1');
  title.textContent = '🏠 SREDA Market';
  title.style.cssText = `
    font-size: 3rem;
    margin-bottom: 1rem;
    text-align: center;
  `;
  
  // Подзаголовок
  const subtitle = document.createElement('p');
  subtitle.textContent = 'ИИ-сервис для рынка недвижимости';
  subtitle.style.cssText = `
    font-size: 1.4rem;
    margin-bottom: 2rem;
    text-align: center;
  `;
  
  // Карточка с информацией
  const card = document.createElement('div');
  card.style.cssText = `
    background: rgba(255,255,255,0.15);
    padding: 2rem;
    border-radius: 15px;
    text-align: center;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.2);
  `;
  
  const cardTitle = document.createElement('h2');
  cardTitle.textContent = '✅ Приложение работает!';
  cardTitle.style.marginBottom = '1rem';
  
  const cardText = document.createElement('p');
  cardText.textContent = 'Сервер успешно запущен на порту 5000';
  
  const statusText = document.createElement('p');
  statusText.textContent = 'Vanilla JS версия загружена успешно';
  statusText.style.cssText = `
    font-size: 0.9rem;
    opacity: 0.8;
    margin-top: 1.5rem;
  `;
  
  // Кнопка для тестирования API
  const testButton = document.createElement('button');
  testButton.textContent = 'Тест API';
  testButton.style.cssText = `
    background: rgba(255,255,255,0.2);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    margin-top: 1rem;
  `;
  
  testButton.onclick = async () => {
    try {
      const response = await fetch('/api/regions');
      const data = await response.json();
      statusText.textContent = `API работает! Найдено ${data.data?.length || 0} регионов`;
    } catch (error) {
      statusText.textContent = `Ошибка API: ${error.message}`;
    }
  };
  
  // Собираем все элементы
  card.appendChild(cardTitle);
  card.appendChild(cardText);
  card.appendChild(testButton);
  card.appendChild(statusText);
  
  app.appendChild(title);
  app.appendChild(subtitle);
  app.appendChild(card);
  
  root.appendChild(app);
}

// Запускаем приложение
document.addEventListener('DOMContentLoaded', createApp);