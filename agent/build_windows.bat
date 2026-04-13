@echo off
title LABSYNC SaaS - Compilador de Print Agent (.exe)
color 0A

echo ==========================================================
echo         Compilador do Rastreador de Impressao Web
echo                     LabSync (SaaS)
echo ==========================================================
echo.
echo Verificando a presenca do Python no sistema...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO CRITICO] O Python nao foi encontrado no Windows.
    echo Por favor, baixe o Python no site oficial e marque a opcao "Add Python to PATH" durante a instalacao.
    pause
    exit /b
)

echo [OK] Python detectado. Instalando dependencias do pacote...
pip install flask flask-cors pypiwin32 pyinstaller pystray pillow requests

echo.
echo [PROCESSANDO] Gerando pacote encapsulado...
echo Por favor aguarde, isso pode levar alguns minutos...
echo.

:: Compila em modo OneFile (-F) e Sem Console Escuro (-w) 
pyinstaller -w -F --name "Mavitec_PrintAgent" ^
    --hidden-import "pystray._win32" ^
    --collect-all pystray ^
    gui_app.py

echo.
echo ==========================================================
echo SUCESSO! 
echo O seu Agente Local de Impressao foi criado.
echo Arquivo gerado em: "dist\LabSync_PrintAgent.exe"
echo.
echo Copie este arquivo para o Windows da recepcao e coloque 
echo na pasta "Inicializar" para iniciar com o Windows!
echo ==========================================================
pause
