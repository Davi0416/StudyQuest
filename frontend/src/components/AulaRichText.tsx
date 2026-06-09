import React from 'react';

function looksLikeCode(line: string): boolean {
  const t = line.trim();
  if (t.split(/\s+/).length >= 10) return false;
  if (/\b(você|vocês|capítulo|aprende|aparecem|quando|porque|também|sempre|nunca|linguagem)\b/i.test(t)) return false;
  if (/^(print|if |else|elif |for |while |try|except|def |import |from |return |break|continue|[a-z_][\w]*\s*=)/.test(t)) return true;
  if (/^[a-z_][\w.]*\s*\(/i.test(t) && t.length < 80) return true;
  return false;
}

function parseInlineFormatting(text: string) {
  const parts = text.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-text-dim">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-surface-container-highest px-1.5 py-0.5 rounded text-primary font-mono text-[0.85em] border border-outline/30">{part.slice(1, -1)}</code>;
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return <a key={i} href={linkMatch[2]} target="_blank" rel="noreferrer" className="text-primary hover:underline">{linkMatch[1]}</a>;
    }
    return part;
  });
}

function CalloutBox({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <div className={`px-4 py-3 rounded-md text-sm text-text-dim leading-relaxed ${className}`}>
      {children}
    </div>
  );
}

function parseCallout(line: string, prefix: string) {
  const content = line.startsWith(prefix) ? line.slice(prefix.length).trim() : line;
  return content.split('\n').map((ln, i, arr) => (
    <React.Fragment key={i}>
      {parseInlineFormatting(ln)}
      {i < arr.length - 1 && <br />}
    </React.Fragment>
  ));
}

type Block =
  | { kind: 'line'; index: number; text: string }
  | { kind: 'saida'; index: number; label: string; header: string; body: string[] }
  | { kind: 'code'; index: number; language: string; body: string[] };

