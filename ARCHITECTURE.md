# StudyQuest — Architecture

## Visão Geral

StudyQuest é um aplicativo desktop de estudos gamificado. O backend é construído em Java com Spring Boot, expondo uma API REST consumida pelo frontend em React + Electron. A execução de código do usuário é delegada ao serviço externo Judge0. Um assistente de IA via Groq responde perguntas contextuais dentro das missões.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Desktop shell | Electron |
| Frontend | React + Vite + Tailwind CSS |
| Backend | Java 21 + Spring Boot 3 |
| Banco remoto | PostgreSQL (Neon — plano gratuito) |
| Banco local | SQLite (na máquina do usuário) |
| Sandbox de código | Judge0 (API externa) |
| Assistente IA | Groq API (LLaMA) via Spring AI |
| Autenticação | JWT + OAuth2 Google |

---

## Estrutura de Pacotes — Spring Boot

Organização por domínio. Cada domínio é autossuficiente com seu Controller, Service, Repository e DTOs.

```
com.studyquest
│
├── auth/
│   ├── AuthController.java
│   ├── AuthService.java
│   ├── AuthRepository.java
│   └── dto/
│       ├── LoginRequest.java
│       ├── RegisterRequest.java
│       └── TokenResponse.java
│
├── usuarios/
│   ├── UsuarioController.java
│   ├── UsuarioService.java
│   ├── UsuarioRepository.java
│   ├── Usuario.java                  (entidade JPA)
│   └── dto/
│       ├── UsuarioResponse.java
│       └── UsuarioStatsResponse.java
│
├── trilhas/
│   ├── TrilhaController.java
│   ├── TrilhaService.java
│   ├── TrilhaRepository.java
│   ├── Trilha.java
│   ├── UserTrilha.java
│   └── dto/
│       ├── TrilhaResponse.java
│       └── MatricularRequest.java
│
├── nos/
│   ├── NoController.java
│   ├── NoService.java
│   ├── NoRepository.java
│   ├── No.java
│   ├── UserNo.java
│   └── dto/
│       ├── NoResponse.java
│       └── NoStatusResponse.java
│
├── missoes/
│   ├── MissaoController.java
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
│   ├── FlashcardController.java
│   ├── FlashcardService.java
│   ├── FlashcardRepository.java
│   ├── Flashcard.java
│   └── dto/
│       ├── FlashcardResponse.java
│       └── CriarFlashcardRequest.java
│
├── revisao/
│   ├── RevisaoController.java
│   ├── RevisaoService.java           (algoritmo de Leitner)
│   ├── LeitnerCardRepository.java
│   ├── LeitnerCard.java
│   └── dto/
│       ├── RevisaoHojeResponse.java
│       └── ResponderRevisaoRequest.java
│
├── gamificacao/
│   ├── GamificacaoController.java
│   ├── GamificacaoService.java       (XP, nível, streak, conquistas)
│   ├── ConquistaRepository.java
│   ├── ConquistaUsuarioRepository.java
│   ├── RankingRepository.java
│   └── dto/
│       ├── ConquistaResponse.java
│       └── RankingResponse.java
│
├── ia/
│   ├── IaController.java
│   ├── IaService.java                (proxy pra Groq via Spring AI)
│   └── dto/
│       ├── ChatRequest.java
│       └── ChatResponse.java
│
└── shared/
    ├── config/
    │   ├── SecurityConfig.java
    │   ├── JwtConfig.java
    │   └── CorsConfig.java
    ├── exception/
    │   ├── GlobalExceptionHandler.java
    │   ├── NoBloqueadoException.java
    │   └── RecursoNaoEncontradoException.java
    └── response/
        └── ApiResponse.java          (envelope padrão de resposta)
```

---

## Fluxo de Camadas

```
Request HTTP
     │
     ▼
Controller          valida entrada, chama Service, retorna resposta
     │
     ▼
Service             toda a lógica de negócio vive aqui
     │
     ▼
Repository          acesso ao banco via Spring Data JPA
     │
     ▼
PostgreSQL / SQLite
```

Regra: entidades JPA nunca saem do Service. O Controller sempre recebe e retorna DTOs.

---

## Separação de Dados: Remoto vs Local

### Banco Remoto — PostgreSQL (Neon)

Dados que precisam ser centralizados ou compartilhados entre dispositivos.

