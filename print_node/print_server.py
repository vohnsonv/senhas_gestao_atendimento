import os
import sys
import platform
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

IS_WINDOWS = platform.system() == "Windows"

if IS_WINDOWS:
    try:
        import win32print
    except ImportError:
        print("Aviso: pywin32 não instalado. Impressão no Windows não funcionará.")

def get_default_printer():
    if IS_WINDOWS:
        return win32print.GetDefaultPrinter()
    return "Default (Linux/CUPS)"

def send_to_printer(raw_data, printer_name=None):
    if IS_WINDOWS:
        if not printer_name:
            printer_name = win32print.GetDefaultPrinter()
        
        hPrinter = win32print.OpenPrinter(printer_name)
        try:
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("QueueMaster Print Job", None, "RAW"))
            win32print.StartPagePrinter(hPrinter)
            win32print.WritePrinter(hPrinter, raw_data)
            win32print.EndPagePrinter(hPrinter)
            win32print.EndDocPrinter(hPrinter)
        finally:
            win32print.ClosePrinter(hPrinter)
    else:
        # No Linux, tentamos escrever diretamente no dispositivo ou via lp
        # (Ajuste o caminho do dispositivo conforme necessário, ex: /dev/usb/lp0)
        try:
            with open('/dev/usb/lp0', 'wb') as f:
                f.write(raw_data)
        except Exception as e:
            # Fallback: Usar o comando 'lp' do sistema
            import subprocess
            process = subprocess.Popen(['lp', '-o', 'raw'], stdin=subprocess.PIPE)
            process.communicate(input=raw_data)

@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        "status": "online",
        "platform": platform.system(),
        "printer": get_default_printer()
    })

@app.route('/print', methods=['POST'])
def print_ticket():
    data = request.json
    senha = data.get('senha', '000')
    tipo = data.get('tipo', 'C')
    lab = data.get('lab', 'LABORATÓRIO')
    
    # Comandos ESC/POS (Genéricos)
    ESC = b'\x1b'
    GS = b'\x1d'
    Initialize = ESC + b'@'
    BoldOn = ESC + b'E\x01'
    BoldOff = ESC + b'E\x00'
    DoubleSizeOn = GS + b'!\x11' # Double height & width
    DoubleSizeOff = GS + b'!\x00'
    Center = ESC + b'a\x01'
    Left = ESC + b'a\x00'
    Cut = GS + b'V\x00' # Full cut
    
    raw_bytes = Initialize
    raw_bytes += Center + BoldOn + lab.encode('cp850') + b'\n' + BoldOff
    
    tipo_text = "PREFERENCIAL" if tipo == 'P' else "COMUM"
    raw_bytes += b'ATENDIMENTO ' + tipo_text.encode('cp850') + b'\n'
    raw_bytes += b'--------------------------------\n'
    
    raw_bytes += DoubleSizeOn + senha.encode('cp850') + DoubleSizeOff + b'\n'
    raw_bytes += b'--------------------------------\n'
    
    raw_bytes += b'AGUARDE CHAMADO NO PAINEL\n'
    raw_bytes += b'\n' * 5 # Espaço para corte manual se não houver guilhotina
    raw_bytes += Cut
    
    try:
        send_to_printer(raw_bytes)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    print(f"Print Node rodando em http://localhost:5000")
    print(f"Plataforma: {platform.system()}")
    print(f"Impressora Padrão: {get_default_printer()}")
    app.run(port=5000)
