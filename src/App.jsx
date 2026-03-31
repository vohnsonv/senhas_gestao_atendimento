import React, { useState, useEffect, useRef } from 'react'
import { Ticket, UserCheck, Clock, History, Settings, Play, Pause, ListFilter } from 'lucide-react'
import './App.css'

const STORAGE_KEY = 'atende_org_data_v2'
const PRINT_NODE_URL = 'http://localhost:5000'

function App() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const initial = {
      date: new Date().toLocaleDateString(),
      common: 1,
      priority: 1,
      waiting: [],
      history: [],
      p_streak: 0,
      priorityMode: 'balanced' // 'balanced' or 'priority_only'
    }
    
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.date !== initial.date) return initial
      return parsed
    }
    return initial
  })

  const [activeCall, setActiveCall] = useState(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [lastTicket, setLastTicket] = useState(null)
  const [printerOnline, setPrinterOnline] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const timerRef = useRef(null)

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  // Timer Logic
  useEffect(() => {
    if (activeCall) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [activeCall])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeys = (e) => {
      if (e.code === 'Space') {
         e.preventDefault()
         callNext()
      }
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [data]) // Re-bind when data changes to have fresh state in closure

  const formatTime = (s) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert("Copiado!")
  }

  const checkPrinter = async () => {
    try {
      const res = await fetch(`${PRINT_NODE_URL}/status`)
      setPrinterOnline(res.ok)
    } catch {
      setPrinterOnline(false)
    }
  }

  useEffect(() => {
    checkPrinter()
    const interval = setInterval(checkPrinter, 10000)
    return () => clearInterval(interval)
  }, [])

  const emitTicket = async (tipo) => {
    const numero = tipo === 'C' ? data.common : data.priority
    const senha = `${tipo}${String(numero).padStart(3, '0')}`
    
    const newItem = {
      id: Date.now(),
      senha,
      tipo,
      emitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: Date.now()
    }

    setData(prev => ({
      ...prev,
      [tipo === 'C' ? 'common' : 'priority']: numero + 1,
      waiting: [...prev.waiting, newItem]
    }))

    setLastTicket(senha)
    
    // Impressão
    if (printerOnline) {
      try {
        await fetch(`${PRINT_NODE_URL}/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senha, tipo, lab: "ATENDE.ORG - RECEPÇÃO" })
        })
      } catch (err) { console.error(err) }
    }

    setTimeout(() => setLastTicket(null), 5000)
  }

  const callNext = () => {
    if (data.waiting.length === 0) {
      alert("Fila vazia")
      return
    }

    // Finalizar atendimento atual se houver
    const endTimestamp = Date.now()
    if (activeCall) {
       const finishedItem = {
         ...activeCall,
         endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
         duration: formatTime(timerSeconds)
       }
       setData(prev => ({
         ...prev,
         history: [finishedItem, ...prev.history].slice(0, 50)
       }))
    }

    // Lógica de Prioridade
    let nextIndex = -1
    let newStreak = data.p_streak

    if (data.priorityMode === 'priority_only') {
       nextIndex = data.waiting.findIndex(item => item.tipo === 'P')
    } else {
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
    }

    if (nextIndex === -1) nextIndex = 0

    const nextItem = data.waiting[nextIndex]
    const newWaiting = data.waiting.filter((_, i) => i !== nextIndex)

    setData(prev => ({
      ...prev,
      waiting: newWaiting,
      p_streak: newStreak
    }))

    setActiveCall({ ...nextItem, startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })
    setTimerSeconds(0)

    // Som Chime Profissional
    const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    chime.play().catch(e => console.log("Erro ao tocar som:", e));

    // Voz em Português
    const msg = new SpeechSynthesisUtterance(`Senha ${nextItem.senha}, favor comparecer.`);
    msg.lang = 'pt-BR';
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.includes('pt-BR')) || voices[0];
    if (ptVoice) msg.voice = ptVoice;
    window.speechSynthesis.speak(msg);
  }

  const toggleMode = () => {
    setData(prev => ({ ...prev, priorityMode: prev.priorityMode === 'balanced' ? 'priority_only' : 'balanced' }))
  }

  return (
    <div className="app-container">
      <header style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 className="hero-title" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Ticket className="neon-green" size={42} strokeWidth={2.5} />
            PAINEL DE SENHAS
          </h1>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <div className={`printer-status ${printerOnline ? 'online' : 'offline'}`} onClick={() => setShowSetup(true)} style={{ cursor: 'pointer' }}>
            {printerOnline ? '● IMPRESSORA ONLINE' : '○ IMPRESSORA OFFLINE'}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 15px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', border: '1px solid rgba(255,255,255,0.1)' }}>
            MODO: {data.priorityMode === 'balanced' ? '⚖️ INTERCALADO' : '🔥 PRIORIDADE MÁXIMA'}
          </div>
        </div>
      </header>

      <main className="terminal-section">
        <div className="glass-card" style={{ marginBottom: '30px' }}>
          <h2>EMISSÃO DE TICKETS</h2>
          <div className="btn-container">
            <button className="neon-btn btn-emerald" onClick={() => emitTicket('C')}>
              <UserCheck size={32} />
              <span>COMUM</span>
            </button>
            <button className="neon-btn btn-lime" onClick={() => emitTicket('P')}>
              <Ticket size={32} />
              <span>PREFERENCIAL</span>
            </button>
          </div>
          {lastTicket && (
            <div style={{ position: 'absolute', top: '20px', right: '40px', textAlign: 'center' }}>
               <p style={{ fontSize: '0.6rem', opacity: 0.5 }}>ÚLTIMO EMITIDO</p>
               <p style={{ color: 'var(--neon-green)', fontWeight: '900', fontSize: '1.5rem' }}>{lastTicket}</p>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ border: '2px solid var(--soft-emerald)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <Play size={18} /> PAINEL DO ATENDENTE
             </h2>
             {activeCall && <div className="active-timer"><Clock size={16} /> {formatTime(timerSeconds)}</div>}
          </div>
          
          {activeCall ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>EM ATENDIMENTO AGORA</p>
              <h3 style={{ fontSize: '5rem', color: 'var(--accent-lime)', textShadow: '0 0 30px rgba(163, 230, 53, 0.4)' }}>{activeCall.senha}</h3>
              <p style={{ opacity: 0.7, marginTop: '10px' }}>Iniciado às {activeCall.startTime}</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>Aguardando próxima chamada...</div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
             <button className="neon-btn btn-emerald" style={{ width: '100%', flex: 2 }} onClick={callNext}>
               CHAMAR PRÓXIMO (Espaço) 🔊
             </button>
             <button className="neon-btn" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }} onClick={toggleMode}>
               {data.priorityMode === 'balanced' ? 'Ativar Prioridade' : 'Ativar Intercalado'}
             </button>
          </div>
        </div>
      </main>

      <aside className="queue-section">
        <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
           <h2>FILA DE ESPERA ({data.waiting.length})</h2>
           <div style={{ flex: 1, overflowY: 'auto', marginBottom: '30px' }}>
              {data.waiting.length > 0 ? data.waiting.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontWeight: '800', color: item.tipo === 'P' ? 'var(--accent-lime)' : 'var(--neon-green)' }}>{item.senha}</span>
                  <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>{item.emitTime}</span>
                </div>
              )) : <p style={{ opacity: 0.2, textAlign: 'center', marginTop: '50px' }}>Vazio</p>}
           </div>

           <h2 style={{ paddingTop: '20px', borderTop: '1px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <History size={18} /> HISTÓRICO DE HOJE
           </h2>
           <div style={{ flex: 1, overflowY: 'auto' }}>
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>SENHA</th>
                    <th>INÍCIO</th>
                    <th>FIM</th>
                    <th>DURAÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((row, i) => (
                    <tr key={i}>
                      <td><span className={`status-badge ${row.tipo === 'P' ? 'status-priority' : 'status-common'}`}>{row.senha}</span></td>
                      <td style={{ fontSize: '0.75rem', opacity: 0.7 }}>{row.startTime}</td>
                      <td style={{ fontSize: '0.75rem', opacity: 0.7 }}>{row.endTime}</td>
                      <td style={{ fontWeight: '700', color: 'var(--soft-emerald)' }}>{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      </aside>

      {showSetup && (
        <div className="modal-overlay" onClick={() => setShowSetup(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>PAINEL DE SENHAS Print Node 🖨️</h2>
            <div className="setup-step" style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '16px' }}>
              <h3 style={{ color: 'var(--neon-green)' }}>📥 Baixar Instalador</h3>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <a href="/downloads/QueueMaster_PrintNode_Linux.zip" download className="neon-btn btn-emerald" style={{ textDecoration: 'none', fontSize: '0.8rem' }}>
                  LINUX (.zip)
                </a>
              </div>
            </div>
            <button className="neon-btn" onClick={() => setShowSetup(false)} style={{ marginTop: '20px', width: '100%', background: '#111', color: '#fff' }}>FECHAR</button>
          </div>
        </div>
      )}

      <footer className="status-bar" style={{ gridColumn: '1/-1', textAlign: 'center', opacity: 0.4, padding: '20px', fontSize: '0.8rem' }}>
        PAINEL DE SENHAS • SISTEMA DE GESTÃO DE FLUXO • {data.date} • ÚNICO GUICHÊ
      </footer>
    </div>
  )
}

export default App
