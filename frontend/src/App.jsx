import React, { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [queue, setQueue] = useState({ waiting: [], called: [], average_wait: 5 })
  const [loading, setLoading] = useState(false)
  const [lastTicket, setLastTicket] = useState(null)

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/queue')
      const data = await res.json()
      setQueue(data)
    } catch (err) {
      console.error("Erro ao buscar fila:", err)
    }
  }

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 5000)
    return () => clearInterval(interval)
  }, [])

  const emitTicket = async (tipo) => {
    setLoading(true)
    try {
      const res = await fetch('/api/emit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo })
      })
      const data = await res.json()
      setLastTicket(data.senha)
      fetchQueue()
      setTimeout(() => setLastTicket(null), 10000)
    } catch (err) {
      alert("Erro ao emitir senha")
    } finally {
      setLoading(false)
    }
  }

  const callNext = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/call-next', { method: 'POST' })
      const data = await res.json()
      if (data.senha) {
        alert("Chamado: " + data.senha)
      } else {
        alert("Fila vazia")
      }
      fetchQueue()
    } catch (err) {
      alert("Erro ao chamar próximo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <header style={{ gridColumn: '1 / -1' }}>
        <h1 className="hero-title">QueueMaster 🚀</h1>
        <p style={{ opacity: 0.5, marginBottom: '20px' }}>Sistema de Gestão de Senhas Profissional</p>
      </header>

      <section className="terminal-section">
        <div className="glass-card">
          <h2>EMISSÃO DE SENHA</h2>
          <p style={{ marginBottom: '24px', opacity: 0.7 }}>Escolha o tipo de atendimento abaixo:</p>
          
          <div className="btn-container">
            <button 
              className="neon-btn btn-cyan" 
              onClick={() => emitTicket('C')}
              disabled={loading}
            >
              <span>Atendimento Comum</span>
              <span style={{ fontSize: '1.2rem' }}>→</span>
            </button>
            <button 
              className="neon-btn btn-pink" 
              onClick={() => emitTicket('P')}
              disabled={loading}
            >
              <span>Preferencial</span>
              <span style={{ fontSize: '1.2rem' }}>★</span>
            </button>
          </div>

          {lastTicket && (
            <div style={{ marginTop: '30px', textAlign: 'center', animation: 'fadeIn 0.5s' }}>
              <p style={{ fontSize: '0.9rem', color: '#888' }}>Sua Senha Gerada:</p>
              <h3 style={{ fontSize: '3rem', color: var(--neon-green) }}>{lastTicket}</h3>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ marginTop: '40px', border: '1px dashed #333' }}>
          <h2>ADMINISTRAÇÃO</h2>
          <button 
            className="neon-btn btn-green" 
            style={{ width: '100%', marginTop: '20px' }}
            onClick={callNext}
          >
            CHAMAR PRÓXIMO 🔊
          </button>
        </div>
      </section>

      <section className="queue-section">
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>FILA DE ESPERA</h2>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.8rem', color: '#666' }}>TEMPO MÉDIO</p>
              <p style={{ color: '#ffa500', fontWeight: 'bold' }}>~{queue.average_wait} min</p>
            </div>
          </div>

          <div style={{ marginTop: '30px' }}>
            {queue.waiting.length > 0 ? (
              queue.waiting.map(item => (
                <div key={item.id} className="queue-item">
                  <span className={`senha-badge type-${item.tipo}`}>{item.senha}</span>
                  <span style={{ opacity: 0.5 }}>AGUARDANDO...</span>
                </div>
              ))
            ) : (
              <p style={{ opacity: 0.3, textAlign: 'center', padding: '40px' }}>Ninguém na fila no momento.</p>
            )}
          </div>

          <div className="called-list">
            <h3 style={{ fontSize: '0.9rem', marginBottom: '16px', color: '#444' }}>ÚLTIMOS CHAMADOS</h3>
            {queue.called.map((item, i) => (
              <div key={i} className="called-item">
                <span>{item.senha}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="status-bar">
        SISTEMA ONLINE • UNIDADE TORITAMA • WEB VERSION 1.0
      </footer>
    </div>
  )
}

export default App
