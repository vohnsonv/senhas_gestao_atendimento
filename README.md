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

### 1. Preparar o Print Node (Servidor de Impressão)
Entre na pasta `print_node` e execute o script de instalação automática:
-   **Windows:** Clique duas vezes em `setup_print_node.bat`
-   **Linux:** Execute `bash setup_print_node.sh`

Depois, inicie o servidor:
```bash
python print_server.py
```

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
