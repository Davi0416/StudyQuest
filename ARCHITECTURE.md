# StudyQuest — Architecture

## Visão Geral

StudyQuest é um aplicativo desktop de estudos gamificado. O backend é construído em Java com **Quarkus + GraalVM**, compilado como um executável nativo e orquestrado de forma invisível pelo **Electron**. O frontend em React se comunica com esse backend local via HTTP, da mesma forma que consumiria uma API em nuvem. O backend local gerencia simultaneamente um banco SQLite local (operação offline e alta velocidade) e um banco PostgreSQL remoto (sincronização e identidade).

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Desktop shell | Electron (orquestra frontend + processo backend nativo) |
| Frontend | React + Vite + Tailwind CSS + Monaco Editor |
| Backend local | Java 21 + Quarkus + GraalVM (executável nativo, sem JVM) |
| Banco remoto | PostgreSQL (Neon — plano gratuito) |
| Banco local | SQLite (na máquina do usuário) |
| Sandbox de código | Judge0 (API externa) |
| Assistente IA | Groq API (LLaMA) via LangChain4j |

---

## Arquitetura de Execução (Modelo Embutido)

O usuário instala o StudyQuest como qualquer aplicativo desktop. Nenhuma JVM precisa estar instalada na máquina — o backend roda como binário nativo gerado pelo GraalVM.

```
StudyQuest.exe
│
├── Electron (processo principal)
│   ├── Inicia o binário nativo do Quarkus via child_process
│   └── Serve o frontend React via protocolo app://
│
├── studyquest-runner (binário nativo — localhost:8080)
│   ├── Inicialização em milissegundos (sem JVM)
│   ├── SQLite (dados locais — offline first)
│   └── PostgreSQL Neon (sincronização em background)
│
└── Frontend React (app://index.html)
    └── Consome http://localhost:8080/api/*
```

**Fluxo de inicialização:**
1. Usuário abre o `StudyQuest.exe`
2. Electron spawna o binário nativo `studyquest-runner` em background
3. Quarkus inicializa em milissegundos na porta `localhost:8080`
4. Electron aguarda o health check (`/q/health/live`) ficar verde
5. Janela principal carrega o React via protocolo `app://`
6. Em background, o `SyncJob` verifica conexão e sincroniza com o Neon

**Protocolo `app://`:**
O Electron registra um protocolo customizado que serve os arquivos estáticos do React com fallback para `index.html` em qualquer rota — necessário para que o `BrowserRouter` do React funcione sem um servidor HTTP.

---

## Estrutura de Pacotes — Quarkus

Organização por domínio. Cada domínio contém seu Resource (JAX-RS), Service, Repository (Panache) e DTOs. Entidades JPA nunca saem do Service — o Resource sempre recebe e retorna DTOs.

```
com.studyquest
│
├── auth/
│   ├── AuthResource.java
│   ├── AuthService.java
│   └── dto/  LoginRequest, RegisterRequest, TokenResponse
│
├── usuarios/
│   ├── UserResource.java
│   ├── UserService.java
│   ├── UserRepository.java
│   ├── User.java
│   └── dto/  UserRequestDTO, UserResponseDTO, UpdateProfileRequest, UserStatsDTO
│
├── trilhas/
│   ├── TrilhaResource.java
│   ├── TrilhaService.java
│   ├── TrilhaRepository.java
│   ├── Trilha.java
│   └── dto/  TrilhaResponse, MatricularRequest
│
├── nos/
│   ├── NoResource.java
│   ├── NoService.java
│   ├── NoRepository.java
│   ├── No.java
│   └── dto/  NoResponse
│
├── missoes/
│   ├── MissaoResource.java
│   ├── MissaoService.java
│   ├── MissaoRepository.java
│   ├── SubmissaoRepository.java
│   ├── Missao.java, Submissao.java
│   ├── judge0/  Judge0Client, Judge0SubmissionRequest, Judge0SubmissionResponse
│   └── dto/  MissaoResponse, SubmeterCodigoRequest, SubmissaoResponse
│
├── flashcards/
│   ├── FlashcardResource.java
│   ├── FlashcardService.java
│   ├── FlashcardRepository.java
│   ├── Flashcard.java
│   └── dto/  FlashcardResponse, CriarFlashcardRequest
│
├── revisao/
│   ├── RevisaoResource.java
│   ├── RevisaoService.java           (algoritmo de Leitner)
│   └── dto/  RevisaoHojeResponse, ResponderRevisaoRequest
│
├── gamificacao/
│   ├── GamificacaoResource.java
│   ├── GamificacaoService.java       (XP, nível, streak, conquistas)
│   ├── Conquista.java, ConquistaUsuario.java, RankingEntry.java
│   ├── ConquistaRepository.java, ConquistaUsuarioRepository.java, RankingRepository.java
│   └── dto/  ConquistaResponse, RankingResponse
│
├── ia/
│   ├── IaResource.java
│   ├── IaService.java                (integração LangChain4j + Groq)
│   ├── StudyAssistant.java           (interface @RegisterAiService)
│   └── dto/  ChatRequest, ChatResponse
│
├── offline/                          entidades do banco SQLite local
│   ├── LeitnerCard.java              progresso de revisão por flashcard
│   ├── UserNo.java                   status de cada nó no mapa
│   ├── UserTrilha.java               progresso por trilha
│   ├── UserAulaProgress.java         progresso por aula
│   ├── UserExercicioProgress.java    progresso por exercício
│   ├── CachedSession.java            sessão em cache para uso offline
│   ├── RankingCache.java             cache local do ranking semanal
│   └── SyncEvent.java                fila de eventos pendentes de sync
│
└── shared/
    ├── exception/
    │   ├── GlobalExceptionMapper.java
    │   ├── NoBloqueadoException.java
    │   └── RecursoNaoEncontradoException.java
    ├── response/
    │   └── ApiResponse.java          (envelope padrão de resposta)
    └── sync/
        ├── SyncService.java          (enfileira eventos offline)
        └── SyncJob.java              (job periódico de sincronização)
```

