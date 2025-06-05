function TestApp() {
  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      flexDirection: "column",
      fontFamily: "Arial, sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      padding: "20px"
    }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center" }}>
        🏠 SREDA Market
      </h1>
      <p style={{ fontSize: "1.4rem", marginBottom: "2rem", textAlign: "center" }}>
        ИИ-сервис для рынка недвижимости
      </p>
      <div style={{ 
        background: "rgba(255,255,255,0.15)", 
        padding: "2rem", 
        borderRadius: "15px",
        textAlign: "center",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.2)"
      }}>
        <h2 style={{ marginBottom: "1rem" }}>✅ Приложение работает!</h2>
        <p>Сервер успешно запущен на порту 5000</p>
        <div style={{ marginTop: "1.5rem" }}>
          <p style={{ fontSize: "0.9rem", opacity: "0.8" }}>
            Система готова к использованию
          </p>
        </div>
      </div>
    </div>
  );
}

export default TestApp;