# StudyQuest — Architecture

## Visão Geral

StudyQuest é um aplicativo desktop de estudos gamificado. O backend é construído em Java com **Quarkus + GraalVM**, compilado como um executável nativo e orquestrado de forma invisível pelo **Electron**. O frontend em React se comunica com esse backend local via HTTP, da mesma forma que consumiria uma API em nuvem. O backend local gerencia simultaneamente um banco SQLite local (operação offline e alta velocidade) e um banco PostgreSQL remoto (sincronização e identidade).

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Desktop shell | Electron (orquestra frontend + processo backend nativo) |
| Frontend | React + Vite + Tailwind CSS + Monaco Editor |
| Backend local | Java 21 + Quarkus + GraalVM (executável nativo) |
| Banco remoto | PostgreSQL (Neon — plano gratuito) |
| Banco local | SQLite (na máquina do usuário) |
| Sandbox de código | Judge0 (API externa) |
| Assistente IA | Groq API (LLaMA) via LangChain4j |

---

## Arquitetura de Execução (Modelo Embutido)

O usuário instala o StudyQuest como qualquer aplicativo desktop. Nenhuma JVM precisa estar instalada na máquina — o backend roda como binário nativo.

```
StudyQuest.exe
│
├── Electron (processo principal)
│   ├── Inicia o binário nativo do Quarkus via child_process
│   └── Serve o frontend React na janela do app
│
├── Quarkus (localhost:8080) ← inicializa em milissegundos
│   ├── SQLite (dados locais — offline first)
│   └── PostgreSQL Neon (sincronização em background)
│
└── Frontend React
    └── Consome http://localhost:8080/api/*
```

**Fluxo de inicialização:**
1. Usuário abre o `StudyQuest.exe`
2. Electron sobe e usa `child_process` para iniciar o binário nativo Quarkus em background
3. Quarkus inicializa em milissegundos na porta `localhost:8080`
4. Frontend React carrega e passa a consumir a API local
5. Em background, o `SyncService` verifica conexão e sincroniza com o Neon

---

## Estrutura de Pacotes — Quarkus

Organização por domínio. Cada domínio contém seu Resource (JAX-RS), Service, Repository (Panache) e DTOs. A regra é estrita: entidades JPA nunca saem do Service — o Resource sempre recebe e retorna DTOs.

```
com.studyquest
│
├── auth/
│   ├── AuthResource.java             (endpoint JAX-RS)
│   ├── AuthService.java
│   ├── AuthRepository.java           (PanacheRepository)
│   └── dto/
│       ├── LoginRequest.java
│       ├── RegisterRequest.java
│       └── TokenResponse.java
│
├── usuarios/
│   ├── UsuarioResource.java
│   ├── UsuarioService.java
│   ├── UsuarioRepository.java
│   ├── Usuario.java                  (entidade Panache)
│   └── dto/
│       ├── UsuarioResponse.java
│       └── UsuarioStatsResponse.java
│
├── trilhas/
│   ├── TrilhaResource.java
│   ├── TrilhaService.java
│   ├── TrilhaRepository.java
│   ├── Trilha.java
│   ├── UserTrilha.java
│   └── dto/
│       ├── TrilhaResponse.java
│       └── MatricularRequest.java
│
├── nos/
│   ├── NoResource.java
│   ├── NoService.java
│   ├── NoRepository.java
│   ├── No.java
│   ├── UserNo.java
│   └── dto/
│       ├── NoResponse.java
│       └── NoStatusResponse.java
│
├── missoes/
│   ├── MissaoResource.java
│   ├── MissaoService.java
│   ├── MissaoRepository.java
│   ├── SubmissaoRepository.java
│   ├── Missao.java
│   ├── Submissao.java
│   └── dto/
│       ├── MissaoResponse.java
│       ├── SubmeterCodigoRequest.java
│       └── SubmissaoResponse.java
│
├── flashcards/
│   ├── FlashcardResource.java
│   ├── FlashcardService.java
│   ├── FlashcardRepository.java
│   ├── Flashcard.java
│   └── dto/
│       ├── FlashcardResponse.java
│       └── CriarFlashcardRequest.java
│
├── revisao/
│   ├── RevisaoResource.java
│   ├── RevisaoService.java           (algoritmo de Leitner)
│   ├── LeitnerCardRepository.java
│   ├── LeitnerCard.java
│   └── dto/
│       ├── RevisaoHojeResponse.java
│       └── ResponderRevisaoRequest.java
│
├── gamificacao/
│   ├── GamificacaoResource.java
│   ├── GamificacaoService.java       (XP, nível, streak, conquistas)
│   ├── ConquistaRepository.java
│   ├── ConquistaUsuarioRepository.java
│   ├── RankingRepository.java
│   └── dto/
│       ├── ConquistaResponse.java
│       └── RankingResponse.java
│
├── ia/
│   ├── IaResource.java
│   ├── IaService.java                (integração LangChain4j + Groq)
│   └── dto/
│       ├── ChatRequest.java
│       └── ChatResponse.java
│
└── shared/
    ├── config/
    ├── exception/
    │   ├── GlobalExceptionMapper.java
    │   ├── NoBloqueadoException.java
    │   └── RecursoNaoEncontradoException.java
    ├── response/
    │   └── ApiResponse.java          (envelope padrão de resposta)
    └── sync/
        ├── SyncService.java          (gerencia fila de eventos offline)
        └── SyncJob.java              (job periódico de sincronização)
```