---

## Separação de Dados: Local vs Remoto

### Banco Local — SQLite (`com.studyquest.offline`)

Dados de uso frequente que funcionam sem conexão, mapeados pelo segundo datasource Hibernate (`@PersistenceUnit("local")`).

| Entidade | Tabela | Justificativa |
|---|---|---|
| `LeitnerCard` | `leitner_cards` | Atualiza várias vezes por dia durante revisões |
| `UserNo` | `user_nos` | Status de cada nó no mapa (bloqueado/ativo/concluído) |
| `UserTrilha` | `user_trilhas` | Progresso e XP por trilha |
| `UserAulaProgress` | `user_aula_progress` | Progresso por aula, necessário offline |
| `UserExercicioProgress` | `user_exercicio_progress` | Progresso por exercício, necessário offline |
| `CachedSession` | `cached_sessions` | Sessão em cache para funcionamento offline |
| `RankingCache` | `ranking_cache` | Cache local do ranking semanal |
| `SyncEvent` | `sync_queue` | Fila de eventos pendentes de sincronização |

### Banco Remoto — PostgreSQL (Neon)

Dados de identidade, currículo e ranking centralizados.

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

O `SyncJob` roda periodicamente. Consome a `sync_queue` do SQLite — eventos como `NODE_COMPLETED`, `XP_GAINED`, `BADGE_UNLOCKED`. Quando há conexão, processa em lote e atualiza o PostgreSQL remoto.

---

## Endpoints da API

### Auth — `/api/auth`

```
POST /register              cria conta email + senha
POST /login                 retorna access token + refresh token
POST /refresh               renova o access token via query param ?token=
```

### Usuários — `/api/users`

```
GET  /me                    perfil completo
PUT  /me                    atualiza nome e avatar
GET  /me/stats              XP total, streak, nível
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
POST /adicionar/{flashcardId}  adiciona flashcard à fila Leitner do usuário
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

Intervalos por caixa (`INTERVALOS = {0, 1, 3, 7, 14, 30}`):

| Caixa | Intervalo |
|---|---|
| 1 | Todo dia |
| 2 | A cada 3 dias |
| 3 | A cada 7 dias |
| 4 | A cada 14 dias |
| 5 | A cada 30 dias |

`dificil` define `proximaRevisao = hoje` (hoje+0), fazendo o card reaparecer na mesma sessão do dia.

---

## Lógica de Desbloqueio de Nós

O `NoService` valida pré-requisitos antes de iniciar um nó:

1. Busca todos os `no_prereqs` do nó solicitado
2. Verifica se existe `UserNo` com `status = CONCLUIDO` para cada pré-requisito
3. Se algum pré-requisito não estiver concluído, lança `NoBloqueadoException` (HTTP 403)
4. Quando um nó é concluído, verifica quais nós ele desbloqueia e atualiza o status local

---

## Integração com Judge0

O `MissaoService` orquestra a execução de código:

1. Recebe código e linguagem do usuário
2. Busca os casos de teste da missão
3. Monta o payload e chama a API do Judge0 via `@RegisterRestClient`
4. Compara output com o esperado
5. Persiste a `Submissao` com o resultado
6. Se aprovado na primeira tentativa, chama `GamificacaoService` para conceder XP

---

## Integração com Groq via LangChain4j

O `IaService` usa LangChain4j com interface `@RegisterAiService`:

1. Recebe mensagem do usuário e contexto (trilha + nó atual)
2. Monta system prompt com o contexto da aula
3. Chama a Groq API (endpoint compatível com OpenAI) com o modelo LLaMA
4. Retorna a resposta para o frontend

O assistente é stateless — cada mensagem carrega o contexto necessário.

---

## Segurança

- JWT com access token (15min) + refresh token (7 dias), assinado com RSA
- `publicKey.pem` commitada no repo (chave pública — não sensível)
- `privateKey.pem` fora do controle de versão (`.gitignore`); caminho configurável via `JWT_PRIVATE_KEY_LOCATION`
- CORS configurável via `CORS_ORIGINS` (padrão dev: aceita tudo; produção: restringir ao domínio)
- Senhas armazenadas com BCrypt
- Todos os endpoints (exceto `/api/auth/**`) exigem Bearer token válido

---

## Decisões Técnicas

| Decisão | Justificativa |
|---|---|
| Quarkus + GraalVM | Backend vira executável nativo — não exige JVM no usuário final, inicializa em milissegundos, consome pouca RAM |
| Binário nativo embutido no Electron | Permite acesso direto ao SQLite local, zero dependências para o usuário final |
| Protocolo `app://` no Electron | Permite usar `BrowserRouter` do React sem servidor HTTP extra, com SPA fallback nativo |
| SQLite local para Leitner e progresso | Revisões acontecem offline, várias vezes ao dia — elimina latência do Neon |
| Pacote `offline/` separado | Entidades do SQLite ficam isoladas das entidades do PostgreSQL, evitando conflitos de PersistenceUnit |
| Layered Architecture por domínio | Velocidade de desenvolvimento, fácil de navegar, sem over-engineering |
| Judge0 externo no MVP | Execução segura de código sem gerenciar containers |
| LangChain4j + Groq | Gratuito, rápido, integração madura com Quarkus |
| Sync queue no SQLite | Garante que nenhum evento se perde mesmo sem conexão |
