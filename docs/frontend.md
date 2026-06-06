# StudyQuest — Guia de Integração para o Frontend

> Base URL local: `http://localhost:8080/api`  
> Todos os endpoints (exceto `/auth/*`) exigem o header `Authorization: Bearer <token>`

---

## Índice

1. [Autenticação](#1-autenticação)
2. [Usuário](#2-usuário)
3. [Trilhas](#3-trilhas)
4. [Nós](#4-nós)
5. [Missões](#5-missões)
6. [Flashcards](#6-flashcards)
7. [Revisão (Leitner)](#7-revisão-leitner)
8. [Gamificação](#8-gamificação)
9. [IA](#9-ia)
10. [Formato padrão de resposta](#10-formato-padrão-de-resposta)
11. [Erros comuns](#11-erros-comuns)
12. [Fluxo de telas sugerido](#12-fluxo-de-telas-sugerido)

---

## 1. Autenticação

### Registrar conta

```
POST /api/auth/register
```

**Body:**
```json
{
  "name": "Ana Silva",
  "email": "ana@email.com",
  "password": "minhasenha123",
  "avatarUrl": "https://..." // opcional
}
```

**Resposta 201:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "tokenType": "Bearer",
    "expiresIn": 900
  },
  "message": "Conta criada com sucesso",
  "timestamp": "2026-06-01T12:00:00Z"
}
```

---

### Login

```
POST /api/auth/login
```

**Body:**
```json
{
  "email": "ana@email.com",
  "password": "minhasenha123"
}
```

**Resposta 200:** mesma estrutura do registro.

---

### Renovar token

Access token expira em **15 minutos**. Use o refresh token para renovar sem pedir senha novamente.

```
POST /api/auth/refresh?token=<refreshToken>
```

**Resposta 200:** novo par de tokens.

> **Estratégia recomendada:** salve ambos os tokens no `localStorage`. No interceptor HTTP, se receber 401, tente o refresh automaticamente. Se o refresh também falhar, redirecione para o login.

---

### Logout

```
POST /api/auth/logout?token=<refreshToken>
Authorization: Bearer <accessToken>
```

O refresh token é **revogado** no backend — mesmo que vazado, não pode mais ser usado para emitir novos tokens. O frontend também deve descartar ambos os tokens do storage.

> Passe o `refreshToken` como query param `token`. Se omitido, o logout ainda funciona localmente (tokens descartados), mas sem revogação remota.

---

## 2. Usuário

### Perfil do usuário logado

```
GET /api/users/me
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Ana Silva",
    "email": "ana@email.com",
    "avatarUrl": "https://...",
    "lvl": 3,
    "totalXp": 1250,
    "currentStreak": 5,
    "maxStreak": 12
  }
}
```

---

### Atualizar perfil

```
PUT /api/users/me
Authorization: Bearer <token>
```

**Body (todos os campos são opcionais):**
```json
{
  "name": "Ana Lima",
  "avatarUrl": "https://nova-foto.com/avatar.png"
}
```

**Resposta 200:** perfil atualizado.

---

### Stats do usuário

```
GET /api/users/me/stats
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Ana Silva",
    "lvl": 3,
    "totalXp": 1250,
    "currentStreak": 5,
    "maxStreak": 12,
    "lastActivityDate": "2026-06-01"
  }
}
```

---

## 3. Trilhas

### Listar todas as trilhas

```
GET /api/trilhas
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "titulo": "Python para Iniciantes",
      "descricao": "Do zero ao primeiro projeto em Python",
      "iconUrl": null,
      "cor": "#3B82F6",
      "xpTotal": 2000,
      "ativo": true,
      "xpGanho": null,
      "nosConcluidosCount": null,
      "matriculado": false
    }
  ]
}
```

> `xpGanho` e `nosConcluidosCount` são `null` quando o usuário não está matriculado.

---

### Detalhe de uma trilha

```
GET /api/trilhas/{id}
Authorization: Bearer <token>
```

**Resposta 200:** objeto `TrilhaResponse` com progresso do usuário preenchido se matriculado.

---

### Matricular em uma trilha

```
POST /api/trilhas/{id}/matricular
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "success": true,
  "data": { /* trilha com matriculado: true */ },
  "message": "Matriculado com sucesso"
}
```

**Erro 409** — já matriculado.

---

### Trilhas ativas do usuário

```
GET /api/trilhas/ativas
Authorization: Bearer <token>
```

**Resposta 200:** lista de trilhas onde o usuário está matriculado, com `xpGanho` e `nosConcluidosCount` preenchidos.

---

## 4. Nós

Um nó é uma aula/tópico dentro de uma trilha. Cada nó tem um status para o usuário: `BLOQUEADO`, `EM_PROGRESSO` ou `CONCLUIDO`.

### Detalhe de um nó

```
GET /api/nos/{id}
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "titulo": "Listas Encadeadas",
    "conteudo": "Uma lista encadeada é...",
    "trilhaId": 2,
    "ordem": 3,
    "xpRecompensa": 50,
    "prerequisitoIds": [3, 4],
    "status": "BLOQUEADO"
  }
}
```

---

### Iniciar um nó

```
POST /api/nos/{id}/iniciar
Authorization: Bearer <token>
```

Valida pré-requisitos. Se algum não estiver `CONCLUIDO`, retorna **403**:

```json
{
  "success": false,
  "error": "NO_BLOQUEADO",
  "message": "Pré-requisitos não concluídos: Listas Encadeadas"
}
```

**Resposta 200** — nó com `status: "EM_PROGRESSO"`.

---

### Concluir um nó

```
POST /api/nos/{id}/concluir
Authorization: Bearer <token>
```

O nó precisa estar `EM_PROGRESSO`. Ao concluir, XP é concedido via `GamificacaoService`.

**Resposta 200:**
```json
{
  "success": true,
  "data": { /* nó com status: "CONCLUIDO" */ },
  "message": "Nó concluído! XP concedido."
}
```

---

## 5. Missões

Missões são desafios de código vinculados a um nó. O código é executado no sandbox **Judge0**.

### Detalhe de uma missão

```
GET /api/missoes/{id}
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "noId": 5,
    "titulo": "Implementar uma pilha",
    "enunciado": "Crie uma classe Stack com push, pop e peek...",
    "codigoInicial": "class Stack:\n    def __init__(self):\n        ...",
    "linguagem": "python",
    "xpRecompensa": 100
  }
}
```

---

### Submeter código

```
POST /api/missoes/{id}/submeter
Authorization: Bearer <token>
```

**Body:**
```json
{
  "codigo": "class Stack:\n    def __init__(self):\n        self.items = []\n    ...",
  "linguagem": "python"
}
```

**Linguagens aceitas:** `python`, `javascript`, `java`, `c`, `cpp`, `go`

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "missaoId": 1,
    "status": "APROVADO",
    "feedback": "Todos os casos passaram!",
    "primeiraAprovacao": true,
    "submetidaEm": "2026-06-01T14:32:00"
  }
}
```

