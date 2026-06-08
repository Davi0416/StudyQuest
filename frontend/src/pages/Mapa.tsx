import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Topbar } from '../components/Topbar';
import api, { unwrap } from '../lib/api';
import type {  Trilha, No  } from "../types";
import { Button } from '../components/ui/Button';
import { IconLock, IconSword, IconRotateClockwise, IconListCheck, IconBolt, IconCircleCheckFilled, IconFlag3, IconCheck, IconArrowsMove, IconBook } from '@tabler/icons-react';
import {
  createMapEngine, drawMinimap, HTML_DECO, tileCenter, TPX, WORLD_H, WORLD_W, type MapEngineState,
} from '../lib/mapEngine';

// Layout do mapa para a trilha "O Caminho da Serpente" (5 capítulos + boss na aula 5)
const STATIC_NODES = [
  { biome: 'grass', icon: '🐍', tile: [6, 31], prereqsIdx: [] },
  { biome: 'grass', icon: '📜', tile: [14, 27], prereqsIdx: [0] },
  { biome: 'grass', icon: '🔀', tile: [9, 21], prereqsIdx: [1] },
  { biome: 'stone', icon: '🔄', tile: [21, 26], prereqsIdx: [1] },
  { biome: 'cave', icon: '🐉', tile: [29, 20], prereqsIdx: [2, 3] },
];

const EDGES = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4]];

const NODE_THEME: Record<string, { plat: string; frame: string }> = {
  grass: { plat: '#2c5e38', frame: '#3a7a45' },
  stone: { plat: '#4b515a', frame: '#5c6571' },
  forest: { plat: '#1f4a30', frame: '#2a6440' },
  mountain: { plat: '#544f4b', frame: '#675f59' },
  cave: { plat: '#221b2e', frame: '#e06c75' },
};

const BIOME_LABEL: Record<string, string> = { 
  grass: 'Bioma · Planície', stone: 'Bioma · Pedreira', forest: 'Bioma · Floresta', mountain: 'Bioma · Montanha', cave: 'Bioma · Caverna' 
};

