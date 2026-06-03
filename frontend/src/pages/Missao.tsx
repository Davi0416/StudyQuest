import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Topbar } from '../components/Topbar';
import api, { unwrap } from '../lib/api';
import type {  Missao as MissaoType  } from "../types";
import Editor from '@monaco-editor/react';
import { Button } from '../components/ui/Button';

export function Missao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addXp } = useUser();
  
  const [missao, setMissao] = useState<MissaoType | null>(null);
  const [codigo, setCodigo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ status: string; text: string } | null>(null);

  useEffect(() => {
    const fetchMissao = async () => {
      try {
        const res = await api.get(`/missoes/${id}`);
        const data = unwrap(res) as MissaoType;
        setMissao(data);
        setCodigo(data.codigoInicial);
      } catch (err) {
        console.error('Failed to fetch missao', err);
      }
    };
    if (id) fetchMissao();
  }, [id]);

  const handleSubmit = async () => {
    if (!missao) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post(`/missoes/${missao.id}/submeter`, { codigo, linguagem: missao.linguagem });
      const sub = unwrap(res) as any;
      
      if (sub.status === 'APROVADO') {
        setFeedback({ status: 'success', text: sub.primeiraAprovacao ? `Sucesso! Você ganhou ${missao.xpRecompensa} XP!` : 'Sucesso! Missão concluída.' });
        if (sub.primeiraAprovacao) {
          addXp(missao.xpRecompensa);
        }
        try {
          await api.post(`/nos/${missao.noId}/concluir`);
        } catch (err) {
          console.error('Failed to complete node after mission', err);
        }
      } else {
        setFeedback({ status: 'error', text: sub.feedback || 'Falha nos testes.' });
      }
    } catch (err: any) {
      setFeedback({ status: 'error', text: err.response?.data?.message || 'Erro ao submeter' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!missao) return <div className="min-h-screen bg-bg text-text grid place-items-center">Carregando missão...</div>;

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <Topbar />

      <div className="flex-1 grid grid-cols-[350px_1fr] min-h-0">
        
        {/* Enunciado */}
        <aside className="bg-surface border-r border-border overflow-y-auto p-6 scrollbar-thin">
          <Button variant="ghost" className="mb-6 px-3 py-1 text-xs" onClick={() => navigate('/mapa')}>
            ← Voltar ao mapa
          </Button>

          <div className="text-[10px] text-gold tracking-widest uppercase font-semibold mb-2">Desafio Prático</div>
          <h2 className="font-cinzel font-bold text-2xl mb-4">{missao.titulo}</h2>
          
          <div className="prose prose-invert prose-sm max-w-none text-text-dim" dangerouslySetInnerHTML={{ __html: missao.enunciado.replace(/\n/g, '<br/>') }} />
          
          <div className="mt-8 p-4 rounded-md bg-surface-2 border border-border">
            <div className="text-xs text-text-mute mb-1">Recompensa</div>
            <div className="font-cinzel font-bold text-xl text-gold">+{missao.xpRecompensa} XP</div>
          </div>
        </aside>

        {/* Editor */}
        <div className="flex flex-col relative bg-[#1e1e1e]">
          <div className="h-10 bg-surface border-b border-border flex items-center px-4 justify-between shrink-0">
            <div className="text-sm font-mono text-text-mute">main.{missao.linguagem === 'python' ? 'py' : missao.linguagem === 'javascript' ? 'js' : 'java'}</div>
            <Button onClick={handleSubmit} disabled={submitting} className="py-1 px-4 text-xs h-auto">
              {submitting ? 'Avaliando...' : 'Submeter Código'}
            </Button>
          </div>

          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              defaultLanguage={missao.linguagem}
              theme="vs-dark"
              value={codigo}
              onChange={(val) => setCodigo(val || '')}
              options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
          </div>

          {/* Feedback Panel */}
          {feedback && (
            <div className={`p-4 border-t ${feedback.status === 'success' ? 'bg-green/10 border-green' : 'bg-red/10 border-red'} z-10 shrink-0`}>
              <div className={`font-bold mb-1 ${feedback.status === 'success' ? 'text-green' : 'text-red'}`}>
                {feedback.status === 'success' ? 'Missão Aprovada!' : 'Missão Reprovada'}
              </div>
              <pre className="text-sm text-text-dim whitespace-pre-wrap font-mono">{feedback.text}</pre>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
