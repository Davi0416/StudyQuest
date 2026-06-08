-- ==============================================================================
-- Script de Configuração de Segurança RLS (Row-Level Security) no Neon
-- Rode este script no "SQL Editor" do painel da sua conta Neon (console.neon.tech)
-- ==============================================================================

-- 1. Cria o usuário com o qual o Desktop vai logar (Substitua a senha por uma forte!)
-- Atenção: Se o role já existir, esta linha pode dar erro. Pode ignorar ou rodar um DROP ROLE antes se quiser recriar.
CREATE ROLE desktop_client WITH LOGIN PASSWORD 'senha_restrita_123';

-- 2. Dá permissão de uso do schema padrão
GRANT USAGE ON SCHEMA public TO desktop_client;

-- 3. Concede acesso à tabela de ranking. 
-- Note que NÃO concedemos DELETE, apenas SELECT, INSERT e UPDATE.
GRANT SELECT, INSERT, UPDATE ON ranking_semanal TO desktop_client;

-- 4. Habilita o sistema de RLS na tabela
ALTER TABLE ranking_semanal ENABLE ROW LEVEL SECURITY;

-- 5. Política 1: Todos (incluindo o desktop) podem LER a tabela inteira para montar o ranking
CREATE POLICY select_all_ranking ON ranking_semanal
    FOR SELECT TO desktop_client
    USING (true);

-- 6. Política 2: Inserir ou atualizar SOMENTE se o ID da linha for igual ao ID passado na conexão
-- A função current_setting pega a variável enviada pelo Java (NeonRankingService)
CREATE POLICY mod_own_ranking ON ranking_semanal
    FOR ALL TO desktop_client
    USING (userid::text = current_setting('studyquest.current_user_id', true))
    WITH CHECK (userid::text = current_setting('studyquest.current_user_id', true));

-- ==============================================================================
-- INSTRUÇÕES DE DEPLOY
-- ==============================================================================
-- 1. Rode o código acima no Neon.
-- 2. Vá no arquivo `application.properties` do StudyQuest e coloque a senha e a URL.
-- 
-- Exemplo do que você deve colocar no application.properties:
-- %desktop.studyquest.neon.ranking.url=jdbc:postgresql://<SEU_ENDPOINT_NEON>.neon.tech/studyquest?sslmode=require
-- %desktop.studyquest.neon.ranking.user=desktop_client
-- %desktop.studyquest.neon.ranking.password=senha_restrita_123
-- ==============================================================================
