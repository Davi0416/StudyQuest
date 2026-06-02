import React, { useEffect, useState } from 'react';
import { Topbar } from '../components/Topbar';
import { Card } from '../components/ui/Card';
import { useUser } from '../context/UserContext';
import api, { unwrap } from '../lib/api';
import type { RankingResponse, RankingItem } from '../types';
import {
  IconCrown, IconTrophy, IconListNumbers, IconBolt,
  IconArrowUpRight, IconArrowDownRight, IconMinus, IconCalendarWeek, IconClockHour4,
} from '@tabler/icons-react';

const MOCK_TOP10: RankingItem[] = [
  { posicao: 1, userName: 'Marina R.', avatarUrl: null, xpSemana: 3240, isCurrentUser: false },
  { posicao: 2, userName: 'Rafael F.', avatarUrl: null, xpSemana: 2980, isCurrentUser: false },
  { posicao: 3, userName: 'Letícia M.', avatarUrl: null, xpSemana: 2510, isCurrentUser: false },
  { posicao: 4, userName: 'Bruno A.', avatarUrl: null, xpSemana: 2180, isCurrentUser: false },
  { posicao: 5, userName: 'Camila S.', avatarUrl: null, xpSemana: 1940, isCurrentUser: false },
  { posicao: 6, userName: 'Thiago P.', avatarUrl: null, xpSemana: 1760, isCurrentUser: false },
  { posicao: 7, userName: 'Júlia C.', avatarUrl: null, xpSemana: 1520, isCurrentUser: false },
  { posicao: 8, userName: 'Gabriel N.', avatarUrl: null, xpSemana: 1310, isCurrentUser: false },
  { posicao: 9, userName: 'Larissa V.', avatarUrl: null, xpSemana: 1180, isCurrentUser: false },
  { posicao: 10, userName: 'Pedro H.', avatarUrl: null, xpSemana: 1040, isCurrentUser: false },
];

const AVATAR_GRADS = [
  'from-gold to-[#caa244]', 'from-[#aab4bf] to-[#6e7b89]', 'from-[#b87a4b] to-[#8a5a35]',
  'from-green to-[#3fa05a]', 'from-blue to-[#2f73a0]', 'from-purple to-[#7d56b8]',
];

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function avatarGrad(idx: number) {
  return AVATAR_GRADS[idx % AVATAR_GRADS.length];
}

