import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useUser } from '../context/UserContext';

export function Topbar() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <nav className="bg-surface border-b-border-width border-outline sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-md h-xl max-w-container-max mx-auto">
        <Link to="/" className="font-h2 text-h2 text-primary uppercase tracking-widest flex items-center gap-2 active:translate-x-xs active:translate-y-xs transition-transform" title="Início">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>swords</span>
          <span>STUDY QUEST</span>
        </Link>

        <div className="hidden md:flex items-center gap-md font-label-caps text-label-caps h-full">
          <NavLink to="/" end className={({ isActive }) => `h-full flex items-center px-2 py-1 active:translate-x-xs active:translate-y-xs transition-all duration-75 ${isActive ? 'text-primary border-b-border-width border-primary pb-1' : 'text-on-surface-variant hover:text-primary hover:bg-primary-container hover:text-on-primary-container'}`}>
             HOME
          </NavLink>
          <NavLink to="/mapa" className={({ isActive }) => `h-full flex items-center px-2 py-1 active:translate-x-xs active:translate-y-xs transition-all duration-75 ${isActive ? 'text-primary border-b-border-width border-primary pb-1' : 'text-on-surface-variant hover:text-primary hover:bg-primary-container hover:text-on-primary-container'}`}>
             MAPA
          </NavLink>
          <NavLink to="/revisao" className={({ isActive }) => `h-full flex items-center px-2 py-1 active:translate-x-xs active:translate-y-xs transition-all duration-75 ${isActive ? 'text-primary border-b-border-width border-primary pb-1' : 'text-on-surface-variant hover:text-primary hover:bg-primary-container hover:text-on-primary-container'}`}>
             LAB
          </NavLink>
          <NavLink to="/conquistas" className={({ isActive }) => `h-full flex items-center px-2 py-1 active:translate-x-xs active:translate-y-xs transition-all duration-75 ${isActive ? 'text-primary border-b-border-width border-primary pb-1' : 'text-on-surface-variant hover:text-primary hover:bg-primary-container hover:text-on-primary-container'}`}>
             CONQUISTAS
          </NavLink>
          <NavLink to="/ranking" className={({ isActive }) => `h-full flex items-center px-2 py-1 active:translate-x-xs active:translate-y-xs transition-all duration-75 ${isActive ? 'text-primary border-b-border-width border-primary pb-1' : 'text-on-surface-variant hover:text-primary hover:bg-primary-container hover:text-on-primary-container'}`}>
             RANKING
          </NavLink>
        </div>

        <div className="flex items-center gap-sm text-primary">
          <div className="flex items-center gap-1.5 px-2 py-1 border-[2px] border-error bg-error/10 pixel-shadow">
             <span className="material-symbols-outlined text-error animate-pulse text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
             <span className="text-sm font-bold text-error font-code">{user.currentStreak}</span>
          </div>

          <button className="p-1 hover:bg-primary-container hover:text-on-primary-container transition-all active:translate-x-xs active:translate-y-xs duration-75 border-border-width border-transparent hover:border-outline ml-2">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-1 hover:bg-primary-container hover:text-on-primary-container transition-all active:translate-x-xs active:translate-y-xs duration-75 border-border-width border-transparent hover:border-outline">
            <span className="material-symbols-outlined">settings</span>
          </button>

          <Link to="/perfil" className="w-10 h-10 border-border-width border-outline bg-surface-container-high ml-2 pixel-shadow active-press relative group overflow-hidden block">
            {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover grayscale contrast-125 group-hover:grayscale-0 transition-all"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex'); }}
                />
              ) : null}
            <div className="w-full h-full flex items-center justify-center font-code text-lg text-on-surface" style={{ display: user.avatarUrl ? 'none' : 'flex' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
