import os
from dotenv import load_dotenv

import sys

def get_base_path():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

# Carrega varíaveis do arquivo .env no mesmo diretório
env_path = os.path.join(get_base_path(), '.env')
load_dotenv(env_path)

# Configurações Gerais
LAB = os.getenv("NOME_LABORATORIO", "LADES LABORATÓRIO")
WEBHOOK_N8N = os.getenv("WEBHOOK_N8N", "https://seu-n8n.com/webhook/atendimento")

# Configurações de Hardware Impressora
PORTA_LINUX = os.getenv("IMPRESSORA_LINUX", "/dev/usb/lp0")
NOME_IMPRESSORA_WINDOWS = os.getenv("IMPRESSORA_WINDOWS", "EPSON LX-350")

# Configuração de Lógica de Fila 
TEMPO_MEDIO_INICIAL = int(os.getenv("TEMPO_MEDIO_INICIAL", "5"))

# Checagem de Sistema Operacional
IS_WINDOWS = os.name == 'nt'
