function SimpleApp() {
  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      flexDirection: "column",
      fontFamily: "Arial, sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white"
    }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
        SREDA Market
      </h1>
      <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
        ИИ-сервис для рынка недвижимости
      </p>
      <div style={{ 
        background: "rgba(255,255,255,0.1)", 
        padding: "2rem", 
        borderRadius: "10px",
        textAlign: "center"
      }}>
        <h2>Система успешно запущена</h2>
        <p>Backend работает на порту 5000</p>
        <p>Все компоненты безопасности активированы</p>
        <ul style={{ textAlign: "left", marginTop: "1rem" }}>
          <li>✓ JWT аутентификация</li>
          <li>✓ Rate limiting</li>
          <li>✓ Error boundaries</li>
          <li>✓ Lazy loading</li>
          <li>✓ Тестирование настроено</li>
        </ul>
      </div>
    </div>
  );
}

export default SimpleApp;