-- Trilhas iniciais
INSERT INTO trilhas (titulo, descricao, icon_url, cor, xp_total, ativo, criada_em)
VALUES
  ('Python para Iniciantes', 'Do zero ao primeiro projeto em Python', null, '#3B82F6', 2000, true, now()),
  ('Algoritmos e Estruturas de Dados', 'Fundamentos essenciais para qualquer dev', null, '#8B5CF6', 3000, true, now()),
  ('JavaScript Moderno', 'ES6+, async/await, APIs e muito mais', null, '#F59E0B', 2500, true, now())
ON CONFLICT DO NOTHING;

-- Conquistas
INSERT INTO conquistas (titulo, descricao, icon_url, criterio)
VALUES
  ('Primeiros Passos', 'Ganhe 500 XP no total', null, 'xp_total >= 500'),
  ('Mil XP', 'Alcance 1000 XP', null, 'xp_total >= 1000'),
  ('Semana Streak', 'Mantenha 7 dias seguidos de atividade', null, 'streak >= 7'),
  ('Mês Streak', 'Mantenha 30 dias seguidos de atividade', null, 'streak >= 30')
ON CONFLICT DO NOTHING;