> `primeiraAprovacao: true` indica que XP bônus foi concedido. Use para mostrar animação/celebração.

**Status possíveis:** `APROVADO`, `REPROVADO`, `ERRO`

---

### Histórico de submissões

```
GET /api/missoes/{id}/submissoes
Authorization: Bearer <token>
```

**Resposta 200:** lista de `SubmissaoResponse` ordenada por `submetidaEm DESC`.

---

## 6. Flashcards

### Listar flashcards

```
GET /api/flashcards
GET /api/flashcards?trilhaId=1
GET /api/flashcards?noId=5
GET /api/flashcards?trilhaId=1&noId=5
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "trilhaId": 2,
      "noId": 5,
      "frente": "O que é uma lista encadeada?",
      "verso": "Uma estrutura de dados onde cada elemento aponta para o próximo..."
    }
  ]
}
```

---

### Criar flashcard

```
POST /api/flashcards
Authorization: Bearer <token>
```

**Body:**
```json
{
  "trilhaId": 2,
  "noId": 5,
  "frente": "Qual a complexidade do acesso em lista encadeada?",
  "verso": "O(n) — é necessário percorrer do início até o elemento desejado"
}
```

**Resposta 200:** flashcard criado.

---

### Deletar flashcard

```
DELETE /api/flashcards/{id}
Authorization: Bearer <token>
```

