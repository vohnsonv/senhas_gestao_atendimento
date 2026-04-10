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
      history: [],
      p_streak: 0,
      priorityMode: 'balanced', // 'balanced' or 'priority_only'
      activeCall: null
    }
    
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.date !== initial.date) return initial
      return { ...initial, ...parsed } // Mesclar para garantir campos novos
    }
    return initial
  })

  const [lastTicket, setLastTicket] = useState(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [printerOnline, setPrinterOnline] = useState(false)
  const [printers, setPrinters] = useState([])
  const [selectedPrinter, setSelectedPrinter] = useState(() => localStorage.getItem('selected_printer'))
  const [showSetup, setShowSetup] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const timerRef = useRef(null)

  // Sync to LocalStorage
  useEffect(() => {
    if (!isPublic) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }, [data])

  // Timer Logic (Local)
  useEffect(() => {
    if (data.activeCall) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
      setTimerSeconds(0)
    }
    return () => clearInterval(timerRef.current)
  }, [data.activeCall])

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

  // Lógica de Sincronização e Áudio na TV
  const lastCalledRef = useRef(null)
  useEffect(() => {
    if (isPublic && data.activeCall && data.activeCall.senha !== lastCalledRef.current) {
      lastCalledRef.current = data.activeCall.senha
      
      // Som Chime
      const chime = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      chime.play().catch(e => console.log("Erro som TV:", e));

      // Voz
      const msg = new SpeechSynthesisUtterance(`Senha ${data.activeCall.senha}, favor comparecer.`);
      msg.lang = 'pt-BR';
      window.speechSynthesis.speak(msg);
    }
  }, [data.activeCall, isPublic])

  const setActiveCallSync = (item) => {
    // Helper para garantir que a atualização de estado finalize o atendimento e comece o novo
    // Isso já é feito no callNext, mas centralizamos aqui se necessário
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert("Copiado!")
  }

  const checkPrinter = async () => {
    try {
      const res = await fetch(`${PRINT_NODE_URL}/printers`)
      if (res.ok) {
        const data = await res.json()
        setPrinters(data.printers)
        setPrinterOnline(true)
        if (!selectedPrinter && data.default) {
          setSelectedPrinter(data.default)
        }
      } else {
        setPrinterOnline(false)
      }
    } catch {
      setPrinterOnline(false)
    }
  }

  useEffect(() => {
    checkPrinter()
    const interval = setInterval(checkPrinter, 10000)
    
    // Sincronização entre abas
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const parsed = JSON.parse(e.newValue)
        setData(parsed)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // Detectar visão
  const urlParams = new URLSearchParams(window.location.search)
  const isPublic = urlParams.get('view') === 'public'

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

    // Lista de emojis (Easter Egg)
    const emojis = ['🍀', '🚀', '⭐', '🔥', '💎', '🌈', '🍦', '🍕', '🎸', '🎮']
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]

    // Cálculo de tempo estimado
    const getWaitTime = () => {
      if (data.history.length === 0) return data.waiting.length * 5 
      const totalSeconds = data.history.reduce((acc, curr) => {
        const [m, s] = curr.duration.split(':').map(Number)
        return acc + (m * 60) + s
      }, 0)
      const avg = totalSeconds / data.history.length
      return Math.ceil((data.waiting.length * avg) / 60)
    }

    const waitMin = getWaitTime()
    const now = new Date()
    
    // Impressão
    if (printerOnline) {
      try {
        await fetch(`${PRINT_NODE_URL}/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            senha, 
            tipo, 
            lab: "ATENDE.ORG - RECEPÇÃO",
            printer_name: selectedPrinter,
            data: now.toLocaleDateString('pt-BR'),
            hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            espera: waitMin > 0 ? waitMin : 5,
            emoji: randomEmoji
          })
        })
      } catch (err) { console.error(err) }
    }

    setTimeout(() => setLastTicket(null), 5000)
  }

  const testPrint = async () => {
    if (!printerOnline) return
    try {
      await fetch(`${PRINT_NODE_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lab: "TESTE DE IMPRESSÃO",
          is_test: true,
          printer_name: selectedPrinter 
        })
      })
      alert("Comando enviado!")
    } catch (err) { alert("Erro ao imprimir teste") }
  }

  const handleSelectPrinter = (name) => {
    setSelectedPrinter(name)
    localStorage.setItem('selected_printer', name)
  }

  const callNext = () => {
    if (data.waiting.length === 0) {
      if (data.activeCall) {
         const finishedItem = {
           ...data.activeCall,
           endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
           duration: formatTime(timerSeconds)
         }
         setData(prev => ({
           ...prev,
           history: [finishedItem, ...prev.history].slice(0, 50),
           activeCall: null
         }))
         setTimerSeconds(0)
      } else {
         alert("Fila vazia")
      }
      return
    }

    // Finalizar atendimento atual se houver e preparar o próximo
    let historyUpdate = []
    if (data.activeCall) {
       const finishedItem = {
         ...data.activeCall,
         endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
         duration: formatTime(timerSeconds)
       }
       historyUpdate = [finishedItem]
    }

    // Lógica de Chamada
    let nextIndex = -1
    let newStreak = data.p_streak

    if (data.priorityMode === 'priority_only') {
       nextIndex = data.waiting.findIndex(item => item.tipo === 'P')
    } else if (data.priorityMode === 'arrival_order') {
       // Ordem de Chegada absoluta pelo timestamp
       nextIndex = 0 // data.waiting já mantém a ordem de inserção
    } else {
       if (newStreak >= 1) {
         nextIndex = data.waiting.findIndex(item => item.tipo === 'C')
         if (nextIndex !== -1) newStreak = 0
       }
       if (nextIndex === -1) {
         nextIndex = data.waiting.findIndex(item => item.tipo === 'P')
         if (nextIndex !== -1) newStreak = 1
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
      p_streak: newStreak,
      activeCall: { ...nextItem, startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
      history: historyUpdate.length > 0 ? [...historyUpdate, ...prev.history].slice(0, 50) : prev.history
    }))
    setTimerSeconds(0)
  }

  const toggleMode = () => {
    setData(prev => {
      const modes = ['balanced', 'priority_only', 'arrival_order']
      const currentIndex = modes.indexOf(prev.priorityMode)
      const nextMode = modes[(currentIndex + 1) % modes.length]
      return { ...prev, priorityMode: nextMode }
    })
  }

  const cancelTicket = (id) => {
    if (window.confirm("Deseja cancelar esta senha?")) {
      setData(prev => ({
        ...prev,
        waiting: prev.waiting.filter(item => item.id !== id)
      }))
    }
  }

  if (isPublic) {
    return (
      <div className="public-view">
        <div className="public-current">
          <p style={{ fontSize: '4rem', opacity: 0.8, color: 'white', fontWeight: '800' }}>CHAMADO AGORA</p>
          <div className="public-ticket-number" style={{ fontSize: data.activeCall ? '28rem' : '15rem' }}>
            {data.activeCall ? data.activeCall.senha : '---'}
          </div>
          <div style={{ position: 'absolute', top: '40px', right: '40px', background: 'rgba(0,0,0,0.5)', padding: '15px 30px', borderRadius: '50px', border: '1px solid var(--ocean-blue)' }}>
             <h2 style={{ fontSize: '1.5rem', color: 'var(--ocean-blue)' }}>{data.date}</h2>
          </div>
        </div>
        
        <div className="public-sidebar">
          <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '30px', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', color: 'var(--ocean-blue)', fontWeight: '800' }}>PRÓXIMO</h2>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {data.waiting.slice(0, 1).map(item => (
                <div key={item.id} className="public-next-item" style={{ width: '100%', padding: '30px' }}>
                  <span style={{ fontSize: '8rem', fontWeight: '950', color: item.tipo === 'P' ? 'var(--accent-lime)' : 'var(--neon-green)' }}>{item.senha}</span>
                </div>
              ))}
              {data.waiting.length === 0 && <p style={{ opacity: 0.2, fontSize: '2rem' }}>---</p>}
            </div>
          </div>
        </div>

        <div className="public-ad-space">
          <div className="video-container">
            <img src="/ad_banner.png" alt="Publicidade" style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
            {/* Espaço preparado para Vídeo 16:9 */}
          </div>
          <div className="marquee-footer-modern">
             <marquee scrollamount="12">BEM-VINDO AO NOSSO ATENDIMENTO • AGUARDE SUA VEZ • TEMPO MÉDIO ESTIMADO: ~5 MINUTOS • OBRIGADO PELA PACIÊNCIA</marquee>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 className="hero-title" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Ticket style={{ color: 'var(--ocean-blue)' }} size={42} strokeWidth={2.5} />
            PAINEL DE SENHAS
          </h1>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="neon-btn" onClick={() => setShowHistory(true)} style={{ padding: '8px 15px', fontSize: '0.7rem' }}>
             <History size={14} /> HISTÓRICO
          </button>
          <div className={`printer-status ${printerOnline ? 'online' : 'offline'}`} onClick={() => setShowSetup(true)} style={{ cursor: 'pointer' }}>
            {printerOnline ? '● IMPRESSORA ONLINE' : '○ IMPRESSORA OFFLINE'}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 15px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', border: '1px solid rgba(255,255,255,0.1)' }}>
            MODO: {data.priorityMode === 'balanced' ? '⚖️ INTERCALADO' : data.priorityMode === 'arrival_order' ? '⏱️ ORDEM DE CHEGADA' : '🔥 PRIORIDADE MÁXIMA'}
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
               <p style={{ color: 'var(--ocean-blue)', fontWeight: '900', fontSize: '1.5rem' }}>{lastTicket}</p>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ border: '2px solid rgba(14, 165, 233, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <Play size={18} /> PAINEL DO ATENDENTE
             </h2>
             {data.activeCall && <div className="active-timer"><Clock size={16} /> {formatTime(timerSeconds)}</div>}
          </div>
          
          {data.activeCall ? (
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <p style={{ opacity: 0.5, fontSize: '1.2rem' }}>EM ATENDIMENTO AGORA</p>
              <h3 style={{ fontSize: '8rem', lineHeight: '1', margin: '15px 0', color: 'var(--ocean-blue)', textShadow: '0 0 50px rgba(16, 185, 129, 0.3)' }}>{data.activeCall.senha}</h3>
              <p style={{ opacity: 0.7, marginTop: '5px', fontSize: '1rem' }}>Iniciado às {data.activeCall.startTime}</p>
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
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.2rem', color: item.tipo === 'P' ? 'var(--accent-lime)' : 'var(--neon-green)' }}>{item.senha}</span>
                    <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>{item.emitTime}</span>
                  </div>
                  <button onClick={() => cancelTicket(item.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>✕</button>
                </div>
              )) : <p style={{ opacity: 0.2, textAlign: 'center', marginTop: '50px' }}>Vazio</p>}
           </div>

        </div>
      </aside>

      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><History size={24} /> HISTÓRICO DE ATENDIMENTOS</h2>
              <button className="neon-btn" onClick={() => setShowHistory(false)} style={{ background: '#111', padding: '10px 20px' }}>FECHAR</button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
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
                      <td style={{ fontSize: '0.9rem', opacity: 0.7 }}>{row.startTime}</td>
                      <td style={{ fontSize: '0.9rem', opacity: 0.7 }}>{row.endTime}</td>
                      <td style={{ fontWeight: '700', color: '#10b981' }}>{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.history.length === 0 && <p style={{ textAlign: 'center', opacity: 0.3, padding: '40px' }}>Nenhum atendimento realizado hoje.</p>}
            </div>
          </div>
        </div>
      )}

      {showSetup && (
        <div className="modal-overlay" onClick={() => setShowSetup(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ color: '#fff', marginBottom: '20px' }}>PAINEL DE SENHAS Print Node 🖨️</h2>
            <div className="setup-step" style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '16px', marginBottom: '15px' }}>
              <h3 style={{ color: 'var(--neon-green)', marginBottom: '10px' }}>🖨️ Selecionar Impressora</h3>
              <select 
                value={selectedPrinter || ''} 
                onChange={(e) => handleSelectPrinter(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#000', color: '#fff', border: '1px solid var(--neon-green)' }}
              >
                <option value="">-- Padrão do Sistema --</option>
                {printers.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button 
                className="neon-btn btn-emerald" 
                onClick={testPrint}
                style={{ width: '100%', marginTop: '10px', fontSize: '0.8rem' }}
              >
                TESTAR IMPRESSÃO & CORTE
              </button>
            </div>

            <div className="setup-step" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '16px' }}>
              <h3 style={{ color: '#fff' }}>📥 Backend (Python)</h3>
              <p style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '10px' }}>Certifique-se que o script print_server.py está rodando na porta 5000.</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <a href="https://www.python.org/downloads/" target="_blank" className="neon-btn" style={{ textDecoration: 'none', fontSize: '0.7rem', background: '#222' }}>
                  BAIXAR PYTHON
                </a>
              </div>
            </div>
            <button className="neon-btn" onClick={() => setShowSetup(false)} style={{ marginTop: '20px', width: '100%', background: '#111', color: '#fff' }}>FECHAR</button>
          </div>
        </div>
      )}

      {/* Footer removido a pedido do usuário */}
    </div>
  )
}

export default App
