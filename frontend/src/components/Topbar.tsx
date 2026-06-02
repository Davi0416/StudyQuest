import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { IconSword, IconMap, IconFlask, IconMedal, IconTrophy, IconFlame } from '@tabler/icons-react';

export function Topbar() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 h-[64px] backdrop-blur-[12px] border-b border-border bg-bg/80 px-6 flex items-center justify-between">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <IconSword className="text-gold" size={24} />
        <h1 className="font-cinzel text-xl font-bold text-text">
          Study<span className="text-gold">Quest</span>
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-6">
        <NavLink to="/mapa" className={({ isActive }) => `flex items-center gap-2 text-sm font-medium transition-colors ${isActive ? 'text-gold' : 'text-text-mute hover:text-text'}`}>
          <IconMap size={18} /> Mapa
        </NavLink>
        <NavLink to="/revisao" className={({ isActive }) => `flex items-center gap-2 text-sm font-medium transition-colors ${isActive ? 'text-gold' : 'text-text-mute hover:text-text'}`}>
          <IconFlask size={18} /> Lab
        </NavLink>
        <NavLink to="/conquistas" className={({ isActive }) => `flex items-center gap-2 text-sm font-medium transition-colors ${isActive ? 'text-gold' : 'text-text-mute hover:text-text'}`}>
          <IconMedal size={18} /> Conquistas
        </NavLink>
        <NavLink to="/ranking" className={({ isActive }) => `flex items-center gap-2 text-sm font-medium transition-colors ${isActive ? 'text-gold' : 'text-text-mute hover:text-text'}`}>
          <IconTrophy size={18} /> Ranking
        </NavLink>
      </nav>

      {/* Direita */}
      <div className="flex items-center gap-4">
        {/* Streak Chip */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red/30 bg-red/10">
          <IconFlame size={16} className="text-red animate-pulse" />
          <span className="text-sm font-bold text-red">{user.currentStreak}</span>
        </div>

        {/* Bloco do usuário */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold">{user.name}</span>
            {/* Barra XP mini */}
            <div className="w-16 h-[5px] bg-surface-2 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-gold to-[#ffe39b] rounded-full"
                style={{ width: `${(user.totalXp % 1000) / 10}%`, transition: 'width 1s ease-out' }}
              />
            </div>
          </div>
          
          {/* Avatar */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-[#d8a945] flex items-center justify-center text-[#1a1206] font-bold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {/* Badge Nível */}
            <div className="absolute -bottom-1 -right-1 bg-surface border border-border text-[10px] font-bold px-1.5 rounded-sm">
              Lvl {user.lvl}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
