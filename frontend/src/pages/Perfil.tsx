import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useUser } from '../context/UserContext';
import api, { unwrap } from '../lib/api';
import type { Conquista } from '../types';
import {
  IconBolt, IconCircleCheck, IconFlame, IconAward, IconTrendingUp,
  IconHistory, IconMedal, IconChevronRight, IconX, IconCheck,
  IconCamera, IconShieldHalfFilled, IconArrowBigUpLines, IconCards,
  IconTrophy, IconRepeat, IconBug, IconRocket, IconPencil,
  IconPlayerPlayFilled, IconStarFilled,
} from '@tabler/icons-react';

const AVATAR_GRADS = [
  'linear-gradient(150deg,#f0c060,#caa244)',
  'linear-gradient(150deg,#58a6ff,#2f73a0)',
  'linear-gradient(150deg,#7ee787,#3fa05a)',
  'linear-gradient(150deg,#e06c75,#a84a52)',
  'linear-gradient(150deg,#bc8cff,#7d56b8)',
  'linear-gradient(150deg,#9aa7b4,#6e7b89)',
];

const CAT_THEME: Record<string, { c: string; g1: string; g2: string; b: string }> = {
  red:    { c: 'var(--color-red, #e06c75)',    g1: 'rgba(224,108,117,.22)', g2: 'rgba(224,108,117,.04)', b: 'rgba(224,108,117,.45)' },
  gold:   { c: 'var(--color-gold, #f0c060)',   g1: 'rgba(240,192,96,.22)',  g2: 'rgba(240,192,96,.04)',  b: 'rgba(240,192,96,.45)' },
  blue:   { c: 'var(--color-blue, #58a6ff)',   g1: 'rgba(88,166,255,.22)',  g2: 'rgba(88,166,255,.04)',  b: 'rgba(88,166,255,.45)' },
  green:  { c: 'var(--color-green, #7ee787)',  g1: 'rgba(126,231,135,.20)', g2: 'rgba(126,231,135,.03)', b: 'rgba(126,231,135,.45)' },
  purple: { c: 'var(--color-purple, #bc8cff)', g1: 'rgba(188,140,255,.22)', g2: 'rgba(188,140,255,.04)', b: 'rgba(188,140,255,.45)' },
};

const UNLOCKED_STATIC = [
  { icon: <IconFlame size={20} />,    name: 'Primeira Chama',   date: '12 mai', cat: 'red' },
  { icon: <IconFlame size={20} />,    name: 'Maratonista',      date: '28 mai', cat: 'red' },
  { icon: <IconCircleCheck size={20}/>,name:'Primeiros Passos', date: '15 mai', cat: 'gold' },
  { icon: <IconRepeat size={20} />,   name: 'Mestre dos Loops', date: '26 mai', cat: 'gold' },
  { icon: <IconCards size={20} />,    name: 'Colecionador',     date: '20 mai', cat: 'blue' },
  { icon: <IconCards size={20} />,    name: 'Centurião',        date: '22 mai', cat: 'blue' },
  { icon: <IconBug size={20} />,      name: 'Caça-Bugs',        date: '19 mai', cat: 'green' },
  { icon: <IconRocket size={20} />,   name: 'Pioneiro',         date: '12 mai', cat: 'purple' },
];

