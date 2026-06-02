-- Conquistas iniciais (trilhas são carregadas de api/src/main/resources/trilhas/*.json)
INSERT INTO conquistas (titulo, descricao, icon_url, criterio)
VALUES
  ('Primeiros Passos', 'Ganhe 500 XP no total', null, 'xp_total >= 500'),
  ('Mil XP', 'Alcance 1000 XP', null, 'xp_total >= 1000'),
  ('Semana Streak', 'Mantenha 7 dias seguidos de atividade', null, 'streak >= 7'),
  ('Mês Streak', 'Mantenha 30 dias seguidos de atividade', null, 'streak >= 30')
ON CONFLICT DO NOTHING;
