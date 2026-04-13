import threading
import pystray
from PIL import Image, ImageDraw
import tkinter as tk
from tkinter import ttk, messagebox
import json
import os
import sys
import time
import requests
import webbrowser
import platform

# Importar lógica do servidor (deve estar no mesmo diretório)
try:
    import print_server
except ImportError:
    # Fallback se importado de outro lugar
    from agent import print_server

IS_WINDOWS = platform.system() == "Windows"

# Configurações
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'config.json')

def load_config():
    default_config = {
        "printer_name": "PADRAO",
        "margin_top": 0,
        "margin_bottom": 1,
        "show_gui": True
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return {**default_config, **json.load(f)}
        except:
            return default_config
    return default_config

def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=4)

def create_tray_icon():
    # Gera um ícone decorativo (Círculo esmeralda Mavitec)
    image = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    dc = ImageDraw.Draw(image)
    # Círculo externo (Emerald)
    dc.ellipse((4, 4, 60, 60), fill="#10b981") 
    # Círculo interno (Navy)
    dc.ellipse((12, 12, 52, 52), fill="#0f172a")
    # Ponto branco estilizado
    dc.ellipse((28, 28, 36, 36), fill="white")
    return image

class PrintAgentGUI:
    def __init__(self):
        self.config = load_config()
        self.server_thread = None
        self.icon = None
        self.root = None
        
    def start_server(self):
        # Inicia o Flask em porta 5000 via thread daemon
        # Usamos o app objeto do print_server
        self.server_thread = threading.Thread(
            target=lambda: print_server.app.run(port=5000, host='0.0.0.0', debug=False, use_reloader=False),
            daemon=True
        )
        self.server_thread.start()

    def test_print(self):
        try:
            url = "http://localhost:5000/print"
            payload = {
                "senha": "TESTE",
                "tipo": "C",
                "cabecalho": "MAVITEC AGENTE",
                "is_test": True,
                "emoji": "OK"
            }
            res = requests.post(url, json=payload, timeout=5)
            if res.ok:
                messagebox.showinfo("Sucesso", "Comando de teste enviado!")
            else:
                messagebox.showerror("Erro", f"Servidor: {res.text}")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro de conexão: {e}")

    def open_settings(self):
        if self.root:
            try:
                self.root.deiconify()
                self.root.lift()
                self.root.focus_force()
                return
            except:
                self.root = None

        self.root = tk.Tk()
        self.root.title("Mavitec Print Agent")
        self.root.geometry("450x550")
        self.root.configure(bg="#0f172a") # Dark Navy
        
        # Estilo
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TLabel", background="#0f172a", foreground="white", font=("Segoe UI", 10))
        style.configure("TButton", font=("Segoe UI Bold", 10), padding=10)
        
        # Header
        header = tk.Frame(self.root, bg="#10b981", height=70) # Emerald
        header.pack(fill="x")
        tk.Label(header, text="MAVITEC", bg="#10b981", fg="white", font=("Segoe UI Bold", 16)).pack(pady=(10,0))
        tk.Label(header, text="Configurações de Impressão", bg="#10b981", fg="#d1fae5", font=("Segoe UI", 9)).pack()

        container = tk.Frame(self.root, bg="#0f172a", padx=40, pady=30)
        container.pack(fill="both", expand=True)

        # Seleção de Impressora
        tk.Label(container, text="Impressora Térmica:", anchor="w").pack(fill="x", pady=(10,2))
        all_printers = ["PADRAO"] + print_server.list_printers()
        printer_combo = ttk.Combobox(container, values=all_printers, state="readonly")
        printer_combo.set(self.config["printer_name"])
        printer_combo.pack(fill="x", pady=5)

        # Margens
        margin_frame = tk.Frame(container, bg="#0f172a")
        margin_frame.pack(fill="x", pady=20)

        # Top
        tk.Label(margin_frame, text="Margem Superior (Linhas):", anchor="w").pack(fill="x")
        top_spin = tk.Spinbox(margin_frame, from_=0, to=10, bg="#1e293b", fg="white", insertbackground="white", relief="flat", justify="center")
        top_spin.delete(0, "end")
        top_spin.insert(0, self.config["margin_top"])
        top_spin.pack(fill="x", pady=(5,15))

        # Bottom
        tk.Label(margin_frame, text="Avanço Guilhotina (Linhas):", anchor="w").pack(fill="x")
        bot_spin = tk.Spinbox(margin_frame, from_=0, to=10, bg="#1e293b", fg="white", insertbackground="white", relief="flat", justify="center")
        bot_spin.delete(0, "end")
        bot_spin.insert(0, self.config["margin_bottom"])
        bot_spin.pack(fill="x", pady=5)

        # Botões
        def save():
            self.config["printer_name"] = printer_combo.get()
            self.config["margin_top"] = int(top_spin.get())
            self.config["margin_bottom"] = int(bot_spin.get())
            save_config(self.config)
            messagebox.showinfo("Sucesso", "Configurações aplicadas!")

        tk.Button(container, text="SALVAR ALTERAÇÕES", command=save, bg="#10b981", fg="white", borderwidth=0, font=("Segoe UI Bold", 10), cursor="hand2", pady=12).pack(fill="x", pady=5)
        tk.Button(container, text="IMPRIMIR TESTE", command=self.test_print, bg="#3b82f6", fg="white", borderwidth=0, font=("Segoe UI Bold", 10), cursor="hand2", pady=12).pack(fill="x", pady=5)
        
        # Info
        tk.Label(container, text="O serviço está rodando na porta 5000", font=("Segoe UI", 8), fg="#64748b").pack(side="bottom", pady=10)

        self.root.protocol("WM_DELETE_WINDOW", self.hide_window)
        self.root.mainloop()

    def hide_window(self):
        if self.root:
            self.root.withdraw()

    def quit_app(self, icon, item):
        self.icon.stop()
        if self.root:
            self.root.destroy()
        os._exit(0)

    def run(self):
        # Inicia o servidor em background
        self.start_server()

        # Systray
        menu = pystray.Menu(
            pystray.MenuItem("Configurar", lambda: self.open_settings()),
            pystray.MenuItem("Imprimir Teste", lambda: self.test_print()),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Sair", self.quit_app)
        )
        
        self.icon = pystray.Icon("MavitecAgent", create_tray_icon(), "Mavitec Print Agent", menu)
        self.icon.run()

if __name__ == "__main__":
    app = PrintAgentGUI()
    app.run()
