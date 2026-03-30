# 🌐 QueueMaster Web - Sistema de Gestão de Senhas 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React/Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Status](https://img.shields.io/badge/Status-Web--Ready-brightgreen.svg)]()

A transformação digital do QueueMaster Terminal para uma aplicação web moderna, responsiva e com um design **Premium Dark/Neon**.

---

## 🏗️ Arquitetura do Projeto

O projeto foi reestruturado para ser leve, organizado e escalável:

```bash
Painel de Senhas/
├── backend/            # API FastAPI (Lógica e Banco de Dados)
│   ├── main.py
│   ├── config.py
│   ├── requirements.txt
│   └── senhas.db
└── frontend/           # Interface React + Vite
    ├── src/
    ├── public/
    └── package.json
```

---

## 🌟 Funcionalidades Web

-   🎨 **UX/UI Premium:** Interface com Glassmorphism, Neon Glow e Inter (Google Fonts).
-   📡 **API Real-time:** Dashboard que se atualiza automaticamente.
-   🛠️ **Painel de Controle:** Atendimento simplificado para administradores.
-   ⚡ **Leve e Rápido:** Backend performático com FastAPI e Frontend otimizado com Vite.

---

## 🛠️ Como Executar

### 1. Backend (API)
```bash
cd backend
pip install -r requirements.txt
python main.py
```
A API rodará em `http://localhost:8000`.

### 2. Frontend (Interface)
```bash
cd frontend
npm install
npm run dev
```
O frontend rodará em `http://localhost:3000`.

---

## 🚀 Próximos Passos (GitHub)

Para subir esta nova estrutura organizada:
```bash
git add .
git commit -m "Refactor: Transform to Web App with FastAPI/React 🌐"
git push origin main
```

---

Desenvolvido com ❤️ por [Vitoria](https://github.com/vitoria)
