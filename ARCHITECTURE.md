# StudyQuest — Arquitetura de Software

## Visão Geral

StudyQuest é um aplicativo desktop de estudos gamificado. O sistema utiliza um backend local construído em Java com **Quarkus e GraalVM**, empacotado como um executável nativo. Este executável é gerenciado de forma invisível pelo **Electron**, servindo uma API REST para o frontend em React. O backend local atua como ponte inteligente, comunicando-se simultaneamente com um banco SQLite local (para operação offline e alta velocidade) e um banco PostgreSQL remoto (nuvem).

---

## Stack Tecnológica

| Camada            | Tecnologia                                                       |
| ----------------- | ---------------------------------------------------------------- |
| Desktop shell     | Electron (orquestrador do frontend e do processo backend nativo) |
| Frontend          | React + Vite + Tailwind CSS                                      |
| Backend Local     | Java 21 + Quarkus + GraalVM (Executável Nativo)                  |
| Banco remoto      | PostgreSQL (Neon — plano gratuito)                               |
| Banco local       | SQLite (na máquina do usuário)                                   |
| Sandbox de código | Judge0 (API externa chamada pelo backend local)                  |
| Assistente IA     | Groq API (LLaMA) via LangChain4j / REST Client do Quarkus        |

---

## Arquitetura de Execução (Modelo Embutido)

O aplicativo não depende de um servidor remoto para as funções principais do dia a dia, eliminando latência na navegação e permitindo uso offline das revisões e acesso imediato aos módulos baixados.

1. O usuário inicia o aplicativo (`StudyQuest.exe`).
2. O processo principal do Electron inicia e usa a biblioteca `child_process` para levantar silenciosamente o binário nativo do Quarkus em background.
3. O Quarkus inicializa em poucos milissegundos na porta local (ex: `localhost:8080`) com baixo consumo de memória RAM.
4. O frontend em React se comunica via HTTP com o Quarkus local da mesma forma que faria com uma API em nuvem.
5. O Quarkus gerencia e orquestra as conexões com o SQLite (dados locais) e PostgreSQL (sincronização com o ambiente online).

---

## Estrutura de Pacotes — Quarkus

A organização segue os princípios de separação por domínio. A principal alteração em relação ao Spring Boot é o uso de componentes do ecossistema Quarkus (ex: JAX-RS para os endpoints, Hibernate ORM com Panache para persistência). A regra de manter entidades isoladas e expor apenas DTOs nos Controllers/Resources se mantém estrita.

```text
com.studyquest
│
├── auth/
│   ├── AuthResource.java             (Endpoint JAX-RS)
│   ├── AuthService.java
│   ├── AuthRepository.java           (PanacheRepository)
│   └── dto/
│
├── usuarios/
│   ├── UsuarioResource.java
│   ├── UsuarioService.java
│   ├── UsuarioRepository.java
│   ├── Usuario.java                  (Entidade Panache)
│   └── dto/
│
├── trilhas/
├── nos/
├── missoes/
├── flashcards/
├── revisao/
├── gamificacao/
├── ia/
└── shared/
    ├── config/
    ├── exception/
    └── sync/                         (Gerenciador de filas e cron jobs de sincronização)
```

---

## Gerenciamento de Dados: SQLite (Local) vs PostgreSQL (Remoto)

O aplicativo gerencia múltiplos datasources para equilibrar eficiência offline com persistência global online.

### Banco Local — SQLite

- **Localização:** Disco rígido do usuário (embutido pelo instalador).
- **Propósito:** Resposta instantânea da interface, funcionamento do sistema Leitner em modo offline e eliminação de custos recorrentes de leitura/escrita na nuvem.
- **Dados:** `leitner_cards`, `user_nos` (status atual no mapa), `user_trilhas` e fila local de sincronização.

### Banco Remoto — PostgreSQL (Neon)

- **Localização:** Nuvem.
- **Propósito:** Backup de identidade, catálogo unificado, validação de segurança e leaderboards (ranking).
- **Dados:** `users`, `trilhas`, `nos`, `missoes`, `conquistas`, `ranking_semanal`.

### Estratégia de Sincronização

O pacote `shared/sync/` possui uma estrutura de Job programado no Quarkus. Ele consome eventos da fila salva no SQLite (por exemplo: `FLASHCARD_REVIEWED`, `NODE_COMPLETED`). Periodicamente, ou através de disparos ativos pelo frontend, o Quarkus verifica a disponibilidade de conexão via internet. Havendo conexão, processa esses eventos em lote (batch) atualizando o PostgreSQL remoto de forma segura, reconciliando XP e conquistas.

---

## Decisões Técnicas Consolidadas

| Decisão                         | Justificativa                                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend Local Embutido          | Permite acesso direto e de baixíssima latência ao banco de dados SQLite do usuário, orquestrando as duas conexões de banco em um único lugar sem sobrecarregar o Node.js/Electron do frontend.                           |
| Migração para Quarkus + GraalVM | Garante que o backend seja executado como um arquivo binário nativo silencioso sem exigir instalação da máquina virtual Java (JVM) no computador do usuário. Proporciona inicialização imediata e consumo ínfimo de RAM. |
| Isolamento de Arquitetura       | Manter a separação estrita de Entidades (Repository) e DTOs (Controller/Resource) facilita a transição de Spring Boot para Quarkus, pois a lógica core de negócios permanece isolada da infraestrutura do framework.     |
