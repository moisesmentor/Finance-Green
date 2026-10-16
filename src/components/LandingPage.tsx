import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Check, 
  X,
  ArrowRight, 
  TrendingUp,
  PieChart,
  Layers,
  Building2,
  Target,
  Sparkles,
  CheckCircle2,
  Clock,
  CreditCard,
  HelpCircle,
  ChevronDown,
  Lock,
  Smartphone,
  MessageCircle,
  Bot,
  Landmark,
  FileSpreadsheet,
  PiggyBank
} from 'lucide-react';
import { ThemeMode } from '../types';

interface LandingPageProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNavigateAuth: (mode: 'login' | 'register') => void;
  onNavigateLegal?: (page: 'termos' | 'privacidade' | 'excluir-conta') => void;
}

const ROTATING_PHRASES = [
  'no seu controle.',
  'sem planilhas.',
  'com clareza mensal.',
  'do saldo ao patrimônio.',
];

export const FAQ_ITEMS = [
  {
    question: 'O Green Finance Pro pede a senha do meu banco?',
    answer:
      'Não. Hoje todo o controle de lançamentos e saldos bancários no Green Finance Pro é feito por você (manualmente ou importando arquivos OFX/CSV do seu extrato), sem nunca solicitar agência, conta ou senha bancária.',
  },
  {
    question: 'Como meus dados financeiros são protegidos e onde ficam salvos?',
    answer:
      'Sua conta utiliza autenticação criptografada pelo Google Firebase Authentication e banco de dados Cloud Firestore na nuvem, com regras de segurança estritas que isolam os documentos pelo seu identificador único (UID). Ninguém além de você consegue visualizar suas movimentações.',
  },
  {
    question: 'Vocês vendem ou compartilham meus dados financeiros?',
    answer:
      'Jamais. Não vendemos seus dados pessoais ou financeiros e não exibimos anúncios dentro do aplicativo. Seus registros existem exclusivamente para gerar seus painéis, gráficos e relatórios.',
  },
  {
    question: 'Como funciona nos planos pagos e como posso cancelar?',
    answer:
      'Você pode cancelar sua assinatura a qualquer momento, sem multa ou fidelidade. O cancelamento interrompe cobranças futuras imediatamente e seu acesso permanece ativo até o final do período já pago. Além disso, compras iniciais contam com a garantia legal de 7 dias de reembolso integral (art. 49 do CDC).',
  },
  {
    question: 'O que acontece com meus dados se eu decidir excluir minha conta?',
    answer:
      'Você pode exportar um backup completo em JSON quando quiser e solicitar a exclusão definitiva da sua conta e de todas as suas subcoleções (transações, metas, orçamentos, contas e patrimônio), que são permanentemente removidas do banco de dados.',
  },
  {
    question: 'Funciona no celular e no computador?',
    answer:
      'Sim! O Green Finance Pro foi desenhado com layout responsivo (mobile-first). Você pode acessar pelo navegador do celular ou computador com sincronização em tempo real e adicionar um atalho direto na tela inicial do seu smartphone.',
  },
  {
    question: 'Consigo controlar compras parceladas e contas fixas?',
    answer:
      'Sim. Ao criar um lançamento, você pode definir o número de parcelas (que são projetadas automaticamente nos meses seguintes com indicação de 1/10, 2/10...) ou marcá-lo como despesa/receita recorrente mensal ou anual.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  theme,
  onToggleTheme,
  onNavigateAuth,
  onNavigateLegal,
}) => {
  // Subtle typing / phrase rotation respecting prefers-reduced-motion
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState(ROTATING_PHRASES[0]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayedText(ROTATING_PHRASES[0]);
      return;
    }

    const currentFullText = ROTATING_PHRASES[phraseIndex];
    const typingSpeed = isDeleting ? 35 : 65;

    const timer = setTimeout(() => {
      if (!isDeleting && displayedText === currentFullText) {
        setTimeout(() => setIsDeleting(true), 2400);
      } else if (isDeleting && displayedText === '') {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % ROTATING_PHRASES.length);
      } else {
        const nextLength = isDeleting
          ? displayedText.length - 1
          : displayedText.length + 1;
        setDisplayedText(currentFullText.slice(0, nextLength));
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, phraseIndex]);

  // Interactive tab inside the Hero Dashboard Mockup
  const [mockupNav, setMockupNav] = useState<'dashboard' | 'extrato' | 'contas' | 'metas' | 'patrimonio'>('dashboard');

  // Interactive filter tab inside the Feature 2 (Extrato) Mockup
  const [extratoMockTab, setExtratoMockTab] = useState<'all' | 'expense' | 'income' | 'pending' | 'installments'>('all');
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-[#060606] text-slate-900 dark:text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-400 transition-colors duration-300">
      
      {/* =================================================================== */}
      {/* 2. CABEÇALHO FIXO E ENXUTO                                          */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 dark:bg-[#060606]/85 border-b border-slate-200/80 dark:border-white/[0.08] transition-colors duration-300">
        <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          
          {/* Brand Logo */}
          <a 
            href="#" 
            className="inline-flex items-center gap-2.5 text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
          >
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#059669] via-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-500/30">
              <Wallet className="w-4 h-4" />
            </span>
            <span>Green Finance</span>
            <span className="px-1.5 py-0.5 text-xs font-extrabold uppercase tracking-wider bg-emerald-500/15 text-[#059669] dark:text-emerald-400 border border-emerald-500/30 rounded-md">
              PRO
            </span>
          </a>

          {/* Navigation Links */}
          <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#recursos" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Recursos
            </a>
            <a href="#planos" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Planos
            </a>
            <a href="#duvidas" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Dúvidas
            </a>
          </nav>

          {/* Right Actions: Theme Toggle + Entrar + Criar conta */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent hover:border-slate-200/80 dark:hover:border-white/10 transition-all cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigateAuth('login')}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer"
            >
              Entrar
            </button>

            <button
              type="button"
              onClick={() => onNavigateAuth('register')}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#059669] hover:bg-emerald-500 active:scale-95 shadow-sm shadow-emerald-600/25 dark:shadow-[0_0_20px_-4px_rgba(5,150,105,0.55)] transition-all cursor-pointer"
            >
              Criar conta
            </button>
          </div>

        </div>
      </header>

      <main>
        {/* =================================================================== */}
        {/* 3. HERO SECTION                                                     */}
        {/* =================================================================== */}
        <section className="relative pt-12 sm:pt-20 pb-12 sm:pb-16 text-center overflow-hidden">
          
          {/* Ambient radial glow */}
          <div 
            aria-hidden="true" 
            className="pointer-events-none absolute inset-x-0 -top-36 mx-auto h-[380px] max-w-[720px] rounded-full bg-[#059669]/15 dark:bg-[#059669]/20 blur-[110px]" 
          />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
            
            {/* Subtle top pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
              <span className="font-bold text-slate-900 dark:text-white">Green Finance Pro</span>
              <span className="text-slate-400 dark:text-slate-500">•</span>
              <span>Gestão financeira pessoal e familiar</span>
            </div>

            {/* Main Headline */}
            <h1 
              aria-label="Suas contas e patrimônio no seu controle."
              className="mx-auto max-w-3xl text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08] text-slate-900 dark:text-white"
            >
              <span className="block">Suas contas e patrimônio</span>
              <span className="block mt-1 min-h-[1.15em]">
                <span className="bg-gradient-to-r from-[#059669] via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                  {displayedText}
                </span>
                <span 
                  aria-hidden="true"
                  className="ml-1 inline-block w-[3px] h-[0.82em] align-baseline bg-[#059669] dark:bg-emerald-400 animate-pulse" 
                />
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Acompanhe receitas, despesas, tetos por categoria, reserva de emergência e o saldo real dos seus bancos em um painel limpo, rápido e privado.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => onNavigateAuth('register')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm sm:text-base font-bold text-white bg-[#059669] hover:bg-emerald-500 active:scale-98 shadow-lg shadow-emerald-600/25 dark:shadow-[0_0_28px_-4px_rgba(5,150,105,0.6)] transition-all cursor-pointer"
              >
                <span>Começar agora</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#recursos"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#121215] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200/90 dark:border-white/10 shadow-xs transition-all"
              >
                <span>Ver recursos</span>
              </a>
            </div>

            {/* =================================================================== */}
            {/* 4. FAIXA DE CONFIANÇA (3 ITENS VERDADEIROS)                         */}
            {/* =================================================================== */}
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0" />
                <span>Dados isolados e protegidos por conta</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0" />
                <span>Comece grátis, sem pedir senha de banco</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0" />
                <span>Cancele quando quiser</span>
              </span>
            </div>

          </div>

          {/* =================================================================== */}
          {/* 5. MOCKUP DO PRODUTO (MOLDURA DE NAVEGADOR EM HTML/CSS)             */}
          {/* =================================================================== */}
          <div className="relative mx-auto mt-10 sm:mt-12 w-full max-w-[1020px] px-4 sm:px-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215] shadow-2xl dark:shadow-[0_40px_90px_-35px_rgba(0,0,0,0.95)] text-left transition-colors">
              
              {/* Browser Window Bar */}
              <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-100/90 dark:bg-[#18181c] px-4 py-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                <div className="ml-3 flex h-6 flex-1 items-center justify-between rounded-lg border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#0c0c0e] px-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span>greenfinancepro.com.br/app</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-sans font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Sincronizado
                  </span>
                </div>
              </div>

              {/* Inside Browser: App Layout Mockup with Plausible Fictional Data */}
              <div className="grid grid-cols-1 md:grid-cols-[175px_1fr] bg-slate-50 dark:bg-[#09090b]">
                
                {/* Left Sidebar Navigation */}
                <div className="hidden md:flex flex-col justify-between border-r border-slate-200/80 dark:border-white/[0.07] bg-white/60 dark:bg-[#101013] p-3.5">
                  <div className="space-y-1">
                    <div className="px-2.5 py-2 mb-2 flex items-center justify-between">
                      <span className="text-xs font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Finance <span className="text-[#059669] dark:text-emerald-400">PRO</span>
                      </span>
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                        Out 2026
                      </span>
                    </div>

                    {[
                      { id: 'dashboard', label: 'Visão Mensal', icon: TrendingUp },
                      { id: 'extrato', label: 'Extrato & Filtros', icon: Layers },
                      { id: 'contas', label: 'Saldo em Bancos', icon: Building2 },
                      { id: 'metas', label: 'Teto & Metas', icon: Target },
                      { id: 'patrimonio', label: 'Patrimônio', icon: PieChart },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = mockupNav === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setMockupNav(item.id as any)}
                          className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? 'bg-[#059669]/15 text-[#059669] dark:text-emerald-400 border border-[#059669]/25'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-slate-200/70 dark:border-white/[0.06]">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                      <div className="text-xs font-bold text-[#059669] dark:text-emerald-400">
                        Reserva de Emergência
                      </div>
                      <div className="mt-1 text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">
                        R$ 18.500,00
                      </div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-emerald-950/20 dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[#059669]" style={{ width: '74%' }} />
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        74% da meta (R$ 25.000)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Dashboard Canvas */}
                <div className="p-4 sm:p-5 space-y-4">
                  
                  {/* Top Metric Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2 sm:col-span-1 rounded-2xl bg-gradient-to-br from-[#065f46] via-[#047857] to-[#059669] p-3.5 text-white shadow-md">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-100/90">
                        <span>Saldo Líquido</span>
                      </div>
                      <div className="mt-1.5 text-lg sm:text-xl font-extrabold tabular-nums">
                        R$ 3.640,00
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-emerald-100">
                        <span className="rounded bg-white/20 px-1 py-0.2 font-bold">▲ 12%</span>
                        <span>vs. mês ant.</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Receitas
                      </div>
                      <div className="mt-1.5 text-base sm:text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                        R$ 9.800,00
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>R$ 8.500 recebidos</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] p-3.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Despesas
                      </div>
                      <div className="mt-1.5 text-base sm:text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                        R$ 6.160,00
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>R$ 680 pendentes</span>
                      </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] p-3.5">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <span>Teto Mensal</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">82%</span>
                      </div>
                      <div className="mt-1.5 text-base sm:text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                        R$ 7.500,00
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-[#059669]" style={{ width: '82%' }} />
                      </div>
                    </div>
                  </div>

                  {/* Second Row: Daily Evolution Area Chart + Category Donut Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1.55fr_1fr] gap-3">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            Evolução Diária de Saldo & Gastos
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Acompanhamento de ritmo durante o mês
                          </div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#059669] dark:text-emerald-400 border border-emerald-500/20">
                          Dentro da meta
                        </span>
                      </div>

                      <svg viewBox="0 0 340 96" className="h-24 w-full mt-1" aria-label="Gráfico de evolução diária">
                        <defs>
                          <linearGradient id="gfp-hero-area" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#059669" stopOpacity="0.42" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0,74 C45,68 75,46 115,50 C155,54 185,30 225,34 C265,38 295,16 340,18 L340,96 L0,96 Z"
                          fill="url(#gfp-hero-area)"
                        />
                        <path
                          d="M0,74 C45,68 75,46 115,50 C155,54 185,30 225,34 C265,38 295,16 340,18"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <circle cx="340" cy="18" r="4" fill="#10b981" />
                      </svg>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#059669] dark:text-emerald-400" />
                          Saldo manual em bancos:
                        </span>
                        <div className="flex items-center gap-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          <span>Conta Digital: R$ 6.420</span>
                          <span className="text-slate-300 dark:text-white/20">•</span>
                          <span>Corretora: R$ 14.800</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Por Categoria
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Top 4 do mês
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5 my-auto">
                        <svg viewBox="0 0 42 42" width="84" height="84" className="shrink-0 -rotate-90" aria-label="Gráfico de rosca por categoria">
                          <circle cx="21" cy="21" r="15.9" fill="none" stroke="currentColor" className="text-slate-100 dark:text-white/10" strokeWidth="5.5" />
                          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#10b981" strokeWidth="5.5" strokeDasharray="34 66" strokeDashoffset="0" />
                          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#0ea5e9" strokeWidth="5.5" strokeDasharray="26 74" strokeDashoffset="-34" />
                          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="5.5" strokeDasharray="18 82" strokeDashoffset="-60" />
                          <circle cx="21" cy="21" r="15.9" fill="none" stroke="#8b5cf6" strokeWidth="5.5" strokeDasharray="22 78" strokeDashoffset="-78" />
                        </svg>

                        <div className="flex-1 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-xs bg-emerald-500" />
                              Moradia
                            </span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-white">34%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-xs bg-sky-500" />
                              Alimentação
                            </span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-white">26%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-xs bg-amber-500" />
                              Transporte
                            </span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-white">18%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <span className="w-2 h-2 rounded-xs bg-violet-500" />
                              Lazer & Outros
                            </span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-white">22%</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Pix (48%) • Cartão (39%) • Boleto (13%)</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 6. SEÇÕES DE RECURSOS ALTERNANDO TEXTO E IMAGEM (4 SEÇÕES)          */}
        {/* =================================================================== */}
        
        {/* RECURSO 6.1: DASHBOARD E SALDO DO MÊS */}
        <section id="recursos" className="scroll-mt-16 border-t border-slate-200/70 dark:border-white/[0.07] bg-white/60 dark:bg-[#0b0b0e] py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
              
              {/* Texto */}
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs sm:text-sm font-semibold text-[#059669] dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  Dashboard & Saldo do Mês
                </span>
                <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Visão clara do que já entrou, do que falta pagar e de quanto vai sobrar
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  Abra o aplicativo e entenda em segundos a saúde do seu mês. Compare o saldo realizado com o previsto e receba alertas visuais das contas próximas do vencimento.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Resumo separado entre valores já pagos/recebidos e pendentes no mês</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Gráficos interativos por categoria, evolução diária e formas de pagamento</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Avisos de contas e boletos a vencer nos próximos 7 dias ou em atraso</span>
                  </li>
                </ul>
              </div>

              {/* Mockup em Moldura */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215] shadow-xl dark:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-100/90 dark:bg-[#18181c] px-3.5 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 flex-1 rounded-md border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#0c0c0e] px-3 py-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    greenfinancepro.com.br/resumo-mensal
                  </span>
                </div>
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#09090b] space-y-3.5">
                  <div className="rounded-2xl bg-gradient-to-br from-[#065f46] via-[#047857] to-[#059669] p-4 text-white">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-100">
                      <span>Saldo Líquido Projetado</span>
                      <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs">Taxa de poupança: 37%</span>
                    </div>
                    <div className="mt-1.5 text-2xl sm:text-3xl font-extrabold tabular-nums">
                      R$ 3.640,00
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/15 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-emerald-100/80 block">Saldo Realizado Hoje</span>
                        <span className="font-bold tabular-nums text-sm">R$ 3.020,00</span>
                      </div>
                      <div>
                        <span className="text-emerald-100/80 block">Contas a Pagar no Mês</span>
                        <span className="font-bold tabular-nums text-sm">R$ 680,00</span>
                      </div>
                    </div>
                  </div>

                  {/* Vence em breve mini list */}
                  <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] p-3.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Vence nos próximos dias
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">2 pendentes</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03]">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white">Condomínio Residencial</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">Vence em 2 dias • Boleto</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">R$ 540,00</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03]">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white">Internet Fibra 600Mb</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">Vence em 5 dias • Pix</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">R$ 140,00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* RECURSO 6.2: EXTRATO E CATEGORIAS */}
        <section className="border-t border-slate-200/70 dark:border-white/[0.07] py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
              
              {/* Texto (Direita no Desktop) */}
              <div className="md:order-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs sm:text-sm font-semibold text-[#059669] dark:text-emerald-400">
                  <Layers className="w-4 h-4" />
                  Extrato & Categorias
                </span>
                <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Filtre cada movimentação, compras parceladas e lançamentos fixos
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  Encontre qualquer despesa ou receita em um clique. Cadastre gastos fixos mensais, projete compras parceladas no cartão ou importe seu extrato em OFX e CSV.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Abas rápidas: Todas, Despesas, Receitas, Pendentes, Pagas e Parceladas</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Projeção automática de parcelas (ex: 3/10) e despesas recorrentes</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Categorias personalizadas com cores e ícones criados por você</span>
                  </li>
                </ul>
              </div>

              {/* Mockup em Moldura (Esquerda no Desktop) */}
              <div className="md:order-1 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215] shadow-xl dark:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-100/90 dark:bg-[#18181c] px-3.5 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 flex-1 rounded-md border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#0c0c0e] px-3 py-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    greenfinancepro.com.br/extrato
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-[#09090b]">
                  {/* Filter pills inside mockup */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-3 no-scrollbar">
                    {[
                      { id: 'all', label: 'Todas (5)' },
                      { id: 'expense', label: 'Despesas (4)' },
                      { id: 'income', label: 'Receitas (1)' },
                      { id: 'pending', label: 'Pendentes (1)' },
                      { id: 'installments', label: 'Parceladas (1)' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setExtratoMockTab(t.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                          extratoMockTab === t.id
                            ? 'bg-[#059669] text-white'
                            : 'bg-white dark:bg-[#141418] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/10'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Fictional Transactions List */}
                  <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                    {[
                      { title: 'Salário Mensal — Transferência', cat: 'Renda Principal • Recebido', amount: '+ R$ 8.500,00', type: 'income', status: 'paid', inst: false },
                      { title: 'Supermercado Família', cat: 'Alimentação • Pix • Pago', amount: '− R$ 642,80', type: 'expense', status: 'paid', inst: false },
                      { title: 'Notebook Trabalho (Parcela 4/10)', cat: 'Equipamentos • Cartão de Crédito', amount: '− R$ 420,00', type: 'expense', status: 'paid', inst: true },
                      { title: 'Plano de Saúde Familiar (Fixo)', cat: 'Saúde • Recorrente Mensal', amount: '− R$ 890,00', type: 'expense', status: 'paid', inst: false },
                      { title: 'Condomínio Residencial', cat: 'Moradia • Boleto • Pendente', amount: '− R$ 540,00', type: 'expense', status: 'pending', inst: false },
                    ]
                      .filter((item) => {
                        if (extratoMockTab === 'expense') return item.type === 'expense';
                        if (extratoMockTab === 'income') return item.type === 'income';
                        if (extratoMockTab === 'pending') return item.status === 'pending';
                        if (extratoMockTab === 'installments') return item.inst;
                        return true;
                      })
                      .map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between px-3.5 py-2.5">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{item.title}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{item.cat}</div>
                          </div>
                          <span
                            className={`font-mono font-bold tabular-nums ${
                              item.type === 'income'
                                ? 'text-[#059669] dark:text-emerald-400'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.amount}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* RECURSO 6.3: METAS E ORÇAMENTOS POR CATEGORIA */}
        <section className="border-t border-slate-200/70 dark:border-white/[0.07] bg-white/60 dark:bg-[#0b0b0e] py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
              
              {/* Texto */}
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs sm:text-sm font-semibold text-[#059669] dark:text-emerald-400">
                  <Target className="w-4 h-4" />
                  Metas & Orçamentos
                </span>
                <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Defina um teto para cada categoria antes de o mês sair do controle
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  Estabeleça quanto pretende gastar em Alimentação, Moradia, Lazer e Transporte. Acompanhe o percentual consumido em tempo real com barras de progresso claras.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Tetos mensais individuais por categoria e cálculo automático de folga restante</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Indicadores visuais quando uma categoria se aproxima ou ultrapassa 100% da meta</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Cofrinhos e objetivos financeiros com prazo e histórico de aportes</span>
                  </li>
                </ul>
              </div>

              {/* Mockup em Moldura */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215] shadow-xl dark:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-100/90 dark:bg-[#18181c] px-3.5 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 flex-1 rounded-md border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#0c0c0e] px-3 py-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    greenfinancepro.com.br/orcamentos
                  </span>
                </div>

                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#09090b] space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">Execução do Teto Mensal</span>
                    <span className="font-mono font-bold text-[#059669] dark:text-emerald-400">R$ 6.160 / R$ 7.500</span>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] p-3.5 space-y-3.5 text-xs">
                    {[
                      { name: 'Moradia & Contas', spent: 'R$ 2.100', limit: 'R$ 2.500', pct: 84, color: 'bg-emerald-500' },
                      { name: 'Alimentação & Mercado', spent: 'R$ 1.620', limit: 'R$ 2.000', pct: 81, color: 'bg-sky-500' },
                      { name: 'Transporte & Combustível', spent: 'R$ 1.110', limit: 'R$ 1.300', pct: 85, color: 'bg-amber-500' },
                      { name: 'Lazer & Assinaturas', spent: 'R$ 680', limit: 'R$ 700', pct: 97, color: 'bg-rose-500' },
                    ].map((cat, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{cat.name}</span>
                          <span className="font-mono text-slate-600 dark:text-slate-400">
                            <b className="text-slate-900 dark:text-white">{cat.spent}</b> / {cat.limit} ({cat.pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* RECURSO 6.4: RESERVA, PATRIMÔNIO E SALDO EM BANCOS */}
        <section className="border-t border-slate-200/70 dark:border-white/[0.07] py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
              
              {/* Texto (Direita no Desktop) */}
              <div className="md:order-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs sm:text-sm font-semibold text-[#059669] dark:text-emerald-400">
                  <PiggyBank className="w-4 h-4" />
                  Reserva, Patrimônio & Bancos
                </span>
                <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Construa sua reserva de emergência e consolide todo o seu patrimônio
                </h2>
                <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                  Vá além dos gastos do mês. Acompanhe o saldo manual das suas contas bancárias, evolução de investimentos, previdência, consórcios e sua reserva de segurança sem duplicar valores.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Reserva de emergência com sugestão mensal automática (% da renda ou valor fixo)</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Módulo de Patrimônio: Investimentos Gerais, Previdência, Consórcio e Capitalização</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>Cadastro manual de contas bancárias e carteira física com histórico de ajustes</span>
                  </li>
                </ul>
              </div>

              {/* Mockup em Moldura (Esquerda no Desktop) */}
              <div className="md:order-1 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215] shadow-xl dark:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]">
                <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-100/90 dark:bg-[#18181c] px-3.5 py-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-2 flex-1 rounded-md border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#0c0c0e] px-3 py-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    greenfinancepro.com.br/patrimonio
                  </span>
                </div>

                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#09090b] space-y-3.5">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-emerald-400 block">
                        Patrimônio Consolidado
                      </span>
                      <span className="text-xl sm:text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                        R$ 64.720,00
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-[#141418] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10">
                      Sem duplicidade
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] p-3">
                      <span className="text-slate-500 dark:text-slate-400 block">Reserva de Emergência</span>
                      <span className="mt-1 font-mono font-bold text-sm text-slate-900 dark:text-white block">R$ 18.500,00</span>
                      <span className="text-xs text-[#059669] dark:text-emerald-400">Meta: R$ 25.000 (74%)</span>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] p-3">
                      <span className="text-slate-500 dark:text-slate-400 block">Renda Fixa & Fundos</span>
                      <span className="mt-1 font-mono font-bold text-sm text-slate-900 dark:text-white block">R$ 28.400,00</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">CDB Liquidez + Tesouro</span>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] p-3">
                      <span className="text-slate-500 dark:text-slate-400 block">Previdência & Consórcio</span>
                      <span className="mt-1 font-mono font-bold text-sm text-slate-900 dark:text-white block">R$ 11.400,00</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Aportes acumulados</span>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141418] p-3">
                      <span className="text-slate-500 dark:text-slate-400 block">Saldo Livre em Contas</span>
                      <span className="mt-1 font-mono font-bold text-sm text-slate-900 dark:text-white block">R$ 6.420,00</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">2 contas manuais ativas</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 7. SEÇÃO "EM BREVE" (RECURSOS FUTUROS CLARAMENTE IDENTIFICADOS)     */}
        {/* =================================================================== */}
        <section className="border-t border-slate-200/70 dark:border-white/[0.07] bg-white/60 dark:bg-[#0b0b0e] py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
              Próximos Passos • Em breve
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              O que estamos construindo para as próximas versões
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Transparência em primeiro lugar: os recursos abaixo ainda estão em desenvolvimento e chegarão futuramente para assinantes do plano Pro.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#059669] dark:text-emerald-400">
                    <Landmark className="w-5 h-5" />
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    Em breve
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Conexão via Open Finance
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Sincronização automática de saldos e transações direto com seus bancos e cartões através de integração regulada pelo Banco Central.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#059669] dark:text-emerald-400">
                    <MessageCircle className="w-5 h-5" />
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    Em breve
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Lembretes e Consultas no WhatsApp
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Consulte quanto ainda pode gastar no mês e receba alertas de contas a vencer diretamente no seu WhatsApp.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#059669] dark:text-emerald-400">
                    <Bot className="w-5 h-5" />
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    Em breve
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Assistente de IA Financeiro
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Análise inteligente dos seus hábitos de consumo para responder dúvidas sobre seu histórico financeiro em segundos.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 8. PLANOS (CARDS LADO A LADO + TABELA COMPARATIVA)                  */}
        {/* =================================================================== */}
        <section id="planos" className="scroll-mt-16 border-t border-slate-200/70 dark:border-white/[0.07] py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs sm:text-sm font-semibold text-[#059669] dark:text-emerald-400">
                <CreditCard className="w-4 h-4" />
                Planos e Preços
              </span>
              <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Comece grátis. Evolua no seu ritmo.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Escolha o plano ideal para organizar sua rotina financeira. Sem fidelidade: cancele quando quiser em um clique.
              </p>
            </div>

            {/* Pricing Cards Grid */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              
              {/* PLANO 1: GRÁTIS */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215] p-6 sm:p-7 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">Grátis</div>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 min-h-[38px]">
                    Para organizar suas receitas e despesas manualmente no dia a dia.
                  </p>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                      R$ 0
                    </span>
                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">para sempre</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateAuth('register')}
                    className="mt-6 w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer"
                  >
                    Começar grátis
                  </button>

                  <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/[0.08] text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Inclui hoje:
                  </div>
                  <ul className="mt-3 space-y-2.5 text-xs sm:text-sm">
                    <li className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                      <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Dashboard mensal, extrato e filtros</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                      <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Lançamentos fixos e parcelados</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                      <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Cadastro manual de contas bancárias</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-400 dark:text-slate-600">
                      <X className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Importação de extratos OFX e CSV</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-400 dark:text-slate-600">
                      <X className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Módulo completo de Patrimônio & Visão Anual</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* PLANO 2: BASIC */}
              <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215] p-6 sm:p-7 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">Basic</div>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 min-h-[38px]">
                    Para quem importa extratos bancários e controla tetos por categoria.
                  </p>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                      R$ 19,90
                    </span>
                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">/mês</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateAuth('register')}
                    className="mt-6 w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer"
                  >
                    Assinar Basic
                  </button>

                  <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/[0.08] text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Tudo do Grátis, mais:
                  </div>
                  <ul className="mt-3 space-y-2.5 text-xs sm:text-sm">
                    <li className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                      <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Importação em lote de extratos (.OFX e .CSV)</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                      <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Categorias personalizadas ilimitadas</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                      <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Tetos de gastos por categoria e alertas</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                      <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Backup e restauração em JSON</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* PLANO 3: PRO (RECOMENDADO) */}
              <div className="rounded-2xl border-2 border-[#059669] bg-emerald-500/[0.03] dark:bg-[#131917] p-6 sm:p-7 flex flex-col justify-between shadow-xl shadow-emerald-600/10 relative md:-translate-y-2">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#059669] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm">
                  Recomendado
                </div>

                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">Pro</div>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 min-h-[38px]">
                    Gestão completa: do orçamento mensal à reserva, investimentos e visão anual.
                  </p>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                      R$ 29,90
                    </span>
                    <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">/mês</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateAuth('register')}
                    className="mt-6 w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#059669] hover:bg-emerald-500 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                  >
                    Assinar Pro
                  </button>

                  <div className="mt-6 pt-5 border-t border-emerald-500/20 text-xs font-bold uppercase tracking-wider text-[#059669] dark:text-emerald-400">
                    Tudo do Basic, mais:
                  </div>
                  <ul className="mt-3 space-y-2.5 text-xs sm:text-sm">
                    <li className="flex items-start gap-2.5 text-slate-800 dark:text-slate-100">
                      <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Reserva de Emergência e Cofrinhos de Metas</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-800 dark:text-slate-100">
                      <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Módulo Patrimônio (Investimentos, Previdência, Consórcio)</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-800 dark:text-slate-100">
                      <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>Relatório consolidado de Visão Anual</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-slate-800 dark:text-slate-100">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        Acesso prioritário a Open Finance e WhatsApp{' '}
                        <span className="inline-block px-1.5 py-0.2 text-xs font-bold rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          Em breve
                        </span>
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

            </div>

            {/* Nota transparente de cancelamento */}
            <p className="mt-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Sem letras miúdas: cancele quando quiser direto na sua conta, sem multas. Garantia de 7 dias com reembolso integral no primeiro pagamento.
            </p>

            {/* Tabela Comparativa de Recursos */}
            <div className="mt-14">
              <h3 className="text-center text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-5">
                Compare todos os recursos
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121215]">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400">
                      <th className="py-3.5 px-4 font-semibold">Recurso</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Grátis</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Basic</th>
                      <th className="py-3.5 px-4 font-bold text-center text-[#059669] dark:text-emerald-400 bg-emerald-500/[0.04]">
                        Pro
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">Mensalidade</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">R$ 0</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">R$ 19,90/mês</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[#059669] dark:text-emerald-400 bg-emerald-500/[0.04]">
                        R$ 29,90/mês
                      </td>
                    </tr>
                    {[
                      { name: 'Dashboard mensal, extrato e filtros', free: true, basic: true, pro: true },
                      { name: 'Lançamentos recorrentes e compras parceladas', free: true, basic: true, pro: true },
                      { name: 'Cadastro manual de contas e saldo em bancos', free: true, basic: true, pro: true },
                      { name: 'Importação de extratos bancários (.OFX e .CSV)', free: false, basic: true, pro: true },
                      { name: 'Categorias personalizadas e tetos por categoria', free: false, basic: true, pro: true },
                      { name: 'Reserva de Emergência e Cofrinhos de Metas', free: false, basic: false, pro: true },
                      { name: 'Módulo Patrimônio e Investimentos + Visão Anual', free: false, basic: false, pro: true },
                      { name: 'Conexão automática Open Finance (Em breve)', free: false, basic: false, pro: 'soon' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-200">{row.name}</td>
                        <td className="py-3 px-4 text-center">
                          {row.free ? (
                            <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.basic ? (
                            <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 px-4 text-center bg-emerald-500/[0.04]">
                          {row.pro === 'soon' ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              Em breve
                            </span>
                          ) : row.pro ? (
                            <Check className="w-4 h-4 text-[#059669] dark:text-emerald-400 mx-auto" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 dark:text-slate-700 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </section>

        {/* =================================================================== */}
        {/* 9. FAQ EM ACORDEÃO                                                  */}
        {/* =================================================================== */}
        <section id="duvidas" className="scroll-mt-16 border-t border-slate-200/70 dark:border-white/[0.07] bg-white/60 dark:bg-[#0b0b0e] py-16 sm:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs sm:text-sm font-semibold text-[#059669] dark:text-emerald-400">
                <HelpCircle className="w-4 h-4" />
                Perguntas Frequentes
              </span>
              <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Tire suas dúvidas com transparência
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Respostas diretas sobre segurança, privacidade, funcionamento e assinatura.
              </p>
            </div>

            <div className="mt-10 divide-y divide-slate-200/80 dark:divide-white/10 border-y border-slate-200/80 dark:border-white/10">
              {FAQ_ITEMS.map((item, idx) => (
                <details key={idx} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:text-[#059669] dark:hover:text-emerald-400 transition-colors">
                    <span>{item.question}</span>
                    <ChevronDown className="w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 pr-6 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* 10. CTA FINAL EM CARD GRANDE                                        */}
        {/* =================================================================== */}
        <section className="border-t border-slate-200/70 dark:border-white/[0.07] py-16 sm:py-24 text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.08] to-transparent p-8 sm:p-14 shadow-lg">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Assuma o controle das suas finanças hoje
              </h2>
              <p className="mx-auto mt-3.5 max-w-lg text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Crie sua conta gratuita em menos de um minuto, sem precisar informar senha de banco.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateAuth('register')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm sm:text-base font-bold text-white bg-[#059669] hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
                >
                  <span>Criar minha conta grátis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateAuth('login')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#121215] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200/90 dark:border-white/10 transition-all cursor-pointer"
                >
                  <span>Já tenho conta</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* =================================================================== */}
      {/* 11. RODAPÉ COMPLETO                                                 */}
      {/* =================================================================== */}
      <footer className="border-t border-slate-200/80 dark:border-white/[0.08] py-8 bg-white dark:bg-[#060606] text-xs sm:text-sm text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white">
            <span className="w-6 h-6 rounded-lg bg-[#059669] flex items-center justify-center text-white">
              <Wallet className="w-3.5 h-3.5" />
            </span>
            <span>Green Finance Pro</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a href="#recursos" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Recursos
            </a>
            <a href="#planos" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Planos
            </a>
            <button
              type="button"
              onClick={() => onNavigateLegal?.('termos')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Termos de Uso
            </button>
            <button
              type="button"
              onClick={() => onNavigateLegal?.('privacidade')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Política de Privacidade
            </button>
            <button
              type="button"
              onClick={() => onNavigateLegal?.('excluir-conta')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Excluir conta
            </button>
            <button
              type="button"
              onClick={() => setIsCookieModalOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Preferências de cookies
            </button>
            <span>© {new Date().getFullYear()} Green Finance Pro</span>
          </div>
        </div>
      </footer>

      {/* Modal de Preferências de Cookies (LGPD - Sem rastreadores de terceiros) */}
      {isCookieModalOpen && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="cookie-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#141418] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="cookie-modal-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#059669] dark:text-emerald-400" />
                Preferências de Cookies (LGPD)
              </h3>
              <button
                type="button"
                onClick={() => setIsCookieModalOpen(false)}
                aria-label="Fechar janela"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              O <strong>Green Finance Pro</strong> respeita sua privacidade: não utilizamos cookies de rastreamento publicitário nem pixels de terceiros.
            </p>
            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-[#0c0c0e] p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Armazenamento Essencial</span>
                <span className="text-slate-500 dark:text-slate-400">Sessão de login segura e preferência de tema (Claro/Escuro).</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[#059669] dark:text-emerald-400 font-bold shrink-0">
                Sempre ativo
              </span>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsCookieModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#059669] hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
