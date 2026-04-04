# 🟢 PAINEL DE SENHAS - Gestão de Atendimento 🎫✨

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Frontend-React/Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Status](https://img.shields.io/badge/Status-Premium--v3-brightgreen.svg)]()

O **PAINEL DE SENHAS** é uma solução profissional para recepções de guichê único, focada em simplicidade, eficiência e transparência. Com um design moderno baseado em Glassmorphism e ícones intuitivos, o sistema organiza o fluxo de atendimento de forma impecável.

---

## 🏗️ Diferenciais do Sistema

-   🎨 **Interface Premium:** Design elegante em tons de verde esmeralda com fundo dinâmico.
-   🎫 **Ícones Intuitivos:** Navegação facilitada por ícones Lucide (Tickets, Relógio, Histórico).
-   ⏳ **Timer de Atendimento:** Monitoramento em tempo real da duração de cada chamada.
-   📊 **Relatório de Fluxo:** Tabela de histórico detalhada com horários de início, fim e duração total.
-   ⚡ **Otimização de Guichê:** Atalhos de teclado (`Espaço`) para chamar o próximo cliente.
-   🔊 **Chamada de Som e Voz:** Notificação sonora ("Chime") seguida de narração em português (pt-BR).
-   🖨️ **Print Node nativo:** Sistema de impressão local robusto com interface visual.

---

## 🚀 Como Iniciar

### 1. Aplicação Web (Painel)
Na raiz do projeto:
```bash
npm install
npm run dev
```
Acesse em: `http://localhost:3000`

### Docker (produção)
Na raiz do repositório:
```bash
docker compose -f deploy/docker-compose.yml up --build
```

### 2. Print Node (Motor de Impressão)

#### 🐧 Como Instalar no Ubuntu (.bin)
1.  **Extraia o arquivo** `QueueMaster_PrintNode_Linux.zip`.
2.  **Dê permissão de execução:**
    ```bash
    chmod +x QueueMaster_PrintNode_Linux.bin
    ```
3.  **Execute:**
    ```bash
    ./QueueMaster_PrintNode_Linux.bin
    ```
*Configure sua impressora clicando com o botão direito no ícone verde da barra de tarefas.*

---

## 📂 Estrutura de Pastas

```bash
.
├── src/                 # Frontend React (UX/UI)
├── public/              # Favicon, assets e downloads
├── deploy/              # Dockerfile, compose e nginx
├── tools/print_node/    # Backend de impressão (Python)
│   ├── gui_app.py
│   └── print_server.py
├── docs/                # Licença e documentação auxiliar
└── README.md
```

---

## 📄 Licença
Este projeto está sob a licença **MIT**. Texto completo em [`docs/LICENSE`](docs/LICENSE).

Desenvolvido para transformar a experiência de atendimento na sua recepção. 🟢🎫
