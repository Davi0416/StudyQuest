-- ============================================================
-- FEATURE 1: Campos de idempotência na sync_queue (SQLite local)
-- Executar se Hibernate update não adicionar as colunas automaticamente.
-- ============================================================

ALTER TABLE sync_queue ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
ALTER TABLE sync_queue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE sync_queue ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE sync_queue ADD COLUMN IF NOT EXISTS last_attempt_at TEXT;

-- Backfill: migra registros antigos
UPDATE sync_queue SET status = 'DONE'    WHERE status IS NULL AND processed = 1;
UPDATE sync_queue SET status = 'PENDING' WHERE status IS NULL AND processed = 0;
UPDATE sync_queue SET status = 'PENDING' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_sync_user_status ON sync_queue (user_id, status);

-- ============================================================
-- FEATURE 2: Sessão cacheada para autenticação offline
-- ============================================================

CREATE TABLE IF NOT EXISTS cached_session (
    user_id           TEXT PRIMARY KEY,
    email             TEXT NOT NULL,
    name              TEXT,
    avatar_url        TEXT,
    last_refresh_token TEXT,
    cached_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- FEATURE 3: Cache de ranking semanal
-- ============================================================

CREATE TABLE IF NOT EXISTS ranking_cache (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    semana    TEXT    NOT NULL UNIQUE,  -- "YYYY-MM-DD" (segunda-feira da semana)
    data_json TEXT    NOT NULL,
    cached_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
