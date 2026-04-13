
@echo off
echo --- Gerando Executavel QueueMaster Print Node (Windows) ---
pip install flask flask-cors python-escpos pystray Pillow pyinstaller
pyinstaller --onefile --windowed --name QueueMaster_PrintNode_Win gui_app.py
echo --- Concluido! O arquivo esta na pasta 'dist' ---
echo --- DICA: Copie o QueueMaster_PrintNode_Win.exe para 'public/downloads' para o site oferecer o download! ---
pause
