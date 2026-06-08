import React, { useEffect, useState } from 'react';
import { Topbar } from '../components/Topbar';
import { useUser } from '../context/UserContext';
import api, { unwrap } from '../lib/api';
import type { Conquista } from '../types';

type Categoria = 'all' | 'constancia' | 'maestria' | 'colecao' | 'combate' | 'especiais';

const CAT_META: Record<string, { label: string; color: string; tabName: string }> = {
  constancia: { label: 'Constância', color: 'text-error',    tabName: 'FIRE' },
  maestria:   { label: 'Maestria',   color: 'text-primary',  tabName: 'MASTERY' },
  colecao:    { label: 'Coleção',    color: 'text-secondary',tabName: 'COLLECTION' },
  combate:    { label: 'Combate',    color: 'text-tertiary', tabName: 'COMBAT' },
  especiais:  { label: 'Especiais',  color: 'text-primary-container', tabName: 'SPECIAL' },
};

const RARITY_MAP: Record<string, { label: string; cls: string; border: string }> = {
  comum:    { label: 'Comum',    cls: 'text-on-surface-variant', border: 'border-outline' },
  raro:     { label: 'Raro',     cls: 'text-secondary',          border: 'border-secondary' },
  epico:    { label: 'Épico',    cls: 'text-tertiary',           border: 'border-tertiary' },
  lendario: { label: 'Lendário', cls: 'text-primary',            border: 'border-primary' },
};

interface BadgeMeta {
  cat: string;
  rarity: string;
  icon: string;
}

const BADGE_META: Record<string, BadgeMeta> = {
  'Primeira Chama':       { cat: 'constancia', rarity: 'comum',    icon: 'local_fire_department' },
  'Maratonista':          { cat: 'constancia', rarity: 'comum',    icon: 'directions_run' },
  'Imparável':            { cat: 'constancia', rarity: 'raro',     icon: 'bolt' },
  'Lenda Viva':           { cat: 'constancia', rarity: 'lendario', icon: 'local_fire_department' },
  'Primeiros Passos':     { cat: 'maestria',   rarity: 'comum',    icon: 'directions_run' },
  'Mestre dos Loops':     { cat: 'maestria',   rarity: 'raro',     icon: 'all_inclusive' },
  'Arquiteto Spring':     { cat: 'maestria',   rarity: 'epico',    icon: 'security' },
  'Poliglota':            { cat: 'maestria',   rarity: 'epico',    icon: 'menu_book' },
  'Grão-Mestre':          { cat: 'maestria',   rarity: 'lendario', icon: 'military_tech' },
  'Colecionador':         { cat: 'colecao',    rarity: 'comum',    icon: 'style' },
  'Centurião':            { cat: 'colecao',    rarity: 'raro',     icon: 'style' },
  'Bibliotecário':        { cat: 'colecao',    rarity: 'epico',    icon: 'menu_book' },
  'Memória de Elefante':  { cat: 'colecao',    rarity: 'raro',     icon: 'psychology' },
  'Caça-Bugs':            { cat: 'combate',    rarity: 'comum',    icon: 'bug_report' },
  'Perfeccionista':       { cat: 'combate',    rarity: 'raro',     icon: 'emoji_events' },
  'Sem Sustos':           { cat: 'combate',    rarity: 'raro',     icon: 'security' },
  'Velocista':            { cat: 'combate',    rarity: 'epico',    icon: 'bolt' },
  'Gladiador':            { cat: 'combate',    rarity: 'epico',    icon: 'swords' },
  'Pioneiro':             { cat: 'especiais',  rarity: 'raro',     icon: 'rocket_launch' },
  'Madrugador':           { cat: 'especiais',  rarity: 'comum',    icon: 'wb_sunny' },
  'Coruja':               { cat: 'especiais',  rarity: 'comum',    icon: 'dark_mode' },
  'Guerreiro de Fim de Semana': { cat: 'especiais', rarity: 'comum', icon: 'security' },
  'Explorador':           { cat: 'especiais',  rarity: 'comum',    icon: 'explore' },
  'Colossal':             { cat: 'especiais',  rarity: 'lendario', icon: 'diamond' },
};

