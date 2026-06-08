import React, { useEffect, useState } from 'react';
import { Topbar } from '../components/Topbar';
import { useUser } from '../context/UserContext';
import api, { unwrap } from '../lib/api';
import type { RankingResponse, RankingItem } from '../types';

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export function Ranking() {
  const { user } = useUser();
  const [ranking, setRanking] = useState<RankingResponse | null>(null);

  useEffect(() => {
    api.get('/gamificacao/ranking/semanal')
      .then(r => setRanking(unwrap(r)))
      .catch(() => {});
  }, []);

  const top10 = ranking?.top10 ?? [];
  const me = ranking?.posicaoAtual;
  const [p1, p2, p3] = [top10[0], top10[1], top10[2]];

  if (!user) return null;

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      <Topbar />

      <main className="flex-grow w-full max-w-container-max mx-auto px-md py-lg flex flex-col gap-lg pb-36">
        
        {/* Header */}
        <header className="flex flex-col items-center justify-center text-center gap-xs mt-md mb-md">
          <h1 className="font-h1 text-h1 text-primary tracking-widest uppercase drop-shadow-[4px_4px_0_rgba(0,0,0,1)] flex items-center gap-2">
            MAIORES PONTUAÇÕES
          </h1>
          <p className="font-code text-code text-on-surface-variant uppercase">Os estudantes que mais acumularam XP nesta semana</p>
          <div className="font-label-caps text-[10px] text-tertiary border-border-width border-outline px-2 py-1 mt-2">PLACAR ZERA TODA SEGUNDA-FEIRA</div>
        </header>

        {/* Podium */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-md items-end">
          {top10.length === 0 ? (
            <div className="md:col-span-3 flex flex-col items-center justify-center py-10 text-center text-on-surface-variant gap-2 bg-surface-container border-border-width border-outline pixel-shadow">
              <span className="material-symbols-outlined text-4xl mb-1">sentiment_dissatisfied</span>
              <span className="font-h3 text-h3">O pódio está vazio</span>
              <span className="font-code text-code">Seja o primeiro a entrar no ranking!</span>
            </div>
          ) : (
            <>
              {/* Rank 2 */}
              <div className="border-border-width border-outline bg-surface-container-high p-sm flex flex-col items-center gap-sm relative order-2 md:order-1 h-[250px] justify-end pixel-shadow">
                <div className="absolute -top-6 bg-surface-container border-[3px] border-on-surface w-12 h-12 flex items-center justify-center font-h3 text-h3 text-secondary z-10 rotate-[-10deg]">2</div>
                <div className="w-24 h-24 border-border-width border-outline bg-surface overflow-hidden flex items-center justify-center">
                  <div className="w-full h-full bg-secondary-container flex items-center justify-center font-h2 text-h2 text-on-secondary-container">
                    {p2 ? initials(p2.userName) : '-'}
                  </div>
                </div>
                <div className="text-center w-full">
                  <h3 className="font-h3 text-h3 text-secondary truncate">{p2 ? p2.userName : 'Vazio'}</h3>
                  <div className="font-label-caps text-label-caps text-on-surface-variant mt-1">XP: {p2 ? p2.xpSemana : 0}</div>
                </div>
                <div className="w-full h-4 border-[3px] border-black bg-surface relative mt-2">
                  <div className="h-full bg-secondary w-[80%] border-r-[2px] border-black" style={{ width: p2 && p1 && p1.xpSemana > 0 ? `${(p2.xpSemana / p1.xpSemana) * 100}%` : '0%' }}></div>
                </div>
              </div>

              {/* Rank 1 */}
              <div className="border-border-width border-primary bg-surface-container-highest p-sm flex flex-col items-center gap-sm relative order-1 md:order-2 h-[300px] justify-end pixel-shadow transform md:-translate-y-4">
                <div className="absolute -top-8 flex flex-col items-center z-10">
                  <span className="material-symbols-outlined text-primary text-4xl mb-1 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]" style={{ fontVariationSettings: "'FILL' 1" }}>crown</span>
                  <div className="bg-primary-container border-[3px] border-on-primary-container w-16 h-16 flex items-center justify-center font-h1 text-h3 text-on-primary-container">1</div>
                </div>
                <div className="w-32 h-32 border-border-width border-primary bg-surface overflow-hidden flex items-center justify-center">
                   <div className="w-full h-full bg-primary flex items-center justify-center font-h1 text-h1 text-on-primary">
                    {p1 ? initials(p1.userName) : '-'}
                  </div>
                </div>
                <div className="text-center w-full">
                  <h3 className="font-h3 text-h3 text-primary truncate drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">{p1 ? p1.userName : 'Vazio'}</h3>
                  <div className="font-label-caps text-label-caps text-primary-container mt-1 animate-pulse">XP: {p1 ? p1.xpSemana : 0}</div>
                </div>
                <div className="w-full h-4 border-[3px] border-black bg-surface relative mt-2">
                  <div className="h-full bg-primary w-[98%] border-r-[2px] border-black" style={{ width: p1 && p1.xpSemana > 0 ? '100%' : '0%' }}></div>
                </div>
              </div>

              {/* Rank 3 */}
              <div className="border-border-width border-outline bg-surface-container-high p-sm flex flex-col items-center gap-sm relative order-3 md:order-3 h-[220px] justify-end pixel-shadow">
                <div className="absolute -top-6 bg-surface-container border-[3px] border-on-surface w-12 h-12 flex items-center justify-center font-h3 text-h3 text-tertiary z-10 rotate-[10deg]">3</div>
                <div className="w-20 h-20 border-border-width border-outline bg-surface overflow-hidden flex items-center justify-center">
                  <div className="w-full h-full bg-tertiary-container flex items-center justify-center font-h2 text-h2 text-on-tertiary-container">
                    {p3 ? initials(p3.userName) : '-'}
                  </div>
                </div>
                <div className="text-center w-full">
                  <h3 className="font-h3 text-h3 text-tertiary truncate">{p3 ? p3.userName : 'Vazio'}</h3>
                  <div className="font-label-caps text-label-caps text-on-surface-variant mt-1">XP: {p3 ? p3.xpSemana : 0}</div>
                </div>
                <div className="w-full h-4 border-[3px] border-black bg-surface relative mt-2">
                  <div className="h-full bg-tertiary w-[70%] border-r-[2px] border-black" style={{ width: p3 && p1 && p1.xpSemana > 0 ? `${(p3.xpSemana / p1.xpSemana) * 100}%` : '0%' }}></div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Leaderboard List */}
        <section className="border-border-width border-outline bg-surface-container-high flex flex-col pixel-shadow mt-md">
          {/* Header Row */}
          <div className="flex items-center px-sm py-xs border-b-[3px] border-outline bg-surface-container-highest">
            <div className="w-16 font-label-caps text-label-caps text-on-surface-variant">RANK</div>
            <div className="flex-1 font-label-caps text-label-caps text-on-surface-variant">JOGADOR</div>
            <div className="w-32 text-right font-label-caps text-label-caps text-on-surface-variant">PONTUAÇÃO (XP)</div>
          </div>
          
          {/* List Items */}
          <div className="flex flex-col">
            {top10.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-on-surface-variant gap-2">
                <span className="font-code text-code text-on-surface-variant">Nenhum dado de ranking ainda. Acumule XP para aparecer no placar.</span>
              </div>
            ) : (
              top10.map((item, i) => (
                <div key={item.posicao} className={`flex items-center px-sm py-xs border-b-[3px] border-outline hover:bg-surface-container transition-colors group cursor-pointer ${item.isCurrentUser ? 'bg-primary-container/10 border-l-[6px] border-l-primary' : ''}`}>
                  <div className={`w-16 font-h3 text-h3 ${i < 3 ? 'text-primary' : 'text-on-surface'}`}>{item.posicao}</div>
                  <div className="flex-1 flex items-center gap-xs">
                    <div className="w-8 h-8 border-border-width border-outline bg-surface flex items-center justify-center overflow-hidden shrink-0">
                      <div className="w-full h-full bg-surface-container-highest flex items-center justify-center text-on-surface font-code text-xs">
                        {initials(item.userName)}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="font-code text-code text-on-surface group-hover:text-primary transition-colors flex items-center gap-2">
                        {item.userName}
                        {item.isCurrentUser && <span className="bg-primary text-on-primary px-1 text-[10px] font-label-caps">VOCÊ</span>}
                      </div>
                      <div className="text-[10px] text-on-surface-variant uppercase font-code">{(item as any).cargo ?? 'Aventureiro'}</div>
                    </div>
                  </div>
                  <div className="w-32 text-right font-code text-code text-primary-container">{item.xpSemana.toLocaleString('pt-BR')}</div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>

      {/* DOCK DO USUÁRIO (fora do top 10) */}
      {me && me.posicao > 10 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 w-full bg-surface-container-highest border-t-[3px] border-primary p-sm">
          <div className="max-w-container-max mx-auto flex items-center gap-md">
            <div className="font-h3 text-h3 text-primary shrink-0">{me.posicao}</div>
            <div className="w-12 h-12 border-border-width border-primary bg-primary shrink-0 grid place-items-center font-h2 text-h2 text-on-primary">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="font-h3 text-h3 flex items-center gap-2 text-on-surface">
                {user.name}
                <span className="bg-primary text-on-primary px-1 text-[10px] font-label-caps">VOCÊ</span>
              </div>
              <div className="text-sm font-code text-on-surface-variant">
                Faltam <span className="text-primary font-bold">{Math.max(0, (top10[9]?.xpSemana ?? 0) - me.xpSemana)} XP</span> para o Top 10
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-h3 text-h3 text-primary">{me.xpSemana.toLocaleString('pt-BR')}</div>
              <div className="font-label-caps text-[10px] text-on-surface-variant">XP SEMANA</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
