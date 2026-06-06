-- ============================================================
-- FEATURE 1: Idempotência de Sync
-- Tabela no Neon (PostgreSQL) para rastrear eventos já processados.
-- O SyncJob local envia eventos com idempotency_key; se a chave
-- já existir, o INSERT é ignorado silenciosamente (ON CONFLICT DO NOTHING).
-- ============================================================

CREATE TABLE IF NOT EXISTS processed_sync_events (
    idempotency_key UUID PRIMARY KEY,
    event_type      VARCHAR(50)  NOT NULL,
    user_id         UUID         NOT NULL,
    payload         TEXT,
    processed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pse_user_id ON processed_sync_events (user_id);
CREATE INDEX IF NOT EXISTS idx_pse_processed_at ON processed_sync_events (processed_at);

-- ============================================================
-- FEATURE 4: Revogação de JWT
-- ============================================================

CREATE TABLE IF NOT EXISTS revoked_tokens (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    jti         VARCHAR(255) NOT NULL UNIQUE,
    user_id     UUID,
    revoked_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revoked_jti        ON revoked_tokens (jti);
CREATE INDEX IF NOT EXISTS idx_revoked_expires_at ON revoked_tokens (expires_at);

-- Cleanup automático via Quarkus job (RevokedTokenCleanupJob @ 3h00 diário).
-- Mas também pode ser configurado como regra nativa no Neon:
-- DELETE FROM revoked_tokens WHERE expires_at < NOW();
