import os
import sqlite3
import datetime as dt
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

from config import LAB, WEBHOOK_N8N, TEMPO_MEDIO_INICIAL
from settings_manager import load_settings, save_settings

app = FastAPI(title="QueueMaster API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'senhas.db')

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contador (
            id INTEGER PRIMARY KEY,
            data TEXT,
            comuns INTEGER,
            preferenciais INTEGER
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS fila (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            senha TEXT,
            tipo TEXT,
            status TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            chamado_em TIMESTAMP,
            finalizado_em TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class TicketRequest(BaseModel):
    tipo: str  # 'C' or 'P'

class SettingUpdate(BaseModel):
    queue_mode: str
    lab_name: Optional[str]

@app.get("/status")
def get_status():
    return {"status": "online", "lab": LAB}

@app.post("/emit")
def emit_ticket(req: TicketRequest):
    conn = get_db()
    cursor = conn.cursor()
    hoje = dt.date.today().isoformat()
    
    # Get/Init counters
    cursor.execute('SELECT comuns, preferenciais FROM contador WHERE data = ?', (hoje,))
    row = cursor.fetchone()
    
    if not row:
        cursor.execute('INSERT INTO contador (data, comuns, preferenciais) VALUES (?, 1, 1)', (hoje,))
        conn.commit()
        comum, prefer = 1, 1
    else:
        comum, prefer = row['comuns'], row['preferenciais']
        
    if req.tipo == 'C':
        numero = comum
        cursor.execute('UPDATE contador SET comuns = ? WHERE data = ?', (comum + 1, hoje))
    else:
        numero = prefer
        cursor.execute('UPDATE contador SET preferenciais = ? WHERE data = ?', (prefer + 1, hoje))
        
    senha_str = f"{req.tipo}{numero:03d}"
    
    # Insert into queue
    cursor.execute('INSERT INTO fila (senha, tipo, status) VALUES (?, ?, "AGUARDANDO")', (senha_str, req.tipo))
    conn.commit()
    
    # Trigger webhook (non-blocking)
    try:
        tipo_nome = "Preferencial" if req.tipo == "P" else "Comum"
        requests.post(WEBHOOK_N8N, json={"senha": senha_str, "unidade": "Toritama Web", "tipo": tipo_nome}, timeout=1)
    except:
        pass
    
    conn.close()
    return {"senha": senha_str, "tipo": req.tipo, "numero": numero}

@app.get("/queue")
def get_queue():
    conn = get_db()
    cursor = conn.cursor()
    
    # Next 5 in line
    cursor.execute("SELECT id, senha, tipo FROM fila WHERE status = 'AGUARDANDO' ORDER BY id ASC LIMIT 5")
    waiting = [dict(r) for r in cursor.fetchall()]
    
    # Last 4 called
    cursor.execute("SELECT senha, tipo FROM fila WHERE status = 'CHAMADO' ORDER BY chamado_em DESC LIMIT 4")
    called = [dict(r) for r in cursor.fetchall()]
    
    # Calculate Average Wait Time
    hoje = dt.date.today().isoformat()
    cursor.execute('''
        SELECT AVG((julianday(chamado_em) - julianday(criado_em)) * 1440) 
        FROM fila 
        WHERE status IN ('CHAMADO', 'FINALIZADO')
        AND date(criado_em) = ?
        AND chamado_em IS NOT NULL
    ''', (hoje,))
    avg_wait = cursor.fetchone()[0]
    avg_wait = int(max(1, round(avg_wait))) if avg_wait else TEMPO_MEDIO_INICIAL
    
    conn.close()
    return {
        "waiting": waiting,
        "called": called,
        "average_wait": avg_wait
    }

@app.post("/call-next")
def call_next():
    conn = get_db()
    cursor = conn.cursor()
    
    # Finalize current active one if any
    cursor.execute("UPDATE fila SET status = 'FINALIZADO', finalizado_em = CURRENT_TIMESTAMP WHERE status = 'CHAMADO'")
    
    settings = load_settings()
    mode = settings.get("queue_mode", "alternating")
    
    # Simplified alternating logic for web version (porting the 2:1 rule)
    # We'll use a session state or just check the last called ones
    cursor.execute("SELECT tipo FROM fila WHERE status = 'CHAMADO' OR status = 'FINALIZADO' ORDER BY id DESC LIMIT 2")
    last_two = [r['tipo'] for r in cursor.fetchall()]
    
    # If last two were 'P', call 'C'
    prefer_count = last_two.count('P')
    
    row = None
    if mode == "alternating" and prefer_count >= 2:
        cursor.execute("SELECT id, senha, tipo FROM fila WHERE status = 'AGUARDANDO' AND tipo = 'C' ORDER BY id ASC LIMIT 1")
        row = cursor.fetchone()
        
    if not row:
        # Prioritize 'P'
        cursor.execute("SELECT id, senha, tipo FROM fila WHERE status = 'AGUARDANDO' AND tipo = 'P' ORDER BY id ASC LIMIT 1")
        row = cursor.fetchone()
        
    if not row:
        # fallback to 'C'
        cursor.execute("SELECT id, senha, tipo FROM fila WHERE status = 'AGUARDANDO' AND tipo = 'C' ORDER BY id ASC LIMIT 1")
        row = cursor.fetchone()

    if row:
        cursor.execute("UPDATE fila SET status = 'CHAMADO', chamado_em = CURRENT_TIMESTAMP WHERE id = ?", (row['id'],))
        conn.commit()
        res = dict(row)
        conn.close()
        return res
    
    conn.close()
    return {"message": "No one in queue"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
