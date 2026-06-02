import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate, Navigate } from 'react-router-dom';
import api from '../lib/api';
import { IconSword, IconSparkles, IconBolt, IconStack2, IconCrown, IconLogin2, IconUserPlus, IconMail, IconLock, IconEye, IconEyeOff, IconCheck, IconFlag2, IconUser } from '@tabler/icons-react';
import { Button } from '../components/ui/Button';

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (mode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        const data = res.data.data;
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
      } else {
        const res = await api.post('/auth/register', { name, email, password });
        const data = res.data.data;
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      
      const userRes = await api.get('/users/me');
      setUser(userRes.data.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Erro de autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <main className="w-full max-w-[940px] grid md:grid-cols-[1.05fr_1fr] bg-surface border border-border rounded-[18px] overflow-hidden shadow-soft relative reveal" style={{ '--d': '.04s' } as any}>
        {/* Brand Panel */}
        <aside className="relative p-10 md:p-12 flex flex-col border-b md:border-r md:border-b-0 border-border overflow-hidden" style={{ background: 'radial-gradient(520px 360px at 18% 12%, rgba(240,192,96,.10), transparent 60%), linear-gradient(160deg, #12161d, #0d1117)' }}>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 grid place-items-center border-[0.5px] border-gold/50 rounded-[10px] text-gold text-[22px]" style={{ background: 'linear-gradient(160deg, rgba(240,192,96,.16), rgba(240,192,96,.04))' }}>
              <IconSword size={24} />
            </div>
            <div className="font-cinzel font-bold text-[22px] tracking-wide text-text">
              Study<b className="text-gold">Quest</b>
            </div>
          </div>

          <div className="mt-auto pt-8 relative z-10">
            <div className="text-[12.5px] text-gold font-semibold tracking-[1.6px] uppercase flex items-center gap-2 mb-4">
              <IconSparkles size={16} /> Sua jornada começa aqui
            </div>
            <h1 className="font-cinzel font-bold text-[31px] leading-[1.18] mb-4">
              Transforme seus estudos em uma <span className="text-gold">grande aventura</span>
            </h1>
            <p className="text-text-dim text-[14px] max-w-[34ch]">
              Acumule XP, mantenha seu streak em chamas e desbloqueie cada nó do mapa de conhecimento.
            </p>

            <ul className="list-none mt-8 flex flex-col gap-4">
              <li className="flex items-center gap-3 text-[14px] text-text">
                <span className="w-9 h-9 shrink-0 rounded-[9px] grid place-items-center border-[0.5px] text-gold bg-gold/10 border-gold/25">
                  <IconBolt size={20} />
                </span>
                <span>
                  Ganhe XP a cada missão
                  <small className="block text-text-mute text-[12px]">Suba de nível enquanto aprende</small>
                </span>
              </li>
              <li className="flex items-center gap-3 text-[14px] text-text">
                <span className="w-9 h-9 shrink-0 rounded-[9px] grid place-items-center border-[0.5px] text-green bg-green/10 border-green/25">
                  <IconStack2 size={20} />
                </span>
                <span>
                  Revisão espaçada (Leitner)
                  <small className="block text-text-mute text-[12px]">Memorize de verdade, sem decoreba</small>
                </span>
              </li>
              <li className="flex items-center gap-3 text-[14px] text-text">
                <span className="w-9 h-9 shrink-0 rounded-[9px] grid place-items-center border-[0.5px] text-blue bg-blue/10 border-blue/25">
                  <IconCrown size={20} />
                </span>
                <span>
                  Ranking semanal com amigos
                  <small className="block text-text-mute text-[12px]">Compita e suba no pódio</small>
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-5 border-t border-border flex items-center gap-3 text-[12.5px] text-text-mute relative z-10">
            <span className="text-gold tracking-widest">★★★★★</span>
            <span>Mais de 12 mil aventureiros já estudam aqui</span>
          </div>
        </aside>

        {/* Form Panel */}
        <section className="p-8 md:p-11 flex flex-col">
          <div className="grid grid-cols-2 gap-1 bg-surface-2 border border-border rounded-md p-1.5 mb-7 relative">
            <div 
              className="absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] rounded-md transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)]"
              style={{ 
                background: 'linear-gradient(150deg,#f0c060,#d8a945)', 
                boxShadow: '0 6px 16px -8px rgba(240,192,96,.7)',
                transform: mode === 'register' ? 'translateX(100%)' : 'translateX(0)' 
              }}
            />
            <button 
              className={`relative z-10 py-2.5 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'login' ? 'text-[#1a1206]' : 'text-text-dim'}`}
              onClick={() => setMode('login')}
            >
              <IconLogin2 size={16} /> Entrar
            </button>
            <button 
              className={`relative z-10 py-2.5 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'register' ? 'text-[#1a1206]' : 'text-text-dim'}`}
              onClick={() => setMode('register')}
            >
              <IconUserPlus size={16} /> Criar conta
            </button>
          </div>

          <div className="mb-6">
            <h2 className="font-cinzel font-bold text-2xl mb-1.5">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-text-dim text-sm">
              {mode === 'login' ? 'Continue de onde parou na sua jornada.' : 'Comece sua jornada e ganhe seus primeiros 50 XP.'}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="mb-4 text-red text-sm">{error}</div>}

            {mode === 'register' && (
              <div className="mb-4">
                <label className="block text-[12.5px] font-semibold text-text-dim mb-1.5 tracking-wide">Nome de aventureiro</label>
                <div className="relative flex items-center bg-surface-2 border border-border rounded-sm focus-within:border-gold focus-within:ring-[3px] focus-within:ring-gold/15 transition-all">
                  <IconUser className="ml-3.5 text-text-mute shrink-0" size={18} />
                  <input 
                    type="text" 
                    value={name} onChange={e => setName(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-text text-[14.5px] py-3 px-3.5"
                    placeholder="Como devemos te chamar?" required 
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-[12.5px] font-semibold text-text-dim mb-1.5 tracking-wide">E-mail</label>
              <div className="relative flex items-center bg-surface-2 border border-border rounded-sm focus-within:border-gold focus-within:ring-[3px] focus-within:ring-gold/15 transition-all">
                <IconMail className="ml-3.5 text-text-mute shrink-0" size={18} />
                <input 
                  type="email" 
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-text text-[14.5px] py-3 px-3.5"
                  placeholder="voce@exemplo.com" required 
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[12.5px] font-semibold text-text-dim mb-1.5 tracking-wide">Senha</label>
              <div className="relative flex items-center bg-surface-2 border border-border rounded-sm focus-within:border-gold focus-within:ring-[3px] focus-within:ring-gold/15 transition-all">
                <IconLock className="ml-3.5 text-text-mute shrink-0" size={18} />
                <input 
                  type={showPass ? 'text' : 'password'} 
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-text text-[14.5px] py-3 px-3.5"
                  placeholder={mode === 'register' ? 'Mínimo de 8 caracteres' : '••••••••'} required 
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="px-3.5 text-text-mute hover:text-text-dim">
                  {showPass ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'login' ? (
              <div className="flex items-center justify-between mt-[-4px] mb-5">
                <label className="flex items-center gap-2 text-[13px] text-text-dim cursor-pointer select-none">
                  <input type="checkbox" className="hidden peer" defaultChecked />
                  <div className="w-[18px] h-[18px] rounded-[5px] border border-border bg-surface-2 peer-checked:bg-gold peer-checked:border-gold text-[#1a1206] grid place-items-center transition-colors">
                    <IconCheck size={12} className="opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  Manter conectado
                </label>
                <a href="#" className="text-[13px] text-text-dim hover:text-blue transition-colors">Esqueci minha senha</a>
              </div>
            ) : (
              <p className="text-[12px] text-text-mute mt-[-4px] mb-5">
                Ao criar a conta, você concorda com os <a href="#" className="text-text-dim border-b border-border hover:text-gold hover:border-gold">Termos</a> e a <a href="#" className="text-text-dim border-b border-border hover:text-gold hover:border-gold">Política de Privacidade</a>.
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full gap-2">
              {mode === 'login' ? <IconSword size={18} /> : <IconFlag2 size={18} />}
              {loading ? 'Carregando...' : mode === 'login' ? 'Entrar na aventura' : 'Criar conta e começar'}
            </Button>
          </form>

          <div className="flex items-center gap-4 my-5 text-text-mute text-xs tracking-wide uppercase before:flex-1 before:h-[0.5px] before:bg-border after:flex-1 after:h-[0.5px] after:bg-border">
            ou
          </div>

          <button className="flex items-center justify-center gap-3 w-full py-3 rounded-sm border border-border bg-surface-2 text-text font-semibold text-sm hover:border-[#3d444d] hover:bg-[#222936] hover:-translate-y-[2px] transition-all">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 19.5-8 19.5-20 0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.6 2.3-7.2 2.3-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C40.9 36 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
            {mode === 'login' ? 'Continuar com Google' : 'Cadastrar com Google'}
          </button>

          <p className="mt-6 text-center text-[13.5px] text-text-dim">
            {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem uma conta? '}
            <button 
              type="button" 
              className="text-gold font-semibold hover:underline"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Criar conta grátis' : 'Fazer login'}
            </button>
          </p>

        </section>
      </main>
    </div>
  );
}
