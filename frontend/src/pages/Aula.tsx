import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Topbar } from '../components/Topbar';
import { AulaExercicio } from '../components/AulaExercicio';
import api, { unwrap } from '../lib/api';
import type { AulaBloco, AulaProgresso, Flashcard, No } from '../types';
import { AulaRichText } from '../components/AulaRichText';
import { Button } from '../components/ui/Button';
import { IconBolt, IconCheck, IconBook, IconCards, IconChevronLeft, IconChevronRight, IconPlayerPlay } from '@tabler/icons-react';

function TextoBloco({ conteudo }: { conteudo: string }) {
  return <AulaRichText conteudo={conteudo} />;
}

function youtubeAssistirUrl(url: string, linkAssistir?: string): string {
  if (linkAssistir) return linkAssistir;
  const idMatch = url.match(/embed\/([A-Za-z0-9_-]{11})/);
  if (idMatch) return `https://www.youtube.com/watch?v=${idMatch[1]}`;
  const listMatch = url.match(/list=([^&]+)/);
  if (listMatch) return `https://www.youtube.com/playlist?list=${listMatch[1]}`;
  return url;
}

function VideoBloco({ titulo, url, linkAssistir }: { titulo: string; url: string; linkAssistir?: string }) {
  const assistirUrl = youtubeAssistirUrl(url, linkAssistir);

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-surface flex flex-col">
      <div className="px-4 py-3 border-b border-border bg-surface-2 flex items-center gap-2 shrink-0">
        <IconPlayerPlay size={16} className="text-gold shrink-0" />
        <span className="text-sm font-semibold font-cinzel tracking-wide">{titulo}</span>
      </div>
      <div className="aspect-video bg-black">
        <iframe
          src={url}
          title={titulo}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="px-4 py-3 border-t border-border bg-surface-2 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-xs text-text-mute flex-1">
          Vídeo extra do Curso em Vídeo (Gustavo Guanabara). Se não carregar aqui, abra direto no YouTube.
        </p>
        <a
          href={assistirUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-red-600/90 hover:bg-red-600 text-white shrink-0 transition-colors"
        >
          Assistir no YouTube ↗
        </a>
      </div>
    </div>
  );
}

