import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Topbar } from '../components/Topbar';
import api, { unwrap } from '../lib/api';
import type { Trilha, No } from '../types';
import { Button } from '../components/ui/Button';
import {
  IconLock, IconSword, IconRotateClockwise, IconListCheck, IconBolt,
  IconCircleCheckFilled, IconFlag3, IconCheck, IconArrowsMove, IconBook,
  IconSkull, IconStar, IconX, IconCode,
} from '@tabler/icons-react';

// ── Desafio de Projeto ────────────────────────────────────────────────────────
const PROJECTS = [
  {
    id: 'calc',
    icon: '🧮',
    title: 'Calculadora Científica',
    desc: 'Construa uma calculadora CLI com histórico de operações, suporte a expressões complexas e funções do módulo math.',
    skills: ['funções', 'loops', 'módulo math', 'I/O'],
    difficulty: 'Iniciante',
    diffColor: '#7ee787',
  },
  {
    id: 'tasks',
    icon: '📋',
    title: 'Gerenciador de Tarefas',
    desc: 'Crie um CRUD de tarefas com persistência em arquivo JSON — adicione, complete, filtre e exporte.',
    skills: ['dicionários', 'listas', 'arquivos & I/O', 'exceções'],
    difficulty: 'Intermediário',
    diffColor: '#46c7ff',
  },
  {
    id: 'text',
    icon: '📊',
    title: 'Analisador de Texto',
    desc: 'Leia um arquivo e gere estatísticas: palavras, frequência de termos, frases mais longas e padrões com regex.',
    skills: ['strings', 'regex', 'compreensões', 'arquivos & I/O'],
    difficulty: 'Intermediário',
    diffColor: '#46c7ff',
  },
] as const;
import {
  CAVE_STATIC_NODES,
  CAVE_NODE_THEME, CAVE_BIOME_LABEL,
} from '../lib/caveEngine';
import { makeRenderer, type MapEngine } from '../lib/map';

function getStaticIndex(i: number, total: number) {
  const maxIdx = CAVE_STATIC_NODES.length - 1;
  
  // Se a trilha tem 18 aulas ou mais, mapeia 1 para 1 para evitar que duas aulas fiquem no mesmo espaço (textos sobrepostos)
  if (total >= CAVE_STATIC_NODES.length) {
    return Math.min(i, maxIdx);
  }
  
  // Se tiver menos aulas, espalha uniformemente garantindo que a última aula fique no Cume Verde (maxIdx)
  if (total <= 1) return 0;
  return Math.round((i / (total - 1)) * maxIdx);
}

