import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import api, { unwrap } from '../lib/api';
import type {  LeitnerCardRevisao, RevisaoHoje  } from "../types";
import { Button } from '../components/ui/Button';

export function Revisao() {
  const navigate = useNavigate();
  const [fila, setFila] = useState<LeitnerCardRevisao[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showVerso, setShowVerso] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState({ facil: 0, ok: 0, dificil: 0 });

  useEffect(() => {
    const fetchRevisao = async () => {
      try {
        const res = await api.get('/revisao/hoje');
        const data = unwrap(res) as RevisaoHoje;
        
        const flatFila: LeitnerCardRevisao[] = [];
        for (let i = 1; i <= 5; i++) {
          if (data.porCaixa[i]) flatFila.push(...data.porCaixa[i]);
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

  if (loading) return <div className="min-h-screen bg-bg grid place-items-center">Carregando revisão...</div>;

  if (finished || fila.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <Topbar />
        <div className="flex-1 grid place-items-center p-6">
          <div className="max-w-md w-full bg-surface border border-border p-8 rounded-xl text-center">
            <h2 className="font-cinzel font-bold text-2xl text-gold mb-2">Revisão Concluída!</h2>
            <p className="text-text-dim mb-6">Você revisou todos os cards de hoje.</p>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
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

            <Button onClick={() => navigate('/')}>Voltar ao Hub</Button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = fila[currentIndex];

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Topbar />
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-text-dim mb-4 text-sm font-semibold">
          Card {currentIndex + 1} de {fila.length}
        </div>
        
        <div className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-soft min-h-[300px] flex flex-col items-center justify-center p-8 text-center text-lg leading-relaxed relative">
          <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 bg-surface-2 border border-border rounded-md text-text-mute">
            Caixa {currentCard.caixa}
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
    </div>
  );
}
