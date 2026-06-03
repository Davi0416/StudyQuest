import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'disabled';
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  let baseClass = 'inline-flex items-center justify-center px-4 py-2 font-bold rounded-md transition-all duration-200 ';
  
  if (variant === 'disabled' || props.disabled) {
    baseClass += 'border border-border bg-surface-2 text-text-mute cursor-not-allowed ';
  } else if (variant === 'primary') {
    baseClass += 'bg-gradient-to-br from-gold to-[#d8a945] text-[#1a1206] shadow-[0_6px_18px_-8px_rgba(240,192,96,0.7)] hover:-translate-y-[2px] hover:brightness-105 active:translate-y-0 ';
  } else if (variant === 'ghost') {
    baseClass += 'border border-border bg-surface-2 hover:border-gold hover:text-gold hover:-translate-y-[2px] ';
  }

  return (
    <button className={`${baseClass} ${className}`} disabled={variant === 'disabled' || props.disabled} {...props}>
      {children}
    </button>
  );
}
