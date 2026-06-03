-- Conquistas iniciais (trilhas são carregadas de api/src/main/resources/trilhas/*.json)
INSERT INTO conquistas (titulo, descricao, icon_url, criterio)
SELECT 'Primeiros Passos', 'Ganhe 500 XP no total', null, 'xp_total >= 500'
WHERE NOT EXISTS (SELECT 1 FROM conquistas WHERE titulo = 'Primeiros Passos');

INSERT INTO conquistas (titulo, descricao, icon_url, criterio)
SELECT 'Mil XP', 'Alcance 1000 XP', null, 'xp_total >= 1000'
WHERE NOT EXISTS (SELECT 1 FROM conquistas WHERE titulo = 'Mil XP');

INSERT INTO conquistas (titulo, descricao, icon_url, criterio)
SELECT 'Semana Streak', 'Mantenha 7 dias seguidos de atividade', null, 'streak >= 7'
WHERE NOT EXISTS (SELECT 1 FROM conquistas WHERE titulo = 'Semana Streak');

INSERT INTO conquistas (titulo, descricao, icon_url, criterio)
SELECT 'Mês Streak', 'Mantenha 30 dias seguidos de atividade', null, 'streak >= 30'
WHERE NOT EXISTS (SELECT 1 FROM conquistas WHERE titulo = 'Mês Streak');
