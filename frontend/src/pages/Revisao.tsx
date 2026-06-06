import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import api, { unwrap } from '../lib/api';
import type {  LeitnerCardRevisao, RevisaoHoje, RevisaoTodos  } from "../types";
import { Button } from '../components/ui/Button';

export function Revisao() {
  const navigate = useNavigate();
  const [fila, setFila] = useState<LeitnerCardRevisao[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showVerso, setShowVerso] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState(() => {
    try {
      const saved: { card: LeitnerCardRevisao; resultado: 'facil' | 'ok' | 'dificil' }[] =
        JSON.parse(sessionStorage.getItem(`revisao-historico-${new Date().toISOString().slice(0, 10)}`) || '[]');
      return saved.reduce((acc, h) => ({ ...acc, [h.resultado]: acc[h.resultado] + 1 }), { facil: 0, ok: 0, dificil: 0 });
    } catch { return { facil: 0, ok: 0, dificil: 0 }; }
  });
  const HISTORICO_KEY = `revisao-historico-${new Date().toISOString().slice(0, 10)}`;

  const [historico, setHistorico] = useState<{ card: LeitnerCardRevisao; resultado: 'facil' | 'ok' | 'dificil' }[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(HISTORICO_KEY) || '[]'); } catch { return []; }
  });

  const [activeTab, setActiveTab] = useState<'hoje' | 'meus'>('hoje');
  const [boxStats, setBoxStats] = useState<Record<number, number>>({});
  const [hojeData, setHojeData] = useState<RevisaoHoje | null>(null);
  const [todosData, setTodosData] = useState<RevisaoTodos | null>(null);
  const [expandedBox, setExpandedBox] = useState<number | null>(null);

  useEffect(() => {
    const fetchRevisao = async () => {
      try {
        const [resHoje, resStats, resTodos] = await Promise.all([
          api.get('/revisao/hoje'),
          api.get('/revisao/stats'),
          api.get('/revisao/todos')
        ]);
        const data = unwrap(resHoje) as RevisaoHoje;
        const statsData = unwrap(resStats) as Record<number, number>;
        const todos = unwrap(resTodos) as RevisaoTodos;
        
        setHojeData(data);
        setBoxStats(statsData);
        setTodosData(todos);

        const flatFila: LeitnerCardRevisao[] = [];
        for (let i = 1; i <= 5; i++) {
          if (data.porCaixa[i]) flatFila.push(...data.porCaixa[i]);
        }
        if (flatFila.length === 0 && historico.length > 0) {
          setFinished(true);
        }
        setFila(flatFila);
      } catch (err) {
        console.error('Failed to fetch revisao', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRevisao();
  }, []);

  const handleResponse = async (resultado: 'facil' | 'ok' | 'dificil') => {
    const card = fila[currentIndex];
    if (!card) return;

    try {
      await api.post(`/revisao/${card.leitnerCardId}/responder`, { resultado });
      setStats(prev => ({ ...prev, [resultado]: prev[resultado] + 1 }));
      setHistorico(prev => {
        const next = [...prev, { card, resultado }];
        try { sessionStorage.setItem(HISTORICO_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
      
      if (currentIndex + 1 < fila.length) {
        setCurrentIndex(currentIndex + 1);
        setShowVerso(false);
      } else {
        setFinished(true);
      }
    } catch (err) {
      console.error('Erro ao salvar resposta', err);
    }
  };

  const handleRevisarCaixa = (caixa: number, forcarTodos = false) => {
    const cards = forcarTodos
      ? (todosData?.porCaixa[caixa] || [])
      : (hojeData?.porCaixa[caixa] || []);
    setFila(cards);
    setCurrentIndex(0);
    setShowVerso(false);
    setFinished(false);
    setHistorico([]);
    setStats({ facil: 0, ok: 0, dificil: 0 });
    setActiveTab('hoje');
  };

  if (loading) return <div className="min-h-screen bg-bg grid place-items-center">Carregando revisão...</div>;

  const currentCard = fila[currentIndex];
  const isRevisando = fila.length > 0 && !finished;
  const dificeis = historico.filter(h => h.resultado === 'dificil');

  const handleRefazerDificeis = () => {
    setFila(dificeis.map(h => h.card));
    setCurrentIndex(0);
    setShowVerso(false);
    setFinished(false);
    setHistorico([]);
    setStats({ facil: 0, ok: 0, dificil: 0 });
  };

  const renderHistorico = () => (
    historico.length > 0 && (
      <div className="mb-8 text-left space-y-2 w-full">
        <h3 className="text-text font-bold mb-3">Histórico desta sessão:</h3>
        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
          {historico.map((h, i) => (
            <div key={i} className="bg-surface-2 p-3 rounded-lg border border-border text-sm flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-text truncate pr-2">{h.card.frente}</span>
                <span className={`text-xs font-bold ${h.resultado === 'facil' ? 'text-green' : h.resultado === 'ok' ? 'text-gold' : 'text-red'}`}>
                  {h.resultado === 'facil' ? 'Fácil' : h.resultado === 'ok' ? 'Ok' : 'Difícil'}
                </span>
              </div>
              <div className="text-text-dim text-xs truncate">{h.card.verso}</div>
            </div>
          ))}
        </div>
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Topbar />
      
      {(!isRevisando || activeTab !== 'hoje') && (
        <div className="flex justify-center gap-4 p-4 border-b border-border bg-surface-2">
          <button
            onClick={() => setActiveTab('hoje')}
            className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${
              activeTab === 'hoje' ? 'border-gold text-gold' : 'border-transparent text-text-mute hover:text-text'
            }`}
          >
            Revisão de Hoje
          </button>
          <button
            onClick={() => setActiveTab('meus')}
            className={`px-4 py-2 font-bold text-sm transition-colors border-b-2 ${
              activeTab === 'meus' ? 'border-gold text-gold' : 'border-transparent text-text-mute hover:text-text'
            }`}
          >
            Meus Flashcards
          </button>
        </div>
      )}

      {activeTab === 'hoje' && (
        <div className="flex-1 flex flex-col">
          {isRevisando ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="text-text-dim mb-4 text-sm font-semibold">
                Card {currentIndex + 1} de {fila.length}
              </div>
              
              <div className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-soft min-h-[300px] flex flex-col items-center justify-center p-8 text-center text-lg leading-relaxed relative">
                <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 bg-surface-2 border border-border rounded-md text-text-mute">
                  {['Difícil', 'Aprendendo', 'Praticando', 'Avançado', 'Dominado'][currentCard.caixa - 1]}
                </div>
                
                <div className="mb-8">{currentCard.frente}</div>
                
                {showVerso ? (
                  <>
                    <div className="w-full h-px bg-border my-6"></div>
                    <div className="text-text-dim">{currentCard.verso}</div>
                  </>
                ) : null}
              </div>

              <div className="mt-8 flex gap-4 w-full max-w-2xl justify-center">
                {!showVerso ? (
                  <Button onClick={() => setShowVerso(true)} className="w-full max-w-xs">Revelar Resposta</Button>
                ) : (
                  <>
                    <Button onClick={() => handleResponse('dificil')} className="flex-1 !bg-none !bg-red/10 !text-red !border-red/40 !shadow-none border hover:!bg-red/20">Difícil</Button>
                    <Button onClick={() => handleResponse('ok')} className="flex-1 !bg-none !bg-gold/10 !text-gold !border-gold/40 !shadow-none border hover:!bg-gold/20">Ok</Button>
                    <Button onClick={() => handleResponse('facil')} className="flex-1 !bg-none !bg-green/10 !text-green !border-green/40 !shadow-none border hover:!bg-green/20">Fácil</Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 grid place-items-center p-6">
              <div className="max-w-md w-full bg-surface border border-border p-8 rounded-xl text-center flex flex-col items-center">
                <h2 className="font-cinzel font-bold text-2xl text-gold mb-2">Revisão Concluída!</h2>
                <p className="text-text-dim mb-6">Você revisou todos os cards de hoje.</p>
                
                <div className="grid grid-cols-3 gap-4 mb-8 w-full">
                  <div className="bg-surface-2 p-3 rounded-lg border border-border">
                    <div className="text-green font-bold text-xl">{stats.facil}</div>
                    <div className="text-xs text-text-mute">Fácil</div>
                  </div>
                  <div className="bg-surface-2 p-3 rounded-lg border border-border">
                    <div className="text-gold font-bold text-xl">{stats.ok}</div>
                    <div className="text-xs text-text-mute">Ok</div>
                  </div>
                  <div className="bg-surface-2 p-3 rounded-lg border border-border">
                    <div className="text-red font-bold text-xl">{stats.dificil}</div>
                    <div className="text-xs text-text-mute">Difícil</div>
                  </div>
                </div>

                {renderHistorico()}

                <div className="flex flex-col gap-3 w-full mt-4">
                  {dificeis.length > 0 && (
                    <Button onClick={handleRefazerDificeis} className="!bg-none !bg-red/10 !text-red !border-red/40 !shadow-none border hover:!bg-red/20">
                      Refazer Difíceis ({dificeis.length})
                    </Button>
                  )}
                  <Button onClick={() => navigate('/')}>Voltar ao Hub</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'meus' && (
        <div className="flex-1 p-6 flex flex-col items-center">
          <div className="w-full max-w-2xl flex flex-col gap-8">
            <div className="grid gap-4">
              {[1, 2, 3, 4, 5].map(caixa => {
                const pendentes = hojeData?.porCaixa[caixa]?.length || 0;
                const total = boxStats[caixa] || 0;
                const intervalos = ['1d', '3d', '7d', '14d', '30d'];
                const nomesCaixa = ['Difícil', 'Aprendendo', 'Praticando', 'Avançado', 'Dominado'];
                const isExpanded = expandedBox === caixa;
                const todosCaixa = todosData?.porCaixa[caixa] || [];
                const startOfToday = new Date().setHours(0,0,0,0);
                
                return (
                  <div key={caixa} className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-2 transition-colors"
                      onClick={() => setExpandedBox(isExpanded ? null : caixa)}
                    >
                      <div>
                        <h3 className="text-gold font-bold text-lg mb-1 font-cinzel">{nomesCaixa[caixa - 1]} <span className="text-text-mute text-sm ml-1 font-sans">({intervalos[caixa - 1]})</span></h3>
                        <div className="text-text-dim text-sm flex gap-4">
                          <span>Total: <strong className="text-text">{todosCaixa.length}</strong></span>
                          {pendentes > 0 && (
                            <span className="text-red font-semibold">{pendentes} pendentes hoje</span>
                          )}
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        {pendentes > 0 ? (
                          <Button onClick={() => handleRevisarCaixa(caixa)} size="sm">
                            Revisar agora ({pendentes})
                          </Button>
                        ) : todosCaixa.length > 0 ? (
                          <Button onClick={() => handleRevisarCaixa(caixa, true)} size="sm"
                            className="!bg-none !bg-surface-2 !text-text-mute border border-border hover:!bg-surface hover:!text-text">
                            Revisar tudo ({todosCaixa.length})
                          </Button>
                        ) : (
                          <Button size="sm" className="opacity-40 cursor-not-allowed pointer-events-none !bg-surface-2 !text-text-mute border-border">
                            Vazia
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && todosCaixa.length > 0 && (
                      <div className="p-4 border-t border-border bg-bg/50">
                        <div className="text-sm font-semibold text-text-dim mb-3">Todos os cards desta caixa:</div>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                          {todosCaixa.map((card, i) => {
                            const isPendente = card.proximaRevisao ? card.proximaRevisao <= startOfToday : true;
                            return (
                              <div key={i} className="bg-surface-2 p-3 rounded-lg border border-border text-sm flex flex-col gap-1">
                                <div className="flex justify-between items-start">
                                  <span className="font-semibold text-text truncate pr-2">{card.frente}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPendente ? 'bg-green/10 text-green' : 'bg-surface text-text-mute border border-border'}`}>
                                    {card.proximaRevisao ? `Próxima revisão: ${new Date(card.proximaRevisao).toLocaleDateString('pt-BR')}` : 'Revisão pendente'}
                                  </span>
                                </div>
                                <div className="text-text-dim text-xs truncate">{card.verso}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {isExpanded && todosCaixa.length === 0 && (
                      <div className="p-4 border-t border-border bg-bg/50 text-sm text-text-mute text-center">
                        Nenhum card armazenado nesta caixa.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
