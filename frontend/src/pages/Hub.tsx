import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import api, { unwrap } from '../lib/api';
import type {  RevisaoHoje, Trilha, RankingResponse, Conquista, No  } from "../types";
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { IconStack2, IconSparkles, IconTargetArrow, IconCards, IconFlame, IconBolt, IconCircleCheck, IconAward, IconTrendingUp, IconLock, IconSword, IconHelpCircle, IconMap2, IconTrophy, IconChevronRight, IconCrown, IconCoffee, IconPlayerPlayFilled } from '@tabler/icons-react';

export function Hub() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [trilhas, setTrilhas] = useState<Trilha[]>([]);
  const [catalogo, setCatalogo] = useState<Trilha[]>([]);
  const [revisao, setRevisao] = useState<RevisaoHoje | null>(null);
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  // TODO: endpoint pendente para estatísticas gerais (missões, flashcards dominados, xp hoje, etc)
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
        setConquistas(unwrap(conqRes).slice(0, 4)); // Get latest 4

        // TODO: endpoint pendente para /users/me/stats
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

  if (!user || loading) return <div className="min-h-screen bg-bg grid place-items-center">Carregando...</div>;

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

  const nosConcluidosCount = activeNos.filter(n => n.status === 'CONCLUIDO').length;
  const totalNosTrilha = activeNos.length > 0 ? activeNos.length : (stats?.totalNosTrilha ?? '-');
  const xpGanho = activeNos.filter(n => n.status === 'CONCLUIDO').reduce((acc, n) => acc + n.xpRecompensa, 0);

  const progressPct = activeTrilha && activeTrilha.xpTotal > 0
    ? Math.min(100, Math.round((xpGanho / activeTrilha.xpTotal) * 100))
    : 0;
    
  const proximoNo = activeNos.find(n => n.status === 'EM_PROGRESSO' || n.status === 'DISPONIVEL') || activeNos.find(n => n.status === 'BLOQUEADO');
  const proximoNoTitulo = proximoNo?.titulo ?? 'Não disponível';

  return (
    <div className="min-h-screen">
      <Topbar />

      <main className="w-full max-w-[1440px] mx-auto px-7 py-8 pb-[70px]">
        {/* HERO */}
        <section className="flex items-end justify-between gap-7 flex-wrap mb-8 reveal" style={{ '--d': '.02s' } as any}>
          <div>
            <div className="text-[13px] text-gold font-semibold tracking-[1.5px] uppercase flex items-center gap-2">
              <IconSparkles size={16} /> {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
            </div>
            <h1 className="font-cinzel font-bold text-[34px] leading-[1.15] my-3">
              Bem-vindo de volta, <span className="text-gold">{user.name}</span>
            </h1>
            <div className="flex gap-3 flex-wrap mt-2">
              <div className="flex items-center gap-3 py-2 px-3.5 rounded-sm bg-surface border border-border">
                <IconTargetArrow size={18} className="text-gold" />
                <span className="text-text-dim text-[13px]"><b className="font-bold text-text">{stats?.missoesPendentes ?? '-'}</b> missões pendentes</span>
              </div>
              <div className="flex items-center gap-3 py-2 px-3.5 rounded-sm bg-surface border border-border">
                <IconCards size={18} className="text-blue" />
                <span className="text-text-dim text-[13px]"><b className="font-bold text-text">{revisao?.totalPendentes || 0}</b> flashcards para revisar</span>
              </div>
              <div className="flex items-center gap-3 py-2 px-3.5 rounded-sm bg-surface border border-border">
                <IconFlame size={18} className="text-red" />
                <span className="text-text-dim text-[13px]"><b className="font-bold text-text">{user.currentStreak}</b> dias de streak — não quebre!</span>
              </div>
            </div>
          </div>
          <Button className="gap-2" onClick={() => navigate('/mapa')}>
            <IconPlayerPlayFilled size={18} /> Continuar de onde parou
          </Button>
        </section>

        {/* STATS */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 reveal border-t-[3px] border-t-gold" style={{ '--d': '.06s' } as any}>
            <div className="w-10 h-10 rounded-md grid place-items-center text-gold bg-gold/10 border-[0.5px] border-gold/25 mb-4">
              <IconBolt size={20} />
            </div>
            <div className="font-cinzel font-bold text-[30px] leading-none">{user.totalXp}</div>
            <div className="text-text-dim text-[13px] mt-1.5">XP Total</div>
            <div className="mt-3 text-[12.5px] font-semibold flex items-center gap-1 text-green">
              <IconTrendingUp size={16} /> +{stats?.xpHoje ?? '-'} XP hoje
            </div>
          </Card>
          <Card className="p-5 reveal border-t-[3px] border-t-green" style={{ '--d': '.12s' } as any}>
            <div className="w-10 h-10 rounded-md grid place-items-center text-green bg-green/10 border-[0.5px] border-green/25 mb-4">
              <IconCircleCheck size={20} />
            </div>
            <div className="font-cinzel font-bold text-[30px] leading-none">{stats?.missoesConcluidas ?? '-'}</div>
            <div className="text-text-dim text-[13px] mt-1.5">Missões Concluídas</div>
            <div className="mt-3 text-[12.5px] font-semibold flex items-center gap-1 text-green">
              <IconTrendingUp size={16} /> +{stats?.missoesConcluidasSemana ?? '-'} esta semana
            </div>
          </Card>
          <Card className="p-5 reveal border-t-[3px] border-t-blue" style={{ '--d': '.18s' } as any}>
            <div className="w-10 h-10 rounded-md grid place-items-center text-blue bg-blue/10 border-[0.5px] border-blue/25 mb-4">
              <IconCards size={20} />
            </div>
            <div className="font-cinzel font-bold text-[30px] leading-none">{stats?.flashcardsDominados ?? '-'}</div>
            <div className="text-text-dim text-[13px] mt-1.5">Flashcards Dominados</div>
            <div className="mt-3 text-[12.5px] font-semibold flex items-center gap-1 text-green">
              <IconTrendingUp size={16} /> +{stats?.flashcardsDominadosHoje ?? '-'} hoje
            </div>
          </Card>
          <Card className="p-5 reveal border-t-[3px] border-t-red" style={{ '--d': '.24s' } as any}>
            <div className="w-10 h-10 rounded-md grid place-items-center text-red bg-red/10 border-[0.5px] border-red/25 mb-4">
              <IconFlame size={20} />
            </div>
            <div className="font-cinzel font-bold text-[30px] leading-none">{user.maxStreak}</div>
            <div className="text-text-dim text-[13px] mt-1.5">Streak Máximo</div>
            <div className="mt-3 text-[12.5px] font-semibold flex items-center gap-1 text-text-mute">
              <IconAward size={16} /> recorde pessoal
            </div>
          </Card>
        </section>

        {/* GRID PRINCIPAL */}
        <div className="grid lg:grid-cols-[1.55fr_1fr] gap-6 items-start">
          
          {/* COLUNA ESQUERDA */}
          <div className="flex flex-col gap-6">
            {/* TRILHA ATIVA */}
            <Card className="p-6 relative overflow-hidden shadow-soft reveal" style={{ '--d': '.30s' } as any}>
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex gap-4">
                  <div className="w-[54px] h-[54px] shrink-0 rounded-lg grid place-items-center text-[27px] text-gold border-[0.5px] border-gold/40" style={{ background: 'linear-gradient(155deg, rgba(240,192,96,.18), rgba(240,192,96,.04))' }}>
                    <IconCoffee size={28} />
                  </div>
                  <div>
                    <div className="text-xs text-gold font-semibold tracking-wide uppercase">Trilha ativa</div>
                    <h3 className="font-cinzel font-bold text-[21px] my-1">{activeTrilha?.titulo || 'Nenhuma trilha ativa'}</h3>
                    <p className="text-[13px] text-text-dim">{activeTrilha?.descricao || 'Matricule-se em uma trilha para começar sua jornada.'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-cinzel font-bold text-2xl text-green">{progressPct}%</div>
                  <small className="block text-text-mute text-[11px]">{nosConcluidosCount} / {totalNosTrilha} nós</small>
                </div>
              </div>

              <ProgressBar progress={progressPct} />
              <div className="flex justify-between mt-3 text-[12.5px] text-text-mute">
                <span>{xpGanho} XP conquistados nesta trilha</span>
                {/* TODO: Endpoint precisa enviar quanto XP falta para o próximo nível */}
                <span>{stats?.xpProximoNivel ?? '-'} XP até o próximo nível</span>
              </div>

              <div className="flex items-center justify-between gap-4 mt-5 pt-5 border-t border-border flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-[42px] h-[42px] rounded-md grid place-items-center bg-surface-2 border border-border text-text-dim">
                    <IconLock size={20} />
                  </div>
                  <div>
                    <small className="block text-text-mute text-[11px] uppercase tracking-wide">Próximo nó a desbloquear</small>
                    <b className="font-semibold text-[14.5px]">{proximoNoTitulo}</b>
                  </div>
                </div>
                <Button className="gap-2" onClick={() => activeTrilha ? navigate('/mapa') : trilhasDisponiveis[0] && handleMatricular(trilhasDisponiveis[0].id)} disabled={!activeTrilha && trilhasDisponiveis.length === 0}>
                  <IconSword size={18} /> {activeTrilha ? 'Continuar Missão' : 'Iniciar Trilha'}
                </Button>
              </div>

              {!activeTrilha && trilhasDisponiveis.length > 0 && (
                <div className="mt-5 pt-4 border-t border-border">
                  <div className="text-xs text-gold font-semibold tracking-wide uppercase mb-3">Trilhas disponíveis</div>
                  <div className="flex flex-col gap-2">
                    {trilhasDisponiveis.map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-surface-2 border border-border">
                        <div>
                          <div className="font-semibold text-sm">{t.titulo}</div>
                          <div className="text-xs text-text-dim line-clamp-2">{t.descricao}</div>
                        </div>
                        <Button className="shrink-0 py-1 px-3 text-xs h-auto" onClick={() => handleMatricular(t.id)}>
                          Matricular
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* REVISÃO DIÁRIA */}
            <Card className="p-6 reveal" style={{ '--d': '.36s' } as any}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-cinzel font-semibold text-lg tracking-wide flex items-center gap-2">
                  <IconStack2 size={20} className="text-gold" /> Revisão Diária
                </h2>
                <a href="#" className="text-[13px] text-text-dim flex items-center gap-1 hover:text-blue transition-colors">
                  Sistema Leitner <IconHelpCircle size={16} />
                </a>
              </div>
              <p className="text-text-dim text-[13px] -mt-1.5 mb-4">
                {revisao?.totalPendentes || 0} flashcards aguardam revisão hoje, organizados por caixa de repetição espaçada.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                {[1, 2, 3].map((caixa) => (
                  <div key={caixa} className="border border-border rounded-md p-4 bg-surface-2 relative overflow-hidden transition-all hover:-translate-y-1 hover:border-gold/50">
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${caixa === 1 ? 'bg-red' : caixa === 2 ? 'bg-gold' : 'bg-green'}`} />
                    <div className="text-[11px] uppercase tracking-wide text-text-mute font-semibold">Caixa {caixa}</div>
                    <div className="font-cinzel font-bold text-[28px] my-1">{revisao?.porCaixa?.[caixa]?.length || 0}</div>
                    <div className="text-xs text-text-dim">{caixa === 1 ? 'revisão diária' : caixa === 2 ? 'a cada 3 dias' : 'a cada 7 dias'}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="text-[13px] text-text-dim">
                  <b className="text-text font-bold">{revisao?.totalPendentes || 0} cards</b>
                  {/* TODO: Backend deve calcular tempo estimado ou usar uma constante por card */}
                  {stats?.tempoRevisaoMin && <span> · tempo estimado ~{stats.tempoRevisaoMin} min</span>}
                </div>
                <Button className="gap-2" onClick={() => navigate('/revisao')}>
                  <IconPlayerPlayFilled size={18} /> Iniciar Revisão
                </Button>
              </div>
            </Card>

            {/* AÇÕES RÁPIDAS */}
            <section className="reveal" style={{ '--d': '.42s' } as any}>
              <h2 className="font-cinzel font-semibold text-lg tracking-wide flex items-center gap-2 mb-4">
                <IconBolt size={20} className="text-gold" /> Ações Rápidas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button className="flex items-center gap-3 p-4 rounded-md bg-surface-2 border border-border text-left transition-all hover:-translate-y-1 hover:border-[#3d444d] hover:bg-[#222936]" onClick={() => navigate('/mapa')}>
                  <div className="w-9 h-9 rounded-md grid place-items-center text-gold bg-gold/10 shrink-0"><IconMap2 size={18} /></div>
                  <div><b className="block font-semibold text-sm">Explorar Mapa</b><small className="text-text-mute text-xs">Veja sua jornada completa</small></div>
                </button>
                <button className="flex items-center gap-3 p-4 rounded-md bg-surface-2 border border-border text-left transition-all hover:-translate-y-1 hover:border-[#3d444d] hover:bg-[#222936]" onClick={() => navigate('/revisao')}>
                  <div className="w-9 h-9 rounded-md grid place-items-center text-blue bg-blue/10 shrink-0"><IconCards size={18} /></div>
                  <div><b className="block font-semibold text-sm">Iniciar Revisão</b><small className="text-text-mute text-xs">Revise seus flashcards de hoje</small></div>
                </button>
                <button className="flex items-center gap-3 p-4 rounded-md bg-surface-2 border border-border text-left transition-all hover:-translate-y-1 hover:border-[#3d444d] hover:bg-[#222936]">
                  <div className="w-9 h-9 rounded-md grid place-items-center text-green bg-green/10 shrink-0"><IconCards size={18} /></div>
                  <div><b className="block font-semibold text-sm">Novo Deck</b><small className="text-text-mute text-xs">Organize seus estudos</small></div>
                </button>
                <button className="flex items-center gap-3 p-4 rounded-md bg-surface-2 border border-border text-left transition-all hover:-translate-y-1 hover:border-[#3d444d] hover:bg-[#222936]" onClick={() => navigate('/conquistas')}>
                  <div className="w-9 h-9 rounded-md grid place-items-center text-red bg-red/10 shrink-0"><IconTrophy size={18} /></div>
                  <div><b className="block font-semibold text-sm">Ver Conquistas</b><small className="text-text-mute text-xs">Suas medalhas e troféus</small></div>
                </button>
              </div>
            </section>
          </div>

          {/* COLUNA DIREITA */}
          <div className="flex flex-col gap-6">
            {/* RANKING SEMANAL */}
            <Card className="p-6 reveal" style={{ '--d': '.34s' } as any}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-cinzel font-semibold text-lg tracking-wide flex items-center gap-2">
                  <IconCrown size={20} className="text-gold" /> Ranking Semanal
                </h2>
                <button onClick={() => navigate('/ranking')} className="text-[13px] text-text-dim flex items-center gap-1 hover:text-blue transition-colors">
                  Ver tudo <IconChevronRight size={16} />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {(!ranking?.top10 || ranking.top10.length === 0) ? (
                  <div className="text-center py-6 text-text-mute text-sm">
                    Nenhum jogador no ranking ainda.<br/>Acumule XP para ser o primeiro!
                  </div>
                ) : (
                  (ranking?.top10?.slice(0, 3) || []).map((item, idx) => (
                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-md border transition-all hover:translate-x-1 ${item.isCurrentUser ? 'border-gold/45 bg-gold/5' : 'border-border bg-surface-2'}`}>
                      <div className={`w-5 text-center font-cinzel font-bold text-base ${idx === 0 ? 'text-gold' : 'text-text-mute'}`}>{item.posicao}</div>
                      <div className="w-10 h-10 rounded-md shrink-0 relative grid place-items-center font-cinzel font-bold text-sm text-[#0d1117] bg-gradient-to-br from-gold to-[#caa244]">
                        {idx === 0 && <IconCrown size={16} className="absolute -top-3 left-1/2 -translate-x-1/2 rotate-12 text-gold" />}
                        {item.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          {item.userName}
                          {item.isCurrentUser && <span className="text-[10px] font-bold text-gold border-[0.5px] border-gold/50 rounded-sm px-1 tracking-wide">VOCÊ</span>}
                        </div>
                        {/* TODO: O backend precisa enviar o cargo/título no RankingItem */}
                        <div className="text-xs text-text-mute">{stats?.cargo ?? 'Aventureiro'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-gold">{item.xpSemana}</div>
                        <small className="block text-[11px] text-text-mute">XP semana</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* CONQUISTAS RECENTES */}
            <section className="reveal" style={{ '--d': '.40s' } as any}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-cinzel font-semibold text-lg tracking-wide flex items-center gap-2">
                  <IconAward size={20} className="text-gold" /> Conquistas Recentes
                </h2>
                <button onClick={() => navigate('/conquistas')} className="text-[13px] text-text-dim flex items-center gap-1 hover:text-blue transition-colors">
                  Galeria <IconChevronRight size={16} />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {conquistas.length === 0 ? (
                  <div className="text-center py-6 w-full text-text-mute text-sm">
                    Nenhuma conquista desbloqueada ainda.<br/>Complete missões para ganhar insígnias!
                  </div>
                ) : (
                  conquistas.map((c, i) => (
                    <div key={i} className="flex-none w-[158px] p-4 rounded-md bg-surface border border-border text-center transition-all hover:-translate-y-1 hover:border-gold/45">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full grid place-items-center text-2xl text-gold border-[0.5px] border-gold/40" style={{ background: 'linear-gradient(155deg, rgba(240,192,96,.2), rgba(240,192,96,.04))' }}>
                        <IconAward size={24} />
                      </div>
                      <div className="font-semibold text-[13.5px] line-clamp-1">{c.titulo}</div>
                      <div className="text-[11.5px] text-text-mute mt-1 line-clamp-2">{c.descricao}</div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}
