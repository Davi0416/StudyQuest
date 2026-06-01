# StudyQuest

Aplicativo desktop de estudos gamificado. O currículo é apresentado como um mapa RPG interativo onde cada tecnologia é um nó a ser desbloqueado. Missões combinam vídeo-aula, desafio de código e revisão por flashcards com repetição espaçada.

Nesta arquitetura moderna, o StudyQuest opera com um **backend nativo embutido** construído com **Quarkus e GraalVM**. Ele roda de forma invisível gerenciado pelo Electron, garantindo alta performance, suporte a uso offline com banco de dados local e sincronização em background com a nuvem.

---

## Demonstração

> Screenshots e GIFs serão adicionados conforme o desenvolvimento avança.

---

## Funcionalidades

- **Mapa Overworld** — currículo em estilo RPG pixel art com biomas, nós e skill tree
- **Missões** — vídeo-aula embutida → desafio de código na Mini IDE → flashcards gerados
- **Mini IDE** — editor Monaco com execução segura via Judge0
- **Sistema Leitner** — revisão diária de flashcards offline com algoritmo de repetição espaçada (5 caixas)
- **Assistente IA** — chat contextual para tirar dúvidas durante as missões
- **Gamificação** — XP, níveis, streak, badges e ranking semanal
- **Sincronização Inteligente** — jogue e estude offline; os dados sincronizam com a nuvem automaticamente quando houver conexão

---

## Stack Tecnológica

### Backend Local (Embutido)

- Java 21 + Quarkus
- GraalVM (Compilação para binário nativo)
- Hibernate ORM com Panache
- JWT + Segurança JAX-RS
- REST Client / LangChain4j (integração com Groq)
- PostgreSQL (banco remoto via Neon - Nuvem)
- SQLite (banco local na máquina do usuário)

### Frontend (Desktop Shell)

- React + Vite
- Tailwind CSS
- Electron (empacotamento desktop e orquestração do backend)
- Monaco Editor

### Serviços externos

- [Judge0](https://judge0.com) — execução segura de código
- [Groq](https://groq.com) — LLM para assistente IA (LLaMA)
- [Neon](https://neon.tech) — PostgreSQL serverless

---

## Estrutura do Repositório

```text
studyquest/
├── backend/                    Quarkus (Gera o binário nativo)
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
├── frontend/                   React + Electron
│   ├── src/
│   ├── electron/
│   │   └── main.js             (Inicia o executável do Quarkus em background)
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
- GraalVM (obrigatório para compilar o executável nativo do backend)
- PostgreSQL (ou conta no Neon)
- Conta no Groq e Judge0 (gratuitas)

### Variáveis de Ambiente — Backend Local

Crie um arquivo `.env` na raiz do `backend/`:

```env
# Conexões Múltiplas (Quarkus)
QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://seu-host-neon/studyquest
QUARKUS_DATASOURCE_USERNAME=seu_usuario
QUARKUS_DATASOURCE_PASSWORD=sua_senha

# Banco Local (SQLite)
QUARKUS_DATASOURCE_LOCAL_JDBC_URL=jdbc:sqlite:studyquest_local.db

# JWT
JWT_SECRET=sua_chave_secreta_com_minimo_256_bits

# Groq
GROQ_API_KEY=sua_groq_api_key

# Judge0
JUDGE0_API_URL=[https://judge0-ce.p.rapidapi.com](https://judge0-ce.p.rapidapi.com)
JUDGE0_API_KEY=sua_judge0_api_key
```

### Rodando o Ambiente em Desenvolvimento

**1. Backend (Quarkus Dev Mode):**

```bash
cd backend
mvn compile quarkus:dev
```

A API estará disponível em `http://localhost:8080`.

**2. Frontend:**

```bash
cd frontend
npm install
npm run dev          # modo desenvolvimento no browser
npm run electron:dev # modo desenvolvimento no Electron
```

### Build para Produção (O Pulo do Gato)

Aqui o backend vira um executável leve e é acoplado ao Electron.

```bash
# 1. Compilar o Backend Nativo com GraalVM
cd backend
mvn package -Dnative
# Isso gera um arquivo como 'studyquest-runner.exe' (ou binário Linux/Mac)

# 2. Copiar o binário para a pasta do Electron (configurar script para isso)
cp target/studyquest-1.0.0-runner ../frontend/resources/backend-bin

# 3. Build do Frontend + Electron
cd ../frontend
npm run build
npm run electron:build
```

---

## Documentação da API

Com o backend rodando em modo dev, acesse a interface Swagger UI padrão do Quarkus em:

```text
http://localhost:8080/q/swagger-ui/
```

Para detalhes completos da arquitetura, endpoints e decisões de sincronização de dados offline/online, consulte o [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Roadmap

- [x] Definição de arquitetura e modelo de dados (Embutido + Quarkus)
- [x] Decisão do fluxo de sincronização SQLite vs PostgreSQL
- [ ] Setup inicial Quarkus + migração da estrutura de pacotes
- [ ] Implementação de multiplos datasources (Panache)
- [ ] Autenticação e Segurança
- [ ] Fila de sincronização (Sync Queue)
- [ ] CRUD de trilhas e nós
- [ ] Integração Judge0
- [ ] Sistema Leitner (Offline)
- [ ] Integração Groq (Assistente IA via LangChain4j)
- [ ] Gamificação (XP, streak, conquistas)
- [ ] Frontend React + Electron
- [ ] Mapa Overworld pixel art
- [ ] Mini IDE com Monaco Editor

---

## Autor

**Davi Asafe dos Santos Kling**
Estudante de Engenharia de IA — Instituto Infnet, Rio de Janeiro

[![GitHub](https://img.shields.io/badge/GitHub-davi0416-181717?style=flat&logo=github)](https://github.com/davi0416)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Davi%20Kling-0A66C2?style=flat&logo=linkedin)](https://linkedin.com/in/davi-kling)

---

## Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
