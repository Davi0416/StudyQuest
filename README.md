# StudyQuest

Aplicativo desktop de estudos gamificado. O currículo é apresentado como um mapa RPG interativo onde cada tecnologia é um nó a ser desbloqueado. Missões combinam vídeo-aula, desafio de código e revisão por flashcards com repetição espaçada.

---

## Demonstração

> Screenshots e GIFs serão adicionados conforme o desenvolvimento avança.

---

## Funcionalidades

- **Mapa Overworld** — currículo em estilo RPG pixel art com biomas, nós e skill tree
- **Missões** — vídeo-aula embutida → desafio de código na Mini IDE → flashcards gerados
- **Mini IDE** — editor Monaco com execução segura via Judge0
- **Sistema Leitner** — revisão diária de flashcards com algoritmo de repetição espaçada (5 caixas)
- **Assistente IA** — chat contextual com LLaMA via Groq para tirar dúvidas durante as missões
- **Gamificação** — XP, níveis, streak, badges e ranking semanal
- **Autenticação** — email/senha e login com Google

---

## Stack

### Backend
- Java 21
- Spring Boot 3
- Spring Security + JWT
- Spring AI (integração com Groq)
- Spring Data JPA
- PostgreSQL (banco remoto via Neon)
- SQLite (banco local na máquina do usuário)

### Frontend
- React + Vite
- Tailwind CSS
- Electron (empacotamento desktop)
- Monaco Editor

### Serviços externos
- [Judge0](https://judge0.com) — execução segura de código
- [Groq](https://groq.com) — LLM para assistente IA (LLaMA)
- [Neon](https://neon.tech) — PostgreSQL serverless

---

## Estrutura do Repositório

```
studyquest/
├── backend/                    Spring Boot
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
│   │   └── application.yml
│   └── pom.xml
│
├── frontend/                   React + Electron
│   ├── src/
│   ├── electron/
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
- PostgreSQL (ou conta no Neon)
- Conta no Groq (gratuita)
- Conta no Judge0 (gratuita)

### Variáveis de Ambiente — Backend

Crie um arquivo `.env` na raiz do `backend/` ou configure as variáveis no sistema:

```env
# Banco de dados
DATABASE_URL=jdbc:postgresql://seu-host-neon/studyquest
DATABASE_USERNAME=seu_usuario
DATABASE_PASSWORD=sua_senha

# JWT
JWT_SECRET=sua_chave_secreta_com_minimo_256_bits
JWT_EXPIRATION_MS=900000
JWT_REFRESH_EXPIRATION_MS=604800000

# OAuth Google
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret

# Groq
GROQ_API_KEY=sua_groq_api_key
GROQ_MODEL=llama3-8b-8192

# Judge0
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=sua_judge0_api_key
```

### Rodando o Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

A API estará disponível em `http://localhost:8080`.

### Rodando o Frontend

```bash
cd frontend
npm install
npm run dev          # modo desenvolvimento no browser
npm run electron:dev # modo desenvolvimento no Electron
```

### Build para Produção

```bash
# Backend
cd backend
mvn clean package
java -jar target/studyquest-*.jar

# Frontend
cd frontend
npm run build
npm run electron:build
```

---

## Documentação da API

Com o backend rodando, acesse a documentação Swagger em:

```
http://localhost:8080/swagger-ui.html
```

Para detalhes completos da arquitetura, endpoints e decisões técnicas, consulte o [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Banco de Dados

O projeto usa dois bancos:

**PostgreSQL remoto (Neon)** — dados de identidade, currículo e ranking. Requer conexão.

**SQLite local** — progresso no mapa, revisões Leitner e progresso por trilha. Funciona offline, sincroniza com o remoto quando há conexão.

Para rodar as migrations:

```bash
cd backend
mvn flyway:migrate
```

---

## Roadmap

- [x] Definição de arquitetura e modelo de dados
- [ ] Setup inicial Spring Boot + estrutura de pacotes
- [ ] Autenticação JWT + OAuth Google
- [ ] CRUD de trilhas e nós
- [ ] Lógica de progressão e desbloqueio de nós
- [ ] Integração Judge0
- [ ] Sistema Leitner
- [ ] Integração Groq (assistente IA)
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
