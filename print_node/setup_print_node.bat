@echo off
echo --- Configurando QueueMaster Print Node (Windows) ---
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
echo --- Instalacao concluida! ---
echo Para rodar o servidor de impressao, use: venv\Scripts\activate.bat && python print_server.py
pause
