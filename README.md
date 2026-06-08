# StudyQuest

<p align="center">
  <a href="https://github.com/Davi0416/StudyQuest/releases/latest">
    <img src="https://img.shields.io/badge/Download%20para%20Windows-v1.1.2-FFB800?style=for-the-badge&logo=windows&logoColor=white&labelColor=1a1a2e" alt="Download StudyQuest" height="90">
  </a>
</p>

Aplicativo desktop de estudos gamificado. O currículo é apresentado como um mapa RPG interativo onde cada tecnologia é um nó a ser desbloqueado. Missões combinam vídeo-aula, desafio de código e revisão por flashcards com repetição espaçada.

O backend roda como um **executável nativo embutido** construído com **Quarkus + GraalVM**, gerenciado de forma invisível pelo Electron — sem exigir instalação de JVM no computador do usuário.

---

## Funcionalidades

- **Mapa Overworld** — currículo em estilo RPG pixel art com biomas gerados por ruído de Perlin, nós e skill tree
- **Missões** — vídeo-aula embutida → desafio de código na Mini IDE → flashcards
- **Mini IDE** — editor Monaco com execução segura via Judge0 (ou Python local como fallback)
- **Sistema Leitner** — revisão diária offline com algoritmo de repetição espaçada (5 caixas)
- **Assistente IA** — chat contextual com LLaMA via Groq para tirar dúvidas nas missões
- **Gamificação** — XP, níveis, streak, badges e ranking semanal
- **Offline first** — estude sem internet; dados sincronizam com a nuvem automaticamente quando houver conexão
- **Auto-update** — novas versões instaladas em background via electron-updater

---

## Stack

### Backend (embutido)
- Java 21 + Quarkus 3.36
- GraalVM (compilação para binário nativo)
- Hibernate ORM com Panache
- SmallRye JWT com RSA (access + refresh tokens)
- LangChain4j (integração com Groq)
- PostgreSQL remoto via Neon
- SQLite local na máquina do usuário
- Flyway (migrações separadas para PostgreSQL e SQLite)

### Frontend
- React 19 + Vite 8 + TypeScript
- Tailwind CSS
- Monaco Editor (Mini IDE)
- React Router DOM 7

### Desktop
- Electron 36 (shell + orquestração do backend nativo)
- Electron Builder (instaladores NSIS/DMG/AppImage)
- JRE embutido como fallback se o binário nativo não estiver disponível