function FlashcardsBloco({ cards }: { cards: Flashcard[] }) {
  const [virados, setVirados] = useState<Set<number>>(new Set());

  if (cards.length === 0) {
    return (
      <div className="p-6 rounded-lg border border-border bg-surface text-center text-text-mute text-sm">
        Nenhum flashcard neste capítulo.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface-2 flex items-center gap-2">
        <IconCards size={18} className="text-gold" />
        <span className="text-sm font-semibold">Grimório — Flashcards</span>
        <span className="text-xs text-text-mute ml-auto">Clique para virar</span>
      </div>
      <div className="p-4 grid gap-3 sm:grid-cols-2">
        {cards.map(card => {
          const virado = virados.has(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setVirados(prev => {
                const next = new Set(prev);
                if (next.has(card.id)) next.delete(card.id);
                else next.add(card.id);
                return next;
              })}
              className="text-left p-4 rounded-md border border-border bg-surface-2 hover:border-gold/40 transition-colors min-h-[100px]"
            >
              <div className="text-[10px] uppercase tracking-widest text-gold mb-2">
                {virado ? 'Resposta' : 'Pergunta'}
              </div>
              <p className="text-sm text-text-dim whitespace-pre-wrap">
                {virado ? card.verso : card.frente}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function tituloPasso(bloco: AulaBloco): string {
  switch (bloco.tipo) {
    case 'texto': {
      const first = bloco.conteudo.split('\n').map(l => l.trim()).find(Boolean);
      if (first?.startsWith('## ')) return first.slice(3).slice(0, 42);
      if (first?.startsWith('▶')) return first.slice(1).trim().slice(0, 42);
      if (first?.startsWith('Prática:')) return 'Campo de treinamento';
      return 'Leitura';
    }
    case 'video': return bloco.titulo;
    case 'exercicio': return bloco.titulo || (bloco.boss ? 'Boss final' : bloco.miniboss ? 'Miniboss' : `Exercício · nível ${bloco.nivel}`);
    case 'flashcards': return 'Flashcards';
    default: return 'Conteúdo';
  }
}

export function Aula() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addXp } = useUser();

  const [no, setNo] = useState<No | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [concluding, setConcluding] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [exerciciosOk, setExerciciosOk] = useState<Set<string>>(new Set());
  const [codigosSalvos, setCodigosSalvos] = useState<Record<string, string>>({});
  const [passo, setPasso] = useState(0);
  const [progressoCarregado, setProgressoCarregado] = useState(false);
  const noIdRef = useRef<number | null>(null);

  const exercicios = useMemo(
    () => (no?.aulaBlocos || []).filter((b): b is Extract<AulaBloco, { tipo: 'exercicio' }> => b.tipo === 'exercicio'),
    [no]
  );

  const todosExerciciosOk = exercicios.length === 0 || exercicios.every(e => exerciciosOk.has(e.id));

  const salvarProgresso = useCallback(async (payload: {
    passo?: number;
    exercicioId?: string;
    codigo?: string;
    aprovado?: boolean;
  }) => {
    if (!noIdRef.current) return;
    try {
      await api.put(`/nos/${noIdRef.current}/aula/progresso`, payload);
    } catch (err) {
      console.warn('Falha ao salvar progresso da aula', err);
    }
  }, []);

  const irParaPasso = useCallback((novoPasso: number) => {
    setPasso(novoPasso);
    salvarProgresso({ passo: novoPasso });
  }, [salvarProgresso]);

  const handleCodigoChange = useCallback((exercicioId: string, codigo: string) => {
    setCodigosSalvos(prev => ({ ...prev, [exercicioId]: codigo }));
    salvarProgresso({ exercicioId, codigo });
  }, [salvarProgresso]);

  const handleExercicioAprovado = useCallback((exercicioId: string, codigo: string) => {
    setExerciciosOk(prev => new Set(prev).add(exercicioId));
    setCodigosSalvos(prev => ({ ...prev, [exercicioId]: codigo }));
    salvarProgresso({ exercicioId, codigo, aprovado: true });
  }, [salvarProgresso]);

  useEffect(() => {
    const fetchNo = async () => {
      try {
        setProgressoCarregado(false);
        const res = await api.get(`/nos/${id}`);
        const data = unwrap(res) as No;
        setNo(data);
        setConcluido(data.status === 'CONCLUIDO');
        noIdRef.current = data.id;

        if (data.status === 'DISPONIVEL' && !data.temMissao) {
          const iniciarRes = await api.post(`/nos/${id}/iniciar`);
          setNo(unwrap(iniciarRes) as No);
        }

        const fcRes = await api.get(`/flashcards?noId=${id}`);
        setFlashcards(unwrap(fcRes) as Flashcard[]);

        const progRes = await api.get(`/nos/${id}/aula/progresso`);
        const prog = unwrap(progRes) as AulaProgresso;

        const codigos: Record<string, string> = {};
        const aprovados = new Set<string>();
        for (const ex of prog.exercicios) {
          if (ex.codigo) codigos[ex.id] = ex.codigo;
          if (ex.aprovado) aprovados.add(ex.id);
        }
        setCodigosSalvos(codigos);
        if (data.status === 'CONCLUIDO') {
          setExerciciosOk(new Set(exerciciosFrom(data).map(e => e.id)));
        } else {
          setExerciciosOk(aprovados);
        }

        const total = data.aulaBlocos.length > 0 ? data.aulaBlocos.length : 1;
        const passoSalvo = Math.min(Math.max(0, prog.passo), total - 1);
        setPasso(passoSalvo);
        setProgressoCarregado(true);
      } catch (err) {
        console.error('Failed to fetch aula', err);
        navigate('/mapa');
      }
    };
    if (id) fetchNo();
  }, [id, navigate]);

  function exerciciosFrom(data: No) {
    return data.aulaBlocos.filter((b): b is Extract<AulaBloco, { tipo: 'exercicio' }> => b.tipo === 'exercicio');
  }

  useEffect(() => {
    if (concluido && exercicios.length > 0) {
      setExerciciosOk(new Set(exercicios.map(e => e.id)));
    }
  }, [concluido, exercicios]);

  const handleConcluir = async () => {
    if (!no || concluding || !todosExerciciosOk) return;
    setConcluding(true);
    try {
      const res = await api.post(`/nos/${no.id}/concluir`);
      const updated = unwrap(res) as No;
      setNo(updated);
      setConcluido(true);
      addXp(no.xpRecompensa);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao concluir aula');
    } finally {
      setConcluding(false);
    }
  };

  if (!no || !progressoCarregado) {
    return <div className="min-h-screen bg-bg text-text grid place-items-center">Carregando aula...</div>;
  }

  const blocos: AulaBloco[] = no.aulaBlocos.length > 0
    ? no.aulaBlocos
    : [{ tipo: 'texto', conteudo: no.conteudo }];

  const totalPassos = blocos.length;
  const blocoAtual = blocos[passo];
  const ultimoPasso = passo === totalPassos - 1;
  const isExercicio = blocoAtual?.tipo === 'exercicio';
  const exercicioAtualOk = isExercicio
    ? exerciciosOk.has(blocoAtual.id) || concluido
    : true;
  const progresso = totalPassos > 0 ? Math.round(((passo + 1) / totalPassos) * 100) : 0;

  const renderBloco = (bloco: AulaBloco) => {
    if (bloco.tipo === 'texto') return <TextoBloco conteudo={bloco.conteudo} />;
    if (bloco.tipo === 'video') {
      return <VideoBloco titulo={bloco.titulo} url={bloco.url} linkAssistir={bloco.linkAssistir} />;
    }
    if (bloco.tipo === 'exercicio') {
      return (
        <AulaExercicio
          key={bloco.id}
          bloco={bloco}
          codigoSalvo={codigosSalvos[bloco.id]}
          aprovado={exerciciosOk.has(bloco.id) || concluido}
          readOnly={concluido}
          onCodigoChange={(codigo) => handleCodigoChange(bloco.id, codigo)}
          onAprovado={(codigo) => handleExercicioAprovado(bloco.id, codigo)}
        />
      );
    }
    if (bloco.tipo === 'flashcards') return <FlashcardsBloco cards={flashcards} />;
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <Topbar />

      <header className="shrink-0 border-b border-border bg-surface px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <Button variant="ghost" className="mb-2 px-2 py-1 text-xs -ml-2" onClick={() => navigate('/mapa')}>
                ← Voltar ao mapa
              </Button>
              <div className="text-[10px] text-gold tracking-widest uppercase font-semibold flex items-center gap-2">
                <IconBook size={14} /> Grimório · Aula {no.ordem}
              </div>
              <h1 className="font-cinzel font-bold text-xl sm:text-2xl mt-1">{no.titulo}</h1>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-text-mute">Passo {passo + 1} de {totalPassos}</div>
              <div className="text-sm font-semibold text-gold mt-0.5">{tituloPasso(blocoAtual)}</div>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 border border-border overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green to-[#56b364] transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto px-6 py-6 h-full">
          {concluido && ultimoPasso ? (
            <div className="flex flex-col items-center justify-center gap-4 p-10 rounded-lg bg-green/10 border border-green/35 min-h-[280px]">
              <IconCheck size={40} className="text-green" />
              <p className="font-semibold text-green text-lg">Aula concluída!</p>
              <p className="text-text-dim text-sm text-center">Próximo nó desbloqueado no mapa.</p>
              <Button onClick={() => navigate('/mapa')}>Voltar ao mapa</Button>
            </div>
          ) : (
            renderBloco(blocoAtual)
          )}

          {isExercicio && !exercicioAtualOk && (
            <p className="text-center text-text-mute text-xs mt-4">
              Valide o exercício com sucesso para avançar ao próximo passo.
            </p>
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-border bg-surface px-6 py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <IconBolt size={20} className="text-gold shrink-0" />
            <div className="min-w-0">
              <div className="font-cinzel font-bold text-gold leading-none">+{no.xpRecompensa} XP</div>
              {exercicios.length > 0 && (
                <div className="text-[11px] text-text-mute mt-1">
                  Exercícios: {exerciciosOk.size}/{exercicios.length}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              className="gap-1"
              disabled={passo === 0}
              onClick={() => irParaPasso(passo - 1)}
            >
              <IconChevronLeft size={18} /> Voltar
            </Button>

            {ultimoPasso && !concluido ? (
              <Button
                className="gap-2"
                onClick={handleConcluir}
                disabled={concluding || !todosExerciciosOk || !exercicioAtualOk}
              >
                <IconCheck size={18} />
                {concluding ? 'Salvando...' : 'Concluir Aula'}
              </Button>
            ) : !ultimoPasso ? (
              <Button
                className="gap-1"
                disabled={!exercicioAtualOk}
                onClick={() => irParaPasso(passo + 1)}
              >
                Próximo <IconChevronRight size={18} />
              </Button>
            ) : (
              <Button onClick={() => navigate('/mapa')}>Mapa</Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
