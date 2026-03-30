import React, { useState, useEffect } from 'react'
import './App.css'

const STORAGE_KEY = 'queuemaster_v1_data'
const PRINT_NODE_URL = 'http://localhost:5000'

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
      if (parsed.date !== initial.date) return initial
      return parsed
    }
    return initial
  })

  const [lastTicket, setLastTicket] = useState(null)
  const [printerOnline, setPrinterOnline] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert("Comando copiado!")
  }

  // Check Print Node Status
  const checkPrinter = async () => {
    try {
      const res = await fetch(`${PRINT_NODE_URL}/status`)
      if (res.ok) setPrinterOnline(true)
      else setPrinterOnline(false)
    } catch {
      setPrinterOnline(false)
    }
  }

  useEffect(() => {
    checkPrinter()
    const interval = setInterval(checkPrinter, 10000)
    return () => clearInterval(interval)
  }, [])

  const printTicket = async (senha, tipo) => {
    if (!printerOnline) return
    try {
      await fetch(`${PRINT_NODE_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha, tipo, lab: "UNIDADE TORITAMA" })
      })
    } catch (err) {
      console.error("Falha ao imprimir:", err)
    }
  }

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
    printTicket(senha, tipo) // Solicita impressão local
    setTimeout(() => setLastTicket(null), 8000)
  }

  const callNext = () => {
    if (data.waiting.length === 0) {
      alert("Fila vazia")
      return
    }

    let nextIndex = -1
    let newStreak = data.p_streak

    if (newStreak >= 2) {
      nextIndex = data.waiting.findIndex(item => item.tipo === 'C')
      if (nextIndex !== -1) newStreak = 0
    }

    if (nextIndex === -1) {
      nextIndex = data.waiting.findIndex(item => item.tipo === 'P')
      if (nextIndex !== -1) newStreak += 1
      else {
        nextIndex = data.waiting.findIndex(item => item.tipo === 'C')
        newStreak = 0
      }
    }

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
    
    // Play sound or alert
    const msg = new SpeechSynthesisUtterance(`Senha ${nextItem.senha}, favor comparecer ao guichê.`);
    window.speechSynthesis.speak(msg);
  }

  const avgWait = (data.waiting.length + 1) * 5

  return (
    <div className="app-container">
      <header style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="hero-title">QueueMaster Pro 🚀</h1>
          <p style={{ opacity: 0.5, marginBottom: '20px' }}>Terminal de Autoatendimento Web (Serverless)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {!printerOnline && (
            <button className="btn-setup" onClick={() => setShowSetup(true)}>
              ⚙️ CONFIGURAR IMPRESSORA
            </button>
          )}
          <div className={`printer-status ${printerOnline ? 'online' : 'offline'}`}>
            {printerOnline ? '● Impressora Conectada' : '○ Impressora Offline'}
          </div>
        </div>
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
              {!printerOnline && <p style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: '10px' }}>Aviso: Impressora Offline. Verifique o Print Node.</p>}
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

      {showSetup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowSetup(false)}>×</button>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>Configuração da Impressora 🖨️</h2>
            <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '30px' }}>
              Por segurança, o navegador não pode instalar programas sozinho. 
              Siga os passos abaixo na sua recepção para ativar a impressão física:
            </p>

            <div className="setup-step" style={{ padding: '15px', background: 'rgba(173, 255, 47, 0.05)', borderRadius: '12px', border: '1px solid rgba(173, 255, 47, 0.2)' }}>
              <h3 style={{ color: '#adff2f' }}>🚀 MODO RECOMENDADO: QueueMaster GUI</h3>
              <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Use a interface visual para configurar sua impressora sem códigos:</p>
              <div className="code-block" style={{ background: '#111' }}>
                <span>python3 gui_app.py</span>
                <button className="copy-btn" onClick={() => copyToClipboard("python3 gui_app.py")}>Copiar</button>
              </div>
              <p style={{ fontSize: '0.7rem', opacity: 0.5 }}>* Procure o ícone verde na sua barra de tarefas após rodar.</p>
            </div>

            <div className="setup-step" style={{ marginTop: '20px' }}>
              <h3>🔧 Modo Avançado (Somente via Terminal)</h3>
              <div className="code-block">
                <span>Linux: sudo apt update && sudo apt install -y python3-venv python3-pip && cd ~/Desktop/"Painel de Senhas"/print_node && ./setup_print_node.sh</span>
                <button className="copy-btn" onClick={() => copyToClipboard('sudo apt update && sudo apt install -y python3-venv python3-pip && cd ~/Desktop/"Painel de Senhas"/print_node && ./setup_print_node.sh')}>Copiar</button>
              </div>
            </div>

            <button className="neon-btn btn-cyan" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowSetup(false)}>
              ENTENDI, VOU CONFIGURAR
            </button>
          </div>
        </div>
      )}

      <footer className="status-bar">
        DATA: {data.date} • UNIDADE LOCAL BROWSER • V1.5 PRO (WITH PRINT NODE)
      </footer>
    </div>
  )
}

export default App
