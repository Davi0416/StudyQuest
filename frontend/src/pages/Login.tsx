import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate, Navigate } from 'react-router-dom';
import api from '../lib/api';
import { IconMinus, IconX, IconLogin2, IconUserPlus, IconShieldCheck, IconEye, IconEyeOff } from '@tabler/icons-react';

type Mode = 'login' | 'register' | 'verify';

export function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const { user, setUser } = useUser();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const finishLogin = async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    const userRes = await api.get('/users/me');
    setUser(userRes.data.data);
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      if (mode === 'verify') {
        const res = await api.post('/auth/verify', { email, code });
        const data = res.data.data;
        await finishLogin(data.accessToken, data.refreshToken);
        return;
      }

      if (mode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        const data = res.data.data;
        await finishLogin(data.accessToken, data.refreshToken);
        return;
      }

      const res = await api.post('/auth/register', { name, email, password });
      if (res.data.data && res.data.data.accessToken) {
        await finishLogin(res.data.data.accessToken, res.data.data.refreshToken);
        return;
      }
      setInfo(res.data.message || 'Enviamos um código para o seu e-mail.');
      setCode('');
      setMode('verify');
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message || 'Erro de autenticação';

      if (mode === 'login' && status === 403) {
        setInfo(message);
        setMode('verify');
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    setInfo('');
    try {
      const res = await api.post('/auth/verify/resend', { email });
      setInfo(res.data.message || 'Novo código enviado.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Não foi possível reenviar o código');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex items-center justify-center p-md bg-[linear-gradient(rgba(16,20,26,0.9),rgba(16,20,26,0.9)),url('data:image/svg+xml;utf8,<svg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'><rect fill=\'%2331353c\' height=\'1\' width=\'1\'/></svg>')] bg-repeat">
      <main className="w-full max-w-[500px]">
        <div className="bg-surface-container border-border-width border-outline shadow-[8px_8px_0_theme(colors.outline-variant)]">
          <div className="bg-outline text-background border-b-border-width border-outline px-sm py-base flex justify-between items-center">
            <span className="font-label-caps text-label-caps uppercase">System.Login_Sequence</span>
            <div className="flex gap-base">
              <div className="w-sm h-sm bg-surface border-[2px] border-background flex items-center justify-center cursor-pointer hover:bg-primary transition-colors text-background">
                <IconMinus size={14} stroke={3} />
              </div>
              <div className="w-sm h-sm bg-surface border-[2px] border-background flex items-center justify-center cursor-pointer hover:bg-error transition-colors text-background">
                <IconX size={14} stroke={3} />
              </div>
            </div>
          </div>
          
          <div className="p-lg flex flex-col gap-lg">
            <div className="text-center">
              <h1 className="font-h1 text-h1 text-primary uppercase drop-shadow-[4px_4px_0_theme(colors.on-primary-container)] mb-base">
                {mode === 'login' && 'Quest Start'}
                {mode === 'register' && 'New Hero'}
                {mode === 'verify' && 'Verify ID'}
              </h1>
              <p className="font-code text-code text-on-surface-variant">
                {mode === 'login' && 'Insira suas credenciais para acessar o reino.'}
                {mode === 'register' && 'Registre-se para iniciar sua jornada.'}
                {mode === 'verify' && 'Digite o código de acesso místico enviado ao seu email.'}
              </p>
            </div>
            
            <form className="flex flex-col gap-md" onSubmit={handleSubmit}>
              {error && <div className="p-sm bg-error-container text-on-error-container border-border-width border-error font-code text-code">{error}</div>}
              {info && <div className="p-sm bg-tertiary-container text-on-tertiary-container border-border-width border-tertiary font-code text-code">{info}</div>}
              
              {mode === 'verify' ? (
                <>
                  <div className="flex flex-col gap-base relative">
                    <label className="font-label-caps text-label-caps text-on-surface uppercase" htmlFor="code">Código de Verificação</label>
                    <input
                      className="bg-surface-dim border-border-width border-outline text-code font-code text-on-surface p-sm focus:outline-none focus:border-primary focus:shadow-[4px_4px_0_theme(colors.primary)] transition-shadow w-full text-center tracking-[0.5em] text-[20px]"
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    className="mt-sm bg-secondary-container text-on-secondary-container border-border-width border-outline font-label-caps text-label-caps uppercase py-sm px-md w-full text-center relative hover:bg-secondary hover:text-on-secondary shadow-[6px_6px_0_theme(colors.on-secondary-container)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all flex items-center justify-center gap-xs disabled:opacity-50 disabled:pointer-events-none"
                    type="submit"
                    disabled={loading || code.length !== 6}
                  >
                    <IconShieldCheck size={20} />
                    {loading ? 'Verificando...' : 'Confirmar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="mt-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-code"
                  >
                    {resending ? 'Reenviando...' : 'Reenviar código'}
                  </button>
                </>
              ) : (
                <>
                  {mode === 'register' && (
                    <div className="flex flex-col gap-base relative">
                      <label className="font-label-caps text-label-caps text-on-surface uppercase" htmlFor="name">Nome de Aventureiro</label>
                      <input
                        className="bg-surface-dim border-border-width border-outline text-code font-code text-on-surface p-sm focus:outline-none focus:border-primary focus:shadow-[4px_4px_0_theme(colors.primary)] transition-shadow w-full"
                        id="name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ex: Hero_01"
                        required
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-base relative">
                    <label className="font-label-caps text-label-caps text-on-surface uppercase" htmlFor="email">Email</label>
                    <input
                      className="bg-surface-dim border-border-width border-outline text-code font-code text-on-surface p-sm focus:outline-none focus:border-primary focus:shadow-[4px_4px_0_theme(colors.primary)] transition-shadow w-full"
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-base relative">
                    <label className="font-label-caps text-label-caps text-on-surface uppercase flex justify-between" htmlFor="password">
                      Senha
                      {mode === 'login' && (
                        <a className="text-secondary hover:text-primary underline hover:no-underline lowercase text-xs" href="#">Esqueceu?</a>
                      )}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        className="bg-surface-dim border-border-width border-outline text-code font-code text-on-surface p-sm focus:outline-none focus:border-primary focus:shadow-[4px_4px_0_theme(colors.primary)] transition-shadow w-full pr-12"
                        id="password"
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="********"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPass(!showPass)} 
                        className="absolute right-3 text-on-surface-variant hover:text-primary"
                      >
                        {showPass ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button
                    className="mt-sm bg-secondary-container text-on-secondary-container border-border-width border-outline font-label-caps text-label-caps uppercase py-sm px-md w-full text-center relative hover:bg-secondary hover:text-on-secondary shadow-[6px_6px_0_theme(colors.on-secondary-container)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all flex items-center justify-center gap-xs disabled:opacity-50 disabled:pointer-events-none"
                    type="submit"
                    disabled={loading}
                  >
                    {mode === 'login' ? <IconLogin2 size={20} /> : <IconUserPlus size={20} />}
                    {loading ? 'Carregando...' : mode === 'login' ? 'Initialize Login' : 'Create Account'}
                  </button>
                </>
              )}
            </form>
            
            <div className="border-t-border-width border-outline-variant pt-md text-center">
              {mode === 'verify' ? (
                <p className="font-code text-code text-on-surface-variant">
                  <button
                    type="button"
                    className="text-primary font-bold hover:bg-primary hover:text-on-primary px-base py-[2px] transition-colors border-border-width border-transparent hover:border-outline uppercase"
                    onClick={() => { setMode('login'); setError(''); setInfo(''); }}
                  >
                    Voltar para o Login
                  </button>
                </p>
              ) : (
                <p className="font-code text-code text-on-surface-variant">
                  {mode === 'login' ? 'New adventurer? ' : 'Já possui uma conta? '}
                  <button
                    type="button"
                    className="text-primary font-bold hover:bg-primary hover:text-on-primary px-base py-[2px] transition-colors border-border-width border-transparent hover:border-outline uppercase"
                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo(''); }}
                  >
                    {mode === 'login' ? 'Create Account' : 'Fazer Login'}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
