import React from 'react';

export function Card({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={`bg-surface border border-border rounded-xl transition-all duration-200 hover:-translate-y-[3px] hover:border-[#3d444d] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
