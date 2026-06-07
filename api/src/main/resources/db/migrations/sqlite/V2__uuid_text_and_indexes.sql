-- ============================================================
-- Migração: UUID BLOB → TEXT canônico + índices em userId
--
-- O driver Xerial (SQLite JDBC) armazenava UUID como BINARY(16).
-- A partir desta migração, userId é armazenado como TEXT no
-- formato canônico "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx".
--
-- Estratégia por tabela: rename → recria com TEXT → copia → drop.
-- ============================================================

PRAGMA foreign_keys = OFF;

-- ── leitner_cards ────────────────────────────────────────────

ALTER TABLE leitner_cards RENAME TO leitner_cards_old;

CREATE TABLE leitner_cards (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    userId         TEXT    NOT NULL,
    flashcardId    INTEGER NOT NULL,
    caixa          INTEGER NOT NULL DEFAULT 1,
    proximaRevisao TEXT,
    ultimaRevisao  TEXT,
    CONSTRAINT uc_leitner_user_flashcard UNIQUE (userId, flashcardId)
);

INSERT INTO leitner_cards (id, userId, flashcardId, caixa, proximaRevisao, ultimaRevisao)
SELECT
    id,
    CASE
        -- Se já é TEXT canônico (contém '-'), mantém como está
        WHEN typeof(userId) = 'text' THEN userId
        -- Senão, converte BLOB hex → "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        ELSE lower(
            substr(hex(userId),  1, 8) || '-' ||
            substr(hex(userId),  9, 4) || '-' ||
            substr(hex(userId), 13, 4) || '-' ||
            substr(hex(userId), 17, 4) || '-' ||
            substr(hex(userId), 21, 12)
        )
    END,
    flashcardId,
    caixa,
    proximaRevisao,
    ultimaRevisao
FROM leitner_cards_old;

DROP TABLE leitner_cards_old;

CREATE INDEX IF NOT EXISTS idx_leitner_userId
    ON leitner_cards (userId);

CREATE INDEX IF NOT EXISTS idx_leitner_userId_proxima
    ON leitner_cards (userId, proximaRevisao);

-- ── user_aula_progress ───────────────────────────────────────

ALTER TABLE user_aula_progress RENAME TO user_aula_progress_old;

CREATE TABLE user_aula_progress (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      TEXT    NOT NULL,
    noId        INTEGER NOT NULL,
    passoAtual  INTEGER NOT NULL DEFAULT 0,
    atualizadoEm TEXT,
    CONSTRAINT uc_aula_progress_user_no UNIQUE (userId, noId)
);

INSERT INTO user_aula_progress (id, userId, noId, passoAtual, atualizadoEm)
SELECT
    id,
    CASE
        WHEN typeof(userId) = 'text' THEN userId
        ELSE lower(
            substr(hex(userId),  1, 8) || '-' ||
            substr(hex(userId),  9, 4) || '-' ||
            substr(hex(userId), 13, 4) || '-' ||
            substr(hex(userId), 17, 4) || '-' ||
            substr(hex(userId), 21, 12)
        )
    END,
    noId,
    passoAtual,
    atualizadoEm
FROM user_aula_progress_old;

DROP TABLE user_aula_progress_old;

CREATE INDEX IF NOT EXISTS idx_aula_progress_userId
    ON user_aula_progress (userId);

-- ── user_exercicio_progress ──────────────────────────────────

ALTER TABLE user_exercicio_progress RENAME TO user_exercicio_progress_old;

CREATE TABLE user_exercicio_progress (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    userId       TEXT    NOT NULL,
    noId         INTEGER NOT NULL,
    exercicioId  TEXT,
    codigo       TEXT,
    aprovado     INTEGER NOT NULL DEFAULT 0,
    atualizadoEm TEXT,
    CONSTRAINT uc_exercicio_progress_user_no_ex UNIQUE (userId, noId, exercicioId)
);

INSERT INTO user_exercicio_progress (id, userId, noId, exercicioId, codigo, aprovado, atualizadoEm)
SELECT
    id,
    CASE
        WHEN typeof(userId) = 'text' THEN userId
        ELSE lower(
            substr(hex(userId),  1, 8) || '-' ||
            substr(hex(userId),  9, 4) || '-' ||
            substr(hex(userId), 13, 4) || '-' ||
            substr(hex(userId), 17, 4) || '-' ||
            substr(hex(userId), 21, 12)
        )
    END,
    noId,
    exercicioId,
    codigo,
    aprovado,
    atualizadoEm
FROM user_exercicio_progress_old;

DROP TABLE user_exercicio_progress_old;

CREATE INDEX IF NOT EXISTS idx_exercicio_progress_userId
    ON user_exercicio_progress (userId);

-- ── user_nos ─────────────────────────────────────────────────

ALTER TABLE user_nos RENAME TO user_nos_old;

CREATE TABLE user_nos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    userId       TEXT    NOT NULL,
    noId         INTEGER NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'BLOQUEADO',
    iniciadoEm   TEXT,
    concluidoEm  TEXT,
    CONSTRAINT uc_user_nos_user_no UNIQUE (userId, noId)
);

INSERT INTO user_nos (id, userId, noId, status, iniciadoEm, concluidoEm)
SELECT
    id,
    CASE
        WHEN typeof(userId) = 'text' THEN userId
        ELSE lower(
            substr(hex(userId),  1, 8) || '-' ||
            substr(hex(userId),  9, 4) || '-' ||
            substr(hex(userId), 13, 4) || '-' ||
            substr(hex(userId), 17, 4) || '-' ||
            substr(hex(userId), 21, 12)
        )
    END,
    noId,
    status,
    iniciadoEm,
    concluidoEm
FROM user_nos_old;

DROP TABLE user_nos_old;

CREATE INDEX IF NOT EXISTS idx_user_nos_userId
    ON user_nos (userId);

-- ── user_trilhas ─────────────────────────────────────────────

ALTER TABLE user_trilhas RENAME TO user_trilhas_old;

CREATE TABLE user_trilhas (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    userId             TEXT    NOT NULL,
    trilhaId           INTEGER NOT NULL,
    xpGanho            INTEGER NOT NULL DEFAULT 0,
    nosConcluidosCount INTEGER NOT NULL DEFAULT 0,
    matriculadaEm      TEXT,
    concluidaEm        TEXT,
    CONSTRAINT uc_user_trilhas_user_trilha UNIQUE (userId, trilhaId)
);

INSERT INTO user_trilhas (id, userId, trilhaId, xpGanho, nosConcluidosCount, matriculadaEm, concluidaEm)
SELECT
    id,
    CASE
        WHEN typeof(userId) = 'text' THEN userId
        ELSE lower(
            substr(hex(userId),  1, 8) || '-' ||
            substr(hex(userId),  9, 4) || '-' ||
            substr(hex(userId), 13, 4) || '-' ||
            substr(hex(userId), 17, 4) || '-' ||
            substr(hex(userId), 21, 12)
        )
    END,
    trilhaId,
    xpGanho,
    nosConcluidosCount,
    matriculadaEm,
    concluidaEm
FROM user_trilhas_old;

DROP TABLE user_trilhas_old;

CREATE INDEX IF NOT EXISTS idx_user_trilhas_userId
    ON user_trilhas (userId);

PRAGMA foreign_keys = ON;
