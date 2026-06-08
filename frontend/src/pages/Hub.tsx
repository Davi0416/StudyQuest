import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import api, { unwrap } from '../lib/api';
import type {  RevisaoHoje, Trilha, RankingResponse, Conquista, No  } from "../types";

export function Hub() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [catalogo, setCatalogo] = useState<Trilha[]>([]);
  const [revisao, setRevisao] = useState<RevisaoHoje | null>(null);
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeNos, setActiveNos] = useState<No[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trilhasRes, revRes, rankRes, conqRes, allTrilhasRes] = await Promise.all([
          api.get('/trilhas/ativas'),
          api.get('/revisao/hoje'),
          api.get('/gamificacao/ranking/semanal'),
          api.get('/gamificacao/conquistas'),
          api.get('/trilhas'),
        ]);

        setTrilhas(unwrap(trilhasRes));
        setCatalogo(unwrap(allTrilhasRes));
        setRevisao(unwrap(revRes));
        setRanking(unwrap(rankRes));
        setConquistas(unwrap(conqRes).slice(0, 4));

        try {
          const statsRes = await api.get('/users/me/stats');
          setStats(unwrap(statsRes));
        } catch (e) {
          console.warn("Stats endpoint not available yet");
        }

        const ativas = unwrap(trilhasRes);
        if (ativas && ativas.length > 0) {
          try {
            const nosRes = await api.get(`/nos?trilhaId=${ativas[0].id}`);
            const nosData = unwrap(nosRes) as No[];
            setActiveNos(nosData.sort((a, b) => a.ordem - b.ordem));
          } catch (e) {
            console.error("Failed to fetch active trail nodes");
          }
        }
      } catch (err) {
        console.error("Failed to fetch hub data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (!user || loading) return <div className="min-h-screen bg-background text-on-background grid place-items-center">Carregando...</div>;

  const activeTrilha = trilhas.length > 0 ? trilhas[0] : null;
  const activeIds = new Set(trilhas.map(t => t.id));
  const trilhasDisponiveis = catalogo.filter(t => !activeIds.has(t.id));

  const handleMatricular = async (trilhaId: number) => {
    try {
      await api.post(`/trilhas/${trilhaId}/matricular`);
      const trilhasRes = await api.get('/trilhas/ativas');
      const ativas = unwrap(trilhasRes);
      setTrilhas(ativas);
      setCatalogo(prev => prev.map(t => t.id === trilhaId ? { ...t, matriculado: true } : t));
      
      if (ativas && ativas.length > 0) {
        const nosRes = await api.get(`/nos?trilhaId=${ativas[0].id}`);
        setActiveNos((unwrap(nosRes) as No[]).sort((a, b) => a.ordem - b.ordem));
      }
    } catch (err) {
      console.error('Failed to enroll in trail', err);
    }
  };

  const xpGanho = activeNos.filter(n => n.status === 'CONCLUIDO').reduce((acc, n) => acc + n.xpRecompensa, 0);
  const progressPct = activeTrilha && activeTrilha.xpTotal > 0
    ? Math.min(100, Math.round((xpGanho / activeTrilha.xpTotal) * 100))
    : 0;
    
  const proximoNo = activeNos.find(n => n.status === 'EM_PROGRESSO' || n.status === 'DISPONIVEL') || activeNos.find(n => n.status === 'BLOQUEADO');
  const proximoNoTitulo = proximoNo?.titulo ?? 'Não disponível';

  return (
    <div className="min-h-screen flex flex-col font-body-md bg-background text-on-background">
      <Topbar />

      <main className="flex-grow w-full max-w-container-max mx-auto px-md py-lg flex flex-col gap-lg">
        
        {/* Hero Section (Player Status) */}
        <section className="bg-surface-container border-border-width border-outline p-md flex flex-col md:flex-row gap-lg items-center relative hard-shadow-surface overflow-hidden">
          {/* Decorative Fire Streak Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: 'linear-gradient(45deg, transparent 40%, rgba(240, 192, 96, 0.5) 45%, rgba(255, 180, 171, 0.8) 50%, transparent 60%)' }}></div>
          
          {/* Avatar Frame */}
          <div className="relative w-32 h-32 flex-shrink-0 border-border-width border-primary p-1 bg-surface-container-lowest z-10">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar do Jogador"
                className="w-full h-full object-cover grayscale contrast-125"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex'); }}
              />
            ) : null}
            <div className="w-full h-full flex items-center justify-center font-code text-4xl text-on-surface" style={{ display: user.avatarUrl ? 'none' : 'flex' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-3 -right-3 bg-primary text-on-primary border-border-width border-outline font-label-caps text-label-caps px-2 py-1">
                LVL {user.lvl}
            </div>
          </div>

          {/* Stats Bars */}
          <div className="flex-grow w-full flex flex-col gap-sm z-10">
            <div className="flex justify-between items-end mb-1">
              <div>
                <h2 className="font-h3 text-h3 text-primary uppercase">{user.name}</h2>
                <p className="font-label-caps text-label-caps text-on-surface-variant">Status: EM ATIVIDADE | {stats?.cargo ?? 'Aventureiro'}</p>
              </div>
              <div className="flex items-center gap-1 text-error">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                <span className="font-h3 text-h3">{user.currentStreak}</span>
              </div>
            </div>

            {/* HP Bar */}
            <div className="flex items-center gap-sm">
              <span className="font-label-caps text-label-caps w-12 text-tertiary">HP</span>
              <div className="flex-grow h-6 bg-surface-dim border-border-width border-black relative">
                <div className="absolute inset-0 bg-tertiary progress-bar-segment" style={{ width: '100%' }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-black font-bold z-10 mix-blend-difference font-code">{stats?.flashcardsDominados ?? 0} DOMINADOS</span>
              </div>
            </div>

            {/* Mana Bar */}
            <div className="flex items-center gap-sm">
              <span className="font-label-caps text-label-caps w-12 text-secondary">MP</span>
              <div className="flex-grow h-6 bg-surface-dim border-border-width border-black relative">
                <div className="absolute inset-0 bg-secondary progress-bar-segment" style={{ width: '100%' }}></div>
                <span className="absolute inset-0 flex items-center justify-center text-black font-bold z-10 mix-blend-difference font-code">{stats?.missoesConcluidas ?? 0} MISSÕES</span>
              </div>
            </div>

            {/* XP Bar */}
            <div className="flex items-center gap-sm">
              <span className="font-label-caps text-label-caps w-12 text-primary">XP</span>
              <div className="flex-grow h-4 bg-surface-dim border-border-width border-black relative mt-1">
                <div className="absolute inset-0 bg-primary progress-bar-segment" style={{ width: `${(user.totalXp % 1000) / 10}%` }}></div>
              </div>
              <span className="font-code text-code w-16 text-right text-primary">{user.totalXp} XP</span>
            </div>
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          
          {/* Left Column: Active Mission / Map */}
          <div className="md:col-span-8 flex flex-col gap-md">
            <div className="bg-surface-container border-border-width border-outline-variant pixel-shadow h-full flex flex-col">
              <div className="bg-surface-container-high border-b-border-width border-outline-variant px-sm py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">map</span>
                  <h3 className="font-label-caps text-label-caps text-on-surface uppercase">COORDENADAS ATUAIS</h3>
                </div>
                <span className="bg-primary-container text-on-primary-container px-2 py-1 font-code text-xs border-[2px] border-black">
                  {activeTrilha ? 'ZONA ATIVA' : 'SEM ZONA'}
                </span>
              </div>
              
              <div className="p-sm flex-grow flex flex-col relative min-h-[400px]">
                {/* Simulated Map Area */}
                <div className="absolute inset-sm border-border-width border-outline-variant bg-surface-container-lowest overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 1000 400" preserveAspectRatio="none" style={{ stroke: '#f0c060', strokeWidth: 2, fill: 'none' }}>
                     <path d="M0,100 Q250,20 500,100 T1000,100" />
                     <path d="M0,200 Q250,120 500,200 T1000,200" />
                     <path d="M0,300 Q250,220 500,300 T1000,300" />
                  </svg>
                  
                  {activeTrilha ? (
                    <>
                      {/* Dynamic path connecting nodes up to the last completed/in-progress */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 400" preserveAspectRatio="none" style={{ stroke: '#f0c060', strokeWidth: 4, fill: 'none', strokeDasharray: '12 6' }}>
                        <path d={`M100,${activeNos.length > 0 ? (100 <= 500 ? 200 - 160*(100/500) + 160*Math.pow(100/500, 2) : 200 + 160*((100-500)/500) - 160*Math.pow((100-500)/500, 2)) : 200} ` + 
                          activeNos.map((no, i) => {
                            if (no.status === 'BLOQUEADO' && i > 0 && activeNos[i-1].status === 'BLOQUEADO') return ''; // Don't draw path to blocked nodes past the first one
                            const N = activeNos.length;
                            const spacing = 800 / Math.max(1, N - 1);
                            const x = 100 + i * spacing;
                            const y = x <= 500 ? 200 - 160*(x/500) + 160*Math.pow(x/500, 2) : 200 + 160*((x-500)/500) - 160*Math.pow((x-500)/500, 2);
                            return `L${x},${y}`;
                          }).join(' ')
                        } />
                      </svg>
                      
                      {activeNos.map((no, i) => {
                        const N = activeNos.length;
                        const spacing = 800 / Math.max(1, N - 1);
                        const x = 100 + i * spacing;
                        const y = x <= 500 ? 200 - 160*(x/500) + 160*Math.pow(x/500, 2) : 200 + 160*((x-500)/500) - 160*Math.pow((x-500)/500, 2);
                        
                        const isCurrent = no.status === 'EM_PROGRESSO' || no.status === 'DISPONIVEL' || (no.status === 'BLOQUEADO' && i > 0 && activeNos[i-1].status === 'CONCLUIDO');
                        const isCompleted = no.status === 'CONCLUIDO';
                        
                        return (
                          <div key={no.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center group cursor-pointer"
                               style={{ left: `${(x / 1000) * 100}%`, top: `${(y / 400) * 100}%` }}
                               onClick={() => navigate('/mapa')}>
                            
                            {/* Marker */}
                            {isCurrent ? (
                              <div className="w-5 h-5 bg-error rounded-full animate-pulse border-[3px] border-white pixel-shadow flex items-center justify-center"></div>
                            ) : isCompleted ? (
                              <div className="w-5 h-5 bg-primary border-[2px] border-black flex items-center justify-center transform rotate-45 pixel-shadow">
                                <span className="material-symbols-outlined text-[10px] text-black -rotate-45">check</span>
                              </div>
                            ) : (
                              <div className="w-4 h-4 bg-surface-container-highest border-[2px] border-outline-variant rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-[10px] text-outline-variant">lock</span>
                              </div>
                            )}
                            
                            {/* Tooltip */}
                            <div className="absolute top-full mt-2 w-max bg-surface-container-highest border-border-width border-outline text-on-surface text-[10px] font-code px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                               {no.titulo}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* End Flag */}
                      {activeNos.length > 0 && (
                        <div className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                             style={{ left: `${((100 + (activeNos.length - 1) * (800 / Math.max(1, activeNos.length - 1))) / 1000) * 100}%`, top: `${((100 + (activeNos.length - 1) * (800 / Math.max(1, activeNos.length - 1))) <= 500 ? 200 - 160*((100 + (activeNos.length - 1) * (800 / Math.max(1, activeNos.length - 1)))/500) + 160*Math.pow(((100 + (activeNos.length - 1) * (800 / Math.max(1, activeNos.length - 1))))/500, 2) : 200 + 160*((100 + (activeNos.length - 1) * (800 / Math.max(1, activeNos.length - 1))) - 500)/500 - 160*Math.pow(((100 + (activeNos.length - 1) * (800 / Math.max(1, activeNos.length - 1))) - 500)/500, 2)) / 400 * 100}%` }}>
                           <div className="absolute -top-8 -right-2 w-6 h-6 bg-primary border-[2px] border-black flex items-center justify-center pixel-shadow">
                             <span className="material-symbols-outlined text-black text-[14px] font-bold">flag</span>
                           </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-center font-code text-on-surface-variant">
                      NENHUMA MISSÃO ATIVA.<br/>SELECIONE UMA TRILHA.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-md border-t-border-width border-outline-variant bg-surface-container-low flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-h3 text-h3 text-on-surface uppercase">{activeTrilha?.titulo || 'Operação: Nenhuma'}</h3>
                  <p className="font-code text-code text-on-surface-variant">Objetivo: {activeTrilha ? proximoNoTitulo : 'Matricule-se para iniciar.'}</p>
                </div>
                <button 
                  onClick={() => activeTrilha ? navigate('/mapa') : trilhasDisponiveis[0] && handleMatricular(trilhasDisponiveis[0].id)}
                  disabled={!activeTrilha && trilhasDisponiveis.length === 0}
                  className="bg-primary text-on-primary border-border-width border-black font-label-caps text-label-caps px-lg py-sm pixel-shadow pixel-shadow-hover pixel-shadow-active transition-all cursor-pointer disabled:opacity-50 disabled:grayscale"
                >
                  {activeTrilha ? 'CONTINUAR MISSÃO' : 'INICIAR MISSÃO'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Leaderboard & Achievements */}
          <div className="md:col-span-4 flex flex-col gap-lg">
            
            {/* Arcade Leaderboard */}
            <div className="bg-surface-container border-border-width border-outline-variant pixel-shadow">
              <div className="bg-surface-container-high border-b-border-width border-outline-variant px-sm py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">trophy</span>
                  <h3 className="font-label-caps text-label-caps text-on-surface text-primary">RANKING SEMANAL</h3>
                </div>
              </div>
              <ul className="p-sm space-y-2 font-code text-code">
                {(!ranking?.top10 || ranking.top10.length === 0) ? (
                   <li className="p-2 text-on-surface-variant text-center">SEM DADOS</li>
                ) : (
                   (ranking?.top10?.slice(0, 4) || []).map((item, idx) => (
                     <li key={idx} className={`flex justify-between items-center p-2 transition-colors ${item.isCurrentUser ? 'bg-surface-container-highest border-[2px] border-primary text-primary' : 'text-on-surface hover:bg-surface-variant'}`}>
                       <span>{item.posicao}. {item.userName.toUpperCase()} {item.isCurrentUser && '(VOCÊ)'}</span>
                       <span>{item.xpSemana}</span>
                     </li>
                   ))
                )}
              </ul>
            </div>

            {/* Achievements Log */}
            <div className="bg-surface-container border-border-width border-outline-variant pixel-shadow flex-grow">
              <div className="bg-surface-container-high border-b-border-width border-outline-variant px-sm py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface">stars</span>
                <h3 className="font-label-caps text-label-caps text-on-surface">REGISTRO DE CONQUISTAS</h3>
              </div>
              <div className="p-sm flex flex-col gap-sm">
                {conquistas.length === 0 ? (
                  <div className="text-center py-4 font-code text-on-surface-variant">NENHUM REGISTRO</div>
                ) : (
                  conquistas.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex items-start space-x-sm bg-surface-dim p-2 border-[2px] border-outline-variant">
                      <div className="w-10 h-10 bg-tertiary-container border-[2px] border-black flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-on-tertiary-container" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                      </div>
                      <div>
                        <h4 className="font-label-caps text-sm text-tertiary uppercase">{c.titulo}</h4>
                        <p className="font-code text-xs text-on-surface-variant">{c.descricao}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
