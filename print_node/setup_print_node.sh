#!/bin/bash
echo "--- Configurando QueueMaster Print Node (Linux) ---"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
echo "--- Instalação concluída! ---"
echo "Para rodar o servidor de impressão, use: source venv/bin/activate && python print_server.py"