---

## Fluxo de Camadas

```
Request HTTP
     │
     ▼
Resource (JAX-RS)     valida entrada, chama Service, retorna DTO
     │
     ▼
Service               toda a lógica de negócio vive aqui
     │
     ▼
Repository (Panache)  acesso ao banco de dados
     │
     ▼
SQLite / PostgreSQL
```

---

## Separação de Dados: Local vs Remoto

### Banco Local — SQLite (offline first)

Dados de uso frequente e que não precisam de conexão constante.

| Tabela | Justificativa |
|---|---|
| `leitner_cards` | Atualiza várias vezes por dia durante revisões |
| `user_nos` | Status de cada nó no mapa (bloqueado/ativo/concluído) |
| `user_trilhas` | Progresso e XP por trilha |
| `sync_queue` | Fila de eventos pendentes de sincronização |

### Banco Remoto — PostgreSQL (Neon)

Dados de identidade, currículo e ranking que precisam ser centralizados.

| Tabela | Justificativa |
|---|---|
| `users` | Identidade e progresso principal |
| `trilhas` | Currículo fixo, gerenciado centralmente |
| `nos` | Conteúdo das trilhas e pré-requisitos |
| `missoes` | Enunciados e casos de teste |
| `submissoes` | Histórico de código enviado |
| `flashcards` | Conteúdo fixo vinculado à trilha |
| `conquistas` | Catálogo de badges |
| `conquistas_usuario` | Badges desbloqueados |
| `ranking_semanal` | Ranking centralizado entre usuários |

### Estratégia de Sincronização

O `SyncJob` roda periodicamente no Quarkus. Ele consome a `sync_queue` do SQLite — uma tabela de eventos como `NODE_COMPLETED`, `XP_GAINED`, `BADGE_UNLOCKED`. Quando há conexão disponível, processa os eventos em lote e atualiza o PostgreSQL remoto.

---

## Endpoints da API

### Auth — `/api/auth`

```
POST /register              cria conta email + senha
POST /login                 retorna access token + refresh token
POST /oauth/google          login via Google
POST /refresh               renova o access token
POST /logout                invalida o refresh token
```

### Usuários — `/api/users`

```
GET  /me                    perfil completo
PUT  /me                    atualiza nome e avatar
GET  /me/stats              histórico de XP e missões
```

### Trilhas — `/api/trilhas`

```
GET  /                      lista todas as trilhas
GET  /{id}                  detalhes + nós com status do usuário
POST /{id}/matricular       matricula o usuário
GET  /ativas                trilhas em que o usuário está matriculado
```

### Nós — `/api/nos`

```
GET  /{id}                  dados do nó + status do usuário
POST /{id}/iniciar          marca como em progresso, valida pré-requisitos
POST /{id}/concluir         conclui, concede XP, desbloqueia próximos nós
```

### Missões — `/api/missoes`

```
GET  /{id}                  enunciado, código inicial, linguagem
POST /{id}/submeter         envia código → Judge0 → salva → retorna feedback
GET  /{id}/submissoes       histórico de tentativas
```

### Flashcards — `/api/flashcards`

