import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { useUser } from '../context/UserContext';
import api, { unwrap } from '../lib/api';
import type { Conquista } from '../types';

export function Perfil() {
  const { user, logout, setUser } = useUser();
  const navigate = useNavigate();
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftAvatarUrl, setDraftAvatarUrl] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/gamificacao/conquistas')
      .then(r => setConquistas(unwrap(r)))
      .catch(() => {});
    
    api.get('/users/me/stats')
      .then(r => setStats(unwrap(r)))
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const unlockedConquistas = conquistas.filter(c => c.desbloqueada);
  const achTotal = conquistas.length;
  const achUnlocked = unlockedConquistas.length;
  
  const xpForLevel = (user as any).xpProximoNivel ?? 5500;
  const xpCurrent = (user as any).xpAtualNoNivel ?? (user.totalXp % xpForLevel);
  const xpPct = Math.round(xpCurrent / xpForLevel * 100);

  async function handleResetAndLogout() {
    try {
      await api.post('/auth/dev/reset');
    } catch (e) {
    }
    logout();
  }

  function openModal() {
    setDraftName(user?.name || '');
    setDraftAvatarUrl(user?.avatarUrl || '');
    setModalOpen(true);
  }

  async function saveModal() {
    try {
      const updatedName = draftName.trim() || 'Aventureiro';
      const updatedAvatarUrl = draftAvatarUrl.trim() || undefined;
      await api.put('/users/me', {
        name: updatedName,
        avatarUrl: updatedAvatarUrl
      });
      setUser({ ...user, name: updatedName, avatarUrl: updatedAvatarUrl });
      setModalOpen(false);
    } catch (err) {
      console.error('Failed to update profile', err);
      alert('Erro ao atualizar o perfil.');
    }
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-body-md selection:bg-primary-container selection:text-on-primary-container">
      <Topbar />

      <main className="flex-grow w-full max-w-container-max mx-auto px-md py-lg grid grid-cols-1 md:grid-cols-12 gap-md">
        
        {/* Left Column: Character Stats & Identity */}
        <div className="md:col-span-4 flex flex-col gap-md">
          
          <div className="bg-surface-container-high border-border-width border-outline-variant neo-shadow flex flex-col">
            <div className="bg-surface-container-highest border-b-border-width border-outline-variant px-sm py-xs flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-primary">IDENTIDADE DO HERÓI</span>
              <span className="material-symbols-outlined text-outline-variant text-sm">person</span>
            </div>
            
            <div className="p-sm flex flex-col items-center text-center gap-sm">
              <div className="w-32 h-32 border-border-width border-primary p-1 bg-surface-container-lowest neo-shadow relative flex items-center justify-center">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="Avatar do Herói"
                    className="w-full h-full object-cover grayscale contrast-125"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex'); }}
                  />
                ) : null}
                <div className="w-full h-full bg-surface-container flex items-center justify-center text-4xl text-on-surface font-code" style={{ display: user.avatarUrl ? 'none' : 'flex' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-3 -right-3 bg-tertiary-container border-border-width border-surface-container-lowest px-2 py-1 neo-shadow">
                  <span className="font-label-caps text-label-caps text-on-tertiary-container">NÍVEL {user.lvl}</span>
                </div>
              </div>
              
              <div className="mt-xs">
                <h1 className="font-h3 text-h3 text-on-surface mb-1 uppercase">{user.name}</h1>
                <p className="font-code text-code text-primary uppercase">{stats?.cargo ?? 'Aventureiro'}</p>
              </div>

              {/* Primary Stats */}
              <div className="w-full flex flex-col gap-xs mt-sm">
                <div className="flex items-center gap-xs">
                  <span className="font-label-caps text-label-caps text-error w-10 text-right">HP</span>
                  <div className="flex-grow h-4 border-border-width border-outline-variant bg-surface-container-lowest flex relative">
                    <div className="bg-error progress-segment" style={{ width: '100%' }}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-black font-bold mix-blend-difference">
                       {stats?.flashcardsDominados ?? 0} FLASHCARDS
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-xs">
                  <span className="font-label-caps text-label-caps text-secondary w-10 text-right">MP</span>
                  <div className="flex-grow h-4 border-border-width border-outline-variant bg-surface-container-lowest flex relative">
                    <div className="bg-secondary progress-segment" style={{ width: '100%' }}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-black font-bold mix-blend-difference">
                       {stats?.missoesConcluidas ?? 0} MISSÕES
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-xs">
                  <span className="font-label-caps text-label-caps text-primary w-10 text-right">XP</span>
                  <div className="flex-grow h-4 border-border-width border-outline-variant bg-surface-container-lowest flex relative">
                    <div className="bg-primary progress-segment" style={{ width: `${xpPct}%` }}></div>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-black font-bold mix-blend-difference">
                       {xpCurrent} / {xpForLevel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-xs">
            <button onClick={openModal} className="bg-primary border-border-width border-outline-variant text-on-primary font-label-caps text-label-caps py-sm px-sm neo-shadow neo-button-active w-full flex justify-center items-center gap-xs transition-colors hover:bg-primary-fixed cursor-pointer">
              <span className="material-symbols-outlined text-base">edit</span>
              EDITAR PERSONAGEM
            </button>
            <button onClick={logout} className="bg-surface-container border-border-width border-outline-variant text-on-surface font-label-caps text-label-caps py-sm px-sm neo-shadow neo-button-active w-full flex justify-center items-center gap-xs transition-colors hover:bg-surface-container-highest cursor-pointer">
              <span className="material-symbols-outlined text-base">logout</span>
              SAIR
            </button>
            <button onClick={() => setResetConfirm(true)} className="bg-error border-border-width border-outline-variant text-on-error font-label-caps text-label-caps py-sm px-sm neo-shadow neo-button-active w-full flex justify-center items-center gap-xs transition-colors hover:bg-error-container hover:text-on-error-container mt-4 cursor-pointer">
              <span className="material-symbols-outlined text-base">delete</span>
              APAGAR DADOS
            </button>
          </div>
        </div>

        {/* Right Column: Achievements */}
        <div className="md:col-span-8 flex flex-col gap-md">
          
          {/* Attributes Panel (Stats) */}
          <div className="bg-surface-container-high border-border-width border-outline-variant neo-shadow flex flex-col">
            <div className="bg-surface-container-highest border-b-border-width border-outline-variant px-sm py-xs flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-secondary">ATRIBUTOS E HABILIDADES</span>
              <span className="material-symbols-outlined text-outline-variant text-sm">bar_chart</span>
            </div>
            <div className="p-sm grid grid-cols-1 sm:grid-cols-2 gap-sm">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <span className="font-code text-code text-on-surface uppercase">OFENSIVA (DIAS)</span>
                  <span className="font-label-caps text-label-caps text-primary">{user.currentStreak}</span>
                </div>
                <div className="w-full h-3 border-border-width border-outline-variant bg-surface-container-lowest flex">
                  <div className="bg-primary" style={{ width: `${Math.min(user.currentStreak * 10, 100)}%` }}></div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <span className="font-code text-code text-on-surface uppercase">XP TOTAL</span>
                  <span className="font-label-caps text-label-caps text-tertiary">{user.totalXp}</span>
                </div>
                <div className="w-full h-3 border-border-width border-outline-variant bg-surface-container-lowest flex">
                  <div className="bg-tertiary" style={{ width: `100%` }}></div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <span className="font-code text-code text-on-surface uppercase">OFENSIVA MÁXIMA</span>
                  <span className="font-label-caps text-label-caps text-error">{user.maxStreak}</span>
                </div>
                <div className="w-full h-3 border-border-width border-outline-variant bg-surface-container-lowest flex">
                  <div className="bg-error" style={{ width: `${Math.min(user.maxStreak * 10, 100)}%` }}></div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-end">
                  <span className="font-code text-code text-on-surface uppercase">CONQUISTAS</span>
                  <span className="font-label-caps text-label-caps text-secondary">{achUnlocked} / {achTotal}</span>
                </div>
                <div className="w-full h-3 border-border-width border-outline-variant bg-surface-container-lowest flex">
                  <div className="bg-secondary" style={{ width: `${achTotal ? (achUnlocked/achTotal)*100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Equipped Gear (Achievements) */}
          <div className="flex flex-col gap-xs">
            <div className="flex justify-between items-end mb-xs mt-2">
              <h2 className="font-h3 text-h3 text-on-surface uppercase">ARMORIAL</h2>
              <span className="font-code text-code text-outline-variant">Espaços: {achUnlocked}/{achTotal}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-sm">
              
              {unlockedConquistas.map((item, i) => (
                <div key={i} className="bg-surface-container border-border-width border-outline-variant p-sm flex items-start gap-sm hover:border-primary transition-colors cursor-pointer group neo-shadow">
                  <div className="w-16 h-16 border-border-width border-outline-variant bg-surface-container-lowest flex items-center justify-center group-hover:bg-primary-container transition-colors shrink-0">
                    <span className="material-symbols-outlined text-h2 text-on-surface group-hover:text-on-primary-container">stars</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-label-caps text-label-caps text-primary uppercase">{item.titulo}</span>
                      <span className="bg-surface-container-highest border-border-width border-outline-variant px-1 text-[10px] font-code text-on-surface">MEDALHA</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant text-sm line-clamp-2">{item.descricao}</p>
                  </div>
                </div>
              ))}

              {/* Empty Slots */}
              {Array.from({ length: Math.max(0, 4 - unlockedConquistas.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-surface-container-lowest border-border-width border-dashed border-outline-variant p-sm flex items-center justify-center gap-sm opacity-50 h-[96px]">
                  <div className="flex flex-col items-center justify-center text-outline-variant gap-2">
                    <span className="material-symbols-outlined text-h2">lock</span>
                    <span className="font-label-caps text-label-caps uppercase">ESPAÇO BLOQUEADO</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* MODAL RESET */}
      {resetConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
             onClick={e => { if (e.target === e.currentTarget) setResetConfirm(false); }}>
          <div className="w-full max-w-[420px] bg-surface-container border-border-width border-error neo-shadow">
            <div className="flex items-center gap-3 px-6 py-4 bg-error text-on-error border-b-border-width border-error">
              <span className="material-symbols-outlined text-2xl">delete</span>
              <h3 className="font-h3 text-lg uppercase tracking-widest">APAGAR DADOS</h3>
            </div>
            <div className="p-6">
              <p className="text-on-surface text-sm font-code leading-relaxed mb-4">
                AVISO: ISSO APAGARÁ TODOS OS USUÁRIOS DO BANCO DE DADOS LOCAL E DESLOGARÁ VOCÊ.
              </p>
              <p className="text-on-surface-variant text-xs font-code">ÚTIL PARA TESTAR O FLUXO DE REGISTRO.</p>
            </div>
            <div className="flex items-center justify-end gap-4 px-6 py-4 border-t-border-width border-error bg-surface">
              <button onClick={() => setResetConfirm(false)} className="text-on-surface hover:text-primary font-label-caps text-sm cursor-pointer">CANCELAR</button>
              <button
                className="bg-error text-on-error border-border-width border-black px-4 py-2 font-label-caps neo-shadow active-press flex items-center gap-2 cursor-pointer"
                onClick={() => { setResetConfirm(false); handleResetAndLogout(); }}
              >
                <span className="material-symbols-outlined text-base">delete</span> CONFIRMAR EXCLUSÃO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
             onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="w-full max-w-[480px] bg-surface-container border-border-width border-primary neo-shadow">
            <div className="flex items-center justify-between gap-3 px-6 py-4 bg-primary text-on-primary border-b-border-width border-primary">
              <h3 className="font-h3 text-lg uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">edit</span> CONFIGURAÇÃO DE PERFIL
              </h3>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center border-border-width border-black hover:bg-black hover:text-primary transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-surface-container-lowest border-border-width border-outline">
                <div className="w-16 h-16 shrink-0 flex items-center justify-center font-bold text-2xl text-on-surface border-border-width border-primary bg-surface-container overflow-hidden">
                  {draftAvatarUrl ? (
                    <img
                      src={draftAvatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover grayscale contrast-125"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'inline'); }}
                    />
                  ) : null}
                  <span className="font-code" style={{ display: draftAvatarUrl ? 'none' : 'inline' }}>{(draftName.trim()[0] || 'A').toUpperCase()}</span>
                </div>
                <div>
                  <b className="block text-primary text-lg uppercase font-h3">{draftName.trim() || 'Aventureiro'}</b>
                  <small className="text-on-surface-variant font-code text-xs">LVL {user.lvl}</small>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase text-on-surface-variant font-label-caps mb-2">NOME / APELIDO</label>
                <input type="text" maxLength={22} value={draftName}
                       onChange={e => setDraftName(e.target.value)}
                       className="w-full px-4 py-3 bg-surface-container-lowest border-border-width border-outline text-on-surface font-code text-sm focus:outline-none focus:border-primary placeholder:text-outline-variant" placeholder="SEU NOME..." />
              </div>

              <div>
                <label className="block text-xs uppercase text-on-surface-variant font-label-caps mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">image</span> URL DO AVATAR
                </label>
                <input type="url" value={draftAvatarUrl}
                       onChange={e => setDraftAvatarUrl(e.target.value)}
                       className="w-full px-4 py-3 bg-surface-container-lowest border-border-width border-outline text-on-surface font-code text-sm focus:outline-none focus:border-primary placeholder:text-outline-variant" placeholder="https://imgur.com/suafoto.png" />
                <p className="text-[10px] text-on-surface-variant mt-2 font-code">COLE UM LINK DIRETO DE UMA IMAGEM PARA SEU PERFIL.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 px-6 py-4 border-t-border-width border-primary bg-surface-container-lowest">
              <button onClick={() => setModalOpen(false)} className="text-on-surface-variant hover:text-primary font-label-caps text-sm cursor-pointer">CANCELAR</button>
              <button className="bg-primary text-on-primary border-border-width border-black px-4 py-2 font-label-caps neo-shadow active-press flex items-center gap-2 cursor-pointer" onClick={saveModal}>
                <span className="material-symbols-outlined text-sm">check</span> SALVAR ALTERAÇÕES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
