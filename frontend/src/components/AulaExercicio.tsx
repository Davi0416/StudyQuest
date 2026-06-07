import React, { useEffect, useRef, useState } from 'react';

import Editor from '@monaco-editor/react';

import api, { unwrap } from '../lib/api';

import type { AulaBloco, ValidarCodigoResult } from '../types';

import { AulaRichText } from './AulaRichText';

import { Button } from './ui/Button';

import { IconCheck, IconCode } from '@tabler/icons-react';



const NIVEL_LABEL: Record<number, string> = {
  1: 'Iniciante',
  2: 'Intermediário',
  3: 'Avançado',
  4: 'Desafio final',
};



interface Props {

  bloco: Extract<AulaBloco, { tipo: 'exercicio' }>;

  codigoSalvo?: string;

  aprovado: boolean;

  onAprovado: (codigo: string) => void;

  onCodigoChange: (codigo: string) => void;

  readOnly?: boolean;

}



export function AulaExercicio({ bloco, codigoSalvo, aprovado, onAprovado, onCodigoChange, readOnly }: Props) {

  const codigoInicial = codigoSalvo ?? bloco.codigoInicial;

  const [codigo, setCodigo] = useState(codigoInicial);

  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);



  useEffect(() => {

    setCodigo(codigoSalvo ?? bloco.codigoInicial);

    setFeedback(null);

  }, [bloco.id, codigoSalvo, bloco.codigoInicial]);



  const handleCodigoChange = (val: string) => {

    setCodigo(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => onCodigoChange(val), 400);

  };



  useEffect(() => () => {

    if (debounceRef.current) clearTimeout(debounceRef.current);

  }, []);



  const handleSubmit = async () => {
    setSubmitting(true);
    setFeedback(null);
    onCodigoChange(codigo);
    try {
      const res = await api.post('/exercicios/validar', {
        codigo,
        linguagem: bloco.linguagem,
        testes: bloco.testes,
      });
      if (!isMounted.current) return;
      const result = unwrap(res) as ValidarCodigoResult;
      setFeedback({ ok: result.aprovado, text: result.feedback });
      if (result.aprovado) onAprovado(codigo);
    } catch (err: any) {
      if (!isMounted.current) return;
      setFeedback({ ok: false, text: err.response?.data?.message || 'Erro ao validar código' });
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };



  return (

    <div className={`rounded-lg border overflow-hidden ${aprovado ? 'border-green/40 bg-green/5' : bloco.boss ? 'border-red/40 bg-red/5' : bloco.miniboss ? 'border-orange-500/40 bg-orange-500/5' : 'border-border bg-surface'}`}>

      <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b border-border ${bloco.boss ? 'bg-red/10' : bloco.miniboss ? 'bg-orange-500/10' : 'bg-surface-2'}`}>

        <div className="flex items-center gap-3">

          <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 font-cinzel text-xs font-bold ${bloco.boss ? 'bg-red/20 text-red border border-red/30' : bloco.miniboss ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-gold/10 text-gold border border-gold/25'}`}>
            {bloco.boss ? 'IV' : bloco.miniboss ? 'III' : bloco.nivel}
          </div>

          <div>

            <div className={`text-[10px] uppercase tracking-widest font-semibold ${bloco.boss ? 'text-red' : bloco.miniboss ? 'text-orange-400' : 'text-gold'}`}>

              {bloco.boss ? 'Boss final' : bloco.miniboss ? 'Miniboss' : `Nível ${bloco.nivel} · ${NIVEL_LABEL[bloco.nivel] || 'Exercício'}`}

            </div>

            <div className="text-sm font-semibold flex items-center gap-1.5">

              <IconCode size={14} className="text-text-mute" />

              {bloco.titulo || `Exercício ${bloco.nivel}`}

            </div>

          </div>

        </div>

        {aprovado && (

          <span className="flex items-center gap-1 text-green text-xs font-bold uppercase">

            <IconCheck size={14} /> Aprovado

          </span>

        )}

      </div>



      <div className="p-4 border-b border-border bg-surface/50">

        <AulaRichText conteudo={bloco.enunciado} compact />

      </div>



      <div className={`border-b border-border ${bloco.boss ? 'h-[320px]' : bloco.miniboss ? 'h-[280px]' : 'h-[220px]'}`}>

        <Editor

          height="100%"

          defaultLanguage={bloco.linguagem}

          theme="vs-dark"

          value={codigo}

          onChange={(val) => handleCodigoChange(val || '')}

          options={{

            minimap: { enabled: false },

            fontSize: 13,

            readOnly: readOnly || aprovado,

            scrollBeyondLastLine: false,

            padding: { top: 12 },

          }}

        />

      </div>



      <div className="p-4 flex flex-col gap-3">

        {!readOnly && !aprovado && (

          <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">

            {submitting ? 'Executando...' : 'Executar e Validar'}

          </Button>

        )}

        {feedback && (

          <div className={`p-3 rounded-md text-sm ${feedback.ok ? 'bg-green/10 text-green border border-green/30' : 'bg-red/10 text-red border border-red/30'}`}>

            <pre className="whitespace-pre-wrap font-mono text-xs">{feedback.text}</pre>

          </div>

        )}

      </div>

    </div>

  );

}

