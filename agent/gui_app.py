import threading
import pystray
from PIL import Image, ImageDraw
import tkinter as tk
from tkinter import ttk
import json
import os
import sys
import print_server

# Configurações
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'config.json')

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {"printer_name": "PADRAO"}

def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f)

def create_image(color):
    # Gera um ícone simples colorido
    image = Image.new('RGB', (64, 64), color)
    dc = ImageDraw.Draw(image)
    dc.ellipse((10, 10, 54, 54), fill=color, outline="white")
    return image

class PrintNodeApp:
    def __init__(self):
        self.config = load_config()
        self.server_thread = None
        self.icon = None

    def start_server(self):
        self.server_thread = threading.Thread(target=print_server.run_server, kwargs={'port': 5000}, daemon=True)
        self.server_thread.start()

    def open_settings(self):
        root = tk.Tk()
        root.title("Configurar Impressora")
        root.geometry("400x250")
        root.attributes("-topmost", True)

        tk.Label(root, text="Selecione a Impressora:", font=("Arial", 10)).pack(pady=20)
        
        # Simula lista de impressoras (no real usaria win32print.EnumPrinters)
        printers = ["PADRAO", "PDF Printer", "Thermal 80mm", "Network Printer"]
        
        combo = ttk.Combobox(root, values=printers, width=30)
        combo.set(self.config["printer_name"])
        combo.pack(pady=10)

        def save():
            self.config["printer_name"] = combo.get()
            save_config(self.config)
            # Sem popup de sucesso conforme solicitado
            print("Configuração salva com sucesso.")
            root.destroy()

        tk.Button(root, text="SALVAR", command=save, bg="#adff2f", fg="black", padx=20).pack(pady=20)
        root.mainloop()

    def run(self):
        # Inicia o servidor em background
        self.start_server()

        # Configura o Systray
        menu = pystray.Menu(
            pystray.MenuItem("Configurar", self.open_settings),
            pystray.MenuItem("Sair", self.quit_app)
        )
        
        self.icon = pystray.Icon("QueueMaster", create_image("green"), "QueueMaster Print Node", menu)
        self.icon.run()

    def quit_app(self, icon, item):
        self.icon.stop()
        os._exit(0)

if __name__ == "__main__":
    app = PrintNodeApp()
    app.run()
