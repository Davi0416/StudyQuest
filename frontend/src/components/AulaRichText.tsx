import React from 'react';

function looksLikeCode(line: string): boolean {
  const t = line.trim();
  if (t.split(/\s+/).length >= 10) return false;
  if (/\b(você|vocês|capítulo|aprende|aparecem|quando|porque|também|sempre|nunca|linguagem)\b/i.test(t)) return false;
  if (/^(print|if |else|elif |for |while |try|except|def |import |from |return |break|continue|[a-z_][\w]*\s*=)/.test(t)) return true;
  if (/^[a-z_][\w.]*\s*\(/i.test(t) && t.length < 80) return true;
  return false;
}

function CalloutBox({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <div className={`px-4 py-3 rounded-md text-sm text-text-dim leading-relaxed ${className}`}>
      {children}
    </div>
  );
}

function parseCallout(line: string, prefix: string) {
  return line.startsWith(prefix) ? line.slice(prefix.length).trim() : line;
}

export function AulaRichText({ conteudo, compact }: { conteudo: string; compact?: boolean }) {
  const lines = conteudo.split('\n');
  const firstContentIdx = lines.findIndex(l => l.trim());

  const isSpecial = (t: string) =>
    t.startsWith('## ') || t.startsWith('Contexto:') || t.startsWith('Objetivo:') ||
    t.startsWith('Mestre:') || t.startsWith('Saída') || t.startsWith('Prática:') ||
    t.startsWith('Dica:') || t.startsWith('Atenção:') || t.startsWith('Entrada:') ||
    t.startsWith('▶') || t.startsWith('•') || looksLikeCode(t);

  const bodyClass = compact
    ? 'space-y-2.5'
    : 'p-6 rounded-lg bg-surface border border-border space-y-3';

  return (
    <div className={bodyClass}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        if (compact && i === firstContentIdx && !isSpecial(trimmed)) {
          return (
            <p key={i} className="font-cinzel font-semibold text-text text-base tracking-wide">
              {trimmed}
            </p>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={i} className="font-cinzel font-bold text-lg text-gold leading-snug tracking-wide border-b border-gold/20 pb-2 mb-1">
              {trimmed.slice(3)}
            </h3>
          );
        }

        if (trimmed.startsWith('Contexto:')) {
          return (
            <CalloutBox key={i} className="bg-surface-2 border-l-2 border-l-indigo-400/60 border border-border">
              <span className="font-cinzel text-[11px] uppercase tracking-[0.15em] text-indigo-300/90 block mb-1.5">Contexto</span>
              <span className="text-text-dim">{parseCallout(trimmed, 'Contexto:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Objetivo:')) {
          return (
            <CalloutBox key={i} className="bg-surface-2 border-l-2 border-l-green/60 border border-border">
              <span className="font-cinzel text-[11px] uppercase tracking-[0.15em] text-green/90 block mb-1.5">Objetivo</span>
              <span className="text-text-dim">{parseCallout(trimmed, 'Objetivo:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Mestre:')) {
          return (
            <blockquote key={i} className="px-4 py-3 border-l-2 border-purple-400/50 bg-purple-500/5 text-sm text-text-dim italic leading-relaxed">
              {parseCallout(trimmed, 'Mestre:')}
            </blockquote>
          );
        }

        if (trimmed.startsWith('Saída:') || trimmed.startsWith('Saída esperada:')) {
          const isExpected = trimmed.startsWith('Saída esperada:');
          const prefix = isExpected ? 'Saída esperada:' : 'Saída:';
          const label = isExpected ? 'Saída esperada' : 'Saída';
          return (
            <CalloutBox key={i} className="bg-surface-2 border-l-2 border-l-sky-400/60 border border-border font-mono text-sm">
              <span className="font-cinzel text-[11px] uppercase tracking-[0.15em] text-sky-300/90 block mb-1.5 not-italic font-normal">{label}</span>
              <span className="text-green/90">{parseCallout(trimmed, prefix)}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Prática:')) {
          return (
            <CalloutBox key={i} className="bg-gold/5 border border-gold/20">
              <span className="font-cinzel text-[11px] uppercase tracking-[0.15em] text-gold block mb-1.5">Prática</span>
              <span className="text-text font-medium">{parseCallout(trimmed, 'Prática:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Dica:')) {
          return (
            <CalloutBox key={i} className="bg-surface-2 border border-border/80">
              <span className="text-[11px] uppercase tracking-widest text-gold/80 font-semibold block mb-1">Dica</span>
              <span className="text-text-dim">{parseCallout(trimmed, 'Dica:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Atenção:')) {
          return (
            <CalloutBox key={i} className="bg-amber-500/5 border-l-2 border-l-amber-500/60 border border-border">
              <span className="text-[11px] uppercase tracking-widest text-amber-400/90 font-semibold block mb-1">Atenção</span>
              <span className="text-text-dim">{parseCallout(trimmed, 'Atenção:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Entrada:')) {
          return (
            <p key={i} className="text-sm text-text-dim">
              <span className="font-semibold text-text-mute uppercase text-[11px] tracking-wider mr-2">Entrada</span>
              {parseCallout(trimmed, 'Entrada:')}
            </p>
          );
        }

        if (trimmed.startsWith('▶')) {
          return (
            <p key={i} className="font-cinzel text-sm font-semibold text-text mt-4 first:mt-0 border-l-2 border-gold/70 pl-3 tracking-wide">
              {trimmed.slice(1).trim()}
            </p>
          );
        }

        if (trimmed.startsWith('•')) {
          return (
            <li key={i} className="ml-1 pl-3 text-text-dim leading-relaxed list-none border-l border-border/60">
              {trimmed.slice(1).trim()}
            </li>
          );
        }

        if (looksLikeCode(trimmed)) {
          return (
            <pre key={i} className="px-4 py-3 rounded-md bg-[#0d1117] border border-border/80 text-[13px] font-mono text-green/90 whitespace-pre-wrap break-words leading-relaxed">
              {trimmed}
            </pre>
          );
        }

        return (
          <p key={i} className="text-text-dim leading-[1.75] text-sm">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
