import os
import requests
import datetime as dt
from datetime import datetime
import sqlite3
import tkinter as tk
import threading
from config import LAB, WEBHOOK_N8N, TEMPO_MEDIO_INICIAL, IS_WINDOWS
from impressora import enviar_dados_impressora
from settings_manager import load_settings, save_settings
from tkinter import messagebox

import sys

if IS_WINDOWS:
    import win32print

def get_base_path():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

class AppRecepcao:
    def __init__(self, root):
        self.root = root
        self.root.title("Terminal de Emissão de Senhas")
        
        # Iniciar nativamente maximizado pelo SO sem perder a barra de tarefas
        if IS_WINDOWS:
            self.root.state('zoomed')
        else:
            self.root.attributes('-zoomed', True)
        
        # Banco de Dados Local para Garantir Zero Downtime / Retorno Pós-Queda de Energia
        db_path = os.path.join(get_base_path(), 'senhas.db')
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.init_db()
        
        self.data_atual = dt.date.today().isoformat()
        self.contador_comum, self.contador_preferencial = self.obter_contadores()
        
        # Controle de preempção justa (Anti-Starvation)
        self.qtd_p_chamados_seguidos = 0
        self.atendimento_atual_id = None
        
        # Atributos de UI (Inicializados em construir_interface)
        self.frame_esq = None
        self.frame_dir = None
        self.lbl_tempo_medio = None
        self.lbl_status = None
        self.container_principal = None
        self.slots_aguardando = []
        self.slots_chamados = []

        self.construir_interface()
        self.configurar_atalhos()

    def centralizar_janela(self, largura, altura):
        """Vazio. Foi substituído pela maximização automática do sistema operacional."""
        pass

    def init_db(self):
        """Inicializa e garante integridade básica do controle de senhas diário e da nova Fila Visual."""
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS contador (
                id INTEGER PRIMARY KEY,
                data TEXT,
                comuns INTEGER,
                preferenciais INTEGER
            )
        ''')
        # Tabela robusta para segurar a flutuação de operação (queda de energia)
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
        # Tenta adicionar as colunas a uma base já existente sem quebrar (Migration silenciosa)
        try:
            cursor.execute("ALTER TABLE fila ADD COLUMN chamado_em TIMESTAMP")
        except sqlite3.OperationalError:
            pass # Coluna já existe
            
        try:
            cursor.execute("ALTER TABLE fila ADD COLUMN finalizado_em TIMESTAMP")
        except sqlite3.OperationalError:
            pass # Coluna já existe
            
        self.conn.commit()

    def obter_contadores(self):
        """Trata escala diária. Volta para 1 no dia seguinte automaticamente."""
        hoje = dt.date.today().isoformat()
        cursor = self.conn.cursor()
        cursor.execute('SELECT comuns, preferenciais FROM contador WHERE data = ?', (hoje,))
        row = cursor.fetchone()
        
        if row:
            return row[0], row[1]
        else:
            # Novo dia ou primeiro acesso
            cursor.execute('INSERT INTO contador (data, comuns, preferenciais) VALUES (?, 1, 1)', (hoje,))
            self.conn.commit()
            return 1, 1

    def atualizar_contador_bd(self, tipo, valor):
        """Garante a persistência atômica da mudança real do contador."""
        hoje = dt.date.today().isoformat()
        cursor = self.conn.cursor()
        if tipo == 'C':
            cursor.execute('UPDATE contador SET comuns = ? WHERE data = ?', (valor, hoje))
        elif tipo == 'P':
            cursor.execute('UPDATE contador SET preferenciais = ? WHERE data = ?', (valor, hoje))
        self.conn.commit()

    def construir_interface(self):
        """Arquitetura UI Premium: Estética Dark/Neon com Cards de Comando."""
        # Configurações de cores Neon
        self.bg_deep = "#0D0D0D"
        self.bg_card = "#161616"
        self.fg_comum = "#00E5FF"
        self.fg_prefer = "#FF007F"
        self.fg_ready = "#ADFF2F"
        self.fg_white = "#E0E0E0"
        
        self.container_principal = tk.Frame(self.root, bg=self.bg_deep)
        self.container_principal.pack(fill=tk.BOTH, expand=True)
        self.container_principal.columnconfigure(0, weight=1)
        self.container_principal.columnconfigure(1, weight=1)
        self.container_principal.rowconfigure(0, weight=1)

        # LADO ESQUERDO: CONTROLES OPERACIONAIS
        self.frame_esq = tk.Frame(self.container_principal, bg=self.bg_deep)
        self.frame_esq.grid(row=0, column=0, sticky="nsew", padx=30, pady=30)
        
        self.lbl_titulo = tk.Label(self.frame_esq, text="TERMINAL DE RECEPÇÃO", font=("Segoe UI", 32, "bold"), fg=self.fg_white, bg=self.bg_deep)
        self.lbl_titulo.pack(pady=(20, 30))

        # --- CARD DE ATALHOS REORGANIZADO ---
        self.card_comandos = tk.Frame(self.frame_esq, bg=self.bg_card, bd=1, relief=tk.FLAT, highlightbackground="#333333", highlightthickness=1)
        self.card_comandos.pack(fill=tk.X, padx=20, pady=10)
        
        def add_instrucao_botao(parent, tecla, acao, cor, cmd):
            btn = tk.Button(parent, text=f"[{tecla}]  {acao}", font=("Segoe UI", 14, "bold"), 
                            fg=cor, bg=self.bg_card, activebackground="#333333", 
                            activeforeground=cor, bd=0, cursor="hand2", anchor="w",
                            padx=20, pady=8, command=cmd)
            btn.pack(fill=tk.X)

        # Seção EMISSÃO
        tk.Label(self.card_comandos, text=" EMISSÃO DE SENHAS (CLIQUE OU USE O TECLADO)", font=("Segoe UI", 10, "bold"), fg="#666666", bg=self.bg_card).pack(anchor="w", padx=15, pady=(10, 5))
        add_instrucao_botao(self.card_comandos, "C", "SENHA COMUM", self.fg_comum, lambda: self.processar_solicitacao("C"))
        add_instrucao_botao(self.card_comandos, "P", "SENHA PREFERENCIAL", self.fg_prefer, lambda: self.processar_solicitacao("P"))
        
        tk.Frame(self.card_comandos, height=1, bg="#333333").pack(fill=tk.X, padx=20, pady=10)
        
        # Seção OPERAÇÃO
        tk.Label(self.card_comandos, text=" OPERAÇÃO", font=("Segoe UI", 10, "bold"), fg="#666666", bg=self.bg_card).pack(anchor="w", padx=15, pady=(5, 5))
        add_instrucao_botao(self.card_comandos, "ENTER", "CHAMAR PRÓXIMO", self.fg_ready, lambda: self.chamar_proximo())
        
        tk.Frame(self.card_comandos, height=1, bg="#333333").pack(fill=tk.X, padx=20, pady=10)
        
        # Seção IMPRESSORA
        tk.Label(self.card_comandos, text=" CONTROLE DE PAPEL", font=("Segoe UI", 10, "bold"), fg="#666666", bg=self.bg_card).pack(anchor="w", padx=15, pady=(5, 5))
        
        grid_botoes = tk.Frame(self.card_comandos, bg=self.bg_card)
        grid_botoes.pack(fill=tk.X, padx=20, pady=(0, 15))
        
        def add_mini_tecla(parent, tecla, acao, row, col):
             f = tk.Frame(parent, bg=self.bg_card)
             f.grid(row=row, column=col, sticky="w", padx=5, pady=2)
             tk.Label(f, text=f"[{tecla}]", font=("Consolas", 12, "bold"), fg="#888888", bg=self.bg_card).pack(side=tk.LEFT)
             tk.Label(f, text=acao, font=("Segoe UI", 10), fg="#AAAAAA", bg=self.bg_card).pack(side=tk.LEFT)

        add_mini_tecla(grid_botoes, "↑", "AVANÇAR", 0, 0)
        add_mini_tecla(grid_botoes, "A", "AVANÇAR 3X", 0, 1)
        add_mini_tecla(grid_botoes, "↓", "VOLTAR", 1, 0)
        add_mini_tecla(grid_botoes, "R", "VOLTAR 3X", 1, 1)

        # Botão de Configurações (Engrenagem)
        self.btn_config = tk.Button(
            self.card_comandos, 
            text="⚙ Configurações", 
            font=("Segoe UI", 12, "bold"),
            bg="#333333", 
            fg=self.fg_white,
            activebackground="#444444",
            activeforeground=self.fg_ready,
            bd=0,
            cursor="hand2",
            command=self.abrir_configuracoes
        )
        self.btn_config.pack(fill=tk.X, padx=20, pady=(10, 15))

        # Métrica de Tempo Médio
        self.lbl_tempo_medio = tk.Label(self.frame_esq, text=f"Tempo Médio: {TEMPO_MEDIO_INICIAL} min", font=("Segoe UI", 20, "bold"), fg="#FFA500", bg=self.bg_deep)
        self.lbl_tempo_medio.pack(pady=20)

        self.lbl_status = tk.Label(self.frame_esq, text="SISTEMA PRONTO.", font=("Segoe UI", 16, "bold"), fg=self.fg_ready, bg=self.bg_deep)
        self.lbl_status.pack(side=tk.BOTTOM, pady=20)

        # LADO DIREITO: PAINEL DE FILA
        self.frame_dir = tk.Frame(self.container_principal, bg="#111111", bd=0)
        self.frame_dir.grid(row=0, column=1, sticky="nsew", padx=30, pady=30)
        
        # Sombra simulada/Gradiente para o painel de fila
        self.frame_dir_inner = tk.Frame(self.frame_dir, bg="#111111", bd=1, relief=tk.FLAT, highlightbackground="#222222", highlightthickness=1)
        self.frame_dir_inner.pack(fill=tk.BOTH, expand=True)

        # --- PAINEL AGUARDANDO ---
        self.frame_aguardando = tk.Frame(self.frame_dir_inner, bg="#111111")
        self.frame_aguardando.pack(fill=tk.BOTH, expand=True, padx=30, pady=(30, 0))

        self.lbl_titulo_aguardando = tk.Label(self.frame_aguardando, text="PRÓXIMOS", font=("Segoe UI", 24, "bold"), fg=self.fg_ready, bg="#111111")
        self.lbl_titulo_aguardando.pack(anchor="w", pady=(0, 20))

        self.slots_aguardando = []
        for i in range(5):
            # Slots agora são Frames para suportar botão de descarte interno
            f = tk.Frame(self.frame_aguardando, bg="#111111")
            f.pack(fill=tk.X, pady=4)
            self.slots_aguardando.append(f)

        # Linha Divisória Neon
        canvas_div = tk.Canvas(self.frame_dir_inner, height=2, bg="#333333", highlightthickness=0)
        canvas_div.pack(fill=tk.X, padx=40, pady=20)

        # --- PAINEL ÚLTIMOS CHAMADOS ---
        self.frame_chamados = tk.Frame(self.frame_dir_inner, bg="#111111")
        self.frame_chamados.pack(fill=tk.BOTH, expand=False, padx=30, pady=(0, 30))

        self.lbl_titulo_chamados = tk.Label(self.frame_chamados, text="ÚLTIMOS CHAMADOS", font=("Segoe UI", 16, "bold"), fg="#555555", bg="#111111")
        self.lbl_titulo_chamados.pack(anchor="w", pady=(0, 10))

        self.slots_chamados = []
        for i in range(4):
            lbl = tk.Label(self.frame_chamados, text="", font=("Segoe UI", 24, "overstrike"), fg="#333333", bg="#111111", anchor="w")
            lbl.pack(fill=tk.X, pady=2)
            self.slots_chamados.append(lbl)

        self.atualizar_tela_fila()

    def configurar_atalhos(self):
        """Mapeamento exclusivo para teclado."""
        self.root.bind("<c>", lambda e: self.processar_solicitacao("C"))
        self.root.bind("<C>", lambda e: self.processar_solicitacao("C"))
        self.root.bind("<p>", lambda e: self.processar_solicitacao("P"))
        self.root.bind("<P>", lambda e: self.processar_solicitacao("P"))
        self.root.bind("<Return>", lambda e: self.chamar_proximo())     # ENTER normais
        self.root.bind("<KP_Enter>", lambda e: self.chamar_proximo())   # ENTER do Teclado Numérico
        self.root.bind("<Up>", lambda e: self.movimentar_papel("AVANCAR"))
        self.root.bind("<a>", lambda e: self.movimentar_papel("AVANCAR_3X"))
        self.root.bind("<A>", lambda e: self.movimentar_papel("AVANCAR_3X"))
        self.root.bind("<Down>", lambda e: self.movimentar_papel("RETROCEDER"))
        self.root.bind("<r>", lambda e: self.movimentar_papel("RETROCEDER_3X"))
        self.root.bind("<R>", lambda e: self.movimentar_papel("RETROCEDER_3X"))
        self.root.bind("<Escape>", lambda e: self.root.quit())

    def movimentar_papel(self, direcao):
        """Interface thread-safe para mover o tracionador da impressora."""
        if direcao == "AVANCAR":
            self.atualizar_status("AVANÇANDO PAPEL...", "#00FFFF")
        else:
            self.atualizar_status("RETROCEDENDO PAPEL...", "#00FFFF")
        threading.Thread(target=self.executar_movimento_motor, args=(direcao,), daemon=True).start()

    def calcular_tempo_medio_minutos(self):
        """Calcula a média de espera (CRIADO -> CHAMADO) do dia no Banco."""
        cursor = self.conn.cursor()
        hoje = dt.date.today().isoformat()
        
        # Função Julianday em SQLite para diferença em dias -> multiplica por 1440 p/ min
        # Focamos no tempo de ESPERA (criado_em até chamado_em)
        cursor.execute('''
            SELECT AVG((julianday(chamado_em) - julianday(criado_em)) * 1440) 
            FROM fila 
            WHERE status IN ('CHAMADO', 'FINALIZADO')
            AND date(criado_em) = ?
            AND chamado_em IS NOT NULL
        ''', (hoje,))
        
        resultado = cursor.fetchone()[0]
        
        if resultado is None:
            return TEMPO_MEDIO_INICIAL
        return int(max(1, round(resultado)))
        
    def estimar_tempo_de_espera(self, tipo):
        """Calcula quantos minutos faltam com base nas filas prioritárias vs comuns"""
        cursor = self.conn.cursor()
        # Quantos caras já estão na fila "na minha frente" (regra de preempção simples)
        if tipo == "P":
             # P só tem P na frente.
             cursor.execute("SELECT COUNT(id) FROM fila WHERE status = 'AGUARDANDO' AND tipo = 'P'")
             qtd_frente = cursor.fetchone()[0]
        else:
             # C tem todos os Cs mais velhos + TODOS os Ps na fila (pois P fura a fila na base 2:1)
             cursor.execute("SELECT COUNT(id) FROM fila WHERE status = 'AGUARDANDO' AND tipo = 'P'")
             qtd_p = cursor.fetchone()[0]
             cursor.execute("SELECT COUNT(id) FROM fila WHERE status = 'AGUARDANDO' AND tipo = 'C'")
             qtd_c = cursor.fetchone()[0]
             # Abordagem matemática ponderada pelo Anti-Starvation (2 preferenciais pausam para 1 C).
             qtd_frente = qtd_c + qtd_p
        
        tempo_medio = self.calcular_tempo_medio_minutos()
        return (qtd_frente + 1) * tempo_medio

    def executar_movimento_motor(self, direcao):
        """Envia comandos diretos em hexadecimal (ESC/P) ou Line_Feeds para a matricial."""
        try:
            raw_data = b""
            if direcao == "AVANCAR":
                raw_data = b"\n" * 3
            elif direcao == "AVANCAR_3X":
                raw_data = b"\n" * 9
            elif direcao == "RETROCEDER_3X":
                raw_data = b'\x1b\x6a\x64' * 3
            else:
                raw_data = b'\x1b\x6a\x64'
                
            enviar_dados_impressora(raw_data)

            self.root.after(0, lambda: self.atualizar_status("SISTEMA PRONTO.", "#00FFFF"))
        except Exception as e:
            self.root.after(0, lambda: self.atualizar_status("FALHA MOTOR IMPRESSORA.", "#FF0000"))
            print(f"[{datetime.now()}] Erro no tracionador: {e}")

    def processar_solicitacao(self, tipo):
        """Trata regras de negócio, incrementos e chama I/O em desdobramento."""
        try:
            # Se virou o dia, reseta os contadores para iniciar um novo dia sem precisar fechar o app
            hoje = dt.date.today().isoformat()
            if getattr(self, 'data_atual', hoje) != hoje:
                self.data_atual = hoje
                self.contador_comum, self.contador_preferencial = self.obter_contadores()

            if tipo == "C":
                numero = self.contador_comum
                self.contador_comum += 1
                self.atualizar_contador_bd("C", self.contador_comum)
            else:
                numero = self.contador_preferencial
                self.contador_preferencial += 1
                self.atualizar_contador_bd("P", self.contador_preferencial)
            
            senha_str = f"{tipo}{numero:03d}"
            tempo_estimado = self.estimar_tempo_de_espera(tipo)
            
            self.atualizar_status(f"AGUARDE: {senha_str}...", "#00FFFF")
            
            # I/O em bloco async-like usando threads (evita que o Tkinter trave durante a impressão/chamada webhook)
            threading.Thread(target=self.imprimir, args=(tipo, numero, senha_str, tempo_estimado), daemon=True).start()
        except Exception as e:
            self.atualizar_status(f"FALHA NO APP: {str(e)[:40]}", "#FF0000")
            print(f"Erro em processar_solicitacao: {e}")

    def inserir_na_fila(self, senha_str, tipo, tempo_estimado):
        """Persiste na fila como Aguardando e logo em seguida repinta o Frame."""
        cursor = self.conn.cursor()
        cursor.execute('INSERT INTO fila (senha, tipo, status) VALUES (?, ?, "AGUARDANDO")', (senha_str, tipo))
        self.conn.commit()
        # Repinta as Labels com estado atual do DB e novos tempos
        self.atualizar_tela_fila()
    def atualizar_tela_fila(self):
        """Lê do DB separando Aguardandos de Chamados e renderiza os painéis correspondentes."""
        cursor = self.conn.cursor()
        
        for slot in self.slots_aguardando:
            for child in slot.winfo_children():
                child.destroy()
            
        tempo_medio = self.calcular_tempo_medio_minutos()
        agora_dt = datetime.now()

        # Re-seleciona com ID para o botão de cancelar
        cursor.execute("SELECT id, senha, tipo FROM fila WHERE status = 'AGUARDANDO' ORDER BY id ASC LIMIT 5")
        aguardandos = cursor.fetchall()

        for idx, item in enumerate(aguardandos):
            fila_id, senha_str, tipo = item
            # Hora estimada = Agora + ((Posição + 1) * Tempo Médio)
            minutos_espera = (idx + 1) * tempo_medio
            hora_estimada = (agora_dt + dt.timedelta(minutes=minutos_espera)).strftime("%H:%M")
            
            texto = f" ⧖ {senha_str} ({hora_estimada})"
            cor = "#FF00FF" if tipo == "P" else "#00FFFF"
            
            # Container para o texto e o botão de cancelar
            msg_frame = tk.Frame(self.slots_aguardando[idx], bg="#111111")
            msg_frame.pack(fill=tk.X)
            
            tk.Label(msg_frame, text=texto, font=("Segoe UI", 36, "bold"), fg=cor, bg="#111111", anchor="w").pack(side=tk.LEFT)
            
            # Botão X Minimalista para Descarte
            btn_x = tk.Button(msg_frame, text=" ✕ ", font=("Segoe UI", 12, "bold"), 
                              fg="#666666", bg="#111111", activeforeground="#FF0000", 
                              activebackground="#111111", bd=0, cursor="hand2",
                              command=lambda f_id=fila_id, s_str=senha_str: self.cancelar_senha(f_id, s_str))
            btn_x.pack(side=tk.RIGHT, padx=20)
            
        # 2. Povoamento dos Últimos Chamados
        cursor.execute("SELECT senha, tipo FROM fila WHERE status = 'CHAMADO' ORDER BY id DESC LIMIT 4")
        chamados = cursor.fetchall()
        
        for slot in self.slots_chamados:
            slot.config(text="")
            
        for idx, item in enumerate(chamados):
            texto = f" ✓ {item[0]}"
            # Riscado em cinza chumbo com base vermelha escura p/ preferenciais e chumbo p/ comuns
            cor = "#AA5555" if item[1] == "P" else "#555555"
            self.slots_chamados[idx].config(text=texto, fg=cor)
            
        # Atualiza a média de tempo na tela
        tempo_medio = self.calcular_tempo_medio_minutos()
        if self.lbl_tempo_medio:
            self.lbl_tempo_medio.config(text=f"Tempo Médio: {tempo_medio} min")

    def finalizar_atendimento(self):
        """Para o cronômetro do último usuário chamado (captura o tempo final)"""
        if not self.atendimento_atual_id:
             self.atualizar_status("NENHUM ATENDIMENTO PARA FINALIZAR.", "#FFA500")
             return
             
        cursor = self.conn.cursor()
        cursor.execute("UPDATE fila SET status = 'FINALIZADO', finalizado_em = CURRENT_TIMESTAMP WHERE id = ?", (self.atendimento_atual_id,))
        self.conn.commit()
        self.atendimento_atual_id = None
        
        self.atualizar_status("ATENDIMENTO FINALIZADO NO SISTEMA.", "#00FF00")
        self.atualizar_tela_fila() # Repinta a média para garantir precisão

    def chamar_proximo(self):
        """Regra de Intercalação 2:1 ou Sequencial pura."""
        
        # O usuário quer que o novo botão de chamar automaticamente capture a finalização do cara antigo
        if self.atendimento_atual_id:
             self.finalizar_atendimento()
             
        cursor = self.conn.cursor()
        settings = load_settings()
        queue_mode = settings.get("queue_mode", "alternating")
        
        row = None
        
        if queue_mode == "sequential":
            # Ordem de Chegada: pega o ID mais antigo na fila AGUARDANDO
            cursor.execute("SELECT id, senha, tipo FROM fila WHERE status = 'AGUARDANDO' ORDER BY id ASC LIMIT 1")
            row = cursor.fetchone()
        else:
            # Regra de Intercalação 2:1 -> Chama 2 P, no 3º chama C.
            # Verifica se vamos forçar a chamar Comum por conta da regra Anti-Starvation (2:1)
            if self.qtd_p_chamados_seguidos >= 2:
                # Tenta pegar Comum
                cursor.execute("SELECT id, senha, tipo FROM fila WHERE status = 'AGUARDANDO' AND tipo = 'C' ORDER BY id ASC LIMIT 1")
                row = cursor.fetchone()
                if row:
                    self.qtd_p_chamados_seguidos = 0 # Reseta preempção
            
            # Sem intervenção ou não havia comum, prioriza o Preferencial
            if not row:
                cursor.execute("SELECT id, senha, tipo FROM fila WHERE status = 'AGUARDANDO' AND tipo = 'P' ORDER BY id ASC LIMIT 1")
                row = cursor.fetchone()
                if row:
                    self.qtd_p_chamados_seguidos += 1
                    
            # Continua sem pessoa? Tenta Comum padrão.
            if not row:
                 cursor.execute("SELECT id, senha, tipo FROM fila WHERE status = 'AGUARDANDO' AND tipo = 'C' ORDER BY id ASC LIMIT 1")
                 row = cursor.fetchone()
                 if row:
                     self.qtd_p_chamados_seguidos = 0 # Chamou comum pq quis, reseta preempção do mesmo jeito
                 
        if row:
            fila_id = row[0]
            senha_chamada = row[1]
            
            # Atualiza BD para "CHAMADO" com o Timestamp de início (chamado_em)
            cursor.execute("UPDATE fila SET status = 'CHAMADO', chamado_em = CURRENT_TIMESTAMP WHERE id = ?", (fila_id,))
            self.conn.commit()
            
            # Armazena estado da sessão pro botão de Finalizar depois capturar
            self.atendimento_atual_id = fila_id
            
            self.atualizar_status(f"CHAMADO: {senha_chamada}", "#00FF00")
            self.atualizar_tela_fila()
        else:
            self.atualizar_status("FILA VAZIA. NINGUÉM AGUARDANDO.", "#FF0000")

    def cancelar_senha(self, fila_id, senha_str):
        """Marca uma senha como DESISTENCIA/CANCELADA."""
        if messagebox.askyesno("Confirmar", f"Deseja descartar a senha {senha_str}?"):
            cursor = self.conn.cursor()
            cursor.execute("UPDATE fila SET status = 'CANCELADO' WHERE id = ?", (fila_id,))
            self.conn.commit()
            self.atualizar_status(f"SENHA {senha_str} DESCARTADA.", "#FFA500")
            self.atualizar_tela_fila()

    def abrir_configuracoes(self):
        """Abre uma mini-aba (Toplevel) para escolher a impressora e ajustar dimensões."""
        config_win = tk.Toplevel(self.root)
        config_win.title("Configurações de Impressão")
        config_win.geometry("450x650") # Aumentado para melhor visualização
        config_win.configure(bg=self.bg_deep)
        config_win.transient(self.root)
        config_win.grab_set()

        # --- ESTRUTURA ROLÁVEL ---
        canvas = tk.Canvas(config_win, bg=self.bg_deep, highlightthickness=0)
        scrollbar = tk.Scrollbar(config_win, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=self.bg_deep)

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw", width=430)
        canvas.configure(yscrollcommand=scrollbar.set)

        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        # Suporte para scroll do mouse
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        config_win.bind_all("<MouseWheel>", _on_mousewheel)

        settings = load_settings()

        tk.Label(scrollable_frame, text="CONFIGURAÇÕES", font=("Segoe UI", 16, "bold"), fg=self.fg_white, bg=self.bg_deep).pack(pady=15)

        # Tipo de Impressora
        tk.Label(scrollable_frame, text="Tipo de Impressora:", font=("Segoe UI", 10), fg="#888888", bg=self.bg_deep).pack(anchor="w", padx=30)
        var_printer_type = tk.StringVar(value=settings.get("printer_type", "matricial"))
        tk.Radiobutton(scrollable_frame, text="Matricial (Padrão)", variable=var_printer_type, value="matricial", bg=self.bg_deep, fg=self.fg_white, selectcolor=self.bg_card, activebackground=self.bg_deep, activeforeground=self.fg_ready).pack(anchor="w", padx=40)
        tk.Radiobutton(scrollable_frame, text="Zebra 5x2cm (Etiqueta)", variable=var_printer_type, value="zebra", bg=self.bg_deep, fg=self.fg_white, selectcolor=self.bg_card, activebackground=self.bg_deep, activeforeground=self.fg_ready).pack(anchor="w", padx=40)

        # Seleção de Impressora
        tk.Label(scrollable_frame, text="Impressora:", font=("Segoe UI", 10), fg="#888888", bg=self.bg_deep).pack(anchor="w", padx=30, pady=(10, 0))
        
        printers = ["Usar Padrão"]
        if IS_WINDOWS:
            try:
                enum_printers = win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)
                printers += [p[2] for p in enum_printers]
            except Exception as e:
                print(f"Erro ao listar impressoras: {e}")

        var_printer = tk.StringVar(value=settings.get("printer_name") if settings.get("printer_name") else "Usar Padrão")
        dropdown = tk.OptionMenu(scrollable_frame, var_printer, *printers)
        dropdown.config(bg=self.bg_card, fg=self.fg_white, bd=1, relief=tk.FLAT, highlightthickness=0)
        dropdown["menu"].config(bg=self.bg_card, fg=self.fg_white)
        dropdown.pack(fill=tk.X, padx=30, pady=(0, 10))

        # Campos Numéricos
        def create_entry(label, key):
            tk.Label(scrollable_frame, text=label, font=("Segoe UI", 10), fg="#888888", bg=self.bg_deep).pack(anchor="w", padx=30)
            entry = tk.Entry(scrollable_frame, bg=self.bg_card, fg=self.fg_white, insertbackground="white", bd=1, relief=tk.FLAT, highlightthickness=1, highlightbackground="#333333")
            entry.insert(0, str(settings.get(key, "")))
            entry.pack(fill=tk.X, padx=30, pady=(0, 8))
            return entry

        ent_margin = create_entry("Margem Esquerda (espaços):", "left_margin")
        ent_spacing = create_entry("Espaçamento de Linha (ESC/P 3):", "line_spacing")
        ent_advance = create_entry("Avanço de Papel (linhas):", "advance_paper_lines")
        
        # Qualidade
        tk.Label(scrollable_frame, text="Qualidade da Fonte:", font=("Segoe UI", 10), fg="#888888", bg=self.bg_deep).pack(anchor="w", padx=30, pady=(5, 0))
        var_quality = tk.IntVar(value=settings.get("font_quality", 1))
        tk.Radiobutton(scrollable_frame, text="Draft (Rápido)", variable=var_quality, value=0, bg=self.bg_deep, fg=self.fg_white, selectcolor=self.bg_card, activebackground=self.bg_deep, activeforeground=self.fg_ready).pack(anchor="w", padx=40)
        tk.Radiobutton(scrollable_frame, text="NLQ (Bonito)", variable=var_quality, value=1, bg=self.bg_deep, fg=self.fg_white, selectcolor=self.bg_card, activebackground=self.bg_deep, activeforeground=self.fg_ready).pack(anchor="w", padx=40)

        # Modo de Fila
        tk.Label(scrollable_frame, text="Regra de Chamada:", font=("Segoe UI", 10), fg="#888888", bg=self.bg_deep).pack(anchor="w", padx=30, pady=(10, 0))
        var_queue_mode = tk.StringVar(value=settings.get("queue_mode", "alternating"))
        tk.Radiobutton(scrollable_frame, text="Intercalado (2 Prefer : 1 Comum)", variable=var_queue_mode, value="alternating", bg=self.bg_deep, fg=self.fg_white, selectcolor=self.bg_card, activebackground=self.bg_deep, activeforeground=self.fg_ready).pack(anchor="w", padx=40)
        tk.Radiobutton(scrollable_frame, text="Ordem de Chegada (Sequencial)", variable=var_queue_mode, value="sequential", bg=self.bg_deep, fg=self.fg_white, selectcolor=self.bg_card, activebackground=self.bg_deep, activeforeground=self.fg_ready).pack(anchor="w", padx=40)

        def salvar():
            try:
                new_settings = {
                    "printer_name": var_printer.get() if var_printer.get() != "Usar Padrão" else "",
                    "printer_type": var_printer_type.get(),
                    "left_margin": int(ent_margin.get()),
                    "line_spacing": int(ent_spacing.get()),
                    "advance_paper_lines": int(ent_advance.get()),
                    "font_quality": var_quality.get(),
                    "queue_mode": var_queue_mode.get()
                }
                save_settings(new_settings)
                # Remover o bind de mousewheel ao fechar para evitar erros
                config_win.unbind_all("<MouseWheel>")
                config_win.destroy()
                self.atualizar_status("CONFIGURAÇÕES SALVAS!", self.fg_ready)
            except ValueError:
                messagebox.showerror("Erro", "Valores numéricos inválidos.")

        def testar():
            self.atualizar_status("ENVIANDO TESTE...", "#00FFFF")
            # Pequeno comando de teste
            if var_printer_type.get() == "zebra":
                test_raw = b"^XA\n^FO20,20^A0N,40,40^FDTESTE ZEBRA OK^FS\n^XZ\n"
            else:
                test_raw = b"\x1b\x40TESTE DE IMPRESSAO OK\n\n\n\n"
            threading.Thread(target=self.executar_teste_impressora, args=(test_raw,), daemon=True).start()

        btn_test = tk.Button(scrollable_frame, text="TESTAR IMPRESSÃO", font=("Segoe UI", 10, "bold"), bg="#555555", fg=self.fg_white, command=testar, bd=0, cursor="hand2")
        btn_test.pack(fill=tk.X, padx=30, pady=(15, 0))

        btn_save = tk.Button(scrollable_frame, text="SALVAR CONFIGURAÇÕES", font=("Segoe UI", 12, "bold"), bg=self.fg_ready, fg=self.bg_deep, command=salvar, bd=0, cursor="hand2")
        btn_save.pack(fill=tk.X, padx=30, pady=(20, 30))


    def executar_teste_impressora(self, raw_data):
        try:
            enviar_dados_impressora(raw_data)
            self.root.after(0, lambda: self.atualizar_status("TESTE ENVIADO COM SUCESSO!", "#00FF00"))
        except Exception as e:
            self.root.after(0, lambda: self.atualizar_status(f"ERRO: {str(e)[:40]}...", "#FF0000"))

    def atualizar_status(self, mensagem, cor):
        self.lbl_status.config(text=mensagem, fg=cor)
        self.root.update_idletasks()

    def imprimir(self, tipo, numero, senha_str, tempo_estimado):
        """I/O de impressora (Matricial ou Zebra) usando o módulo abstrato"""
        try:
            self.root.after(0, lambda: self.atualizar_status("ENVIANDO PARA IMPRESSORA...", "#FFFF00"))
            settings = load_settings()
            printer_type = settings.get("printer_type", "matricial")
            inicio_op = datetime.now()
            agora = inicio_op.strftime("%d/%m/%Y %H:%M")
            
            raw_bytes = b""
            
            if printer_type == "zebra":
                # Layout ZPL Simplificado para Etiqueta Zebra 5x2cm (203dpi)
                zpl_senha = f"^FO20,20^A0N,60,60^FD{senha_str}^FS"
                zpl_tempo = f"^FO20,100^A0N,25,25^FDTempo Medico: {tempo_estimado} min^FS"
                raw_bytes = f"^XA\n{zpl_senha}\n{zpl_tempo}\n^XZ\n".encode('utf-8')
            else:
                # Configurações dinâmicas para Matricial
                left_margin_size = settings.get("left_margin", 6)
                margem = " " * left_margin_size
                line_spacing = settings.get("line_spacing", 30)
                advance_lines = settings.get("advance_paper_lines", 4)
                font_quality = settings.get("font_quality", 1) # Default NLQ for this interface
    
                senha_centro = "    " + " ".join(list(senha_str)) # Centralizando apenas a senha
    
                raw_bytes += b'\x1b\x40'          # Reset
                
                # Qualidade da fonte
                if font_quality == 1:
                    raw_bytes += b'\x1b\x78\x01'  # NLQ
                else:
                    raw_bytes += b'\x1b\x78\x00'  # Draft
                    
                raw_bytes += b'\x1b\x33' + bytes([line_spacing]) # Line Spacing (Respiro)
    
                raw_bytes += b'\x1b\x47'          # Negrito ON (Double-strike)
                raw_bytes += f"{margem}{LAB}\n".encode('cp850', 'ignore')
                raw_bytes += b'\x1b\x48'          # Negrito OFF
    
                label_tipo = "ATENDIMENTO PREFERENCIAL" if tipo == "P" else "  ATENDIMENTO COMUM"
                raw_bytes += f"{margem}{label_tipo}\n".encode('cp850', 'ignore')
                
                # Linha Minimalista: Data/Hora e Tempo de Espera
                raw_bytes += f"{margem}{agora}\n".encode('cp850', 'ignore')
                raw_bytes += f"{margem}ESPERA ESTIMADA: ~{tempo_estimado} MIN\n".encode('cp850', 'ignore')
                
                tempo_medio_global = self.calcular_tempo_medio_minutos()
                raw_bytes += f"{margem}(Media Atual: {tempo_medio_global} min)\n".encode('cp850', 'ignore')
                
                raw_bytes += f"{margem}--------------------------------\n".encode('cp850', 'ignore')
    
                raw_bytes += b'\x1b\x57\x01'      # LARGURA DUPLA ON (Apenas para a Senha)
                raw_bytes += b'\x1b\x77\x01'      # ALTURA DUPLA ON
                raw_bytes += f"{margem}{senha_centro}\n".encode('cp850', 'ignore')
                raw_bytes += b'\x1b\x77\x00'      # ALTURA DUPLA OFF
                raw_bytes += b'\x1b\x57\x00'      # LARGURA DUPLA OFF
                
                raw_bytes += f"{margem}--------------------------------\n".encode('cp850', 'ignore')
                raw_bytes += f"{margem}   AGUARDE CHAMADO NO PAINEL\n".encode('cp850', 'ignore')
                
                # Avanço para Corte
                raw_bytes += b"\n" * advance_lines

            enviar_dados_impressora(raw_bytes)

            tempo_impressao_ms = int((datetime.now() - inicio_op).total_seconds() * 1000)
            print(f"[{datetime.now()}] Job enviado com sucesso (Demorou {tempo_impressao_ms}ms)")

            # Integração N8N segura
            tipo_nome = "Preferencial" if tipo == "P" else "Comum"
            try:
                requests.post(WEBHOOK_N8N, json={"senha": senha_str, "unidade": "Toritama", "tipo": tipo_nome}, timeout=2)
            except Exception as _webhook_err:
                # Falha no webhook não deve interromper informar sucesso da impressão
                pass

            # Apenas APÓS imprimir com sucesso injetamos visualmente na fila
            self.root.after(0, lambda: self.inserir_na_fila(senha_str, tipo, tempo_estimado))
            self.root.after(0, lambda: self.atualizar_status(f"SENHA {senha_str} IMPRESSA COM SUCESSO!", "#00FF00"))

        except Exception as e:
            # Mostra o erro real na barra de status
            erro_resumido = str(e).upper()
            self.root.after(0, lambda: self.atualizar_status(f"ERRO: {erro_resumido[:50]}...", "#FF0000"))
            print(f"[{datetime.now()}] Erro operacional impressora: {e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = AppRecepcao(root)
    root.mainloop()
