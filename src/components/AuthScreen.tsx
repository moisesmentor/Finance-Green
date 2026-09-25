import React, { useState } from 'react';
import { 
  Wallet, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { 
  loginWithEmail, 
  registerWithEmail, 
  sendPasswordReset, 
  translateAuthError 
} from '../utils/firebase';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password strength checks (minimum 8 chars, letters and numbers)
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordStrong = hasMinLength && hasLetter && hasNumber;

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      console.error('Erro de login:', err);
      setErrorMessage(translateAuthError(err?.code || ''));
    } finally {
      setIsLoading(false);
    }
  };

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Por favor, informe seu nome.');
      return;
    }

    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }

    if (!isPasswordStrong) {
      setErrorMessage('A senha precisa ter no mínimo 8 caracteres, contendo letras e números.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      await registerWithEmail(email, password, name);
      if (onAuthSuccess) onAuthSuccess();
    } catch (err: any) {
      console.error('Erro de cadastro:', err);
      setErrorMessage(translateAuthError(err?.code || ''));
    } finally {
      setIsLoading(false);
    }
  };

  // Password reset handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Digite seu e-mail para receber as instruções de recuperação.');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccessMessage('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada e spam.');
    } catch (err: any) {
      console.error('Erro ao recuperar senha:', err);
      setErrorMessage(translateAuthError(err?.code || ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/25 ring-4 ring-emerald-500/15">
            <Wallet className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Finance Pro
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> Seguro
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
              Gestão Inteligente & Controle Financeiro Privado
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="dark-brushed-metal-modal border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">

          {/* Mode Switcher Tabs (Only in Login / Register mode) */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1 bg-black/50 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Entrar na Conta
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Criar Nova Conta
              </button>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message Alert */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Seu E-mail:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    autoComplete="email"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm placeholder:text-slate-600 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Sua Senha:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm placeholder:text-slate-600 transition-all outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Acessar Minha Conta</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Seu Nome Completo:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Moisés Rodrigues"
                    autoComplete="name"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm placeholder:text-slate-600 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Seu E-mail:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    autoComplete="email"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm placeholder:text-slate-600 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Criar Senha Segura:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres com letras e números"
                    autoComplete="new-password"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm placeholder:text-slate-600 transition-all outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength checklist */}
                {password.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] space-y-1 pt-2">
                    <div className="flex items-center gap-1.5">
                      {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                      <span className={hasMinLength ? 'text-emerald-300 font-medium' : 'text-slate-500'}>Mínimo de 8 caracteres</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasLetter && hasNumber ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />}
                      <span className={hasLetter && hasNumber ? 'text-emerald-300 font-medium' : 'text-slate-500'}>Contém letras e números</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Confirmar a Senha:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm placeholder:text-slate-600 transition-all outline-none font-mono"
                  />
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <span className="text-[11px] text-rose-400 font-medium">As senhas não coincidem.</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || !isPasswordStrong || !passwordsMatch}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Criar Minha Conta Segura</span>
                    <ShieldCheck className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD VIEW */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                  <KeyRound className="w-3 h-3" /> Recuperação Oficial
                </div>
                <h3 className="text-base font-bold text-white">
                  Redefinir sua Senha
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Digite o e-mail da sua conta. O Firebase enviará um link seguro da Google para você criar uma nova senha.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Seu E-mail Cadastrado:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    autoComplete="email"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm placeholder:text-slate-600 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enviar Link de Recuperação</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para o Login</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Security Trust Footer */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Autenticação protegida com criptografia Google Firebase Auth</span>
        </div>

      </div>
    </div>
  );
}
