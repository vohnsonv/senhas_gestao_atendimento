import React, { useState, useEffect, useRef } from 'react'
import { Ticket, UserCheck, Clock, History, Settings, Play, Pause, ListFilter, Lock, Accessibility, CheckCircle2 } from 'lucide-react'
import './App.css'

const STORAGE_KEY = 'atende_org_data_v2'

// Componente para exibir tempo de espera relativo
const RelativeTime = ({ timestamp }) => {
  const [mins, setMins] = useState(() => Math.floor((Date.now() - timestamp) / 60000))
  useEffect(() => {
    const int = setInterval(() => {
      setMins(Math.floor((Date.now() - timestamp) / 60000))
    }, 60000)
    return () => clearInterval(int)
  }, [timestamp])
  return <span>esperando há {mins === 0 ? 'poucos seg' : `${mins} min`}</span>
}

function App() {
  const urlParams = new URLSearchParams(window.location.search)
  const isPublic = urlParams.get('view') === 'public'

  const [data, setData] = useState(() => {
    const initial = {
      date: new Date().toLocaleDateString(),
      common: 1,
      priority: 1,
      waiting: [],
      history: [],
      p_streak: 0,
      priorityMode: 'balanced', // 'balanced' or 'priority_only'
      activeCall: null
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Se a data mudou, resetamos o estado para o dia atual
        if (parsed.date !== initial.date) {
            console.log('App: Novo dia detectado, limpando estado antigo.')
            return initial
        }
        // Mesclagem profunda simples para garantir campos novos
        return {
           ...initial,
           ...parsed,
           waiting: Array.isArray(parsed.waiting) ? parsed.waiting : [],
           history: Array.isArray(parsed.history) ? parsed.history : []
        }
      }
    } catch (err) {
      console.error('App: Falha ao carregar estado inicial:', err)
    }
    return initial
  })

  const [lastTicket, setLastTicket] = useState(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [printerOnline, setPrinterOnline] = useState(false)
  const [printers, setPrinters] = useState([])
  const [selectedPrinter, setSelectedPrinter] = useState(() => localStorage.getItem('selected_printer'))
  const [printNodeUrl, setPrintNodeUrl] = useState(() => localStorage.getItem('atende_print_node_url') || 'http://127.0.0.1:5000')
  const [printerHeader, setPrinterHeader] = useState(() => localStorage.getItem('atende_printer_header') || 'LADES LABORATORIO')
  const [printerFooter, setPrinterFooter] = useState(() => localStorage.getItem('atende_printer_footer') || 'Obrigado por escolher o\nLades Laboratorio.\nAguarde sua senha no painel.')
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('atende_auth') === '124663')
  const [passwordInput, setPasswordInput] = useState('')

  const [activeTab, setActiveTab] = useState('atendimento') // 'atendimento' | 'configuracoes'
  const [showHistory, setShowHistory] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const timerRef = useRef(null)

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('atende_print_node_url', printNodeUrl)
  }, [printNodeUrl])

  useEffect(() => {
    localStorage.setItem('atende_printer_header', printerHeader)
  }, [printerHeader])

  useEffect(() => {
    localStorage.setItem('atende_printer_footer', printerFooter)
  }, [printerFooter])

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
         setIsSpacePressed(true)
         callNext()
         setTimeout(() => setIsSpacePressed(false), 200)
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
      const res = await fetch(`${printNodeUrl}/printers`)
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
        setData(prev => {
          // Dispara som caso seja a visão Pública (TV) e tenha havido uma Nova Chamada.
          if (isPublic && parsed.activeCall && (!prev.activeCall || parsed.activeCall.id !== prev.activeCall.id)) {
            try {
              // Som de "Airport Chime" / Chamada no painel principal
              const tvChime = new Audio('https://assets.mixkit.co/active_storage/sfx/2800/2800-preview.mp3')
              tvChime.volume = 1.0
              tvChime.play().catch(err => console.log('Interaja com a tela uma vez para habilitar o áudio automático'))
            } catch(err) {}
          }
          return parsed
        })
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorage)
    }
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
        await fetch(`${printNodeUrl}/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            senha, 
            tipo, 
            lab: "ATENDE.ORG - RECEPÇÃO",
            printer_name: selectedPrinter,
            cabecalho: printerHeader,
            rodape: printerFooter,
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
      await fetch(`${printNodeUrl}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lab: "TESTE DE IMPRESSÃO",
          is_test: true,
          printer_name: selectedPrinter,
          cabecalho: printerHeader,
          rodape: printerFooter
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
    // Sound Feedback Local (Feedback Suave Atendente)
    try {
      const clickSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3')
      clickSound.volume = 0.4
      clickSound.play()
    } catch(e) {}

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
          <p style={{ fontSize: '4rem', opacity: 0.8, color: 'var(--text-muted)', fontWeight: '800' }}>CHAMADO AGORA</p>
          <div className="public-ticket-number" style={{ fontSize: data.activeCall ? '28rem' : '15rem' }}>
            {data.activeCall ? data.activeCall.senha : '---'}
          </div>
          <div style={{ position: 'absolute', top: '40px', right: '40px', background: 'var(--bg-main)', padding: '15px 30px', borderRadius: '50px', border: '1px solid var(--glass-border)' }}>
             <h2 style={{ fontSize: '1.5rem', color: 'var(--color-primary)', margin: 0 }}>{data.date}</h2>
          </div>
        </div>
        
        <div className="public-sidebar">
          <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '30px', overflow: 'hidden' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', color: 'var(--color-secondary)', fontWeight: '800' }}>PRÓXIMO</h2>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {data.waiting.slice(0, 1).map(item => (
                <div key={item.id} className="public-next-item" style={{ width: '100%', padding: '30px' }}>
                  <span style={{ fontSize: '8rem', fontWeight: '950', color: item.tipo === 'P' ? 'var(--color-secondary)' : 'var(--color-primary)' }}>{item.senha}</span>
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

  const handleLogin = (e) => {
    e.preventDefault()
    if (passwordInput === '124663') {
      sessionStorage.setItem('atende_auth', '124663')
      setIsAuthenticated(true)
    } else {
      alert("Senha incorreta!")
      setPasswordInput('')
    }
  }

  if (!isPublic && !isAuthenticated) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
         <div className="glass-card" style={{ width: '400px', textAlign: 'center' }}>
            <Lock size={48} style={{ color: 'var(--color-primary)', margin: '0 auto 20px auto' }} />
            <h2 style={{ marginBottom: '20px' }}>ACESSO RESTRITO</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                type="password" 
                placeholder="Insira a senha de acesso..." 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                style={{ padding: '15px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-main)', color: 'var(--text-main)', fontSize: '1.2rem', textAlign: 'center' }}
                autoFocus
              />
              <button type="submit" className="neon-btn btn-emerald" style={{ padding: '15px', fontSize: '1rem' }}>
                ENTRAR NO PAINEL
              </button>
            </form>
         </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 className="hero-title" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Ticket style={{ color: 'var(--color-primary)' }} size={42} strokeWidth={2.5} />
            PAINEL DE SENHAS
          </h1>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className={`tab-btn ${activeTab === 'atendimento' ? 'active' : ''}`} onClick={() => setActiveTab('atendimento')}>
             <Ticket size={14} style={{strokeWidth: 2.5}}/> ATENDIMENTO
          </button>
          <button className={`tab-btn ${activeTab === 'configuracoes' ? 'active' : ''}`} onClick={() => setActiveTab('configuracoes')}>
             <Settings size={14} style={{strokeWidth: 2.5}}/> CONFIGURAÇÕES
          </button>
          <a href="/?view=public" target="_blank" rel="noopener noreferrer" className="tab-btn" style={{ textDecoration: 'none', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
             🖥️ ABRIR TV
          </a>
          <button className="tab-btn" onClick={() => setShowHistory(true)}>
             <History size={14} style={{strokeWidth: 2.5}}/> HISTÓRICO
          </button>
          <div className={`printer-status ${printerOnline ? 'online' : 'offline'}`} onClick={() => setActiveTab('configuracoes')} style={{ cursor: 'pointer', animation: printerOnline ? 'blinkIndicator 2s infinite' : 'none' }}>
            {printerOnline ? '● IMPRESSORA ONLINE' : '○ IMPRESSORA OFFLINE'}
          </div>
          <button onClick={toggleMode} className="tab-btn">
            MODO: {data.priorityMode === 'balanced' ? '⚖️ INTERCALADO' : data.priorityMode === 'arrival_order' ? '⏱️ ORDEM DE CHEGADA' : '🔥 PRIORIDADE'}
          </button>
        </div>
      </header>

      {activeTab === 'atendimento' ? (
        <>
          <main className="terminal-section">
        <div className="glass-card" style={{ marginBottom: '30px' }}>
          <h2>EMISSÃO DE TICKETS</h2>
          <div className="btn-container" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            <button className="neon-btn btn-emerald" onClick={() => emitTicket('C')} style={{ padding: '25px', fontSize: '1.4rem' }}>
              <UserCheck size={40} />
              <span style={{ marginLeft: '15px' }}>COMUM</span>
            </button>
            <button className="neon-btn btn-lime" onClick={() => emitTicket('P')} style={{ padding: '25px', fontSize: '1.4rem' }}>
              <Accessibility size={40} />
              <span style={{ marginLeft: '15px' }}>PREFERENCIAL</span>
            </button>
          </div>
          {lastTicket && (
            <div style={{ position: 'absolute', top: '20px', right: '40px', textAlign: 'center' }}>
               <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>ÚLTIMO EMITIDO</p>
               <p style={{ color: 'var(--color-primary)', fontWeight: '900', fontSize: '1.5rem' }}>{lastTicket}</p>
            </div>
          )}
        </div>

        <div className="glass-card" style={{ border: '2px solid rgba(27, 153, 139, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <Play size={18} /> PAINEL DO ATENDENTE
             </h2>
             {data.activeCall && <div className="active-timer"><Clock size={16} /> {formatTime(timerSeconds)}</div>}
          </div>
          
          {data.activeCall ? (
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 600 }}>EM ATENDIMENTO AGORA</p>
              <h3 style={{ fontSize: '8rem', lineHeight: '1', margin: '15px 0', color: 'var(--color-primary)' }}>{data.activeCall.senha}</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '5px', fontSize: '1rem' }}>Iniciado às {data.activeCall.startTime}</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Aguardando próxima chamada...</div>
          )}

          <div style={{ display: 'flex', gap: '15px' }}>
             <button 
                onClick={() => {
                  setIsSpacePressed(true)
                  callNext()
                  setTimeout(() => setIsSpacePressed(false), 200)
                }}
                style={{ 
                  width: '100%', 
                  flex: 1, 
                  backgroundColor: 'var(--color-secondary)', 
                  color: '#fff', 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem', 
                  padding: '24px', 
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  animation: isSpacePressed ? 'flashPulse 0.2s ease-out' : 'none',
                  transform: isSpacePressed ? 'scale(0.98)' : 'scale(1)',
                  transition: 'transform 0.1s'
                }}>
               CHAMAR PRÓXIMO (Espaço) 🔊
             </button>
          </div>
        </div>
      </main>

      <aside className="queue-section">
        <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
           <h2>FILA DE ESPERA ({data.waiting.length})</h2>
           <div style={{ flex: 1, overflowY: 'auto', marginBottom: '30px' }}>
              {data.waiting.length > 0 ? data.waiting.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {item.tipo === 'P' ? <Accessibility size={24} style={{ color: 'var(--color-secondary)'}} /> : <UserCheck size={24} style={{ color: 'var(--text-muted)'}} />}
                    <span style={{ fontWeight: '800', fontSize: '1.4rem', color: item.tipo === 'P' ? 'var(--color-secondary)' : 'var(--text-main)' }}>{item.senha}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '10px' }}><RelativeTime timestamp={item.timestamp} /></span>
                  </div>
                  <button onClick={() => cancelTicket(item.id)} style={{ background: 'var(--bg-main)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', width: '45px', height: '45px', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s' }}>✕</button>
                </div>
              )) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '80px' }}>
                  <CheckCircle2 size={64} style={{ margin: '0 auto', marginBottom: '20px', color: 'var(--color-primary)', opacity: 0.5 }} />
                  <p style={{ fontSize: '1.2rem' }}>Tudo limpo!<br/>Nenhum paciente aguardando.</p>
                </div>
              )}
           </div>

        </div>
      </aside>
        </>
      ) : (
        <main className="glass-card" style={{ gridColumn: '1 / -1', padding: '40px', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
             <Settings size={32} style={{ color: 'var(--color-primary)' }} />
             <h2 style={{ margin: 0 }}>CONFIGURAÇÕES DO SISTEMA</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.5fr) minmax(300px, 1fr)', gap: '30px' }}>
            {/* Esquerda: Configurações de Impressão */}
            <div className="setup-step" style={{ padding: '30px', background: 'var(--bg-main)', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '25px', fontSize: '1.2rem' }}>🖨️ Editor de Impressão e Comunicação</h3>
              
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>Endereço Local Print Agent (.EXE)</label>
              <input 
                type="text" 
                value={printNodeUrl} 
                onChange={(e) => setPrintNodeUrl(e.target.value)}
                placeholder="Ex: http://127.0.0.1:5000"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', marginBottom: '20px', fontSize: '1rem' }}
              />

              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>Selecionar Impressora Instalada</label>
              <select 
                value={selectedPrinter || ''} 
                onChange={(e) => handleSelectPrinter(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', marginBottom: '20px', fontSize: '1rem', cursor: 'pointer' }}
              >
                <option value="">-- Padrão do Sistema --</option>
                {printers.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>Cabeçalho do Ticket</label>
              <input 
                type="text" 
                value={printerHeader} 
                onChange={(e) => setPrinterHeader(e.target.value)}
                placeholder="Ex: LADES LABORATORIO"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', marginBottom: '20px', fontSize: '1rem' }}
              />

              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 'bold' }}>Mensagem de Rodapé (Agradecimento / Insta)</label>
              <textarea 
                value={printerFooter} 
                onChange={(e) => setPrinterFooter(e.target.value)}
                placeholder="Ex: Obrigado por escolher o laboratório..."
                rows="4"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', marginBottom: '20px', resize: 'vertical', fontSize: '1rem', fontFamily: 'inherit' }}
              />
              <button 
                className="neon-btn btn-lime" 
                onClick={testPrint}
                style={{ width: '100%', marginTop: '10px', fontSize: '1rem', padding: '15px' }}
              >
                TESTAR IMPRESSÃO & CORTE
              </button>
            </div>

            {/* Direita: Downloads e Dependências */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="setup-step" style={{ padding: '30px', background: 'var(--bg-main)', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                <h3 style={{ color: 'var(--color-secondary)', marginBottom: '10px' }}>📥 Backend Dependente</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px', lineHeight: '1.4' }}>Certifique-se de que a ponte de comunicação (print_server.py ou Agente.exe) está rodando localmente (normalmente porta 5000), caso contrário as impressões falharão.</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer" className="tab-btn" style={{ textDecoration: 'none', fontSize: '0.8rem', flex: 1, textAlign: 'center', justifyContent: 'center' }}>
                    BAIXAR PYTHON
                  </a>
                </div>
              </div>

              <div className="setup-step" style={{ padding: '30px', background: 'var(--bg-main)', borderRadius: '20px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
                <h3 style={{ color: 'var(--color-secondary)', marginBottom: '15px', fontSize: '1.2rem' }}>📥 Downloads & Drivers</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Baixe as pontes de comunicação e os drivers da impressora POS-80.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <a href="/drivers_pos80.zip" download className="tab-btn" style={{ padding: '15px', textDecoration: 'none', fontSize: '1rem', justifyContent: 'center' }}>
                    🖨️ DRIVERS POS-80
                  </a>
                  <a href="/Instalador_LabSync_Agent.exe" download className="neon-btn btn-emerald" style={{ padding: '15px', textDecoration: 'none', fontSize: '1rem', fontWeight: 'bold' }}>
                    🪟 BRIDGE INSTALLER (.EXE)
                  </a>
                  <a href="/print_server.py" download className="tab-btn" style={{ padding: '15px', textDecoration: 'none', fontSize: '1rem', justifyContent: 'center' }}>
                    🐧 BRIDGE SCRIPT LINUX (.PY)
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}><History size={24} /> HISTÓRICO DE ATENDIMENTOS</h2>
              <button className="tab-btn" onClick={() => setShowHistory(false)}>FECHAR</button>
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
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{row.startTime}</td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{row.endTime}</td>
                      <td style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.history.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Nenhum atendimento realizado hoje.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Footer removido a pedido do usuário */}
    </div>
  )
}

export default App
