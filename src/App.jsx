import React, { useState, useEffect } from 'react'
import './App.css'

const STORAGE_KEY = 'queuemaster_v1_data'

function App() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const initial = {
      date: new Date().toLocaleDateString(),
      common: 1,
      priority: 1,
      waiting: [],
      called: [],
      p_streak: 0
    }
    
    if (saved) {
      const parsed = JSON.parse(saved)
      // Check for daily reset
      if (parsed.date !== initial.date) {
        return initial
      }
      return parsed
    }
    return initial
  })

  const [lastTicket, setLastTicket] = useState(null)

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const emitTicket = (tipo) => {
    const numero = tipo === 'C' ? data.common : data.priority
    const senha = `${tipo}${String(numero).padStart(3, '0')}`
    
    const newItem = {
      id: Date.now(),
      senha,
      tipo,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setData(prev => ({
      ...prev,
      [tipo === 'C' ? 'common' : 'priority']: numero + 1,
      waiting: [...prev.waiting, newItem]
    }))

    setLastTicket(senha)
    setTimeout(() => setLastTicket(null), 8000)
    
    // Webhook integration (optional, if user still wants it)
    // We can use a try/catch fetch here
  }

  const callNext = () => {
    if (data.waiting.length === 0) {
      alert("Fila vazia")
      return
    }

    let nextIndex = -1
    let newStreak = data.p_streak

    // Logic: 2 Priority : 1 Common
    if (newStreak >= 2) {
      nextIndex = data.waiting.findIndex(item => item.tipo === 'C')
      if (nextIndex !== -1) {
        newStreak = 0
      }
    }

    if (nextIndex === -1) {
      nextIndex = data.waiting.findIndex(item => item.tipo === 'P')
      if (nextIndex !== -1) {
        newStreak += 1
      } else {
        nextIndex = data.waiting.findIndex(item => item.tipo === 'C')
        newStreak = 0
      }
    }

    // Safety fallback
    if (nextIndex === -1) nextIndex = 0

    const nextItem = data.waiting[nextIndex]
    const newWaiting = data.waiting.filter((_, i) => i !== nextIndex)
    const newCalled = [nextItem, ...data.called].slice(0, 5)

    setData(prev => ({
      ...prev,
      waiting: newWaiting,
      called: newCalled,
      p_streak: newStreak
    }))
    
    alert(`📢 Chamando: ${nextItem.senha}`)
  }

  // Calculate Average Wait Time (simplified simulated logic)
  const avgWait = (data.waiting.length + 1) * 5

  return (
    <div className="app-container">
      <header style={{ gridColumn: '1 / -1' }}>
        <h1 className="hero-title">QueueMaster Pro 🚀</h1>
        <p style={{ opacity: 0.5, marginBottom: '20px' }}>Terminal de Autoatendimento Web (Serverless)</p>
      </header>

      <section className="terminal-section">
        <div className="glass-card">
          <h2>EMISSÃO DE SENHA</h2>
          <p style={{ marginBottom: '24px', opacity: 0.7 }}>Toque no tipo de atendimento desejado:</p>
          
          <div className="btn-container">
            <button className="neon-btn btn-cyan" onClick={() => emitTicket('C')}>
              <span>Atendimento Comum</span>
              <span style={{ fontSize: '1.2rem' }}>💬</span>
            </button>
            <button className="neon-btn btn-pink" onClick={() => emitTicket('P')}>
              <span>Preferencial</span>
              <span style={{ fontSize: '1.2rem' }}>★</span>
            </button>
          </div>

          {lastTicket && (
            <div style={{ marginTop: '30px', textAlign: 'center', animation: 'fadeIn 0.5s' }}>
              <p style={{ fontSize: '0.9rem', color: '#888' }}>Sua Senha:</p>
              <h3 style={{ fontSize: '3.5rem', color: '#adff2f', textShadow: '0 0 20px rgba(173, 255, 47, 0.3)' }}>{lastTicket}</h3>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ marginTop: '40px', border: '1px solid rgba(173, 255, 47, 0.2)' }}>
          <h2 style={{ color: '#adff2f', fontSize: '1rem' }}>GUICHÊ OPERACIONAL</h2>
          <button className="neon-btn btn-green" style={{ width: '100%', marginTop: '16px' }} onClick={callNext}>
            PRÓXIMO CLIENTE 🔊
          </button>
        </div>
      </section>

      <section className="queue-section">
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>PAINEL DE SENHAS</h2>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.7rem', color: '#666' }}>ESPERA ESTIMADA</p>
              <p style={{ color: '#ffa500', fontWeight: '800' }}>~{avgWait} min</p>
            </div>
          </div>

          <div style={{ marginTop: '30px' }}>
            {data.waiting.length > 0 ? (
              data.waiting.map(item => (
                <div key={item.id} className="queue-item">
                  <span className={`senha-badge type-${item.tipo}`}>{item.senha}</span>
                  <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>{item.time}</span>
                </div>
              ))
            ) : (
              <p style={{ opacity: 0.3, textAlign: 'center', padding: '60px 0' }}>Não há senhas aguardando.</p>
            )}
          </div>

          {data.called.length > 0 && (
            <div className="called-list">
              <h3 style={{ fontSize: '0.8rem', marginBottom: '16px', color: '#555' }}>ÚLTIMOS CHAMADOS</h3>
              {data.called.map((item, i) => (
                <div key={i} className="called-item">
                  <span>{item.senha}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="status-bar">
        DATA: {data.date} • UNIDADE LOCAL BROWSER • V1.2 PROFESSIONAL
      </footer>
    </div>
  )
}

export default App