export function Mapa() {
  const { user } = useUser();
  const navigate  = useNavigate();

  const [activeTrilha,         setActiveTrilha]         = useState<Trilha | null>(null);
  const [nodes,                setNodes]                = useState<No[]>([]);
  const [catalogo,             setCatalogo]             = useState<Trilha[]>([]);
  const [semTrilhasNoServidor, setSemTrilhasNoServidor] = useState(false);
  const [fetchError,           setFetchError]           = useState<string | null>(null);
  const [loading,              setLoading]              = useState(true);
  const [needsEnrollment,      setNeedsEnrollment]      = useState(false);
  const [selectedNodeId,       setSelectedNodeId]       = useState<number | null>(null);
  const [starting,             setStarting]             = useState(false);
  const [enrolling,            setEnrolling]            = useState(false);
  const [projectModal,         setProjectModal]         = useState(false);
  const [chosenProject,        setChosenProject]        = useState<string | null>(null);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const terrainRef  = useRef<HTMLCanvasElement>(null);
  const engineRef   = useRef<MapEngine | null>(null);
  const [engineReady, setEngineReady] = useState(false);

  // ── Init canvas ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!terrainRef.current) return;
    const R = makeRenderer(terrainRef.current);
    R.build();
    engineRef.current = R;
    setEngineReady(true);

    return () => {
      engineRef.current?.stop();
    };
  }, []);

  // ── API ────────────────────────────────────────────────────────────────────
  const loadNodesForTrilha = async (trilha: Trilha) => {
    setActiveTrilha(trilha);
    setNeedsEnrollment(false);
    const nosRes  = await api.get(`/nos?trilhaId=${trilha.id}`);
    const nosData = unwrap(nosRes) as No[];
    const sorted  = nosData.sort((a, b) => a.ordem - b.ordem);
    setNodes(sorted);
    const activeNode = sorted.find(n => n.status === 'EM_PROGRESSO')
      || sorted.find(n => n.status === 'DISPONIVEL')
      || sorted[0];
    setSelectedNodeId(activeNode?.id ?? null);
  };

  const fetchMap = async (trilhaId?: number) => {
    setLoading(true); setFetchError(null); setNeedsEnrollment(false);
    try {
      const catalogoRes = await api.get('/trilhas');
      const todas = unwrap(catalogoRes) as Trilha[];
      setSemTrilhasNoServidor(todas.length === 0);
      if (todas.length === 0) { setActiveTrilha(null); setNodes([]); setSelectedNodeId(null); setCatalogo([]); return; }

      const ativasRes = await api.get('/trilhas/ativas');
      const trilhas   = (unwrap(ativasRes) as Trilha[]).filter(t => todas.some(c => c.id === t.id));
      const activeIds = new Set(trilhas.map(t => t.id));
      setCatalogo(todas.filter(t => !activeIds.has(t.id)));

      if (trilhas.length > 0) {
        const trilha = trilhaId ? trilhas.find(t => t.id === trilhaId) ?? trilhas[0] : trilhas[0];
        await loadNodesForTrilha(trilha); return;
      }

      const alvo = trilhaId ? todas.find(t => t.id === trilhaId) ?? todas[0] : todas[0];
      try {
        await api.post(`/trilhas/${alvo.id}/matricular`);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 409) { setActiveTrilha(null); setNodes([]); setSelectedNodeId(null); setNeedsEnrollment(true); return; }
      }
      await loadNodesForTrilha(alvo);
    } catch (err) {
      console.error('Failed to fetch map data', err);
      setActiveTrilha(null); setNodes([]); setSemTrilhasNoServidor(false);
      const data = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      const msg  = data?.message ?? data?.error ?? (err as Error)?.message ?? 'Erro ao carregar o mapa';
      setFetchError(msg);
    } finally { setLoading(false); }
  };

  const handleMatricular = async (trilhaId: number) => {
    setEnrolling(true);
    try { await api.post(`/trilhas/${trilhaId}/matricular`); await fetchMap(trilhaId); }
    catch (err: any) { alert(err.response?.data?.message || 'Erro ao matricular na trilha'); }
    finally { setEnrolling(false); }
  };

  useEffect(() => { fetchMap(); }, []);

  const handleStartMission = async () => {
    if (!selectedNodeId || starting) return;
    setStarting(true);
    try {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (node?.temMissao) {
        await api.post(`/nos/${selectedNodeId}/iniciar`);
        const missaoRes = await api.get(`/missoes/por-no/${selectedNodeId}`);
        const missao    = unwrap(missaoRes) as { id: number };
        navigate(`/missao/${missao.id}`);
      } else {
        await api.post(`/nos/${selectedNodeId}/iniciar`);
        navigate(`/aula/${selectedNodeId}`);
      }
    } catch (err: any) { alert(err.response?.data?.message || 'Erro ao iniciar missão'); }
    finally { setStarting(false); }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selStatic    = selectedNode ? CAVE_STATIC_NODES[getStaticIndex(selectedNode.ordem - 1, nodes.length)] : null;
  const isBoss       = !!selStatic?.boss;
  const isProject    = !!selStatic?.project;

  // ── Active trilha badge icon (first node's emoji or trilha icon)
  const trailIcon = nodes.length > 0 ? CAVE_STATIC_NODES[0].icon : '🐍';

  // ── Progresso ─────────────────────────────────────────────────────────────
  const progressPct = activeTrilha && activeTrilha.xpTotal > 0
    ? Math.min(100, Math.round(((activeTrilha.xpGanho ?? 0) / activeTrilha.xpTotal) * 100))
    : 0;

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <Topbar />

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">

        {/* ── MAP REGION ────────────────────────────────────────────────── */}
        <div className="relative flex-1 overflow-hidden bg-[#05080a]" style={{ containerType: 'size' as any }}>
          <div className="relative w-full h-full overflow-hidden" style={{ containerType: 'size' as any }}>
            <canvas ref={terrainRef} className="absolute inset-0 block w-full h-full" style={{ imageRendering: 'pixelated', mixBlendMode: 'normal' }} />

            {/* Trail badge */}
            <div className="absolute left-[1.6cqw] top-[2.6cqh] z-[8] flex items-center gap-[1.3cqw] p-[1.1cqh_1.6cqw_1.1cqh_1.1cqh] bg-[rgba(10,17,16,.86)] backdrop-blur-[2px] border border-[#2c4a3c] rounded-[3px] shadow-[0_4px_18px_-6px_#000,inset_0_0_0_1px_rgba(87,224,138,.08)]">
              <div className="w-[4.4cqw] h-[4.4cqw] shrink-0 rounded-[3px] grid place-items-center text-[2.5cqw] border border-[#2f6647] shadow-[0_0_10px_rgba(87,224,138,.35),inset_0_0_6px_rgba(87,224,138,.2)]" style={{ background: 'radial-gradient(circle at 50% 40%, #15402a, #0a1c15)', color: '#7dffb0' }}>
                {trailIcon}
              </div>
              <div>
                <div className="font-['Press_Start_2P',monospace] text-[0.95cqw] tracking-[0.5px] mb-[0.7cqh] text-[#57e08a]" style={{ textShadow: '0 0 8px rgba(87,224,138,.5)' }}>Trilha Ativa</div>
                <div className="font-['Press_Start_2P',monospace] text-[1.45cqw] text-[#eaf6ee] mb-[0.7cqh]" style={{ textShadow: '0 2px 0 #04140d' }}>
                  {loading ? 'Carregando…' : activeTrilha?.titulo || 'Nenhuma trilha'}
                </div>
              </div>
            </div>

            {/* Error / no trails overlay */}
            {!loading && !activeTrilha && !needsEnrollment && (semTrilhasNoServidor || fetchError) && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-[#04060a]/85">
                <div className="max-w-md mx-6 p-8 rounded-lg bg-surface border border-border text-center">
                  <h2 className="font-cinzel font-bold text-xl mb-2">Nenhuma trilha disponível</h2>
                  <p className="text-text-dim text-sm">{fetchError ?? 'Aguarde o backend iniciar e tente novamente.'}</p>
                  <Button className="mt-4" onClick={() => fetchMap()}>Tentar novamente</Button>
                </div>
              </div>
            )}

            {/* Enrollment overlay */}
            {!loading && needsEnrollment && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-[#04060a]/85">
                <div className="max-w-md w-full mx-6 p-8 rounded-lg bg-surface border border-[rgba(95,195,107,.3)] text-center shadow-[0_4px_18px_-6px_#000]">
                  <div className="text-4xl mb-4">🐍</div>
                  <h2 className="font-cinzel font-bold text-2xl mb-2">Escolha sua trilha</h2>
                  <p className="text-text-dim text-sm mb-6">Matricule-se para entrar na caverna e começar a jornada.</p>
                  <div className="flex flex-col gap-3">
                    {catalogo.map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-3 p-4 rounded-md bg-surface-2 border border-border text-left">
                        <div>
                          <div className="font-semibold">{t.titulo}</div>
                          <div className="text-xs text-text-dim mt-1">{t.descricao}</div>
                        </div>
                        <Button className="shrink-0 py-1 px-3 text-xs h-auto" onClick={() => handleMatricular(t.id)} disabled={enrolling}>
                          {enrolling ? '…' : 'Matricular'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Nodes */}
            {engineReady && engineRef.current && nodes.map((n, i) => {
              const staticIdx = getStaticIndex(i, nodes.length);
              const s = CAVE_STATIC_NODES[staticIdx];
              const isSel       = selectedNodeId === n.id;
              const isBossNode  = !!s.boss;
              const isProjNode  = !!s.project;
              
              let xPct = engineRef.current.nodeAnchors[staticIdx][0];
              let yPct = engineRef.current.nodeAnchors[staticIdx][1];

              const left = `${xPct * 100}%`;
              const top = `${yPct * 100}%`;
              
              const theme = CAVE_NODE_THEME[s.biome];
              const size  = (isBossNode || isProjNode) ? 'w-[4.4cqw] h-[4.4cqw] text-[2.2cqw]' : 'w-[3.4cqw] h-[3.4cqw] text-[1.8cqw]';
              const frameColor = isBossNode ? '#e0852f' : isProjNode ? '#d4c060' : theme.frame;

              return (
                <div
                  key={n.id}
                  data-map-node
                  className={`absolute flex flex-col items-center gap-[0.5cqh] z-10 cursor-pointer transition-transform ${isSel ? 'scale-110 z-20' : 'hover:scale-[1.12] hover:z-20'}`}
                  style={{ left, top, transform: 'translate(-50%, -50%)' }}
                  onClick={() => setSelectedNodeId(n.id)}
                >
                  <div
                    className={`relative grid place-items-center leading-none rounded-[4px] ${size}`}
                    style={{
                      background: theme.plat,
                      boxShadow: isBossNode
                        ? `0 0 0 1px #06080c, 0 0 0 2px ${frameColor}, 0 0 0 3px #06080c, 0 3px 0 3px rgba(0,0,0,.55)`
                        : `0 0 0 1px #06080c, 0 0 0 2px ${frameColor}, 0 0 0 3px #06080c, 0 3px 0 3px rgba(0,0,0,.5)`,
                      outline: isSel ? '2px solid var(--gold)' : 'none',
                      outlineOffset: isSel ? '4px' : '0',
                      animation: isProjNode ? 'projectAura 2s ease-in-out infinite' : isBossNode ? 'bossAura 1.6s ease-in-out infinite' : (n.status === 'EM_PROGRESSO' || n.status === 'DISPONIVEL') ? 'pulseRing 1.8s ease-in-out infinite' : 'none',
                    }}
                  >
                    <span className={n.status === 'BLOQUEADO' ? 'grayscale opacity-50' : ''}>{s.icon}</span>

                    {/* Completed check */}
                    {n.status === 'CONCLUIDO' && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[1.2cqw] h-[1.2cqw] bg-[#7ee787] text-[#0b1f12] grid place-items-center border border-[#06080c] text-[0.6cqw] rounded-sm">
                        <IconCheck size={8} />
                      </div>
                    )}

                    {/* Lock */}
                    {n.status === 'BLOQUEADO' && (
                      <div className="absolute inset-0 grid place-items-center text-[#cfd6df] text-[1.2cqw]" style={{ background: 'rgba(6,8,12,.4)' }}>
                        <IconLock size={10} />
                      </div>
                    )}
                  </div>

                  <div
                    className="text-text text-center whitespace-nowrap px-[0.6cqw] py-[0.3cqh] border border-[#1f322b] rounded-[2px]"
                    style={{ fontSize: '0.9cqw', lineHeight: '1', background: 'rgba(7,12,11,.82)', color: isProjNode ? '#d4c060' : (n.status === 'EM_PROGRESSO' || n.status === 'DISPONIVEL') ? '#46c7ff' : isBossNode ? '#e0852f' : '#b7d4c6', textShadow: '0 1px 0 #000' }}
                  >
                    {i + 1}. {n.titulo}
                  </div>
                </div>
              );
            })}

            {/* Scanlines overlay */}
            <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-50" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 2px, transparent 2px 4px)' }} />
          </div>
        </div>

        {/* ── HUD ───────────────────────────────────────────────────────── */}
        <aside className="w-full md:w-[320px] shrink-0 bg-surface border-t md:border-t-0 md:border-l border-border flex flex-col flex-[0_0_45%] md:flex-none h-auto min-h-0">
          <div className="flex-1 overflow-y-auto p-5 pb-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#30363d transparent' }}>
            {selectedNode && selStatic ? (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <IconFlag3 size={18} className="text-[#5fc36b]" />
                  <h2 className="font-cinzel font-semibold text-base tracking-wide">Detalhes do Estágio</h2>
                </div>

                {/* Sprite box */}
                <div className="flex items-center gap-4 p-4 rounded-md bg-surface-2 border border-border mb-5">
                  <div
                    className="w-[58px] h-[58px] shrink-0 grid place-items-center text-[32px]"
                    style={{
                      background: CAVE_NODE_THEME[selStatic.biome].plat,
                      boxShadow: `0 0 0 3px #06080c, 0 0 0 6px ${CAVE_NODE_THEME[selStatic.biome].frame}, 0 0 0 7px #06080c`,
                    }}
                  >
                    {selStatic.icon}
                  </div>
                  <div>
                    <div className="text-[7px] tracking-[.5px] text-text-mute uppercase mb-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                      {CAVE_BIOME_LABEL[selStatic.biome]}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-[0.4px] uppercase ${
                      selectedNode.status === 'CONCLUIDO'    ? 'text-[#7ee787] bg-[rgba(126,231,135,.1)] border-[0.5px] border-[rgba(126,231,135,.35)]' :
                      selectedNode.status === 'EM_PROGRESSO' ? 'text-[#46c7ff] bg-[rgba(70,199,255,.1)]  border-[0.5px] border-[rgba(70,199,255,.35)]' :
                      selectedNode.status === 'DISPONIVEL'   ? 'text-gold bg-gold/10 border-[0.5px] border-gold/35' :
                      isBoss    ? 'text-[#e0852f] bg-[rgba(224,133,47,.1)] border-[0.5px] border-[rgba(224,133,47,.35)]' :
                      isProject ? 'text-[#d4c060] bg-[rgba(212,192,96,.1)]  border-[0.5px] border-[rgba(212,192,96,.35)]' :
                      'text-text-mute bg-surface border-[0.5px] border-border'
                    }`}>
                      {selectedNode.status === 'CONCLUIDO'    ? <><IconCircleCheckFilled size={13} /> Concluído</> :
                       selectedNode.status === 'EM_PROGRESSO' ? <><IconSword size={13} /> Em andamento</> :
                       selectedNode.status === 'DISPONIVEL'   ? <><IconSword size={13} /> Disponível</> :
                       isProject ? <><IconStar size={13} /> Desafio Final · Bloqueado</> :
                       isBoss    ? <><IconSkull size={13} /> Boss · Bloqueado</> :
                       <><IconLock size={13} /> Bloqueado</>}
                    </span>
                  </div>
                </div>

                <h3 className="font-cinzel font-bold text-[23px] leading-[1.15] mb-2">{selectedNode.titulo}</h3>
                <div className="text-text-dim text-[13.5px] leading-[1.6] mb-5 flex flex-col gap-1.5">
                  {(selectedNode.conteudo ?? '').split('\n').map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    if (/^#{1,3}\s/.test(trimmed)) {
                      const text = trimmed.replace(/^#{1,3}\s+/, '');
                      return <p key={i} className="font-semibold text-text text-[14px]">{text}</p>;
                    }
                    if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
                      const text = trimmed.slice(2);
                      return (
                        <div key={i} className="flex gap-2">
                          <span className="text-gold mt-0.5 shrink-0">•</span>
                          <span>{text}</span>
                        </div>
                      );
                    }
                    return <p key={i}>{trimmed}</p>;
                  })}
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-md border-[0.5px] border-gold/30 mb-5" style={{ background: 'linear-gradient(155deg, rgba(240,192,96,.12), rgba(240,192,96,.03))' }}>
                  <IconBolt size={22} className="text-gold" />
                  <div>
                    <div className="font-cinzel font-bold text-[22px] text-gold leading-none">+{selectedNode.xpRecompensa} XP</div>
                    <div className="text-[11px] text-text-mute uppercase tracking-[0.6px] mt-1">Recompensa do estágio</div>
                  </div>
                </div>

                {selectedNode.prerequisitoIds.length > 0 && (
                  <div className="mb-5">
                    <div className="text-[11px] uppercase tracking-wide text-text-mute font-semibold mb-3 flex items-center gap-2">
                      <IconListCheck size={16} /> Pré-requisitos
                    </div>
                    <div className="flex flex-col gap-2">
                      {selectedNode.prerequisitoIds.map(prId => {
                        const pr   = nodes.find(n => n.id === prId);
                        const isOk = pr?.status === 'CONCLUIDO';
                        return (
                          <div key={prId} className={`flex items-center gap-3 p-2 rounded-sm bg-surface-2 border border-border text-[13px] ${isOk ? 'text-text' : 'text-text-mute'}`}>
                            <span className={isOk ? 'text-[#7ee787]' : 'text-text-mute'}><IconCircleCheckFilled size={16} /></span>
                            <span className="flex-1 truncate">{pr?.titulo ?? 'Desconhecido'}</span>
                            {isOk ? <IconCheck size={14} className="text-[#7ee787]" /> : <span className="text-[11px] text-text-mute">pendente</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action button */}
                {isProject && (selectedNode.status === 'DISPONIVEL' || selectedNode.status === 'EM_PROGRESSO') ? (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-md font-bold text-[15px] text-[#1a1206] transition-transform hover:-translate-y-0.5 hover:brightness-105"
                    style={{ background: 'linear-gradient(150deg,#d4c060,#b8a030)', boxShadow: '0 6px 18px -8px rgba(212,192,96,.8)' }}
                    onClick={() => setProjectModal(true)}
                  >
                    <IconStar size={18} /> {chosenProject ? 'Continuar Projeto' : 'Escolher Projeto'}
                  </button>
                ) : isProject && selectedNode.status === 'CONCLUIDO' ? (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-md font-bold text-[14px] border-[0.5px] border-[rgba(212,192,96,.5)] bg-surface-2 text-[#d4c060] transition-transform hover:-translate-y-0.5"
                    onClick={() => setProjectModal(true)}
                  >
                    <IconCode size={18} /> Ver Projeto Concluído
                  </button>
                ) : isProject ? (
                  <button className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-md font-bold text-[14px] border-[0.5px] border-border bg-surface-2 text-text-mute cursor-not-allowed">
                    <IconLock size={18} /> Complete todos os estágios
                  </button>
                ) : selectedNode.status === 'DISPONIVEL' ? (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-md font-bold text-[15px] text-[#1a1206] transition-transform hover:-translate-y-0.5 hover:brightness-105 disabled:opacity-60"
                    style={{ background: 'linear-gradient(150deg,#f0c060,#d8a945)', boxShadow: '0 6px 18px -8px rgba(240,192,96,.7)' }}
                    onClick={handleStartMission} disabled={starting}
                  >
                    <IconSword size={18} /> {selectedNode.temMissao ? 'Iniciar Missão' : isBoss ? 'Iniciar Confronto' : 'Estudar Conteúdo'}
                  </button>
                ) : selectedNode.status === 'EM_PROGRESSO' && selectedNode.temMissao ? (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-md font-bold text-[15px] text-[#1a1206] transition-transform hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(150deg,#f0c060,#d8a945)', boxShadow: '0 6px 18px -8px rgba(240,192,96,.7)' }}
                    onClick={handleStartMission} disabled={starting}
                  >
                    <IconSword size={18} /> Continuar Missão
                  </button>
                ) : selectedNode.status === 'EM_PROGRESSO' ? (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-md font-bold text-[14px] border-[0.5px] border-border bg-surface-2 text-text transition-transform hover:-translate-y-0.5 hover:border-[#5fc36b] hover:text-[#5fc36b]"
                    onClick={() => navigate(`/aula/${selectedNode.id}`)}
                  >
                    <IconBook size={18} /> Continuar Estudo
                  </button>
                ) : selectedNode.status === 'CONCLUIDO' && selectedNode.temMissao ? (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-md font-bold text-[14px] border-[0.5px] border-border bg-surface-2 text-text transition-transform hover:-translate-y-0.5 hover:border-[#5fc36b] hover:text-[#5fc36b]"
                    onClick={handleStartMission}
                  >
                    <IconRotateClockwise size={18} /> Revisar Missão
                  </button>
                ) : selectedNode.status === 'CONCLUIDO' ? (
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-md font-bold text-[14px] border-[0.5px] border-border bg-surface-2 text-text transition-transform hover:-translate-y-0.5 hover:border-[#5fc36b] hover:text-[#5fc36b]"
                    onClick={() => navigate(`/aula/${selectedNode.id}`)}
                  >
                    <IconRotateClockwise size={18} /> Revisar Conteúdo
                  </button>
                ) : (
                  <button className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-md font-bold text-[14px] border-[0.5px] border-border bg-surface-2 text-text-mute cursor-not-allowed">
                    <IconLock size={18} /> {isBoss ? 'Complete os pré-requisitos' : 'Bloqueado'}
                  </button>
                )}
              </>
            ) : needsEnrollment ? (
              <div className="text-center mt-10 px-2">
                <p className="text-text-dim text-sm mb-4">Você ainda não está matriculado em nenhuma trilha.</p>
                {catalogo.map(t => (
                  <Button key={t.id} className="w-full mb-2" onClick={() => handleMatricular(t.id)} disabled={enrolling}>
                    Matricular em {t.titulo}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-text-mute text-center mt-10 text-sm">Selecione um nó no mapa</div>
            )}
          </div>

          {/* Trail progress footer */}
          <div className="p-4 border-t border-border bg-bg shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-dim">Progresso da trilha</span>
              <span className="font-cinzel font-bold text-sm" style={{ color: '#5fc36b' }}>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 border border-border overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#7ee787,#56b364)' }} />
            </div>
          </div>
        </aside>
      </div>

      {/* ── Modal de escolha de projeto ──────────────────────────────── */}
      {projectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setProjectModal(false)}>
          <div className="relative w-full max-w-[860px] rounded-xl bg-[#0d1117] border border-[rgba(212,192,96,.35)] shadow-[0_0_60px_rgba(212,192,96,.18)] p-8" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <button className="absolute top-4 right-4 text-text-mute hover:text-text transition-colors" onClick={() => setProjectModal(false)}>
              <IconX size={20} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🏆</span>
              <div>
                <h2 className="font-cinzel font-bold text-2xl text-[#d4c060]">Desafio Final</h2>
                <p className="text-text-mute text-sm">Escolha um projeto para aplicar tudo que aprendeu na trilha</p>
              </div>
            </div>
            <div className="h-px bg-[rgba(212,192,96,.2)] mb-6 mt-4" />

            {/* Project cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PROJECTS.map(proj => {
                const isChosen = chosenProject === proj.id;
                return (
                  <div
                    key={proj.id}
                    className="flex flex-col rounded-lg border transition-all cursor-pointer"
                    style={{
                      background: isChosen ? 'rgba(212,192,96,.08)' : 'rgba(13,17,23,.9)',
                      borderColor: isChosen ? 'rgba(212,192,96,.6)' : 'rgba(48,54,61,.8)',
                      boxShadow: isChosen ? '0 0 20px rgba(212,192,96,.15)' : 'none',
                    }}
                    onClick={() => setChosenProject(proj.id)}
                  >
                    <div className="p-5 flex-1">
                      <div className="text-4xl mb-3">{proj.icon}</div>
                      <div className="font-cinzel font-bold text-[15px] mb-2 leading-[1.3]">{proj.title}</div>
                      <p className="text-text-dim text-[12.5px] leading-[1.55] mb-4">{proj.desc}</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {proj.skills.map(s => (
                          <span key={s} className="px-2 py-0.5 rounded-full text-[10px] bg-surface-2 border border-border text-text-mute">{s}</span>
                        ))}
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border" style={{ color: proj.diffColor, borderColor: `${proj.diffColor}55`, background: `${proj.diffColor}11` }}>
                        {proj.difficulty}
                      </span>
                    </div>
                    <div className="px-5 pb-5">
                      <button
                        className="w-full py-2.5 rounded-md font-bold text-[13px] transition-all"
                        style={isChosen
                          ? { background: 'linear-gradient(150deg,#d4c060,#b8a030)', color: '#1a1206', boxShadow: '0 4px 14px -6px rgba(212,192,96,.7)' }
                          : { background: 'rgba(48,54,61,.6)', color: '#8b949e', border: '1px solid rgba(48,54,61,.8)' }
                        }
                        onClick={e => { e.stopPropagation(); setChosenProject(proj.id); }}
                      >
                        {isChosen ? '✓ Selecionado' : 'Escolher este projeto'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-text-mute text-xs">
                {chosenProject ? `Projeto escolhido: ${PROJECTS.find(p => p.id === chosenProject)?.title}` : 'Selecione um projeto para continuar'}
              </p>
              <button
                className="flex items-center gap-2 px-6 py-2.5 rounded-md font-bold text-[14px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={chosenProject
                  ? { background: 'linear-gradient(150deg,#d4c060,#b8a030)', color: '#1a1206', boxShadow: '0 4px 18px -6px rgba(212,192,96,.7)' }
                  : { background: 'rgba(48,54,61,.5)', color: '#6e7681' }
                }
                disabled={!chosenProject}
                onClick={() => { setProjectModal(false); handleStartMission(); }}
              >
                <IconCode size={16} /> Iniciar Projeto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS keyframes para animações dos nós */}
      <style>{`
        @keyframes pulseRing {
          0%,100% { box-shadow: 0 0 0 3px #06080c, 0 0 0 6px #46c7ff, 0 0 0 7px #06080c, 0 0 0 7px rgba(70,199,255,0), 0 7px 0 7px rgba(0,0,0,.5); }
          50%      { box-shadow: 0 0 0 3px #06080c, 0 0 0 6px #46c7ff, 0 0 0 7px #06080c, 0 0 0 13px rgba(70,199,255,.22), 0 7px 0 7px rgba(0,0,0,.5); }
        }
        @keyframes bossAura {
          0%,100% { box-shadow: 0 0 0 3px #06080c, 0 0 0 6px #e0852f, 0 0 0 7px #06080c, 0 0 14px 2px rgba(224,133,47,.45), 0 8px 0 7px rgba(0,0,0,.55); }
          50%      { box-shadow: 0 0 0 3px #06080c, 0 0 0 6px #e0852f, 0 0 0 7px #06080c, 0 0 36px 10px rgba(255,140,40,.7),  0 8px 0 7px rgba(0,0,0,.55); }
        }
        @keyframes projectAura {
          0%,100% { box-shadow: 0 0 0 3px #06080c, 0 0 0 6px #d4c060, 0 0 0 7px #06080c, 0 0 18px 4px rgba(212,192,96,.35), 0 8px 0 7px rgba(0,0,0,.55); }
          50%      { box-shadow: 0 0 0 3px #06080c, 0 0 0 6px #d4c060, 0 0 0 7px #06080c, 0 0 44px 14px rgba(240,220,80,.6),  0 8px 0 7px rgba(0,0,0,.55); }
        }
      `}</style>
    </div>
  );
}