function groupLines(lines: string[]): Block[] {
  const isSaidaHeader = (t: string) => t.startsWith('Saída:') || t.startsWith('Saída esperada:');
  const isBlockHeader = (t: string) =>
    t.startsWith('## ') || t.startsWith('Contexto:') || t.startsWith('Objetivo:') ||
    t.startsWith('Mestre:') || t.startsWith('Prática:') || t.startsWith('Dica:') ||
    t.startsWith('Atenção:') || t.startsWith('Entrada:') || t.startsWith('▶') ||
    isSaidaHeader(t) || t.startsWith('```');

  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length) {
        if (lines[i].trim().startsWith('```')) {
          i++;
          break;
        }
        body.push(lines[i]);
        i++;
      }
      blocks.push({ kind: 'code', index: i, language, body });
    } else if (isSaidaHeader(trimmed)) {
      const isExpected = trimmed.startsWith('Saída esperada:');
      const prefix = isExpected ? 'Saída esperada:' : 'Saída:';
      const label = isExpected ? 'Saída esperada' : 'Saída';
      const inlineValue = trimmed.slice(prefix.length).trim();
      const body: string[] = inlineValue ? [inlineValue] : [];
      i++;
      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next) { i++; break; }
        if (isBlockHeader(next)) break;
        body.push(next);
        i++;
      }
      blocks.push({ kind: 'saida', index: i, label, header: prefix, body });
    } else {
      let text = lines[i];
      const prefixes = ['Contexto:', 'Objetivo:', 'Mestre:', 'Prática:', 'Dica:', 'Atenção:', 'Entrada:'];
      if (prefixes.some(p => trimmed.startsWith(p))) {
        i++;
        while (i < lines.length) {
          const next = lines[i].trim();
          if (!next) { i++; break; }
          if (isBlockHeader(next)) break;
          text += '\n' + next;
          i++;
        }
      } else {
        i++;
      }
      blocks.push({ kind: 'line', index: i, text });
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
        if (block.kind === 'code') {
          return (
            <div key={`code-${bi}`} className="rounded-md bg-[#0d1117] border border-border/80 overflow-hidden my-3">
              {block.language && (
                <div className="bg-surface-2 px-4 py-1.5 border-b border-border/80 text-[10px] font-mono text-text-mute uppercase tracking-widest">
                  {block.language}
                </div>
              )}
              <pre className="px-4 py-3 text-[13px] font-mono text-green/90 whitespace-pre-wrap break-words leading-relaxed overflow-x-auto">
                {block.body.join('\n')}
              </pre>
            </div>
          );
        }

        if (block.kind === 'saida') {
          return (
            <CalloutBox key={`saida-${bi}`} className="bg-surface-2 border-l-2 border-l-sky-400/60 border border-border font-mono text-sm">
              <span className="font-pixel text-[10px] uppercase tracking-[0.15em] text-sky-300/90 block mb-1.5 not-italic font-normal">{block.label}</span>
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
              {parseInlineFormatting(trimmed)}
            </p>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={`h-${bi}`} className="font-cinzel font-bold text-lg text-gold leading-snug tracking-wide border-b border-gold/20 pb-2 mb-1 mt-4">
              {parseInlineFormatting(trimmed.slice(3))}
            </h3>
          );
        }

        if (trimmed.startsWith('Contexto:')) {
          return (
            <CalloutBox key={`ctx-${bi}`} className="bg-surface-2 border-l-2 border-l-indigo-400/60 border border-border">
              <span className="font-pixel text-[10px] uppercase tracking-[0.15em] text-indigo-300/90 block mb-1.5 mt-1">Contexto</span>
              <span className="text-text-dim">{parseCallout(trimmed, 'Contexto:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Objetivo:')) {
          return (
            <CalloutBox key={`obj-${bi}`} className="bg-surface-2 border-l-2 border-l-green/60 border border-border mt-6">
              <span className="font-pixel text-[10px] uppercase tracking-[0.15em] text-green/90 block mb-1.5 mt-1">Objetivo</span>
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
              <span className="font-pixel text-[10px] uppercase tracking-[0.15em] text-gold block mb-1.5 mt-1">Prática</span>
              <span className="text-text font-medium">{parseCallout(trimmed, 'Prática:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Dica:')) {
          return (
            <CalloutBox key={`dica-${bi}`} className="bg-surface-2 border border-border/80">
              <span className="font-pixel text-[10px] uppercase tracking-[0.15em] text-gold/80 block mb-1 mt-1">Dica</span>
              <span className="text-text-dim">{parseCallout(trimmed, 'Dica:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Atenção:')) {
          return (
            <CalloutBox key={`atencao-${bi}`} className="bg-amber-500/5 border-l-2 border-l-amber-500/60 border border-border">
              <span className="font-pixel text-[10px] uppercase tracking-[0.15em] text-amber-400/90 block mb-1 mt-1">Atenção</span>
              <span className="text-text-dim">{parseCallout(trimmed, 'Atenção:')}</span>
            </CalloutBox>
          );
        }

        if (trimmed.startsWith('Entrada:')) {
          return (
            <p key={`entrada-${bi}`} className="text-sm text-text-dim">
              <span className="font-pixel text-text-mute uppercase text-[10px] tracking-wider mr-2">Entrada</span>
              {parseCallout(trimmed, 'Entrada:')}
            </p>
          );
        }

        if (trimmed.startsWith('▶')) {
          return (
            <p key={`arrow-${bi}`} className="font-cinzel text-sm font-semibold text-text mt-4 first:mt-0 border-l-2 border-gold/70 pl-3 tracking-wide">
              {parseInlineFormatting(trimmed.slice(1).trim())}
            </p>
          );
        }

        if (trimmed.startsWith('•')) {
          return (
            <li key={`bullet-${bi}`} className="ml-1 pl-3 text-text-dim leading-relaxed list-none border-l border-border/60">
              {parseInlineFormatting(trimmed.slice(1).trim())}
            </li>
          );
        }

        if (looksLikeCode(trimmed)) {
          return (
            <pre key={`code-guess-${bi}`} className="px-4 py-3 rounded-md bg-[#0d1117] border border-border/80 text-[13px] font-mono text-green/90 whitespace-pre-wrap break-words leading-relaxed overflow-x-auto my-2">
              {trimmed}
            </pre>
          );
        }

        return (
          <p key={`text-${bi}`} className="text-text-dim leading-[1.75] text-sm">
            {parseInlineFormatting(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