Só funciona para flashcards criados pelo próprio usuário.

**Resposta 200:**
```json
{ "success": true, "data": null, "message": "Flashcard removido" }
```

---

## 7. Revisão (Leitner)

Sistema de repetição espaçada em 5 caixas. Cards na caixa 1 aparecem todo dia; caixa 5 a cada 14 dias.

### Cards para revisar hoje

```
GET /api/revisao/hoje
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "totalPendentes": 8,
    "porCaixa": {
      "1": [
        {
          "leitnerCardId": 10,
          "flashcardId": 1,
          "frente": "O que é uma lista encadeada?",
          "verso": "Uma estrutura de dados onde cada elemento...",
          "caixa": 1
        }
      ],
      "3": [ /* ... */ ]
    }
  }
}
```

> Mostre os cards um por um. O usuário vê a frente, tenta lembrar, revela o verso e avalia.

---

### Responder um card

```
POST /api/revisao/{leitnerCardId}/responder
Authorization: Bearer <token>
```

**Body:**
```json
{ "resultado": "facil" }
```

**`resultado` aceito:** `facil`, `ok`, `dificil`

| Valor | Efeito |
|---|---|
| `facil` | Avança uma caixa |
| `ok` | Permanece na caixa |
| `dificil` | Volta para a caixa 1 |

**Resposta 200:**
```json
{ "success": true, "data": null, "message": "Resposta registrada" }
```

---

### Distribuição por caixa

```
GET /api/revisao/stats
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "1": 12,
    "2": 5,
    "3": 3,
    "4": 1,
    "5": 0
  }
}
```

> Use para mostrar um gráfico de barras do progresso do usuário no sistema Leitner.

---

## 8. Gamificação

### Conquistas

```
GET /api/gamificacao/conquistas
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "titulo": "Primeiros Passos",
      "descricao": "Ganhe 500 XP no total",
      "iconUrl": null,
      "desbloqueada": true,
      "desbloqueadaEm": "2026-05-28T10:00:00"
    },
    {
      "id": 2,
      "titulo": "Mil XP",
      "descricao": "Alcance 1000 XP",
      "iconUrl": null,
      "desbloqueada": false,
      "desbloqueadaEm": null
    }
  ]
}
```

---

### Ranking semanal

