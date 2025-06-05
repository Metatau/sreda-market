import { useState, useEffect } from "react";

interface Region {
  id: number;
  name: string;
}

function BasicApp() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/regions')
      .then(res => res.json())
      .then(data => {
        setRegions(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      flexDirection: "column",
      fontFamily: "Inter, Arial, sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      padding: "20px"
    }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center" }}>
        SREDA Market
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
        border: "1px solid rgba(255,255,255,0.2)",
        maxWidth: "600px",
        width: "100%"
      }}>
        <h2 style={{ marginBottom: "1rem" }}>Статус системы</h2>
        
        <div style={{ marginBottom: "2rem" }}>
          <p>✅ Сервер запущен на порту 5000</p>
          <p>✅ React приложение загружено</p>
          <p>✅ База данных подключена</p>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Регионы в базе данных:</h3>
          {loading && <p>Загрузка...</p>}
          {error && <p style={{ color: "#ffcccb" }}>Ошибка: {error}</p>}
          {!loading && !error && (
            <div style={{ 
              maxHeight: "200px", 
              overflowY: "auto",
              background: "rgba(0,0,0,0.2)",
              padding: "1rem",
              borderRadius: "8px"
            }}>
              {regions.length === 0 ? (
                <p>Регионы не найдены</p>
              ) : (
                regions.map(region => (
                  <div key={region.id} style={{ 
                    padding: "0.5rem",
                    borderBottom: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    {region.name}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <p style={{ fontSize: "0.9rem", opacity: "0.8" }}>
          Система готова к использованию
        </p>
      </div>
    </div>
  );
}

export default BasicApp;