export function Ranking() {
  const { user } = useUser();
  const [ranking, setRanking] = useState<RankingResponse | null>(null);

  useEffect(() => {
    api.get('/gamificacao/ranking/semanal')
      .then(r => setRanking(unwrap(r)))
      .catch(() => {});
  }, []);

  const top10 = ranking?.top10?.length ? ranking.top10 : MOCK_TOP10;
  const me = ranking?.posicaoAtual;
  const [p1, p2, p3] = [top10[0], top10[1], top10[2]];

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Topbar />

      <main className="w-full max-w-[1240px] mx-auto px-7 py-8 pb-36">

        {/* CABEÇALHO */}
        <section className="flex items-end justify-between gap-8 flex-wrap mb-8 reveal" style={{ '--d': '.02s' } as any}>
          <div>
            <div className="text-[13px] text-gold font-semibold tracking-[1.5px] uppercase flex items-center gap-2 mb-2">
              <IconCrown size={16} /> Ranking Semanal
            </div>
            <h1 className="font-cinzel font-bold text-[34px] leading-[1.15]">
              Salão dos <span className="text-gold">Campeões</span>
            </h1>
            <p className="text-text-dim text-[14.5px] mt-2 max-w-[52ch]">
              Os estudantes que mais acumularam XP nesta semana. O placar zera toda segunda-feira.
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border text-[13.5px]">
              <IconCalendarWeek size={17} className="text-gold" />
              <span><b className="text-text">Semana atual</b></span>
            </div>
            <div className="flex items-center gap-2 text-[12.5px] text-text-mute">
              <IconClockHour4 size={15} className="text-red" />
              Encerra em <b className="text-red ml-1">1 dia 14 h</b>
            </div>
          </div>
        </section>

        {/* PÓDIO */}
        <Card className="p-8 mb-8 relative overflow-hidden reveal !hover:translate-y-0" style={{ '--d': '.10s' } as any}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(640px_280px_at_50%_-40%,rgba(240,192,96,.08),transparent_70%)]" />
          <div className="flex items-center justify-center gap-2 font-cinzel font-semibold text-[15px] tracking-wide uppercase text-text-dim mb-7">
            <IconTrophy size={17} className="text-gold" /> Pódio da Semana
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-[760px] mx-auto items-end">
            {/* 2º */}
            <PodiumPlace player={p2} rank={2} />
            {/* 1º */}
            <PodiumPlace player={p1} rank={1} highlight />
            {/* 3º */}
            <PodiumPlace player={p3} rank={3} />
          </div>
        </Card>

        {/* LISTA TOP 10 */}
        <section className="reveal" style={{ '--d': '.18s' } as any}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-cinzel font-semibold text-lg flex items-center gap-2">
              <IconListNumbers size={18} className="text-gold" /> Classificação Geral
            </h2>
            <span className="text-[13px] text-text-mute">Top 10 · 1.284 jogadores na liga</span>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {top10.map((item, i) => (
              <div
                key={item.posicao}
                className={`flex items-center gap-4 px-4 py-3.5 transition-all hover:bg-surface-2 hover:translate-x-1 ${i > 0 ? 'border-t border-border' : ''} ${item.isCurrentUser ? 'bg-gold/5 border-l-2 border-l-gold' : ''}`}
              >
                <div className={`w-8 text-center font-cinzel font-bold text-lg shrink-0 ${i < 3 ? 'text-gold' : 'text-text-mute'}`}>{item.posicao}</div>
                <div className={`w-11 h-11 rounded-xl shrink-0 grid place-items-center font-cinzel font-bold text-sm text-[#0d1117] bg-gradient-to-br ${avatarGrad(i)}`}>
                  {initials(item.userName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[14.5px] flex items-center gap-2">
                    {item.userName}
                    {item.isCurrentUser && <span className="text-[10px] font-bold text-[#1a1206] bg-gradient-to-r from-gold to-[#d8a945] rounded px-1.5 py-0.5">VOCÊ</span>}
                  </div>
                  <div className="text-xs text-text-mute">Nível {10 + i} · Aventureiro</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-cinzel font-bold text-base text-gold flex items-center gap-1 justify-end">
                    <IconBolt size={14} />{item.xpSemana.toLocaleString('pt-BR')}
                  </div>
                  <small className="text-[11px] text-text-mute">XP semana</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* DOCK DO USUÁRIO (fora do top 10) */}
      {me && me.posicao > 10 && (
        <div className="sticky bottom-5 z-30 w-full max-w-[1240px] mx-auto px-7">
          <div className="flex items-center gap-4 px-5 py-3.5 rounded-xl border border-gold/50 bg-[rgba(13,17,23,0.92)] backdrop-blur-[12px] shadow-[0_14px_34px_-14px_rgba(240,192,96,0.45)]"
               style={{ background: 'linear-gradient(150deg, rgba(240,192,96,.14), rgba(240,192,96,.04)), rgba(13,17,23,.92)' }}>
            <div className="font-cinzel font-bold text-lg text-gold shrink-0">{me.posicao}</div>
            <div className="w-11 h-11 rounded-xl shrink-0 grid place-items-center font-cinzel font-bold text-sm text-[#0d1117] bg-gradient-to-br from-gold to-[#caa244]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[15px] flex items-center gap-2">
                {user.name}
                <span className="text-[10px] font-bold text-[#1a1206] bg-gradient-to-r from-gold to-[#d8a945] rounded px-1.5 py-0.5">VOCÊ</span>
              </div>
              <div className="text-[12px] text-text-dim">
                Faltam <b className="text-gold">{(top10[9]?.xpSemana ?? 1040) - me.xpSemana} XP</b> para entrar no Top 10
              </div>
            </div>
            <div className="flex items-center gap-1 text-green text-sm font-bold shrink-0">
              <IconArrowUpRight size={16} /> 3
            </div>
            <div className="text-right shrink-0">
              <div className="font-cinzel font-bold text-lg text-gold flex items-center gap-1 justify-end">
                <IconBolt size={14} />{me.xpSemana}
              </div>
              <small className="text-[11px] text-text-mute">XP semana</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PodiumPlace({ player, rank, highlight }: { player: RankingItem; rank: number; highlight?: boolean }) {
  const heightMap: Record<number, string> = { 1: 'h-32', 2: 'h-24', 3: 'h-[74px]' };
  const colorMap: Record<number, string> = {
    1: 'from-gold to-[#caa244]',
    2: 'from-[#aab4bf] to-[#6e7b89]',
    3: 'from-[#b87a4b] to-[#8a5a35]',
  };
  const baseColorMap: Record<number, string> = {
    1: 'border-gold/40 bg-gradient-to-b from-gold/16 to-gold/3 text-gold',
    2: 'border-[rgba(154,167,180,.3)] bg-gradient-to-b from-[rgba(154,167,180,.13)] to-[rgba(154,167,180,.02)] text-[#9aa7b4]',
    3: 'border-[rgba(184,122,75,.3)] bg-gradient-to-b from-[rgba(184,122,75,.14)] to-[rgba(184,122,75,.02)] text-[#b87a4b]',
  };

  if (!player) return <div />;

  const avSize = highlight ? 'w-20 h-20 text-3xl rounded-2xl' : 'w-16 h-16 text-2xl rounded-xl';

  return (
    <div className="flex flex-col items-center">
      {highlight && (
        <IconCrown size={26} className="text-gold mb-1 animate-[floaty_3s_ease-in-out_infinite]" style={{ filter: 'drop-shadow(0 0 10px rgba(240,192,96,0.7))' }} />
      )}
      <div className={`w-7 h-7 rounded-full grid place-items-center font-cinzel font-bold text-sm text-[#0d1117] mb-2.5 bg-gradient-to-br ${colorMap[rank]}`}>
        {rank}
      </div>
      <div className={`grid place-items-center font-cinzel font-bold text-[#0d1117] bg-gradient-to-br ${colorMap[rank]} ${avSize} ${highlight ? 'shadow-[0_0_0_4px_rgba(240,192,96,.14),0_0_32px_2px_rgba(240,192,96,.4)]' : ''}`}>
        {initials(player.userName)}
      </div>
      <div className={`font-bold mt-3 text-center ${highlight ? 'text-[16.5px]' : 'text-[15px]'}`}>{player.userName}</div>
      <div className="text-xs text-text-mute mt-0.5 text-center">Nível {rank === 1 ? 18 : rank === 2 ? 16 : 15}</div>
      <div className={`flex items-center gap-1.5 mt-2.5 font-cinzel font-bold text-gold ${highlight ? 'text-[19px]' : 'text-base'}`}>
        <IconBolt size={14} />{player.xpSemana.toLocaleString('pt-BR')}
        <span className="font-sans font-medium text-[10.5px] text-text-mute tracking-wide">XP</span>
      </div>
      <div className={`mt-4 w-full border-[0.5px] border-b-0 rounded-t-xl grid place-items-center font-cinzel font-bold text-[34px] ${heightMap[rank]} ${baseColorMap[rank]}`}>
        {rank}
      </div>
    </div>
  );
}