### Serviços externos
- [Judge0](https://judge0.com) — execução segura de código
- [Groq](https://groq.com) — LLM (LLaMA) para o assistente IA
- [Neon](https://neon.tech) — PostgreSQL serverless

---

## Estrutura do Repositório

```
studyquest/
├── api/                             Quarkus — gera o binário nativo
│   ├── src/main/java/com/studyquest/
│   │   ├── auth/
│   │   ├── usuarios/
│   │   ├── trilhas/
│   │   ├── nos/
│   │   ├── missoes/
│   │   ├── flashcards/
│   │   ├── revisao/
│   │   ├── gamificacao/
│   │   ├── ia/
│   │   ├── offline/
│   │   └── shared/
│   ├── src/main/resources/
│   │   ├── application.properties   (perfis: dev / desktop / neon)
│   │   └── db/migrations/           (flyway: postgres/ e sqlite/)
│   └── pom.xml
│
├── frontend/                        React + Vite
│   ├── src/
│   │   ├── pages/                   (Hub, Mapa, Aula, Missao, Revisao, Conquistas, Ranking, Perfil, Login)
│   │   ├── components/
│   │   ├── lib/                     (api.ts, mapEngine.ts, caveEngine.tsx, noise.ts)
│   │   ├── context/
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
│
├── electron/                        Shell Electron
│   ├── main.js                      spawna o binário Quarkus, serve frontend via app://
│   ├── preload.js
│   └── package.json                 (Electron Builder — NSIS, DMG, AppImage)
│
├── scripts/                         Build e deploy
├── docs/                            Documentação (frontend.md, screenshots)
├── build-desktop.ps1                Build completo Windows
├── ARCHITECTURE.md
└── README.md
```

---

## Configuração do Ambiente

### Pré-requisitos

- Java 21+
- Maven 3.9+
- Node.js 20+
- GraalVM 21+ (obrigatório apenas para build nativo de produção)
- Conta no Neon, Groq e Judge0 (todas gratuitas)

### Variáveis de Ambiente — Backend

Crie um arquivo `.env` na raiz do `api/`:

```env
# PostgreSQL remoto (Neon)
QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://seu-host-neon/studyquest
QUARKUS_DATASOURCE_USERNAME=seu_usuario
QUARKUS_DATASOURCE_PASSWORD=sua_senha

# SQLite local
QUARKUS_DATASOURCE_LOCAL_JDBC_URL=jdbc:sqlite:studyquest_local.db

# JWT (RSA — gere com openssl)
# Chaves em api/src/main/resources/privateKey.pem e publicKey.pem

# Groq
GROQ_API_KEY=sua_groq_api_key

# Judge0
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=sua_judge0_api_key
```

### Rodando em Desenvolvimento

Em dev você usa a JVM normalmente — o GraalVM só entra no build de produção.

```bash
# Backend (modo dev com hot reload)
cd api
mvn compile quarkus:dev

# A API estará em http://localhost:8080
# Swagger UI em http://localhost:8080/q/swagger-ui/
```

```bash
# Frontend (browser)
cd frontend
npm install
npm run dev
```

```bash
# Electron (com backend já rodando)
cd electron
npm install
npm start
```

### Build de Produção

```bash
# 1. Build completo (Windows) via script
./build-desktop.ps1

# Ou manualmente:

# 1a. Compilar o backend como binário nativo (exige GraalVM)
cd api
mvn package -Pnative
# Gera: target/studyquest-runner.exe (Windows) ou target/studyquest-runner (Linux/Mac)

# 1b. Build do frontend
cd frontend
npm run build

# 1c. Empacotar com Electron Builder
cd electron
npm run dist          # todos os alvos
npm run dist:win      # apenas Windows (NSIS)
npm run dist:mac      # apenas macOS (DMG)
npm run dist:linux    # apenas Linux (AppImage)
```

---

## Documentação da API

Com o backend rodando em dev, acesse o Swagger UI em:

```
http://localhost:8080/q/swagger-ui/
```

Para detalhes completos de arquitetura, modelo de dados, endpoints e estratégia de sincronização offline/online, consulte o [ARCHITECTURE.md](./ARCHITECTURE.md).

Documentação de integração para o frontend em [docs/frontend.md](./docs/frontend.md).

---

## Roadmap

- [x] Definição de arquitetura (Quarkus + GraalVM + Electron embutido)
- [x] Modelo de dados (SQLite local + PostgreSQL remoto)
- [x] Documentação de endpoints e contratos da API
- [x] Setup Quarkus + estrutura de pacotes por domínio
- [x] Múltiplos datasources (SQLite + PostgreSQL com Panache)
- [x] Autenticação JWT (RSA, access + refresh token)
- [x] CRUD de trilhas e nós com seed de currículo
- [x] Lógica de progressão e desbloqueio de nós (pré-requisitos)
- [x] Fila de sincronização offline (sync_queue)
- [x] Integração Judge0 + Python local como fallback
- [x] Sistema Leitner (5 caixas, revisão diária)
- [x] Integração Groq via LangChain4j
- [x] Gamificação (XP, streak, conquistas, ranking semanal)
- [x] Frontend React + Electron
- [x] Mapa Overworld pixel art (biomas com ruído de Perlin)
- [x] Mini IDE com Monaco Editor
- [x] Auto-update via electron-updater
- [ ] OAuth2 Google
- [ ] Trilhas adicionais além do Caminho da Serpente

---

## Autor

**Davi Asafe dos Santos Kling**
Estudante de Engenharia de Software com ênfase em IA — Instituto Infnet, Rio de Janeiro

[![GitHub](https://img.shields.io/badge/GitHub-davi0416-181717?style=flat&logo=github)](https://github.com/davi0416)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Davi%20Kling-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/davi-kling)

---

## Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
