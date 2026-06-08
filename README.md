# StudyQuest

Aplicativo desktop de estudos gamificado. O currículo é apresentado como um mapa RPG interativo onde cada tecnologia é um nó a ser desbloqueado. Missões combinam vídeo-aula, desafio de código e revisão por flashcards com repetição espaçada.

O backend roda como um **executável nativo embutido** construído com **Quarkus + GraalVM**, gerenciado de forma invisível pelo Electron — sem exigir instalação de JVM no computador do usuário.

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
- GraalVM (compilação para binário nativo)
- Hibernate ORM com Panache
- SmallRye JWT + OAuth2 (Google)
- LangChain4j (integração com Groq)
- PostgreSQL remoto via Neon
- SQLite local na máquina do usuário

### Frontend
- React + Vite + Tailwind CSS
- Electron (shell desktop + orquestração do backend nativo)
- Monaco Editor (Mini IDE)

### Serviços externos
- [Judge0](https://judge0.com) — execução segura de código
- [Groq](https://groq.com) — LLM (LLaMA) para o assistente IA
- [Neon](https://neon.tech) — PostgreSQL serverless

---

## Estrutura do Repositório

```
studyquest/
├── backend/                         Quarkus — gera o binário nativo
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
│   │   └── shared/
│   ├── src/main/resources/
│   │   └── application.properties
│   └── pom.xml
│
├── frontend/                        React + Electron
│   ├── src/
│   ├── electron/
│   │   └── main.js                  inicia o binário Quarkus via child_process
│   ├── package.json
│   └── vite.config.ts
│
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

Crie um arquivo `.env` na raiz do `backend/`:

```env
# PostgreSQL remoto (Neon)
QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://seu-host-neon/studyquest
QUARKUS_DATASOURCE_USERNAME=seu_usuario
QUARKUS_DATASOURCE_PASSWORD=sua_senha

# SQLite local
QUARKUS_DATASOURCE_LOCAL_JDBC_URL=jdbc:sqlite:studyquest_local.db

# JWT
JWT_SECRET=sua_chave_secreta_com_minimo_256_bits

# OAuth Google
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret

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
cd backend
mvn compile quarkus:dev

# A API estará em http://localhost:8080
# Swagger UI em http://localhost:8080/q/swagger-ui/
```

```bash
# Frontend
cd frontend
npm install
npm run dev           # browser
npm run electron:dev  # Electron
```

### Build de Produção

```bash
# 1. Compilar o backend como binário nativo (exige GraalVM)
cd backend
mvn package -Dnative
# Gera: target/studyquest-runner (Linux/Mac) ou target/studyquest-runner.exe (Windows)

# 2. Copiar o binário para a pasta de resources do Electron
cp target/studyquest-runner ../frontend/resources/backend-bin/

# 3. Build do Electron
cd ../frontend
npm run build
npm run electron:build
```

---

## Documentação da API

Com o backend rodando em dev, acesse o Swagger UI em:

```
http://localhost:8080/q/swagger-ui/
```

Para detalhes completos de arquitetura, modelo de dados, endpoints e estratégia de sincronização offline/online, consulte o [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Roadmap

- [x] Definição de arquitetura (Quarkus + GraalVM + Electron embutido)
- [x] Modelo de dados (SQLite local + PostgreSQL remoto)
- [x] Documentação de endpoints e contratos da API
- [ ] Setup inicial Quarkus + estrutura de pacotes
- [ ] Múltiplos datasources (SQLite + PostgreSQL com Panache)
- [ ] Autenticação JWT + OAuth2 Google
- [ ] CRUD de trilhas e nós
- [ ] Lógica de progressão e desbloqueio de nós
- [ ] Fila de sincronização offline (sync_queue)
- [ ] Integração Judge0
- [ ] Sistema Leitner
- [ ] Integração Groq via LangChain4j
- [ ] Gamificação (XP, streak, conquistas, ranking)
- [ ] Frontend React + Electron
- [ ] Mapa Overworld pixel art
- [ ] Mini IDE com Monaco Editor

---

## Autor

**Davi Asafe dos Santos Kling**
Estudante de Engenharia de Software com ênfase em IA — Instituto Infnet, Rio de Janeiro

[![GitHub](https://img.shields.io/badge/GitHub-davi0416-181717?style=flat&logo=github)](https://github.com/davi0416)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Davi%20Kling-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/davi-kling)

---

## Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