function getMeta(c: Conquista): BadgeMeta {
  return BADGE_META[c.titulo] ?? { cat: 'especiais', rarity: 'comum', icon: 'emoji_events' };
}

export function Conquistas() {
  const { user } = useUser();
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [cat, setCat] = useState<Categoria>('all');
  const [selectedItem, setSelectedItem] = useState<Conquista | null>(null);

  useEffect(() => {
    api.get('/gamificacao/conquistas')
      .then(r => {
        const data = unwrap(r) as Conquista[];
        setConquistas(data);
        if (data.length > 0) {
          setSelectedItem(data[0]);
        }
      })
      .catch(() => {});
  }, []);

  if (!user) return null;

  const total = conquistas.length;
  const unlocked = conquistas.filter(c => c.desbloqueada).length;

  const visible = conquistas.filter(c => {
    const m = getMeta(c);
    const okCat = cat === 'all' || m.cat === cat;
    return okCat;
  });

  const mSelected = selectedItem ? getMeta(selectedItem) : null;
  const raritySelected = mSelected ? (RARITY_MAP[mSelected.rarity] ?? RARITY_MAP.comum) : RARITY_MAP.comum;
  const catSelected = mSelected ? (CAT_META[mSelected.cat]?.color ?? 'text-primary') : 'text-primary';

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col font-body-md selection:bg-primary-container selection:text-on-primary-container">
      <Topbar />

      <main className="flex-grow w-full max-w-container-max mx-auto px-md py-lg flex flex-col gap-lg pb-36">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface uppercase drop-shadow-[4px_4px_0_rgba(155,143,125,0.3)]">COFRE</h1>
            <p className="font-code text-code text-on-surface-variant mt-base uppercase">Capacidade: {unlocked} / {total} Espaços</p>
          </div>

          {/* Neo-brutalist Filter Tabs */}
          <div className="flex gap-base overflow-x-auto no-scrollbar pb-base">
            <div className="relative inline-block cursor-pointer" onClick={() => setCat('all')}>
              <div className="absolute inset-0 bg-surface-container-lowest top-[4px] left-[4px] border-border-width border-surface-container-lowest"></div>
              <button className={`relative font-label-caps text-label-caps px-sm py-xs border-border-width uppercase transition-transform active:translate-x-[4px] active:translate-y-[4px] ${cat === 'all' ? 'bg-primary-container text-on-primary-container border-on-primary-fixed' : 'bg-surface text-on-surface border-outline hover:border-primary hover:text-primary'}`}>
                TODOS OS ITENS
              </button>
            </div>
            {(Object.entries(CAT_META) as [Categoria, typeof CAT_META[string]][]).map(([key, m]) => (
              <div key={key} className="relative inline-block cursor-pointer" onClick={() => setCat(key)}>
                <div className="absolute inset-0 bg-surface-container-lowest top-[4px] left-[4px] border-border-width border-surface-container-lowest"></div>
                <button className={`relative font-label-caps text-label-caps px-sm py-xs border-border-width uppercase transition-transform active:translate-x-[4px] active:translate-y-[4px] ${cat === key ? 'bg-primary-container text-on-primary-container border-on-primary-fixed' : 'bg-surface text-on-surface border-outline hover:border-primary hover:text-primary'}`}>
                  {m.tabName}
                </button>
              </div>
            ))}
          </div>
        </header>

        {/* Inventory Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
          
          {/* Left Panel: Grid Matrix */}
          <div className="lg:col-span-8 bg-surface-container p-sm border-border-width border-outline pixel-shadow">
            {/* Inner Title Bar */}
            <div className="bg-surface-container-highest border-b-border-width border-outline -mt-sm -mx-sm mb-sm p-xs flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-on-surface">MATRIZ_DE_ARMAZENAMENTO_V1</span>
              <div className="flex gap-base">
                <div className="w-xs h-xs bg-outline"></div>
                <div className="w-xs h-xs bg-outline"></div>
                <div className="w-xs h-xs bg-outline"></div>
              </div>
            </div>

            {/* Grid of Slots */}
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-base min-h-[300px]">
              {visible.map(c => {
                const meta = getMeta(c);
                const r = RARITY_MAP[meta.rarity] ?? RARITY_MAP.comum;
                const isSelected = selectedItem?.id === c.id;
                
                return (
                  <button 
                    key={c.id} 
                    onClick={() => setSelectedItem(c)}
                    className={`aspect-square relative flex items-center justify-center group focus:outline-none transition-colors active:scale-95 ${c.desbloqueada ? `bg-surface border-border-width ${isSelected ? 'border-primary' : r.border}` : 'bg-surface-container-lowest border-border-width border-surface-container-highest opacity-50 grayscale'}`}
                  >
                    <span className="material-symbols-outlined text-[32px] text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {c.desbloqueada ? meta.icon : 'lock'}
                    </span>
                    {c.desbloqueada && (
                      <div className={`absolute top-0 right-0 w-3 h-3 border-l-border-width border-b-border-width border-surface ${r.cls.replace('text-', 'bg-')}`}></div>
                    )}
                  </button>
                );
              })}

              {/* Fill empty slots to look like a grid */}
              {Array.from({ length: Math.max(0, 40 - visible.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-surface-container-low border-border-width border-outline-variant/50 border-dashed"></div>
              ))}
            </div>
          </div>

          {/* Right Panel: Selected Item Details */}
          {selectedItem && mSelected && (
            <div className="lg:col-span-4 sticky top-[100px]">
              <div className="relative w-full">
                {/* Hard Shadow Background */}
                <div className="absolute inset-0 bg-surface-container-lowest top-[4px] left-[4px] border-border-width border-surface-container-lowest"></div>
                
                {/* Card Content */}
                <div className={`relative bg-surface border-border-width ${raritySelected.border} p-md flex flex-col gap-md`}>
                  
                  {/* Item Header */}
                  <div className="flex items-start justify-between border-b-border-width border-outline pb-sm">
                    <div>
                      <h3 className={`font-h3 text-h3 uppercase ${catSelected}`}>{selectedItem.titulo}</h3>
                      <p className={`font-code text-code uppercase mt-1 ${raritySelected.cls}`}>{raritySelected.label} Item</p>
                    </div>
                    <div className="w-12 h-12 border-border-width border-outline bg-surface-container flex items-center justify-center">
                      <span className={`material-symbols-outlined ${catSelected}`} style={{ fontVariationSettings: "'FILL' 1" }}>{mSelected.icon}</span>
                    </div>
                  </div>

                  {/* Item Image Showcase */}
                  <div className="w-full aspect-video bg-surface-container-highest border-border-width border-outline flex items-center justify-center relative overflow-hidden">
                    {/* Scanline effect overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30 z-10"></div>
                    <span className={`material-symbols-outlined text-[80px] relative z-0 ${selectedItem.desbloqueada ? catSelected : 'text-outline-variant'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {selectedItem.desbloqueada ? mSelected.icon : 'lock'}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="font-body-md text-body-md text-on-surface-variant">
                    <p className="italic">"{selectedItem.descricao}"</p>
                    
                    {!selectedItem.desbloqueada && (selectedItem as any).progressoTotal && (
                      <div className="mt-sm p-sm bg-surface-container-highest border-border-width border-outline flex flex-col gap-sm items-start">
                        <div className="text-code font-code text-on-surface-variant uppercase w-full flex justify-between">
                          <span>Progresso</span>
                          <span>{(selectedItem as any).progressoAtual ?? 0} / {(selectedItem as any).progressoTotal}</span>
                        </div>
                        <div className="w-full h-2 border-2 border-outline bg-surface relative">
                          <div className="h-full bg-primary" style={{ width: `${Math.round((((selectedItem as any).progressoAtual ?? 0) / ((selectedItem as any).progressoTotal || 1)) * 100)}%` }}></div>
                        </div>
                      </div>
                    )}

                    {selectedItem.desbloqueada && (
                      <div className="mt-sm p-sm bg-primary-container/20 border-border-width border-primary-container flex gap-sm items-start">
                        <span className="material-symbols-outlined text-primary-container shrink-0">check_circle</span>
                        <span className="text-code font-code text-on-surface">Adquirido em: {selectedItem.desbloqueadaEm ? new Date(selectedItem.desbloqueadaEm).toLocaleDateString('pt-BR') : 'Desconhecido'}</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
