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

type Block =
  | { kind: 'line'; index: number; text: string }
  | { kind: 'saida'; index: number; label: string; header: string; body: string[] };

function groupLines(lines: string[]): Block[] {
  const isSaidaHeader = (t: string) => t.startsWith('Saída:') || t.startsWith('Saída esperada:');
  const isBlockHeader = (t: string) =>
    t.startsWith('## ') || t.startsWith('Contexto:') || t.startsWith('Objetivo:') ||
    t.startsWith('Mestre:') || t.startsWith('Prática:') || t.startsWith('Dica:') ||
    t.startsWith('Atenção:') || t.startsWith('Entrada:') || t.startsWith('▶') ||
    isSaidaHeader(t);

  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (isSaidaHeader(trimmed)) {
      const isExpected = trimmed.startsWith('Saída esperada:');
      const prefix = isExpected ? 'Saída esperada:' : 'Saída:';
      const label = isExpected ? 'Saída esperada' : 'Saída';
      const inlineValue = trimmed.slice(prefix.length).trim();
      const body: string[] = inlineValue ? [inlineValue] : [];
      i++;
      // Collect subsequent non-header, non-blank lines into the same block
      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next) { i++; break; }
        if (isBlockHeader(next)) break;
        body.push(next);
        i++;
      }
      blocks.push({ kind: 'saida', index: i, label, header: prefix, body });
    } else {
      blocks.push({ kind: 'line', index: i, text: lines[i] });
      i++;
    }
  }
  return blocks;
}

export function AulaRichText({ conteudo, compact }: { conteudo: string; compact?: boolean }) {
  const lines = conteudo.split('\n');
  const firstContentIdx = lines.findIndex(l => l.trim());
  const blocks = groupLines(lines);

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
      {blocks.map((block, bi) => {
        if (block.kind === 'saida') {
          return (
            <CalloutBox key={`saida-${bi}`} className="bg-surface-2 border-l-2 border-l-sky-400/60 border border-border font-mono text-sm">
              <span className="font-cinzel text-[11px] uppercase tracking-[0.15em] text-sky-300/90 block mb-1.5 not-italic font-normal">{block.label}</span>
              {block.body.length > 0 && (
                <div className="text-green/90 leading-relaxed">
                  {block.body.map((ln, li) => (
                    <div key={li}>{ln}</div>
                  ))}
                </div>
              )}
            </CalloutBox>
          );
        }

        const i = block.index;
        const trimmed = block.text.trim();
        if (!trimmed) return <div key={`gap-${bi}`} className="h-1" />;

        if (compact && i === firstContentIdx && !isSpecial(trimmed)) {
          return (
            <p key={`p-${bi}`} className="font-cinzel font-semibold text-text text-base tracking-wide">
              {trimmed}
            </p>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={`h-${bi}`} className="font-cinzel font-bold text-lg text-gold leading-snug tracking-wide border-b border-gold/20 pb-2 mb-1">
              {trimmed.slice(3)}
            </h3>
          );
        }

        if (trimmed.startsWith('Contexto:')) {
          return (
            <CalloutBox key={`ctx-${bi}`} className="bg-surface-2 border-l-2 border-l-indigo-400/60 border border-border">
              <span className="font-cinzel text-[11px] uppercase tracking-[0.15em] text-indigo-300/90 block mb-1.5">Contexto</span>
              <span className="text-text-dim">{parseCallout(trimmed, 'Contexto:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Objetivo:')) {
          return (
            <CalloutBox key={`obj-${bi}`} className="bg-surface-2 border-l-2 border-l-green/60 border border-border">
              <span className="font-cinzel text-[11px] uppercase tracking-[0.15em] text-green/90 block mb-1.5">Objetivo</span>
              <span className="text-text-dim">{parseCallout(trimmed, 'Objetivo:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Mestre:')) {
          return (
            <blockquote key={`mestre-${bi}`} className="px-4 py-3 border-l-2 border-purple-400/50 bg-purple-500/5 text-sm text-text-dim italic leading-relaxed">
              {parseCallout(trimmed, 'Mestre:')}
            </blockquote>
          );
        }

        if (trimmed.startsWith('Prática:')) {
          return (
            <CalloutBox key={`prat-${bi}`} className="bg-gold/5 border border-gold/20">
              <span className="font-cinzel text-[11px] uppercase tracking-[0.15em] text-gold block mb-1.5">Prática</span>
              <span className="text-text font-medium">{parseCallout(trimmed, 'Prática:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Dica:')) {
          return (
            <CalloutBox key={`dica-${bi}`} className="bg-surface-2 border border-border/80">
              <span className="text-[11px] uppercase tracking-widest text-gold/80 font-semibold block mb-1">Dica</span>
              <span className="text-text-dim">{parseCallout(trimmed, 'Dica:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Atenção:')) {
          return (
            <CalloutBox key={`atencao-${bi}`} className="bg-amber-500/5 border-l-2 border-l-amber-500/60 border border-border">
              <span className="text-[11px] uppercase tracking-widest text-amber-400/90 font-semibold block mb-1">Atenção</span>
              <span className="text-text-dim">{parseCallout(trimmed, 'Atenção:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Entrada:')) {
          return (
            <p key={`entrada-${bi}`} className="text-sm text-text-dim">
              <span className="font-semibold text-text-mute uppercase text-[11px] tracking-wider mr-2">Entrada</span>
              {parseCallout(trimmed, 'Entrada:')}
            </p>
          );
        }

        if (trimmed.startsWith('▶')) {
          return (
            <p key={`arrow-${bi}`} className="font-cinzel text-sm font-semibold text-text mt-4 first:mt-0 border-l-2 border-gold/70 pl-3 tracking-wide">
              {trimmed.slice(1).trim()}
            </p>
          );
        }

        if (trimmed.startsWith('•')) {
          return (
            <li key={`bullet-${bi}`} className="ml-1 pl-3 text-text-dim leading-relaxed list-none border-l border-border/60">
              {trimmed.slice(1).trim()}
            </li>
          );
        }

        if (looksLikeCode(trimmed)) {
          return (
            <pre key={`code-${bi}`} className="px-4 py-3 rounded-md bg-[#0d1117] border border-border/80 text-[13px] font-mono text-green/90 whitespace-pre-wrap break-words leading-relaxed">
              {trimmed}
            </pre>
          );
        }

        return (
          <p key={`text-${bi}`} className="text-text-dim leading-[1.75] text-sm">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}
