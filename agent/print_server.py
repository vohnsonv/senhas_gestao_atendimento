import os
import sys
import platform
import json
import unicodedata
from flask import Flask, request, jsonify
from flask_cors import CORS

def remove_accents(input_str):
    if not isinstance(input_str, str):
        return input_str
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return u"".join([c for c in nfkd_form if not unicodedata.combining(c)])

app = Flask(__name__)
CORS(app)

IS_WINDOWS = platform.system() == "Windows"

if IS_WINDOWS:
    try:
        import win32print
    except ImportError:
        print("Aviso: pywin32 não instalado. Impressão no Windows não funcionará.")

def list_printers():
    printers = []
    if IS_WINDOWS:
        try:
            # Opção 4: local printers
            # Opção 2: network printers
            enum_flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
            all_printers = win32print.EnumPrinters(enum_flags)
            for p in all_printers:
                printers.append(p[2]) # p[2] is the printer name
        except Exception as e:
            print(f"Erro ao listar impressoras: {e}")
    else:
        # No Linux, poderíamos usar 'lpstat -p | awk '{print $2}''
        import subprocess
        try:
            output = subprocess.check_output(['lpstat', '-p']).decode()
            for line in output.split('\n'):
                if line.startswith('printer'):
                    printers.append(line.split(' ')[1])
        except:
            printers.append("Default (Linux/CUPS)")
    return printers

def get_default_printer():
    if IS_WINDOWS:
        try:
            return win32print.GetDefaultPrinter()
        except:
            return None
    else:
        # No Linux
        import subprocess
        try:
            output = subprocess.check_output(['lpstat', '-d']).decode()
            # Ex: "destino padrão do sistema: POS80"
            if ':' in output:
                return output.split(':')[1].strip()
        except:
            pass
    return "Default"

def send_to_printer(raw_data, printer_name=None):
    if IS_WINDOWS:
        if not printer_name:
            printer_name = win32print.GetDefaultPrinter()
        
        try:
            hPrinter = win32print.OpenPrinter(printer_name)
        except Exception as e:
            print(f"Aviso: Impressora '{printer_name}' não encontrada. Tentando padrão...")
            printer_name = win32print.GetDefaultPrinter()
            hPrinter = win32print.OpenPrinter(printer_name)
            
        try:
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Ticket Atendimento", None, "RAW"))
            win32print.StartPagePrinter(hPrinter)
            win32print.WritePrinter(hPrinter, raw_data)
            win32print.EndPagePrinter(hPrinter)
            win32print.EndDocPrinter(hPrinter)
        finally:
            win32print.ClosePrinter(hPrinter)
    else:
        # No Linux
        try:
            # Tentar via /dev/usb/lp0 primeiro (acesso direto)
            if os.path.exists('/dev/usb/lp0'):
                with open('/dev/usb/lp0', 'wb') as f:
                    f.write(raw_data)
                    return
        except Exception as e:
            print(f"Aviso: Falha ao acessar /dev/usb/lp0: {e}")

        # Fallback: Usar o comando 'lp'
        import subprocess
        # Se printer_name for "Default" ou vazio, tenta pegar a real do sistema
        if not printer_name or printer_name == "Default":
            printer_name = get_default_printer()
            
        print(f"Enviando para impressora Linux: {printer_name}")
        cmd = ['lp', '-o', 'raw']
        if printer_name and printer_name != "Default":
            cmd.extend(['-d', printer_name])
        
        process = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate(input=raw_data)
        
        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Erro desconhecido no comando lp"
            raise Exception(f"Erro no CUPS (lp): {error_msg}")

@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        "status": "online",
        "platform": platform.system(),
        "default_printer": get_default_printer()
    })

@app.route('/printers', methods=['GET'])
def get_printers_list():
    return jsonify({
        "printers": list_printers(),
        "default": get_default_printer()
    })

