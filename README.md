# 🚀 LabSync - Sistema de Gestão de Senhas (SaaS)

Sistema escalável de Gestão de Fluxo e Emissão de Senhas desenvolvido com a melhor experiência de usuário (UX) em mente. Ideal para Laboratórios, Clínicas e Ambientes de Recepção.

![Status: Production](https://img.shields.io/badge/Status-Produção-emerald?style=for-the-badge)
![Tech: React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tech: Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

## ✨ Principais Funcionalidades

- **Gerenciamento de Filas:** Controle de Painel Comum vs Preferencial com Intercalação inteligente.
- **Visualização Pública (TV):** Tela limpa, escura e de alto contraste, sincronizada de imediato para painéis e TVs externas.
- **Ponte de Impressão Nativa (Print Agent):** Impressão direta (sem telas de diálogo do navegador) via protocolo ESC/POS em impressoras térmicas locais (ex: POS80).
- **Instalação Wizard Automática:** Sistema conta com baixador integrado de `.exe` para instalar o script Python da impressora (rodando invisível e iniciando com o Windows).
- **Segurança Embutida:** Tela de Locking para impedir acesso não autorizado de atendentes e separação clara entre "Controle" e "Visão do Paciente".
- **Hospedagem Híbrida SaaS:** Servido por uma VPS em Nuvem com HTTPS nativo (Traefik) utilizando rotas locais do Windows via Localhost para o USB da impressora.

---

## 🛠️ Stack Tecnológica

| Componente | Tecnologia | Finalidade |
| --- | --- | --- |
| **Frontend** | React (Vite.js) | Interface visual de altíssima performance client-side. |
| **Servidor Web** | Docker + Nginx + Traefik | Hospedagem de Produção e Roteamento Edge (HTTPS automático Let's Encrypt). |
| **Agente Impressão** | Python (`flask`, `pywin32`) | Proxy entre a Web e a Tabela de Spooler do Windows (ESC/POS Win32). |
| **Compilação** | PyInstaller + Inno Setup | Geração de Executável Nativo Windows Cross-Platform via Docker. |

---

## 💻 Como Rodar (Produção VPS)

O sistema foi otimizado para deploy em containers Docker e o repositório já conta com o `docker-compose.yml`.

1. Clone o repositório no seu servidor.
2. Defina os domínios no `docker-compose.yml` (labels do Traefik, p. ex: `senhas.labsync.com.br`).
3. Compile e suba (na VM Host que já tenha o Traefik rodando e mapeando as portas 80/443):
```bash
docker compose up -d --build
```

---

## 📦 Agente de Impressão (Modo Usuário - Windows)

Para utilizar a impressora de tickets (POS80) sem telas irritantes do Chrome:

1. Abra a Central de Configurações no canto superior da tela do sistema.
2. Clique em **📦 INSTALADOR PASSO A PASSO (.EXE)**.
3. Conclua o instalador Wizard. O sistema foi programado para abrir as portas do firewall (`127.0.0.1:5000`) e injetar o arquivo na pasta "Inicializar" do Windows de forma oculta.
4. Digite a URL que liga ao Agente na caixa de conexões de Impressora no sistema Web: `http://127.0.0.1:5000/print`.
5. Selecione o Layout na Engrenagem e comece a imprimir as senhas!

---

## 📜 Histórico de Versionamento (Changelog)

### v2.4.0 (Versão Atual)
> **(Foco: Distribuição, Automação do Agente e UX de Tela)**
- Adicionado Versionamento `v2.4.0` ao longo do Rodapé da Aplicação.
- O botão "Modo de Chegada / Prioritário" mudou de lugar e foi integrado como ícone dinâmico do Header UI. 
- Adicionado na interface o Link de Download Nativo do `Instalador_LabSync_Agent.exe`.
- Remoção do Painel de Botoões Obsoletos e Antigos para limpeza visual pesada da tela do atendente.
- Criação e compilação híbrida do `.exe` do agente de requisições, criado inteiramente pelo `InnoSetup`.

### v2.3.0
> **(Foco: Segurança e UX Avançada do Ticket)**
- Criação e Bloqueio de Acesso com Senha (`124663`) gerenciados no estado do Painel do Atendente (sessionStorage).
- Modificado layout do ticket térmico, incluindo centralização bruta ESC/POS e substituição para Titulo `Lades Laboratório`.
- Novo modal Mini-Editor para ajustar Título e Rodapé da impressão via web.

### v2.2.0
> **(Foco: SaaS e Infraestrutura Web)**
- Migração para Nuvem (VPS Mavitec-App).
- Sistema Dockerizado em micro-serviço (Imagem leve `nginx:alpine`).
- Redirecionamento Traefik e adição completa de SSL/HTTPS wildcard no domínio `senhas.labsync.com.br`.

### v2.1.0
> **(Foco: Integração com Impressora POS80)**
- Construção de Ponte de Proxy (`tools/print_node/print_server.py`) criando Endpoint `http://127.0.0.1:5000/print`.
- Tradução do Objeto JavaScript para Linguagem Bruta de Máquina EPSON ESC/POS em UTF-8 no Windows.
- Lidou-se com CORS do `HTTPS` ao `HTTP Localhost` ativando `PrivateNetworkAccess`.

### v2.0.0
> **(Foco: Armazenamento Cliente-Sincronizado e TV Pública)**
- Troca de Estado Temporário por `localStorage` do Navegador.
- Tela da TV Pública recebe sincronização bidirecional em tempo real de milissegundos reagindo a atualizações do React.
- Criação de Layout Moderno Dark-Neon de extrema visibilidade.

### v1.5.0
> **(Foco: React & Vite Refactoring)**
- O sistema todo abandona Javascript puro para utilizar o poder modular React/Vite.
- Aplicação ganha estrutura unificada no `src/App.jsx`.

### v1.0.0
> **(Lançamento Inicial)**
- POC elaborada com HTML + CSS Estático para chamadas de senhas aleatórias. Primeiros testes de filas separados entre Preferencial/Normal.

---
_Desenvolvido com 🖤 pela Equipe de Arquitetura da Mavitec._
