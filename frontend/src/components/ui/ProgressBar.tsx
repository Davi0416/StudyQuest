import React, { useEffect, useState } from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  className?: string;
}

export function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // trigger animation after mount
    setTimeout(() => setWidth(Math.min(100, Math.max(0, progress))), 50);
  }, [progress]);

  return (
    <div className={`h-[10px] rounded-full bg-surface-2 overflow-hidden ${className}`}>
      <div 
        className="h-full rounded-full bg-gradient-to-r from-green to-[#56b364]"
        style={{ 
          width: `${width}%`, 
          transition: 'width 1.6s cubic-bezier(.2,.7,.2,1)' 
        }}
      />
    </div>
  );
}
