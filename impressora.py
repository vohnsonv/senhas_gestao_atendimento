import os
from config import IS_WINDOWS, NOME_IMPRESSORA_WINDOWS, PORTA_LINUX

if IS_WINDOWS:
    # Biblioteca que injeta dados diretamente no Spool do Windows em RAW level
    import win32print

from settings_manager import load_settings

def enviar_dados_impressora(raw_bytes):
    """Camada de Abstração Universal (Zero Downtime p/ Windows e Linux)."""
    settings = load_settings()
    if IS_WINDOWS:
        # Pega a do settings, se vazia pega a do env, se vazia pega a default do SO
        printer_name = settings.get("printer_name")
        if not printer_name:
            printer_name = NOME_IMPRESSORA_WINDOWS if NOME_IMPRESSORA_WINDOWS else win32print.GetDefaultPrinter()
        
        try:
            hPrinter = win32print.OpenPrinter(printer_name)
        except Exception as e:
            msg = f"Falha ao abrir impressora '{printer_name}'. Verifique se o nome esta exato no Windows (Engrenagem -> Dispositivos). Erro: {e}"
            print(msg)
            raise Exception(msg)

        try:
            # Inicializa job RAW p/ Windows bypassar o driver nativo e entender HEX
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Senha Recepcao", None, "RAW"))
            try:
                win32print.StartPagePrinter(hPrinter)
                win32print.WritePrinter(hPrinter, raw_bytes)
                win32print.EndPagePrinter(hPrinter)
            except Exception as e:
                msg = f"Falha ao gravar dados na impressora '{printer_name}'. Erro: {e}"
                print(msg)
                raise Exception(msg)
            finally:
                win32print.EndDocPrinter(hPrinter)
        finally:
            win32print.ClosePrinter(hPrinter)
    else:
        # Caminho Legado Estável p/ Linux (/dev/usb/lp0)
        os.system(f"sudo chmod 666 {PORTA_LINUX} > /dev/null 2>&1")
        os.system("sudo systemctl stop ipp-usb > /dev/null 2>&1")
        try:
            with open(PORTA_LINUX, 'wb') as p:
                p.write(raw_bytes)
        except Exception as e:
             print(f"Erro ao abrir porta {PORTA_LINUX}: {e}")
             raise Exception(f"Porta {PORTA_LINUX} inacessível")