export function Perfil() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftGrad, setDraftGrad] = useState(AVATAR_GRADS[0]);
  const [savedName, setSavedName] = useState('');
  const [savedGrad, setSavedGrad] = useState(AVATAR_GRADS[0]);
  const lvlBarRef = useRef<HTMLDivElement>(null);
  const achBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) setSavedName(user.name);
    api.get('/gamificacao/conquistas')
      .then(r => setConquistas(unwrap(r)))
      .catch(() => {});
    setTimeout(() => {
      if (lvlBarRef.current) lvlBarRef.current.style.width = '88%';
      if (achBarRef.current) achBarRef.current.style.width = '33%';
    }, 350);
  }, [user]);

  if (!user) return null;

  const displayName = savedName || user.name;
  const unlockedConquistas = conquistas.filter(c => c.desbloqueada);
  const achTotal = conquistas.length || 24;
  const achUnlocked = unlockedConquistas.length || 8;
  const xpForLevel = 5500;
  const xpCurrent = user.totalXp % xpForLevel || 4820;
  const xpPct = Math.round(xpCurrent / xpForLevel * 100);

  function openModal() {
    setDraftName(displayName);
    setDraftGrad(savedGrad);
    setModalOpen(true);
  }

  function saveModal() {
    setSavedName(draftName.trim() || 'Aventureiro');
    setSavedGrad(draftGrad);
    setModalOpen(false);
  }

  return (
    <div className="min-h-screen">
      <Topbar />

      <main className="w-full max-w-[1240px] mx-auto px-7 py-8 pb-20">

        {/* HERO DO PERFIL */}
        <section className="bg-surface border border-border rounded-xl mb-6 overflow-hidden relative reveal" style={{ '--d': '.02s' } as any}>
          {/* Banner */}
          <div className="h-24 relative border-b border-border" style={{ background: 'radial-gradient(700px 200px at 20% 120%, rgba(240,192,96,.18), transparent 70%), radial-gradient(600px 200px at 85% -40%, rgba(88,166,255,.16), transparent 70%), linear-gradient(180deg, #131a24, #10151d)' }}>
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 text-text-mute text-[12px] tracking-[1.5px] uppercase font-semibold">
              <IconShieldHalfFilled size={16} className="text-gold" /> Ficha de Aventureiro
            </div>
          </div>

          <div className="flex items-end gap-6 flex-wrap px-7 pb-7 -mt-11">
            {/* Avatar grande */}
            <div className="relative w-[108px] h-[108px] shrink-0 rounded-[18px] grid place-items-center font-cinzel font-bold text-[44px] text-[#0d1117] border-2 border-[rgba(13,17,23,.9)] shadow-[0_0_0_3px_rgba(240,192,96,.4)]"
                 style={{ background: savedGrad }}>
              {displayName.charAt(0).toUpperCase()}
              <button className="absolute top-[-6px] right-[-6px] w-[30px] h-[30px] rounded-full grid place-items-center bg-surface-2 border border-border text-text-dim text-[14px] transition-all hover:text-gold hover:border-gold hover:scale-105"
                      onClick={openModal} title="Editar avatar">
                <IconCamera size={14} />
              </button>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-surface-2 border border-gold/50 text-gold font-bold text-[12px] px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                <IconStarFilled size={13} /> Nível {user.lvl}
              </div>
            </div>

            {/* Identidade */}
            <div className="flex-1 min-w-0 pb-1 pt-6">
              <div className="text-[12px] text-gold font-semibold tracking-[1.5px] uppercase flex items-center gap-2 mb-1.5">
                Caçador de Conhecimento
              </div>
              <h1 className="font-cinzel font-bold text-[32px] leading-[1.1]">{displayName}</h1>
              <div className="flex items-center gap-2.5 flex-wrap mt-2.5">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold bg-gold/10 border border-gold/30 text-gold">
                  Aprendiz · Trilha Java &amp; Spring Boot
                </span>
                <span className="text-[13px] text-text-mute flex items-center gap-1.5">
                  Na jornada desde 12 mai 2026
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2.5 pb-1">
              <Button variant="ghost" className="gap-2" onClick={openModal}>
                <IconPencil size={16} /> Editar perfil
              </Button>
              <Button className="gap-2" onClick={() => navigate('/mapa')}>
                <IconPlayerPlayFilled size={16} /> Continuar jornada
              </Button>
            </div>
          </div>

          {/* Barra de nível */}
          <div className="flex items-center gap-6 flex-wrap px-7 pt-5 pb-6 border-t border-border bg-gradient-to-b from-gold/3 to-transparent">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-[46px] h-[46px] rounded-xl grid place-items-center font-cinzel font-bold text-[19px] text-gold bg-gold/12 border border-gold/40">{user.lvl}</div>
              <small className="text-[10px] uppercase tracking-[.8px] text-text-mute font-semibold">Atual</small>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div><b className="font-cinzel font-bold text-base">Progresso de Nível</b><small className="text-text-dim text-[13px] ml-2">{xpCurrent.toLocaleString('pt-BR')} / {xpForLevel.toLocaleString('pt-BR')} XP</small></div>
                <div className="text-[13px] text-gold font-semibold flex items-center gap-1">
                  <IconBolt size={14} /> faltam {(xpForLevel - xpCurrent).toLocaleString('pt-BR')} XP para o Nível {user.lvl + 1}
                </div>
              </div>
              <div className="h-3.5 rounded-full bg-surface-2 border border-border overflow-hidden relative">
                <div ref={lvlBarRef} className="h-full rounded-full bg-gradient-to-r from-gold to-[#ffe39b] shadow-[0_0_14px_rgba(240,192,96,.4)]"
                     style={{ width: '0%', transition: 'width 1.6s cubic-bezier(.2,.7,.2,1)' }} />
                <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] font-bold text-[#1a1206]">{xpPct}%</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-[46px] h-[46px] rounded-xl grid place-items-center font-cinzel font-bold text-[19px] text-text-mute bg-surface-2 border border-border">{user.lvl + 1}</div>
              <small className="text-[10px] uppercase tracking-[.8px] text-text-mute font-semibold">Próximo</small>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: <IconBolt size={20} />, color: 'gold', val: user.totalXp.toLocaleString('pt-BR'), lbl: 'XP Total', delta: '+120 XP hoje', deltaColor: 'text-green', deltaIcon: <IconTrendingUp size={14}/> },
            { icon: <IconCircleCheck size={20}/>, color: 'green', val: '37', lbl: 'Missões Concluídas', delta: '+2 esta semana', deltaColor: 'text-green', deltaIcon: <IconTrendingUp size={14}/> },
            { icon: <IconFlame size={20} />, color: 'red', val: String(user.currentStreak), lbl: 'Streak Atual', delta: 'em chamas · não quebre!', deltaColor: 'text-red', deltaIcon: <IconFlame size={14}/> },
            { icon: <IconAward size={20} />, color: 'blue', val: String(user.maxStreak), lbl: 'Streak Máximo', delta: 'recorde pessoal', deltaColor: 'text-text-mute', deltaIcon: <IconTrophy size={14}/> },
          ].map((s, i) => (
            <Card key={i} className={`p-5 reveal`} style={{ '--d': `${.06 + i * .06}s` } as any}>
              <div className={`w-10 h-10 rounded-lg grid place-items-center mb-4 border-[0.5px] text-${s.color} bg-${s.color}/10 border-${s.color}/25`}>{s.icon}</div>
              <div className="font-cinzel font-bold text-[30px] leading-none">{s.val}</div>
              <div className="text-text-dim text-[13px] mt-1.5">{s.lbl}</div>
              <div className={`mt-3 text-[12.5px] font-semibold flex items-center gap-1 ${s.deltaColor}`}>
                {s.deltaIcon} {s.delta}
              </div>
            </Card>
          ))}
        </section>

        {/* GRID 2 COLUNAS */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6 items-start">

          {/* HISTÓRICO */}
          <Card className="p-6 reveal !hover:translate-y-0" style={{ '--d': '.30s' } as any}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cinzel font-semibold text-lg flex items-center gap-2">
                <IconHistory size={18} className="text-gold" /> Atividade Recente
              </h2>
              <span className="text-[13px] text-text-dim flex items-center gap-1">
                <IconHistory size={14} /> Últimos 7 dias
              </span>
            </div>
            <div className="relative pl-1.5">
              <TlGroup date="Hoje · 1 jun" items={[
                { icon: <IconCircleCheck size={15}/>, color: 'green', title: <>Concluiu a missão <b>Streams API</b></>, sub: 'Trilha Java & Spring Boot · Módulo 3', xp: '+160' },
                { icon: <IconCards size={15}/>, color: 'blue', title: <>Revisou <b>12 flashcards</b> na Revisão Diária</>, sub: 'Caixas 1 a 3 · 11 acertos de 12', xp: '+60' },
              ]} />
              <TlGroup date="Ontem · 31 mai" items={[
                { icon: <IconTrophy size={15}/>, color: 'gold', title: <>Desbloqueou a conquista <b>Maratonista</b></>, sub: 'Streak de 7 dias seguidos', xp: 'Raro', xpMuted: true },
                { icon: <IconCircleCheck size={15}/>, color: 'green', title: <>Concluiu a missão <b>Maven / Gradle</b></>, sub: 'Trilha Java & Spring Boot · Módulo 3', xp: '+150' },
                { icon: <IconCards size={15}/>, color: 'blue', title: <>Revisou <b>18 flashcards</b></>, sub: 'Deck "Collections Java" · 100% de acerto', xp: '+90' },
              ]} />
              <TlGroup date="Sex · 28 mai" items={[
                { icon: <IconArrowBigUpLines size={15}/>, color: 'purple', title: <>Subiu para o <b>Nível 12</b></>, sub: 'Novo título desbloqueado · Aprendiz', xp: 'Level up', xpMuted: true },
                { icon: <IconCards size={15}/>, color: 'blue', title: <>Revisou <b>9 flashcards</b></>, sub: 'Caixa 2 · repetição espaçada', xp: '+45' },
              ]} />
            </div>
          </Card>

          {/* CONQUISTAS */}
          <Card className="p-6 reveal !hover:translate-y-0" style={{ '--d': '.36s' } as any}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cinzel font-semibold text-lg flex items-center gap-2">
                <IconMedal size={18} className="text-gold" /> Conquistas
              </h2>
              <button className="text-[13px] text-text-dim flex items-center gap-1 hover:text-blue transition-colors" onClick={() => navigate('/conquistas')}>
                Galeria completa <IconChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(unlockedConquistas.length > 0 ? unlockedConquistas.slice(0, 8) : UNLOCKED_STATIC).map((item, i) => {
                const isApi = 'titulo' in item;
                const name = isApi ? (item as Conquista).titulo : (item as typeof UNLOCKED_STATIC[0]).name;
                const date = isApi ? ((item as Conquista).desbloqueadaEm ? new Date((item as Conquista).desbloqueadaEm!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—') : (item as typeof UNLOCKED_STATIC[0]).date;
                const catKey = isApi ? 'gold' : (item as typeof UNLOCKED_STATIC[0]).cat;
                const t = CAT_THEME[catKey] ?? CAT_THEME.gold;
                const icon = isApi ? <IconTrophy size={20} /> : (item as typeof UNLOCKED_STATIC[0]).icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-lg bg-surface-2 border border-border transition-all hover:-translate-y-0.5"
                       style={{ '--am-b': t.b } as any}>
                    <div className="w-[42px] h-[42px] shrink-0 rounded-full grid place-items-center relative"
                         style={{ background: `linear-gradient(155deg, ${t.g1}, ${t.g2})`, border: `0.5px solid ${t.b}`, color: t.c }}>
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <b className="block font-cinzel font-bold text-[13.5px] leading-tight">{name}</b>
                      <small className="text-[11px] text-text-mute">{date}</small>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3.5 mt-4 pt-4 border-t border-border">
              <span className="text-[13px] text-text-dim"><b className="text-gold font-bold">{achUnlocked}</b> de {achTotal} desbloqueadas</span>
              <div className="flex-1 h-[7px] rounded-full bg-surface-2 border border-border overflow-hidden max-w-[180px]">
                <div ref={achBarRef} className="h-full rounded-full bg-gradient-to-r from-gold to-[#ffe39b]"
                     style={{ width: '0%', transition: 'width 1.4s cubic-bezier(.2,.7,.2,1)' }} />
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[rgba(8,10,14,.66)] backdrop-blur-[4px]"
             onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="w-full max-w-[480px] bg-surface border border-border rounded-xl shadow-[0_24px_60px_-20px_rgba(0,0,0,.8)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-6 py-4.5 border-b border-border">
              <h3 className="font-cinzel font-bold text-lg flex items-center gap-2">
                <IconPencil size={18} className="text-gold" /> Editar Perfil
              </h3>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-lg grid place-items-center text-text-dim border border-border bg-surface-2 hover:text-red hover:border-red transition-colors">
                <IconX size={16} />
              </button>
            </div>

            <div className="p-6">
              {/* Preview */}
              <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-surface-2 border border-border">
                <div className="w-[60px] h-[60px] shrink-0 rounded-xl grid place-items-center font-cinzel font-bold text-[26px] text-[#0d1117] border border-[rgba(13,17,23,.8)] shadow-[0_0_0_2px_rgba(240,192,96,.3)]"
                     style={{ background: draftGrad }}>
                  {(draftName.trim()[0] || 'A').toUpperCase()}
                </div>
                <div>
                  <b className="font-cinzel font-bold text-[17px] block">{draftName.trim() || 'Aventureiro'}</b>
                  <small className="text-text-mute text-[12px]">Nível {user.lvl} · Aprendiz</small>
                </div>
              </div>

              {/* Nome */}
              <div className="mb-6">
                <label className="block text-[12px] uppercase tracking-[.8px] text-text-mute font-bold mb-2.5">Nome de aventureiro</label>
                <input type="text" maxLength={22} value={draftName}
                       onChange={e => setDraftName(e.target.value)}
                       className="w-full px-3.5 py-3 rounded-lg bg-bg border border-border text-text font-inherit text-[15px] focus:outline-none focus:border-gold transition-colors" />
              </div>

              {/* Cores do avatar */}
              <div>
                <label className="block text-[12px] uppercase tracking-[.8px] text-text-mute font-bold mb-2.5">Cor do avatar</label>
                <div className="flex gap-2.5 flex-wrap">
                  {AVATAR_GRADS.map((g, i) => (
                    <button key={i} onClick={() => setDraftGrad(g)}
                            className={`w-[42px] h-[42px] rounded-xl border-2 transition-transform hover:scale-105 relative ${draftGrad === g ? 'border-text shadow-[0_0_0_2px_var(--color-bg),0_0_0_4px_rgba(240,192,96,.5)]' : 'border-transparent'}`}
                            style={{ background: g }}>
                      {draftGrad === g && <span className="absolute inset-0 grid place-items-center text-[#0d1117] font-bold text-base">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border bg-bg">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button className="gap-2" onClick={saveModal}><IconCheck size={16} /> Salvar alterações</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TlGroup({ date, items }: { date: string; items: { icon: React.ReactNode; color: string; title: React.ReactNode; sub: string; xp: string; xpMuted?: boolean }[] }) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="text-[11px] uppercase tracking-[1px] text-text-mute font-bold mb-3 pl-[34px]">{date}</div>
      {items.map((item, i) => (
        <div key={i} className="relative flex gap-3.5 items-start pb-4 last:pb-0">
          {i < items.length - 1 && <div className="absolute left-[13px] top-[28px] bottom-0 w-0.5 bg-border" />}
          <div className={`w-[28px] h-[28px] shrink-0 rounded-lg grid place-items-center border-[0.5px] relative z-10 bg-surface-2 text-${item.color} bg-${item.color}/12 border-${item.color}/30`}>{item.icon}</div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-[14px] font-semibold leading-[1.45]">{item.title}</div>
            <div className="text-[12.5px] text-text-mute mt-0.5">{item.sub}</div>
          </div>
          <span className={`shrink-0 self-center font-bold text-[13px] flex items-center gap-1 ${item.xpMuted ? 'text-text-mute' : 'text-gold'}`}>
            {!item.xpMuted && <IconBolt size={13} />}{item.xp}
          </span>
        </div>
      ))}
    </div>
  );
}
