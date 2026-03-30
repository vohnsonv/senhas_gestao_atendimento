import os
import requests
from datetime import datetime
from config import LAB, WEBHOOK_N8N
from impressora import enviar_dados_impressora
from settings_manager import load_settings

def imprimir_tira_a4_margem(numero):
    settings = load_settings()
    agora = datetime.now().strftime("%d/%m/%Y - %H:%M")
    senha_str = f"{numero:03d}"
    
    # Configurações dinâmicas
    left_margin_size = settings.get("left_margin", 3)
    margem = " " * left_margin_size
    line_spacing = settings.get("line_spacing", 30)
    advance_lines = settings.get("advance_paper_lines", 3)
    font_quality = settings.get("font_quality", 0) # 0: Draft, 1: NLQ

    # Espaçamento para a senha ocupar o centro sem estourar
    senha_centro = f"      {senha_str[0]}     {senha_str[1]}     {senha_str[2]}"

    try:
        print(f"Imprimindo Senha {senha_str} com margens... 🎟️🔨")
        
        raw_bytes = b""
        raw_bytes += b'\x1b\x40'          # Reset
        
        # Qualidade da fonte
        if font_quality == 1:
            raw_bytes += b'\x1b\x78\x01'  # NLQ
        else:
            raw_bytes += b'\x1b\x78\x00'  # Draft
            
        raw_bytes += b'\x1b\x33' + bytes([line_spacing]) # Line spacing
        raw_bytes += b'\x1b\x47'          # Negrito ON (Double-strike)
        raw_bytes += b'\x1b\x57\x01'      # LARGURA DUPLA ON (A4 vira 40 colunas)

        # 2. CABEÇALHO COM MARGEM
        raw_bytes += f"{margem}********************************\n".encode('ascii')
        raw_bytes += f"{margem}  {LAB}\n".encode('ascii')
        raw_bytes += f"{margem}  DATA/HORA: {agora}\n".encode('ascii')
        raw_bytes += f"{margem}--------------------------------\n".encode('ascii')

        # 3. SENHA (ALTURA DUPLA + LARGURA DUPLA + NEGRITO) 🚀
        raw_bytes += b'\x1b\x77\x01'      # ALTURA DUPLA ON
        raw_bytes += f"{margem}{senha_centro}\n".encode('ascii')
        raw_bytes += b'\x1b\x77\x00'      # ALTURA DUPLA OFF

        # 4. RODAPÉ COM MARGEM
        raw_bytes += f"{margem}--------------------------------\n".encode('ascii')
        raw_bytes += f"{margem}   AGUARDE SER CHAMADO PELA RECEPÇÃO\n".encode('ascii')
        raw_bytes += f"{margem}********************************\n".encode('ascii')
        
        raw_bytes += b'\x1b\x57\x00'      # LARGURA DUPLA OFF
        raw_bytes += b'\x1b\x48'          # Negrito OFF
        
        # 5. AVANÇO PARA CORTE ✂️
        raw_bytes += b"\n" * advance_lines

        enviar_dados_impressora(raw_bytes)

        # Webhook n8n
        try:
            requests.post(WEBHOOK_N8N, json={"senha": f"C{numero:03d}", "unidade": "Toritama", "tipo": "Comum"}, timeout=2)
        except Exception:
            pass
        print(f"Senha {senha_str} impressa com sucesso! ✅")

    except Exception as e:
        print(f"Erro: {e} ❌")

if __name__ == "__main__":
    imprimir_tira_a4_margem(1)