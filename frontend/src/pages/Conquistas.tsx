import React, { useEffect, useRef, useState } from 'react';
import { Topbar } from '../components/Topbar';
import { useUser } from '../context/UserContext';
import api, { unwrap } from '../lib/api';
import type { Conquista } from '../types';
import {
  IconTrophy, IconLock, IconFlame, IconBolt, IconCrown, IconCards,
  IconRepeat, IconBug, IconRocket, IconDiamond, IconCircleCheck,
  IconBooks, IconShieldCheck, IconSwords, IconRun,
} from '@tabler/icons-react';

type Categoria = 'all' | 'constancia' | 'maestria' | 'colecao' | 'combate' | 'especiais';
type StatusFilter = 'all' | 'unlocked' | 'locked';

const CAT_META: Record<string, { label: string; color: string; dot: string }> = {
  constancia: { label: 'Constância', color: 'text-red',    dot: 'bg-red' },
  maestria:   { label: 'Maestria',   color: 'text-gold',   dot: 'bg-gold' },
  colecao:    { label: 'Coleção',    color: 'text-blue',   dot: 'bg-blue' },
  combate:    { label: 'Combate',    color: 'text-green',  dot: 'bg-green' },
  especiais:  { label: 'Especiais',  color: 'text-purple', dot: 'bg-purple' },
};

const CAT_STYLE: Record<string, { medal: string; border: string }> = {
  constancia: { medal: 'bg-[rgba(224,108,117,.22)] border-[rgba(224,108,117,.45)]',  border: 'hover:border-[rgba(224,108,117,.45)]' },
  maestria:   { medal: 'bg-[rgba(240,192,96,.22)] border-[rgba(240,192,96,.45)]',    border: 'hover:border-[rgba(240,192,96,.45)]' },
  colecao:    { medal: 'bg-[rgba(88,166,255,.22)] border-[rgba(88,166,255,.45)]',    border: 'hover:border-[rgba(88,166,255,.45)]' },
  combate:    { medal: 'bg-[rgba(126,231,135,.20)] border-[rgba(126,231,135,.45)]',  border: 'hover:border-[rgba(126,231,135,.45)]' },
  especiais:  { medal: 'bg-[rgba(188,140,255,.22)] border-[rgba(188,140,255,.45)]',  border: 'hover:border-[rgba(188,140,255,.45)]' },
};

const RARITY_MAP: Record<string, { label: string; cls: string }> = {
  comum:    { label: 'Comum',    cls: 'text-text-mute border-border bg-surface-2' },
  raro:     { label: 'Raro',     cls: 'text-blue border-blue/35 bg-blue/10' },
  epico:    { label: 'Épico',    cls: 'text-purple border-purple/35 bg-purple/10' },
  lendario: { label: 'Lendário', cls: 'text-gold border-gold/40 bg-gold/10' },
};

interface BadgeMeta {
  cat: string;
  rarity: string;
  icon: React.ReactNode;
  prog?: [number, number, string];
}

const BADGE_META: Record<string, BadgeMeta> = {
  'Primeira Chama':       { cat: 'constancia', rarity: 'comum',    icon: <IconFlame size={33} /> },
  'Maratonista':          { cat: 'constancia', rarity: 'comum',    icon: <IconRun size={33} /> },
  'Imparável':            { cat: 'constancia', rarity: 'raro',     icon: <IconBolt size={33} />, prog: [14, 21, '14 / 21 dias'] },
  'Lenda Viva':           { cat: 'constancia', rarity: 'lendario', icon: <IconFlame size={33} /> },
  'Primeiros Passos':     { cat: 'maestria',   rarity: 'comum',    icon: <IconRun size={33} /> },
  'Mestre dos Loops':     { cat: 'maestria',   rarity: 'raro',     icon: <IconRepeat size={33} /> },
  'Arquiteto Spring':     { cat: 'maestria',   rarity: 'epico',    icon: <IconShieldCheck size={33} />, prog: [64, 100, '64% concluído'] },
  'Poliglota':            { cat: 'maestria',   rarity: 'epico',    icon: <IconBooks size={33} /> },
  'Grão-Mestre':          { cat: 'maestria',   rarity: 'lendario', icon: <IconCrown size={33} /> },
  'Colecionador':         { cat: 'colecao',    rarity: 'comum',    icon: <IconCards size={33} /> },
  'Centurião':            { cat: 'colecao',    rarity: 'raro',     icon: <IconCards size={33} /> },
  'Bibliotecário':        { cat: 'colecao',    rarity: 'epico',    icon: <IconBooks size={33} />, prog: [184, 500, '184 / 500 dominados'] },
  'Memória de Elefante':  { cat: 'colecao',    rarity: 'raro',     icon: <IconCards size={33} /> },
  'Caça-Bugs':            { cat: 'combate',    rarity: 'comum',    icon: <IconBug size={33} /> },
  'Perfeccionista':       { cat: 'combate',    rarity: 'raro',     icon: <IconTrophy size={33} /> },
  'Sem Sustos':           { cat: 'combate',    rarity: 'raro',     icon: <IconShieldCheck size={33} /> },
  'Velocista':            { cat: 'combate',    rarity: 'epico',    icon: <IconBolt size={33} /> },
  'Gladiador':            { cat: 'combate',    rarity: 'epico',    icon: <IconSwords size={33} />, prog: [23, 50, '23 / 50 desafios'] },
  'Pioneiro':             { cat: 'especiais',  rarity: 'raro',     icon: <IconRocket size={33} /> },
  'Madrugador':           { cat: 'especiais',  rarity: 'comum',    icon: <IconFlame size={33} /> },
  'Coruja':               { cat: 'especiais',  rarity: 'comum',    icon: <IconFlame size={33} /> },
  'Guerreiro de Fim de Semana': { cat: 'especiais', rarity: 'comum', icon: <IconShieldCheck size={33} /> },
  'Explorador':           { cat: 'especiais',  rarity: 'comum',    icon: <IconRocket size={33} /> },
  'Colossal':             { cat: 'especiais',  rarity: 'lendario', icon: <IconDiamond size={33} />, prog: [4820, 10000, '4.820 / 10.000 XP'] },
};