```
GET /api/gamificacao/ranking/semanal
Authorization: Bearer <token>
```

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "top10": [
      {
        "posicao": 1,
        "userName": "Carlos",
        "avatarUrl": null,
        "xpSemana": 850,
        "isCurrentUser": false
      },
      {
        "posicao": 2,
        "userName": "Ana Silva",
        "avatarUrl": null,
        "xpSemana": 620,
        "isCurrentUser": true
      }
    ],
    "posicaoAtual": {
      "posicao": 2,
      "userName": "Ana Silva",
      "avatarUrl": null,
      "xpSemana": 620,
      "isCurrentUser": true
    },
    "cached": false,
    "cachedAt": null
  }
}
```

> `posicaoAtual` é `null` se o usuário não entrou no top 10. Mostre mesmo assim a posição fora da lista.

> **Modo offline:** quando sem conexão, `cached: true` e `cachedAt` contém o timestamp ISO da última atualização. Mostre um aviso discreto tipo "Dados do ranking podem estar desatualizados".

---

## 9. IA

Assistente de estudos stateless. Cada requisição é independente — inclua contexto relevante no body.

```
POST /api/ia/chat
Authorization: Bearer <token>
```

**Body:**
```json
{
  "mensagem": "Não entendi bem o conceito de ponteiros. Pode explicar de outra forma?",
  "contexto": {
    "trilhaId": 2,
    "noId": 7,
    "tituloTrilha": "Algoritmos e Estruturas de Dados",
    "tituloNo": "Ponteiros e Referências"
  }
}
```

**Body mínimo (sem contexto):**
```json
{
  "mensagem": "O que é recursão?"
}
```

**Resposta 200:**
```json
{
  "success": true,
  "data": {
    "resposta": "Claro! Pensa assim: um ponteiro é como um endereço de casa..."
  }
}
```

> O campo `contexto` é opcional mas melhora muito a qualidade das respostas. Passe sempre o título da trilha e do nó atual.

---

## 10. Formato padrão de resposta

Toda resposta da API segue este envelope:

**Sucesso:**
```json
{
  "success": true,
  "data": { },
  "error": null,
  "message": null,
  "timestamp": "2026-06-01T12:00:00Z"
}
```

**Erro:**
```json
{
  "success": false,
  "data": null,
  "error": "CODIGO_DO_ERRO",
  "message": "Descrição legível do erro",
  "timestamp": "2026-06-01T12:00:00Z"
}
```

---

## 11. Erros comuns

| HTTP | `error` | Causa | O que fazer no front |
|---|---|---|---|
| 400 | `ERRO` | Body inválido ou campo faltando | Mostrar mensagem de validação |
| 401 | `ERRO` | Token ausente, expirado, inválido ou revogado | Tentar refresh; se falhar, redirecionar para login |
| 403 | `NO_BLOQUEADO` | Nó com pré-requisitos não concluídos | Mostrar quais pré-requisitos faltam |
| 404 | `NAO_ENCONTRADO` | Recurso não existe | Mostrar tela de erro ou redirecionar |
| 409 | `ERRO` | Conflito explícito: email já cadastrado, já matriculado na trilha, e-mail já verificado | Mostrar mensagem específica |
| 409 | `DUPLICATE_ENTRY` | Registro duplicado detectado pelo banco (race condition em inserção de flashcard no Leitner) | Ignorar silenciosamente ou avisar "Card já adicionado" |
| 429 | `RATE_LIMIT` | Muitas requisições para Judge0 (10/min) ou Groq (20/min) | Ler header `Retry-After` (segundos) e aguardar antes de retentar. Mostrar mensagem ao usuário |
| 503 | `ERRO` | Operação requer internet (registro, login com senha) | Mostrar "Sem conexão. Conecte-se à internet para continuar." |
| 500 | `ERRO_INTERNO` | Erro inesperado no servidor | Mostrar erro genérico, reportar |

### Comportamento offline

| Endpoint | Offline? | Comportamento |
|----------|----------|---------------|
| `POST /auth/register` | ❌ | 503 — registro exige internet |
| `POST /auth/login` | ❌ | 503 — login com senha exige internet na primeira vez |
| `POST /auth/refresh` | ✅ | Valida JWT localmente + carrega perfil do cache SQLite |
| `POST /auth/logout` | ✅ | Descarta tokens localmente; revogação remota é best-effort |
| `GET /gamificacao/ranking/semanal` | ✅ | Retorna cache local com `cached: true` |
| Demais endpoints | ✅/❌ | Depende do perfil: desktop = SQLite local (sempre OK); neon = PostgreSQL (falha se sem rede) |

---

## 12. Fluxo de telas sugerido

```
App abre
  └── Token no storage?
        ├── Não → Tela de Login / Registro
        └── Sim → GET /api/users/me (valida token)
                    ├── 200 → Home
                    └── 401 → POST /api/auth/refresh
                                ├── 200 → Home
                                └── 401 → Tela de Login

