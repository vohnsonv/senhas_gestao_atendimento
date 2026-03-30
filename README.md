# 🚀 QueueMaster Pro - Sistema de Senhas Web + Print Node 🌐🖨️

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Frontend-React/Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Print Node](https://img.shields.io/badge/Print--Node-Python-blue?logo=python&logoColor=white)]()
[![Status](https://img.shields.io/badge/Status-Pro--Version-brightgreen.svg)]()

Um sistema de gestão de senhas completo com interface web **Premium** e um **Print Node** local para impressão profissional via comandos ESC/POS.

---

## 🏗️ Arquitetura do Sistema

O projeto é dividido em duas partes essenciais:
1.  **Web App (Raiz):** Interface moderna que roda no navegador e gerencia a fila via LocalStorage.
2.  **Print Node (`/print_node`):** Um servidor local em Python que faz a ponte entre o navegador e sua impressora física.

---

## 🌟 Funcionalidades

-   🎨 **Design High-End:** Interface Dark/Neon com Glassmorphism.
-   💾 **Persistência Inteligente:** Fila e contadores salvos no LocalStorage do navegador.
-   🖨️ **Impressão Profissional:** Suporte a comandos ESC/POS (Matriciais e Térmicas) via Python.
-   🔊 **Chamada por Voz:** O sistema utiliza síntese de voz para anunciar a próxima senha.
-   ⚙️ **Multiplataforma:** Compatível com Windows e Linux.

---

## 🚀 Como Configurar e Rodar

### 🖨️ Como configurar a Impressora (Local)

#### 🚀 MODO RECOMENDADO: Interface Visual (GUI)
1.  Abra seu terminal na pasta do projeto.
2.  **Instale os requisitos (pela primeira vez):**
    ```bash
    cd print_node && pip install -r requirements.txt
    ```
3.  **Inicie a interface:**
    ```bash
    python3 gui_app.py
    ```
4.  **Configure:** Clique com o botão direito no ícone verde da barra de tarefas e selecione **"Configurar"** para escolher sua impressora.

#### 🔧 Modo Avançado (Somente via Terminal)
Se preferir rodar sem interface, use:
```bash
python3 print_server.py
```
*No Linux Debian/Ubuntu, se houver erro de dependência, rode:* `sudo apt install python3-venv python3-pip`.

### 2. Iniciar a Aplicação Web
Na raiz do projeto:
```bash
npm install
npm run dev
```

### 3. Uso
-   Abra `http://localhost:3000`.
-   Verifique se o indicador **"Impressora Conectada"** aparece no topo.
-   Ao emitir uma senha, o ticket será impresso automaticamente na sua impressora padrão!

---

## 🌐 Deploy em VPS (Docker)

Para hospedar o sistema no seu subdomínio `senhas.labsync.com.br`:

1.  **Configuração de DNS:** No seu gerenciador de domínio, aponte um **Registro A** de `senhas` para o IP `46.62.150.120`.
2.  **Preparar VPS:** Garanta que o Docker e Docker Compose estejam instalados na sua VPS.
3.  **Subir o Container:** Na pasta do projeto na VPS, execute:
    ```bash
    docker-compose up -d --build
    ```
O sistema estará disponível em `http://senhas.labsync.com.br`.

---

## 📂 Estrutura de Pastas

```bash
.
├── src/                # Interface React
├── public/             # Ativos da Web
├── print_node/         # Motor de Impressão (Python)
│   ├── print_server.py
│   ├── setup_print_node.sh
│   └── requirements.txt
├── README.md           # Você está aqui
└── LICENSE             # Licença MIT
```

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

Desenvolvido com ❤️ por [Vitoria](https://github.com/vohnsonv)