```
GET  /                      lista flashcards (filtros: trilha, nó)
POST /                      cria flashcard manual
DELETE /{id}                remove flashcard
```

### Revisão Leitner — `/api/revisao`

```
GET  /hoje                  flashcards pendentes do dia, agrupados por caixa
POST /{id}/responder        body: { resultado: "facil"|"ok"|"dificil" }
GET  /stats                 distribuição atual de cards por caixa
```

### Gamificação — `/api/gamificacao`

```
GET  /conquistas            catálogo + conquistas desbloqueadas
GET  /ranking/semanal       top 10 da semana + posição do usuário
```

### IA — `/api/ia`

```
POST /chat                  body: { mensagem, contexto: { trilhaId, noId } }
```

---

## Contrato de Resposta Padrão

**Sucesso:**
```json
{
  "success": true,
  "data": { },
  "message": null,
  "timestamp": "2026-06-01T12:00:00Z"
}
```

**Erro:**
```json
{
  "success": false,
  "data": null,
  "error": "NO_BLOQUEADO",
  "message": "Pré-requisitos não concluídos",
  "timestamp": "2026-06-01T12:00:00Z"
}
```

---

## Algoritmo de Leitner

5 caixas de repetição espaçada. A resposta do usuário define o movimento do flashcard:

| Resultado | Comportamento |
|---|---|
| `facil` | Avança uma caixa (máximo: caixa 5) |
| `ok` | Permanece na mesma caixa |
| `dificil` | Volta para a caixa 1 |

Intervalo de revisão por caixa:

| Caixa | Intervalo |
|---|---|
| 1 | Todo dia |
| 2 | A cada 2 dias |
| 3 | A cada 4 dias |
| 4 | A cada 7 dias |
| 5 | A cada 14 dias |

---

## Lógica de Desbloqueio de Nós

O `NoService` valida pré-requisitos antes de iniciar um nó:

1. Busca todos os `no_prereqs` do nó solicitado
2. Verifica se existe `user_nos` com `status = CONCLUIDO` para cada pré-requisito
3. Se algum pré-requisito não estiver concluído, lança `NoBloqueadoException` (HTTP 403)
4. Quando um nó é concluído, verifica quais nós ele desbloqueia e atualiza o status local

---

## Integração com Judge0

O `MissaoService` orquestra a execução de código:

1. Recebe código e linguagem do usuário
2. Busca os casos de teste da missão (`testes_json`)
3. Monta o payload e chama a API do Judge0
4. Aguarda o resultado (polling)
5. Compara output com o esperado
6. Persiste a `Submissao` com o resultado
7. Se aprovado na primeira tentativa, chama `GamificacaoService` para conceder XP

---

## Integração com Groq via LangChain4j

O `IaService` usa LangChain4j para comunicação com Groq:

1. Recebe mensagem do usuário e contexto (trilha + nó atual)
2. Monta um system prompt com o contexto da aula
3. Chama a Groq API via LangChain4j com o modelo LLaMA
4. Retorna a resposta para o frontend

O assistente é stateless — cada mensagem carrega o contexto necessário.

---

## Segurança

- JWT com refresh token (access: 15min, refresh: 7 dias)
- OAuth2 Google para login social
- Todos os endpoints (exceto `/api/auth/**`) exigem token válido
- Senhas armazenadas com BCrypt
- CORS configurado para aceitar apenas origem do Electron (`app://`)

---

## Decisões Técnicas

| Decisão | Justificativa |
|---|---|
| Quarkus + GraalVM | Backend vira executável nativo — não exige JVM no computador do usuário, inicializa em milissegundos e consome pouca RAM |
| Backend embutido no Electron | Permite acesso direto ao SQLite local e orquestra as duas conexões de banco em um único processo |
| SQLite local para Leitner | Revisões acontecem offline, várias vezes ao dia — elimina custo e latência do Neon |
| Layered Architecture por domínio | Velocidade de desenvolvimento, fácil de navegar, sem over-engineering |
| Judge0 externo no MVP | Execução segura de código sem gerenciar containers |
| LangChain4j + Groq | Gratuito, rápido, integração madura com Quarkus |
| Flashcards fixos por trilha | Conteúdo curado é mais confiável que geração automática por IA |
| Sync queue no SQLite | Garante que nenhum evento se perde mesmo sem conexão |
