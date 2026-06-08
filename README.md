# StudyQuest

Aplicativo desktop de estudos gamificado. O currículo é apresentado como um mapa RPG interativo onde cada tecnologia é um nó a ser desbloqueado. Missões combinam vídeo-aula, desafio de código e revisão por flashcards com repetição espaçada.

O backend roda como um **executável nativo embutido** construído com **Quarkus + GraalVM**, gerenciado de forma invisível pelo Electron — sem exigir instalação de JVM no computador do usuário.

---

## Demonstração

### Hub do aventureiro
Dashboard com XP, streak, progresso da trilha, ranking semanal e revisão diária.

![Hub](docs/screenshots/hub.png)

### Mapa Overworld
Currículo em estilo RPG pixel art — cada nó é uma etapa a desbloquear, com biomas, miniboss e boss final.

![Mapa](docs/screenshots/mapa.png)

### Lab — Revisão espaçada (Leitner)
Flashcards organizados por caixa de repetição espaçada.

![Lab](docs/screenshots/lab.png)

---

## Funcionalidades

- **Mapa Overworld** — currículo em estilo RPG pixel art com biomas, nós e skill tree
- **Missões** — vídeo-aula embutida → desafio de código na Mini IDE → flashcards
- **Mini IDE** — editor Monaco com execução segura via Judge0
- **Sistema Leitner** — revisão diária offline com algoritmo de repetição espaçada (5 caixas)
- **Assistente IA** — chat contextual com LLaMA via Groq para tirar dúvidas nas missões
- **Gamificação** — XP, níveis, streak, badges e ranking semanal
- **Offline first** — estude sem internet; dados sincronizam com a nuvem automaticamente quando houver conexão

---

## Stack

### Backend (embutido)
- Java 21 + Quarkus
- GraalVM (compilação para binário nativo — sem JVM no usuário final)
- Hibernate ORM com Panache
- SmallRye JWT
- LangChain4j (integração com Groq)
- PostgreSQL remoto via Neon
- SQLite local na máquina do usuário

### Frontend / Desktop
- React + Vite + Tailwind CSS
- Electron (shell desktop + orquestra o binário nativo)
- Monaco Editor (Mini IDE)

### Serviços externos
- [Judge0](https://judge0.com) — execução segura de código
- [Groq](https://groq.com) — LLM (LLaMA) para o assistente IA
- [Neon](https://neon.tech) — PostgreSQL serverless

---

## Estrutura do Repositório

```
studyquest/
├── api/                             Quarkus — compilado como binário nativo
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
│   │   ├── offline/                 entidades SQLite (LeitnerCard, UserNo, UserTrilha, SyncEvent)
│   │   └── shared/
│   ├── src/main/resources/
│   │   └── application.properties
│   └── pom.xml
│
├── frontend/                        React + Vite + Tailwind
│   └── src/
│
├── electron/                        Shell desktop
│   ├── main.js                      inicia o binário nativo via child_process
│   ├── preload.js
│   └── package.json                 electron-builder config
│
├── build-desktop.ps1                build completo (Windows)
├── build-desktop.sh                 build completo (Linux/macOS)
│
├── ARCHITECTURE.md
└── README.md
```

---

## Configuração do Ambiente

### Pré-requisitos

| Ferramenta | Versão | Para quê |
|---|---|---|
| GraalVM | 21+ | Compilar o backend nativo (produção) |
| Java 21 | 21+ | Desenvolvimento e testes locais |
| Node.js | 18+ | Frontend e Electron |
| Maven | 3.9+ | Build do backend (via wrapper `./mvnw`) |

> Em desenvolvimento você usa a JVM normalmente. O GraalVM só é necessário para gerar o executável final.

### Variáveis de Ambiente

Configure um `.env` na raiz de `api/` ou exporte no ambiente:

```env
# PostgreSQL remoto (Neon)
POSTGRES_URL=jdbc:postgresql://seu-host-neon/studyquest
POSTGRES_USER=seu_usuario
POSTGRES_PASSWORD=sua_senha

# SQLite local (padrão: ~/.studyquest/local.db)
SQLITE_URL=jdbc:sqlite:/caminho/customizado/local.db

# JWT — em produção aponte para o arquivo fora do binário
JWT_PRIVATE_KEY_LOCATION=/caminho/para/privateKey.pem

# CORS — em produção restrinja ao domínio do frontend
CORS_ORIGINS=app://index.html

# Groq
GROQ_API_KEY=sua_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant

# Judge0
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_KEY=sua_judge0_api_key
```

---

## Rodando em Desenvolvimento

```bash
# Backend (JVM, hot reload)
cd api
./mvnw quarkus:dev
# API em http://localhost:8080
# Swagger UI em http://localhost:8080/q/swagger-ui/
```

```bash
# Frontend (Vite dev server)
cd frontend
npm install
npm run dev
```

```bash
# Electron apontando para o build do frontend e backend em dev
cd frontend && npm run build
cd ../electron && npx electron .
```

---

## Build de Produção (executável sem dependências)

```powershell
# Windows — gera o instalador .exe (JRE + Python embutidos)
.\build-desktop.ps1
```

```bash
# Linux / macOS
bash build-desktop.sh
```

O script executa automaticamente:
1. Chaves JWT (se ainda não existirem)
2. Build do backend Quarkus (+ JRE 21 embutido, ou GraalVM com `-Native`)
3. Python embeddable para exercícios offline
4. `vite build` → React estático
5. `electron-builder` → instalador final

**Saída:** `electron/dist-electron/StudyQuest Setup 1.0.8.exe`

O instalador **não exige** Java, Node, Python ou PostgreSQL na máquina do usuário. Tudo roda embutido:
- Electron (interface)
- JRE 21 + Quarkus (API local em `127.0.0.1:8080`)
- Python 3.12 embeddable (validação de código)
- SQLite em `%APPDATA%/StudyQuest/data/` (perfil `desktop`)

---

## Documentação da API

Com o backend rodando em dev:

```
http://localhost:8080/q/swagger-ui/
```

Consulte o [ARCHITECTURE.md](./ARCHITECTURE.md) para detalhes de arquitetura, modelo de dados, endpoints e estratégia de sincronização offline/online.

---

## Roadmap

- [x] Definição de arquitetura (Quarkus + GraalVM + Electron embutido)
- [x] Modelo de dados (SQLite local + PostgreSQL remoto)
- [x] Documentação de endpoints e contratos da API
- [x] Setup Quarkus + estrutura de pacotes por domínio
- [x] Múltiplos datasources (SQLite + PostgreSQL com Panache)
- [x] Autenticação JWT (registro, login, refresh)
- [x] CRUD de trilhas e nós
- [x] Lógica de progressão e desbloqueio de nós
- [x] Fila de sincronização offline (sync_queue)
- [x] Integração Judge0
- [x] Sistema Leitner (5 caixas, repetição espaçada)
- [x] Integração Groq via LangChain4j
- [x] Gamificação (XP, streak, conquistas, ranking)
- [x] Shell Electron com binário nativo embutido
- [x] Frontend React — Mapa Overworld pixel art
- [x] Mini IDE com Monaco Editor (integração completa)
- [ ] Build nativo GraalVM (configuração final de reflection/resources)
- [ ] Testes de integração

---

## Autor

**Davi Asafe dos Santos Kling**
Estudante de Engenharia de Software com ênfase em IA — Instituto Infnet, Rio de Janeiro

[![GitHub](https://img.shields.io/badge/GitHub-davi0416-181717?style=flat&logo=github)](https://github.com/davi0416)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Davi%20Kling-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/davi-kling)

---

## Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
