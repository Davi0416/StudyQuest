import React from 'react';

interface BadgeProps {
  status: 'BLOQUEADO' | 'EM_PROGRESSO' | 'CONCLUIDO';
}

export function Badge({ status }: BadgeProps) {
  let styles = '';
  
  if (status === 'CONCLUIDO') {
    styles = 'text-green bg-green/10 border-green/35';
  } else if (status === 'EM_PROGRESSO') {
    styles = 'text-blue bg-blue/10 border-blue/35';
  } else {
    styles = 'text-text-mute bg-surface border-border';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
      {status}
    </span>
  );
}
