-- ==============================================================================
-- Script de Configuração Inicial do Neon (Tabela de Ranking + Segurança RLS)
-- Rode este script no "SQL Editor" do painel da sua conta Neon (console.neon.tech)
-- ==============================================================================

-- 1. Cria a tabela de ranking global (o banco estava vazio!)
CREATE TABLE IF NOT EXISTS ranking_semanal (
    id SERIAL PRIMARY KEY,
    userid UUID NOT NULL,
    username VARCHAR(255),
    useravatarurl TEXT,
    xpsemana INTEGER DEFAULT 0,
    xptotal INTEGER DEFAULT 0,
    semana DATE NOT NULL,
    CONSTRAINT uc_ranking_user_semana UNIQUE (userid, semana)
);

-- 2. Cria o usuário com o qual o Desktop vai logar
-- (Se já existir, pode ignorar o erro ou remover essa linha)
CREATE ROLE desktop_client WITH LOGIN PASSWORD 'senha_restrita_123';

-- 3. Dá permissão de uso do schema padrão
GRANT USAGE ON SCHEMA public TO desktop_client;

-- 4. Concede acesso total apenas à tabela do ranking e sua sequência de ID
GRANT SELECT, INSERT, UPDATE ON ranking_semanal TO desktop_client;
GRANT USAGE, SELECT ON SEQUENCE ranking_semanal_id_seq TO desktop_client;

-- 5. Habilita o sistema de RLS na tabela
ALTER TABLE ranking_semanal ENABLE ROW LEVEL SECURITY;

-- 6. Política 1: Todos (incluindo o desktop) podem LER a tabela inteira para ver o ranking global
CREATE POLICY select_all_ranking ON ranking_semanal
    FOR SELECT TO desktop_client
    USING (true);

-- 7. Política 2: Inserir ou atualizar SOMENTE se o ID da linha for igual ao ID passado na conexão do jogador local
CREATE POLICY mod_own_ranking ON ranking_semanal
    FOR ALL TO desktop_client
    USING (userid::text = current_setting('studyquest.current_user_id', true))
    WITH CHECK (userid::text = current_setting('studyquest.current_user_id', true));