@app.route('/print', methods=['POST'])
def print_ticket():
    data = request.json
    senha = data.get('senha', '000')
    tipo = data.get('tipo', 'C')
    lab = data.get('lab', 'PAINEL DE SENHAS')
    printer_name = data.get('printer_name')
    is_test = data.get('is_test', False)
    data_str = data.get('data', '--/--/----')
    hora_str = data.get('hora', '--:--')
    espera_min = data.get('espera', 5)
    emoji = data.get('emoji', ':)')
    
    # Extração de meta do painel do novo UX
    cabecalho = data.get('cabecalho', 'LADES LABORATORIO')
    rodape = data.get('rodape', 'Obrigado por escolher o Lades Laboratorio.\nAguarde sua senha no painel.')

    # Sanitização contra Thermal Bugging (Remover acentos)
    cabecalho_limpo = remove_accents(cabecalho)
    rodape_lines = [remove_accents(line) for line in rodape.split('\n')]
    
    # Comandos ESC/POS
    ESC = b'\x1b'
    GS = b'\x1d'
    
    Initialize = ESC + b'@'
    Center = ESC + b'a\x01'
    BoldOn = ESC + b'E\x01'
    BoldOff = ESC + b'E\x00'
    # MEGA FONTE
    QuadrupleSizeOn = GS + b'!\x33'
    DoubleSizeOn = GS + b'!\x11'
    DoubleHeightOn = GS + b'!\x01'
    DoubleSizeOff = GS + b'!\x00'
    
    # Alinhamento Central Padrão
    raw_bytes = Initialize + Center
    
    # Cabeçalho Personalizado (Editor)
    raw_bytes += b'\n'
    raw_bytes += Center + BoldOn + DoubleHeightOn + f'{cabecalho_limpo}\n'.encode('cp850', 'ignore') + DoubleSizeOff + BoldOff
    raw_bytes += b'==============================\n'
    raw_bytes += b'\n'
    
    if is_test:
        raw_bytes += QuadrupleSizeOn + b'TESTE\n' + DoubleSizeOff
        raw_bytes += b'GUILHOTINA OK?\n'
        raw_bytes += b'==============================\n'
    else:
        tipo_text = "PREFERENCIAL" if tipo == 'P' else "COMUM"
        # Título principal da senha
        raw_bytes += BoldOn + 'SENHA DE\n'.encode('cp850')
        raw_bytes += f'ATENDIMENTO {tipo_text}\n'.encode('cp850') + BoldOff
        raw_bytes += b'\n'
        # Senha em tamanho MEGA (Quadruple)
        raw_bytes += QuadrupleSizeOn + senha.encode('cp850') + DoubleSizeOff + b'\n'
        raw_bytes += f'       {emoji}\n'.encode('cp850', 'ignore')
        raw_bytes += b'\n'
        raw_bytes += b'==============================\n'
        
        # Metadata alinhada a esquerda
        raw_bytes += ESC + b'a\x00' # Esquerda
        raw_bytes += f'{data_str} - {hora_str}\n'.encode('cp850')
        raw_bytes += BoldOn + f'Tempo de Espera: ~{espera_min} min\n'.encode('cp850') + BoldOff
        raw_bytes += b'\n'
    
    # Rodapé Personalizado (Editor)
    raw_bytes += Center
    for rl in rodape_lines:
        raw_bytes += f'{rl}\n'.encode('cp850', 'ignore')
    
    raw_bytes += b'\n' * 4 # Avanço
    raw_bytes += GS + b'V\x42\x00' # Corte (V 66 0)
    raw_bytes += ESC + b'm'         # Corte (Bematech)
    
    try:
        send_to_printer(raw_bytes, printer_name)
        return jsonify({"success": True})
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERRO CRITICO NA IMPRESSAO: {error_trace}")
        return jsonify({"success": False, "error": str(e), "trace": error_trace}), 500

def run_server(port=5000):
    print(f"Print Node rodando em http://localhost:{port}")
    app.run(host='0.0.0.0', port=port)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    run_server(port)

