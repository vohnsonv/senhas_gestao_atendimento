# 🟢 ATENDE.ORG - Gestão de Atendimento Inteligente 💎✨

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Frontend-React/Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Status](https://img.shields.io/badge/Status-Premium--UX-brightgreen.svg)]()

O **ATENDE.ORG** é uma solução premium para recepções de guichê único, focada em alta performance, transparência e experiência do usuário (UX). Com design baseado em Glassmorphism e tons de esmeralda, o sistema oferece controle total do fluxo de pacientes.

---

## 🏗️ Diferenciais do ATENDE.ORG

-   🎨 **UX High-End:** Interface "Less Dark" com paleta de verdes harmoniosos e fundo dinâmico.
-   ⏳ **Timer em Tempo Real:** Cronômetro automático para monitorar a duração de cada atendimento individual.
-   📊 **Histórico Profissional:** Tabela detalhada com Horário de Início, Fim e Duração Total.
-   ⚡ **Otimizado para Unidade Única:** Atalhos de teclado (`Espaço`) e modos de prioridade configuráveis.
-   🔊 **Notificações Inteligentes:** Chime sonoro profissional seguido de chamada por voz (TTS).
-   🖨️ **Print Node GUI:** Gerenciador de impressão com interface visual e ícone na bandeja do sistema.

---

## 🚀 Como Iniciar

### 1. Aplicação Web (Painel)
Na raiz do projeto:
```bash
npm install
npm run dev
```
Acesse em: `http://localhost:3000`

### 2. Print Node (Motor de Impressão)

#### 🐧 Como Instalar no Ubuntu (.bin)
Se você baixou o arquivo `QueueMaster_PrintNode_Linux.zip` pelo site:
1.  **Extraia o arquivo:** Clique com o botão direito e "Extrair aqui".
2.  **Abra o terminal na pasta e dê permissão:**
    ```bash
    chmod +x QueueMaster_PrintNode_Linux.bin
    ```
3.  **Execute o aplicativo:**
    ```bash
    ./QueueMaster_PrintNode_Linux.bin
    ```
*Procure o ícone verde na sua barra de tarefas para configurar a impressora.*

---

## 📂 Estrutura de Pastas

```bash
.
├── src/                # Interface React (Green Glassmorphism)
├── public/             # Ativos e Downloads (.zip, .bin)
├── print_node/         # Motor de Impressão Python (GUI + Flask)
│   ├── gui_app.py      # App de Bandeja (Systray)
│   ├── print_server.py # Servidor de Fundo
│   └── build_windows_dist.bat # Script para gerar .exe no Windows
└── README.md           # Você está aqui
```

---

## 📄 Licença
Este projeto está sob a licença **MIT**.

Desenvolvido com ❤️ para uma experiência de atendimento superior. 🟢💎