export function Mapa() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [activeTrilha, setActiveTrilha] = useState<Trilha | null>(null);
  const [nodes, setNodes] = useState<No[]>([]);
  const [catalogo, setCatalogo] = useState<Trilha[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsEnrollment, setNeedsEnrollment] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const terrainRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const mapEngineRef = useRef<MapEngineState | null>(null);
  const waterFrameRef = useRef(0);
  const centeredRef = useRef(false);

  const nodeTiles = STATIC_NODES.map(s => s.tile as [number, number]);

  const updateMinimap = useCallback(() => {
    if (!minimapRef.current || !mapEngineRef.current || !scrollRef.current) return;
    const mmNodes = nodes.map((n, i) => ({
      tile: STATIC_NODES[Math.min(i, STATIC_NODES.length - 1)].tile as [number, number],
      status: n.status,
      isSelected: n.id === selectedNodeId,
    }));
    drawMinimap(minimapRef.current, mapEngineRef.current.biome, mapEngineRef.current.pathSet, mmNodes, scrollRef.current);
  }, [nodes, selectedNodeId]);

  useEffect(() => {
    if (!terrainRef.current) return;
    mapEngineRef.current = createMapEngine(terrainRef.current, nodeTiles, EDGES);

    const interval = setInterval(() => {
      const engine = mapEngineRef.current;
      const canvas = terrainRef.current;
      if (!engine || !canvas) return;
      waterFrameRef.current = (waterFrameRef.current + 1) % 4;
      for (const [c, r] of engine.waterTiles) {
        engine.paintWaterTile(c, r, waterFrameRef.current);
      }
    }, 320);

    return () => clearInterval(interval);
  }, [nodeTiles]);

  useEffect(() => {
    updateMinimap();
  }, [updateMinimap]);

  useEffect(() => {
    if (!scrollRef.current || nodes.length === 0 || centeredRef.current) return;
    const idx = nodes.findIndex(n => n.status === 'EM_PROGRESSO' || n.status === 'DISPONIVEL');
    const i = idx >= 0 ? idx : 0;
    const tile = STATIC_NODES[Math.min(i, STATIC_NODES.length - 1)].tile;
    const ctr = tileCenter(tile as [number, number]);
    const sc = scrollRef.current;
    sc.scrollLeft = ctr.x - sc.clientWidth / 2;
    sc.scrollTop = ctr.y - sc.clientHeight / 2;
    centeredRef.current = true;
    updateMinimap();
  }, [nodes, updateMinimap]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    let dragging = false;
    let sx0 = 0, sy0 = 0, sl0 = 0, st0 = 0;

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('[data-map-node]')) return;
      dragging = true;
      sx0 = e.clientX;
      sy0 = e.clientY;
      sl0 = scroll.scrollLeft;
      st0 = scroll.scrollTop;
      scroll.classList.add('cursor-grabbing');
      scroll.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      scroll.scrollLeft = sl0 - (e.clientX - sx0);
      scroll.scrollTop = st0 - (e.clientY - sy0);
      updateMinimap();
    };
    const onUp = () => {
      dragging = false;
      scroll.classList.remove('cursor-grabbing');
    };

    scroll.addEventListener('pointerdown', onDown);
    scroll.addEventListener('pointermove', onMove);
    scroll.addEventListener('pointerup', onUp);
    scroll.addEventListener('pointercancel', onUp);
    scroll.addEventListener('scroll', updateMinimap);
    return () => {
      scroll.removeEventListener('pointerdown', onDown);
      scroll.removeEventListener('pointermove', onMove);
      scroll.removeEventListener('pointerup', onUp);
      scroll.removeEventListener('pointercancel', onUp);
      scroll.removeEventListener('scroll', updateMinimap);
    };
  }, [updateMinimap]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!minimapRef.current || !scrollRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const sc = scrollRef.current;
    sc.scrollTo({
      left: fx * WORLD_W - sc.clientWidth / 2,
      top: fy * WORLD_H - sc.clientHeight / 2,
      behavior: 'smooth',
    });
  };

  const fetchMap = async (trilhaId?: number) => {
    setLoading(true);
    try {
      const [trilhasRes, catalogoRes] = await Promise.all([
        api.get('/trilhas/ativas'),
        api.get('/trilhas'),
      ]);
      const trilhas = unwrap(trilhasRes) as Trilha[];
      const todas = unwrap(catalogoRes) as Trilha[];
      const activeIds = new Set(trilhas.map(t => t.id));
      setCatalogo(todas.filter(t => !activeIds.has(t.id)));

      if (trilhas.length === 0) {
        setActiveTrilha(null);
        setNodes([]);
        setSelectedNodeId(null);
        setNeedsEnrollment(todas.length > 0);
        return;
      }

      setNeedsEnrollment(false);
      centeredRef.current = false;
      const trilha = trilhaId
        ? trilhas.find(t => t.id === trilhaId) ?? trilhas[0]
        : trilhas[0];

      setActiveTrilha(trilha);
      const nosRes = await api.get(`/nos?trilhaId=${trilha.id}`);
      const nosData = unwrap(nosRes) as No[];
      const sorted = nosData.sort((a, b) => a.ordem - b.ordem);
      setNodes(sorted);

      const activeNode = sorted.find(n => n.status === 'EM_PROGRESSO')
        || sorted.find(n => n.status === 'DISPONIVEL')
        || sorted[0];
      setSelectedNodeId(activeNode?.id ?? null);
    } catch (err) {
      console.error('Failed to fetch map data', err);
      setActiveTrilha(null);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMatricular = async (trilhaId: number) => {
    setEnrolling(true);
    try {
      await api.post(`/trilhas/${trilhaId}/matricular`);
      await fetchMap(trilhaId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao matricular na trilha');
    } finally {
      setEnrolling(false);
    }
  };

  useEffect(() => {
    fetchMap();
  }, []);

  const handleStartMission = async () => {
    if (!selectedNodeId || starting) return;
    setStarting(true);
    try {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (node?.temMissao) {
        await api.post(`/nos/${selectedNodeId}/iniciar`);
        const missaoRes = await api.get(`/missoes/por-no/${selectedNodeId}`);
        const missao = unwrap(missaoRes) as { id: number };
        navigate(`/missao/${missao.id}`);
      } else {
        await api.post(`/nos/${selectedNodeId}/iniciar`);
        navigate(`/aula/${selectedNodeId}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao iniciar missão');
    } finally {
      setStarting(false);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selStatic = selectedNode ? STATIC_NODES[Math.min(selectedNode.ordem - 1, STATIC_NODES.length - 1)] || STATIC_NODES[0] : null;

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <Topbar />

      <div className="flex-1 flex min-h-0">
        
        {/* MAP REGION */}
        <div className="relative flex-1 overflow-hidden bg-[#080a0e]">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3 p-3 bg-bg/80 backdrop-blur-md border border-gold/35 rounded-md shadow-soft">
            <div className="w-10 h-10 rounded-md grid place-items-center text-xl text-gold border-[0.5px] border-gold/40" style={{ background: 'linear-gradient(155deg, rgba(240,192,96,.18), rgba(240,192,96,.04))' }}>
              🐍
            </div>
            <div>
              <div className="text-[10px] tracking-[1.4px] uppercase text-gold font-semibold">Trilha Ativa</div>
              <div className="font-cinzel font-bold text-base leading-[1.1]">
                {loading ? 'Carregando...' : activeTrilha?.titulo || 'Nenhuma trilha ativa'}
              </div>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="absolute inset-0 overflow-auto cursor-grab scrollbar-thin"
          >
            <div className="relative" style={{ width: WORLD_W, height: WORLD_H }}>
              <canvas
                ref={terrainRef}
                className="absolute left-0 top-0 block"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* Decorações animadas (tochas e bandeiras) */}
              <div className="absolute inset-0 pointer-events-none">
                {HTML_DECO.map((d, i) => {
                  const x = (d.tile[0] + 0.5) * TPX;
                  const y = (d.tile[1] + 0.9) * TPX;
                  if (d.type === 'torch') {
                    return (
                      <div key={i} className="absolute" style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}>
                        <div className="w-3 h-3.5 mx-auto -mb-0.5 rounded-full bg-gradient-to-b from-[#ffe39b] via-[#f0c060] to-[#c0451f] animate-pulse" style={{ clipPath: 'polygon(50% 0,78% 35%,90% 70%,72% 100%,28% 100%,10% 70%,22% 35%)' }} />
                        <div className="w-1.5 h-5 mx-auto bg-[#6b4a2a]" />
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="absolute" style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}>
                      <div className="relative w-[18px]">
                        <div className="w-[3px] h-[26px] ml-0.5 bg-[#8a8f98]" />
                        <div className="absolute top-px left-1 w-3.5 h-2.5 bg-green origin-left animate-pulse" style={{ clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%,4px 50%)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {!loading && needsEnrollment && (
                <div className="absolute inset-0 z-20 grid place-items-center bg-[#080a0e]/85">
                  <div className="max-w-md w-full mx-6 p-8 rounded-lg bg-surface border border-gold/30 text-center shadow-soft">
                    <div className="text-4xl mb-4">🐍</div>
                    <h2 className="font-cinzel font-bold text-2xl mb-2">Escolha sua trilha</h2>
                    <p className="text-text-dim text-sm mb-6">
                      Matricule-se para ver o mapa e começar a jornada.
                    </p>
                    <div className="flex flex-col gap-3">
                      {catalogo.map(t => (
                        <div key={t.id} className="flex items-center justify-between gap-3 p-4 rounded-md bg-surface-2 border border-border text-left">
                          <div>
                            <div className="font-semibold">{t.titulo}</div>
                            <div className="text-xs text-text-dim mt-1">{t.descricao}</div>
                          </div>
                          <Button className="shrink-0 py-1 px-3 text-xs h-auto" onClick={() => handleMatricular(t.id)} disabled={enrolling}>
                            {enrolling ? '...' : 'Matricular'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {nodes.map((n, i) => {
                const s = STATIC_NODES[Math.min(i, STATIC_NODES.length - 1)];
                const x = (s.tile[0] + 0.5) * TPX;
                const y = (s.tile[1] + 0.5) * TPX;
                const isSelected = selectedNodeId === n.id;
                const isBoss = i === STATIC_NODES.length - 1;
                
                return (
                  <div 
                    key={n.id}
                    data-map-node
                    className={`absolute flex flex-col items-center gap-1.5 z-10 cursor-pointer hover:scale-110 hover:z-20 transition-transform ${isSelected ? 'scale-110 z-20' : ''}`}
                    style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
                    onClick={() => setSelectedNodeId(n.id)}
                  >
                    <div 
                      className={`relative grid place-items-center leading-none ${isBoss ? 'w-16 h-16 text-[38px]' : 'w-[46px] h-[46px] text-[26px]'}`}
                      style={{ 
                        background: NODE_THEME[s.biome].plat, 
                        boxShadow: isBoss
                          ? `0 0 0 3px #0b0e13, 0 0 0 6px ${NODE_THEME[s.biome].frame}, 0 0 0 7px #0b0e13, 0 8px 0 7px rgba(0,0,0,.5)`
                          : `0 0 0 3px #0b0e13, 0 0 0 6px ${NODE_THEME[s.biome].frame}, 0 0 0 7px #0b0e13, 0 7px 0 7px rgba(0,0,0,.45)`,
                        outline: isSelected ? '2px solid var(--gold)' : 'none',
                        outlineOffset: isSelected ? '9px' : '0',
                        imageRendering: 'pixelated',
                      }}
                    >
                      <span className={n.status === 'BLOQUEADO' ? 'grayscale opacity-50' : ''}>{s.icon}</span>
                      {n.status === 'CONCLUIDO' && <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-[18px] h-[18px] bg-green text-[#0b1f12] grid place-items-center border-2 border-[#0b0e13] text-xs"><IconCheck size={12}/></div>}
                      {(n.status === 'EM_PROGRESSO' || n.status === 'DISPONIVEL') && !isBoss && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-[12px] border-l-transparent border-r-transparent border-t-blue animate-bounce" />
                      )}
                      {n.status === 'BLOQUEADO' && <div className="absolute inset-0 grid place-items-center bg-[#080a0e]/35 text-[#cfd6df] text-xl shadow-[0_1px_2px_#000]"><IconLock size={16}/></div>}
                      {isBoss && n.status === 'BLOQUEADO' && <div className="absolute -top-3 -right-3 text-base"><IconLock size={16}/></div>}
                    </div>
                    <div className="font-mono text-[8px] leading-[1.4] text-text text-center whitespace-nowrap px-2 py-1 bg-[#080a0e]/80 border-[0.5px] border-border rounded shadow-[1px_1px_0_#000]" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                      {n.titulo}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute inset-0 pointer-events-none z-[6] shadow-[inset_0_0_140px_30px_rgba(0,0,0,.55)]" />

          <div className="absolute bottom-4 left-[18px] z-[8] flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg/70 backdrop-blur-sm border border-border text-text-dim text-xs">
            <IconArrowsMove size={14} className="text-text-mute" />
            Arraste para explorar · clique num nó para ver a missão
          </div>

          <div className="absolute right-[18px] bottom-[18px] z-[8] p-2 rounded-md bg-bg/85 backdrop-blur-sm border border-border shadow-soft">
            <div className="font-mono text-[7px] tracking-wide text-text-mute mb-1.5 pl-0.5" style={{ fontFamily: "'Press Start 2P', monospace" }}>MUNDO</div>
            <canvas
              ref={minimapRef}
              width={120}
              height={80}
              className="block cursor-pointer border border-border rounded"
              style={{ imageRendering: 'pixelated' }}
              onClick={handleMinimapClick}
            />
          </div>
        </div>

        {/* HUD */}
        <aside className="w-[300px] shrink-0 bg-surface border-l border-border flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 pb-6 scrollbar-thin">
            {selectedNode && selStatic ? (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <IconFlag3 size={18} className="text-gold" />
                  <h2 className="font-cinzel font-semibold text-base tracking-wide">Detalhes da Missão</h2>
                </div>

                <div className="flex items-center gap-4 p-5 rounded-md bg-surface-2 border border-border mb-5">
                  <div className="w-[58px] h-[58px] shrink-0 grid place-items-center text-[32px]" style={{ background: NODE_THEME[selStatic.biome].plat, boxShadow: `0 0 0 3px #0b0e13, 0 0 0 6px ${NODE_THEME[selStatic.biome].frame}, 0 0 0 7px #0b0e13` }}>
                    {selStatic.icon}
                  </div>
                  <div>
                    <div className="font-mono text-[7px] tracking-[0.5px] text-text-mute uppercase mb-2">
                      {BIOME_LABEL[selStatic.biome]}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-[0.4px] uppercase ${selectedNode.status === 'CONCLUIDO' ? 'text-green bg-green/10 border-[0.5px] border-green/35' : selectedNode.status === 'EM_PROGRESSO' ? 'text-blue bg-blue/10 border-[0.5px] border-blue/35' : selectedNode.status === 'DISPONIVEL' ? 'text-gold bg-gold/10 border-[0.5px] border-gold/35' : 'text-text-mute bg-surface border-[0.5px] border-border'}`}>
                      {selectedNode.status === 'CONCLUIDO' ? 'Concluído' : selectedNode.status === 'EM_PROGRESSO' ? 'Em andamento' : selectedNode.status === 'DISPONIVEL' ? 'Disponível' : 'Bloqueado'}
                    </span>
                  </div>
                </div>

                <h3 className="font-cinzel font-bold text-[23px] leading-[1.15] mb-2">{selectedNode.titulo}</h3>
                <p className="text-text-dim text-[13.5px] leading-[1.55] mb-5">{selectedNode.conteudo}</p>

                <div className="flex items-center gap-3 p-3.5 rounded-md border-[0.5px] border-gold/30 mb-5" style={{ background: 'linear-gradient(155deg, rgba(240,192,96,.12), rgba(240,192,96,.03))' }}>
                  <IconBolt size={22} className="text-gold" />
                  <div>
                    <div className="font-cinzel font-bold text-[22px] text-gold leading-none">+{selectedNode.xpRecompensa} XP</div>
                    <div className="text-[11px] text-text-mute uppercase tracking-[0.6px] mt-1">Recompensa da missão</div>
                  </div>
                </div>

                {selectedNode.prerequisitoIds.length > 0 && (
                  <div className="mb-5">
                    <div className="text-[11px] uppercase tracking-wide text-text-mute font-semibold mb-3 flex items-center gap-2">
                      <IconListCheck size={16} /> Pré-requisitos
                    </div>
                    <div className="flex flex-col gap-2">
                      {selectedNode.prerequisitoIds.map(prId => {
                        const pr = nodes.find(n => n.id === prId);
                        const isOk = pr?.status === 'CONCLUIDO';
                        return (
                          <div key={prId} className={`flex items-center gap-3 p-2 rounded-sm bg-surface-2 border border-border text-[13px] ${isOk ? 'text-text' : 'text-text-mute'}`}>
                            <span className={isOk ? 'text-green' : 'text-text-mute'}><IconCircleCheckFilled size={16} /></span>
                            <span className="flex-1 truncate">{pr?.titulo || 'Desconhecido'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedNode.status === 'DISPONIVEL' ? (
                  <Button className="w-full gap-2" onClick={handleStartMission} disabled={starting}>
                    <IconSword size={18} /> {selectedNode.temMissao ? 'Iniciar Missão' : selectedNode.ordem === 5 ? 'Iniciar Capítulo Final' : 'Estudar Conteúdo'}
                  </Button>
                ) : selectedNode.status === 'EM_PROGRESSO' && selectedNode.temMissao ? (
                  <Button className="w-full gap-2" onClick={handleStartMission} disabled={starting}>
                    <IconSword size={18} /> Continuar Missão
                  </Button>
                ) : selectedNode.status === 'EM_PROGRESSO' ? (
                  <Button className="w-full gap-2" onClick={() => navigate(`/aula/${selectedNode.id}`)}>
                    <IconBook size={18} /> Continuar Estudo
                  </Button>
                ) : selectedNode.status === 'CONCLUIDO' && selectedNode.temMissao ? (
                  <Button variant="ghost" className="w-full gap-2" onClick={handleStartMission}>
                    <IconRotateClockwise size={18} /> Revisar Missão
                  </Button>
                ) : selectedNode.status === 'CONCLUIDO' ? (
                  <Button variant="ghost" className="w-full gap-2" onClick={() => navigate(`/aula/${selectedNode.id}`)}>
                    <IconRotateClockwise size={18} /> Revisar Conteúdo
                  </Button>
                ) : (
                  <Button variant="disabled" className="w-full gap-2">
                    <IconLock size={18} /> Bloqueado
                  </Button>
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

          <div className="p-4 border-t border-border bg-bg shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-dim">Progresso da trilha</span>
              <span className="font-cinzel font-bold text-sm text-green">
                {activeTrilha && activeTrilha.xpTotal > 0 && activeTrilha.nosConcluidosCount !== null ? Math.round((activeTrilha.nosConcluidosCount / (activeTrilha.xpTotal / 100)) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 border border-border overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green to-[#56b364] rounded-full" style={{ width: `${activeTrilha && activeTrilha.xpTotal > 0 && activeTrilha.nosConcluidosCount !== null ? Math.round((activeTrilha.nosConcluidosCount / (activeTrilha.xpTotal / 100)) * 100) : 0}%` }} />
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