Home
  ├── GET /api/trilhas/ativas          (trilhas em andamento)
  ├── GET /api/users/me/stats          (XP, streak, nível)
  └── GET /api/revisao/hoje            (badge: N cards para revisar)

Mapa de trilha (ao entrar em uma trilha)
  └── GET /api/trilhas/{id}            (lista de nós com status)

Tela de nó
  ├── GET /api/nos/{id}                (conteúdo + status)
  ├── POST /api/nos/{id}/iniciar       (ao começar)
  ├── GET /api/flashcards?noId={id}    (flashcards do nó)
  └── POST /api/nos/{id}/concluir      (ao terminar o conteúdo)

Tela de missão
  ├── GET /api/missoes/{id}            (enunciado + código inicial)
  ├── POST /api/missoes/{id}/submeter  (rodar código)
  └── GET /api/missoes/{id}/submissoes (histórico)

Tela de revisão
  ├── GET /api/revisao/hoje            (fila do dia)
  └── POST /api/revisao/{id}/responder (para cada card)

Perfil / Conquistas
  ├── GET /api/users/me
  ├── GET /api/gamificacao/conquistas
  └── GET /api/gamificacao/ranking/semanal

Chat com IA (botão flutuante em qualquer tela de conteúdo)
  └── POST /api/ia/chat                (passando contexto da tela atual)
```

---

## Configuração do cliente HTTP (exemplo com axios)

```typescript
// api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
})

// Injeta o token em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Renova o token automaticamente em caso de 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const { data } = await axios.post(
          `http://localhost:8080/api/auth/refresh?token=${refreshToken}`
        )
        const newToken = data.data.accessToken
        localStorage.setItem('accessToken', newToken)
        localStorage.setItem('refreshToken', data.data.refreshToken)
        error.config.headers.Authorization = `Bearer ${newToken}`
        return api(error.config)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
```

---

## Tipos TypeScript

```typescript
// types.ts

export interface ApiResponse<T> {
  success: boolean
  data: T
  error: string | null
  message: string | null
  timestamp: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  lvl: number
  totalXp: number
  currentStreak: number
  maxStreak: number
}

export interface Trilha {
  id: number
  titulo: string
  descricao: string
  iconUrl: string | null
  cor: string
  xpTotal: number
  ativo: boolean
  xpGanho: number | null
  nosConcluidosCount: number | null
  matriculado: boolean
}

export interface No {
  id: number
  titulo: string
  conteudo: string
  trilhaId: number
  ordem: number
  xpRecompensa: number
  prerequisitoIds: number[]
  status: 'BLOQUEADO' | 'EM_PROGRESSO' | 'CONCLUIDO'
}

export interface Missao {
  id: number
  noId: number
  titulo: string
  enunciado: string
  codigoInicial: string
  linguagem: string
  xpRecompensa: number
}

export interface Submissao {
  id: number
  missaoId: number
  status: 'APROVADO' | 'REPROVADO' | 'ERRO'
  feedback: string
  primeiraAprovacao: boolean
  submetidaEm: string
}

export interface Flashcard {
  id: number
  trilhaId: number | null
  noId: number | null
  frente: string
  verso: string
}

export interface LeitnerCardRevisao {
  leitnerCardId: number
  flashcardId: number
  frente: string
  verso: string
  caixa: number
}

export interface RevisaoHoje {
  totalPendentes: number
  porCaixa: Record<number, LeitnerCardRevisao[]>
}

export interface Conquista {
  id: number
  titulo: string
  descricao: string
  iconUrl: string | null
  desbloqueada: boolean
  desbloqueadaEm: string | null
}

export interface RankingItem {
  posicao: number
  userName: string
  avatarUrl: string | null
  xpSemana: number
  isCurrentUser: boolean
}

export interface RankingResponse {
  top10: RankingItem[]
  posicaoAtual: RankingItem | null
}
```