function getMeta(c: Conquista): BadgeMeta {
  return BADGE_META[c.titulo] ?? { cat: 'especiais', rarity: 'comum', icon: <IconTrophy size={33} /> };
}

export function Conquistas() {
  const { user } = useUser();
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [cat, setCat] = useState<Categoria>('all');
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    api.get('/gamificacao/conquistas')
      .then(r => setConquistas(unwrap(r)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ringRef.current) return;
    const total = conquistas.length || 24;
    const unlocked = conquistas.filter(c => c.desbloqueada).length || 8;
    const pct = unlocked / total;
    const circ = 2 * Math.PI * 55;
    setTimeout(() => {
      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(circ * (1 - pct));
    }, 350);
  }, [conquistas]);

  if (!user) return null;

  const total = conquistas.length || 24;
  const unlocked = conquistas.filter(c => c.desbloqueada).length || 8;

  const visible = conquistas.filter(c => {
    const m = getMeta(c);
    const okStatus = status === 'all' || (status === 'unlocked' ? c.desbloqueada : !c.desbloqueada);
    const okCat = cat === 'all' || m.cat === cat;
    return okStatus && okCat;
  });

  return (
    <div className="min-h-screen">
      <Topbar />

      <main className="w-full max-w-[1240px] mx-auto px-7 py-8 pb-20">

        {/* CABEÇALHO */}
        <section className="mb-7 reveal" style={{ '--d': '.02s' } as any}>
          <div className="text-[13px] text-gold font-semibold tracking-[1.5px] uppercase flex items-center gap-2 mb-2">
            <IconTrophy size={16} /> Galeria de Conquistas
          </div>
          <h1 className="font-cinzel font-bold text-[34px] leading-[1.15]">Sua Coleção de Glórias</h1>
          <p className="text-text-dim text-[14.5px] mt-2 max-w-[48ch]">
            Cada medalha marca um marco da sua jornada. Continue estudando para revelar as que faltam.
          </p>
        </section>

        {/* OVERVIEW */}
        <section className="grid grid-cols-[auto_1fr] gap-8 items-center bg-surface border border-border rounded-xl p-7 mb-8 relative overflow-hidden reveal" style={{ '--d': '.08s' } as any}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

          {/* Anel SVG */}
          <div className="relative w-[128px] h-[128px] shrink-0">
            <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
              <defs>
                <linearGradient id="goldgrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#f0c060" />
                  <stop offset="1" stopColor="#ffe39b" />
                </linearGradient>
              </defs>
              <circle fill="none" stroke="var(--color-surface-2, #1c222b)" strokeWidth="11" cx="64" cy="64" r="55" />
              <circle ref={ringRef} fill="none" stroke="url(#goldgrad)" strokeWidth="11" strokeLinecap="round"
                cx="64" cy="64" r="55"
                strokeDasharray={String(2 * Math.PI * 55)}
                strokeDashoffset={String(2 * Math.PI * 55)}
                style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(.2,.7,.2,1)' }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="font-cinzel font-bold text-[30px] leading-none">
                  <span className="text-gold">{unlocked}</span>
                  <span className="text-text-mute text-[18px]">/{total}</span>
                </div>
                <small className="text-text-dim text-[11px] tracking-wide uppercase block mt-1">Conquistas</small>
              </div>
            </div>
          </div>

          <div>
            <div className="font-cinzel font-bold text-[22px]">
              <b className="text-gold">{unlocked}</b> de {total} conquistas desbloqueadas
            </div>
            <div className="text-text-dim text-[13.5px] mt-1 mb-4">
              Você completou {Math.round(unlocked / total * 100)}% da galeria · {total - unlocked} ainda aguardam.
            </div>
            <div className="flex gap-2.5 flex-wrap">
              {Object.entries(CAT_META).map(([key, m]) => (
                <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-border text-[13px]">
                  <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                  <span><b className="font-bold text-text">{conquistas.filter(c => getMeta(c).cat === key && c.desbloqueada).length || 0}</b>
                    <span className="text-text-mute">/{conquistas.filter(c => getMeta(c).cat === key).length || '—'} · {m.label}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TOOLBAR */}
        <section className="flex items-center justify-between gap-5 flex-wrap mb-6 reveal" style={{ '--d': '.14s' } as any}>
          {/* Status */}
          <div className="flex p-1 gap-0.5 bg-surface border border-border rounded-full">
            {([['all', 'Todas', total], ['unlocked', 'Desbloqueadas', unlocked], ['locked', 'Bloqueadas', total - unlocked]] as [StatusFilter, string, number][]).map(([v, lbl, cnt]) => (
              <button key={v} onClick={() => setStatus(v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-[13.5px] transition-colors ${status === v ? 'bg-gold/12 text-gold' : 'text-text-dim hover:text-text'}`}>
                {lbl}
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${status === v ? 'bg-gold/20 text-gold' : 'bg-surface-2 text-text-mute'}`}>{cnt}</span>
              </button>
            ))}
          </div>

          {/* Categoria */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCat('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-colors ${cat === 'all' ? 'bg-surface-2 border-[#3d444d] text-text' : 'border-border bg-surface text-text-dim hover:text-text'}`}>
              Todas
            </button>
            {(Object.entries(CAT_META) as [Categoria, typeof CAT_META[string]][]).map(([key, m]) => (
              <button key={key} onClick={() => setCat(key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-colors ${cat === key ? 'bg-surface-2 border-[#3d444d] text-text' : 'border-border bg-surface text-text-dim hover:text-text'}`}>
                <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                {m.label}
              </button>
            ))}
          </div>
        </section>

        {/* GRADE */}
        <section className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-4 reveal" style={{ '--d': '.20s' } as any}>
          {visible.length === 0 && (
            <div className="col-span-full text-center py-16 text-text-mute">
              <IconTrophy size={36} className="mx-auto mb-3 text-text-dim" />
              Nenhuma conquista nesta combinação de filtros.
            </div>
          )}
          {visible.map(c => <BadgeCard key={c.id} conquista={c} />)}
        </section>

      </main>
    </div>
  );
}

function BadgeCard({ conquista: c }: { conquista: Conquista }) {
  const m = getMeta(c);
  const style = CAT_STYLE[m.cat] ?? CAT_STYLE.especiais;
  const rarity = RARITY_MAP[m.rarity] ?? RARITY_MAP.comum;
  const catColor = CAT_META[m.cat]?.color ?? 'text-gold';

  return (
    <div className={`relative p-[22px_18px_18px] rounded-xl bg-surface border border-border flex flex-col items-center text-center transition-all duration-200 ${c.desbloqueada ? `hover:-translate-y-1 ${style.border}` : 'opacity-70 hover:opacity-100 hover:-translate-y-0.5'}`}>
      {/* Raridade */}
      <span className={`absolute top-3 right-3 text-[9.5px] font-bold tracking-[.7px] uppercase px-1.5 py-0.5 rounded-full border ${rarity.cls}`}>
        {rarity.label}
      </span>

      {/* Medalha */}
      <div className={`w-[74px] h-[74px] rounded-full grid place-items-center mb-4 border relative ${c.desbloqueada ? `${catColor} ${style.medal}` : 'text-text-mute border-border bg-[#20262f] grayscale brightness-[.7]'}`}>
        {m.icon}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(60%_50%_at_50%_22%,rgba(255,255,255,.14),transparent_70%)]" />
      </div>

      <div className={`font-cinzel font-bold text-base ${c.desbloqueada ? 'text-text' : 'text-text-dim'}`}>{c.titulo}</div>
      <div className={`text-[12.5px] mt-1.5 leading-[1.45] ${c.desbloqueada ? 'text-text-dim' : 'text-text-mute'}`}>{c.descricao}</div>

      {/* Rodapé */}
      {c.desbloqueada ? (
        <div className="mt-3.5 pt-3 border-t border-border w-full">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gold">
            <IconCircleCheck size={14} />
            Conquistada em {c.desbloqueadaEm ? new Date(c.desbloqueadaEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </span>
        </div>
      ) : m.prog ? (
        <div className="mt-3.5 pt-3 border-t border-border w-full">
          <div className="flex items-center justify-between text-[11px] text-text-mute mb-1.5">
            <span>Progresso</span><b className="text-text-dim font-bold">{m.prog[2]}</b>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 border border-border overflow-hidden">
            <div className={`h-full rounded-full bg-gradient-to-r from-text-mute to-text-dim`}
                 style={{ width: `${Math.round(m.prog[0] / m.prog[1] * 100)}%`, transition: 'width 1.4s cubic-bezier(.2,.7,.2,1)' }} />
          </div>
        </div>
      ) : (
        <div className="mt-3.5 pt-3 border-t border-border w-full">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-text-mute">
            <IconLock size={13} /> Bloqueada
          </span>
        </div>
      )}

      {!c.desbloqueada && (
        <span className="absolute bottom-2 right-2 w-6 h-6 rounded-full grid place-items-center bg-surface-2 border border-border text-text-mute">
          <IconLock size={12} />
        </span>
      )}
    </div>
  );
}