| Tabela | Justificativa |
|---|---|
| `users` | Identidade e progresso principal |
| `trilhas` | Currículo fixo, gerenciado pelo admin |
| `nos` | Conteúdo das trilhas |
| `no_prereqs` | Grafo de pré-requisitos |
| `missoes` | Enunciados e casos de teste |
| `submissoes` | Histórico de código enviado |
| `flashcards` | Conteúdo fixo vinculado à trilha |
| `conquistas` | Catálogo de badges |
| `conquistas_usuario` | Badges desbloqueados |
| `ranking_semanal` | Precisa ser centralizado |

### Banco Local — SQLite (máquina do usuário)

Dados de uso frequente que não precisam de conexão constante.

| Tabela | Justificativa |
|---|---|
| `leitner_cards` | Atualiza várias vezes por dia (revisões) |
| `user_nos` | Status de progresso no mapa |
| `user_trilhas` | Progresso e XP por trilha |

Sincronização: o SQLite local é atualizado quando o usuário conclui um nó ou ganha XP. O remoto é atualizado em segundo plano, sem bloquear a experiência.

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
GET  /conquistas            catálogo + conquistas desbloqueadas do usuário
GET  /ranking/semanal       top 10 da semana + posição do usuário
```

### IA — `/api/ia`

```
POST /chat                  body: { mensagem, contexto: { trilhaId, noId } }
```

---

## Contrato de Resposta Padrão

Toda resposta da API segue o envelope `ApiResponse<T>`.

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

O sistema usa 5 caixas de repetição espaçada. Quando o usuário responde um flashcard:

| Resultado | Comportamento |
|---|---|
| `facil` | Avança uma caixa (máximo: caixa 5) |
| `ok` | Permanece na mesma caixa |
| `dificil` | Volta para a caixa 1 |

Intervalo de revisão por caixa:

| Caixa | Revisão |
|---|---|
| 1 | Todo dia |
| 2 | A cada 2 dias |
| 3 | A cada 4 dias |
| 4 | A cada 7 dias |
| 5 | A cada 14 dias |

---

## Lógica de Desbloqueio de Nós

O `NoService` verifica os pré-requisitos antes de permitir que o usuário inicie um nó:

1. Busca todos os `no_prereqs` do nó solicitado
2. Para cada pré-requisito, verifica se existe um `user_nos` com `status = CONCLUIDO` para o usuário
3. Se algum pré-requisito não estiver concluído, lança `NoBloqueadoException` (HTTP 403)
4. Quando um nó é concluído, busca todos os nós que têm esse nó como pré-requisito e verifica se estão aptos a serem desbloqueados

---

## Integração com Judge0

O `MissaoService` orquestra a execução de código:

1. Recebe o código e a linguagem do usuário
2. Busca os casos de teste da missão (`testes_json`)
3. Monta o payload e chama a API do Judge0
4. Aguarda o resultado (polling ou webhook)
5. Compara o output com o esperado
6. Persiste a `Submissao` com o resultado
7. Se aprovado e for a primeira aprovação, chama `GamificacaoService` para conceder XP

---

## Integração com Groq (Assistente IA)

O `IaService` usa Spring AI para comunicação com Groq:

1. Recebe a mensagem do usuário e o contexto (trilha + nó atual)
2. Monta um system prompt com o contexto da aula
3. Chama a Groq API via Spring AI com o modelo LLaMA
4. Retorna a resposta para o frontend

O assistente é stateless — cada mensagem carrega o contexto necessário. Não há histórico de conversa persistido no banco.

---

## Segurança

- Autenticação via JWT com refresh token (validade: access 15min, refresh 7 dias)
- OAuth2 com Google para login social
- Todos os endpoints (exceto `/api/auth/**`) exigem token válido
- Spring Security com `@PreAuthorize` nos endpoints sensíveis
- Senhas armazenadas com BCrypt
- CORS configurado para aceitar apenas a origem do Electron

---

## Decisões Técnicas

| Decisão | Justificativa |
|---|---|
| Layered Architecture por domínio | Velocidade de desenvolvimento, fácil de navegar, sem over-engineering |
| SQLite local para Leitner | Revisões acontecem offline, várias vezes por dia — evita custos no Neon |
| Judge0 externo no MVP | Execução segura de código sem gerenciar containers |
| Groq no lugar de OpenAI | Gratuito, rápido, já usado no Vocash |
| Flashcards fixos | Conteúdo curado é mais confiável que geração automática por IA |
