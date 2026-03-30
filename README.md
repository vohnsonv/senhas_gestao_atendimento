# 🚀 QueueMaster Terminal - Sistema de Gestão de Senhas

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/downloads/)
[![Status](https://img.shields.io/badge/Status-Est%C3%A1vel-brightgreen.svg)]()

Um terminal de emissão e gestão de senhas profissional, desenvolvido com **Python** e **Tkinter**, focado em alta disponibilidade (**Zero Downtime**) e estética **Premium Dark/Neon**.

---

## 🌟 Destaques

-   🎨 **Interface Premium:** Design moderno com estética Dark/Neon e Cards de Comando.
-   ⚡ **Zero Downtime:** Persistência local atômica via **SQLite**, garantindo integridade mesmo após quedas de energia.
-   ⚖️ **Gestão Inteligente (Anti-Starvation):** Intercalação automática entre senhas comuns e preferenciais (Regra 2:1).
-   🖨️ **Suporte Multiprivado:** Integração nativa com Impressoras Matriciais (ESC/P) e Zebra (ZPL) de 5x2cm.
-   🔗 **Automação (Webhooks):** Envio de dados em tempo real para integração via **n8n** ou outros webhooks.
-   📊 **Métricas em Tempo Real:** Cálculo automático de tempo médio de espera e estimativa por usuário.

---

## 🛠️ Tecnologias Utilizadas

-   **Linguagem:** Python 3
-   **Interface Gráfica:** Tkinter
-   **Banco de Dados:** SQLite3
-   **Comunicação:** Requests (Webhooks)
-   **Hardware:** Suporte a Win32Print (Windows) para controle direto de impressoras matriciais e térmicas.

---

## 📂 Estrutura do Projeto

```bash
Painel de Senhas/
├── interface_recepcao.py   # Core do Sistema (UI e Lógica de Negócio)
├── impressora.py           # Abstração de Hardware e Comandos ESC/P / ZPL
├── settings_manager.py     # Gestão de Configurações Persistentes
├── config.py               # Definições de Ambiente e Variáveis Globais
├── requirements.txt        # Dependências do Projeto
└── .env                    # Configurações Sensíveis (Ex: Webhooks)
```

---

## ⚙️ Instalação e Uso

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/vitoria/QueueMaster-Terminal.git
    cd QueueMaster-Terminal
    ```

2.  **Crie um ambiente virtual:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # Linux
    # ou
    .\venv\Scripts\activate   # Windows
    ```

3.  **Instale as dependências:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Execute a aplicação:**
    ```bash
    python interface_recepcao.py
    ```

---

## ⌨️ Atalhos Rápidos

-   `C`: Emitir Senha Comum
-   `P`: Emitir Senha Preferencial
-   `ENTER`: Chamar Próximo Usuário
-   `↑ / ↓`: Avançar/Retroceder Papel da Impressora
-   `ESC`: Sair do Terminal

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Desenvolvido com ❤️ por [Vitoria](https://github.com/vitoria)
