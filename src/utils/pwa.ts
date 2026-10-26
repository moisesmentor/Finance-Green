// Gerenciamento e utilitários do Progressive Web App (PWA) • Green Finance Pro

const PWA_DISMISS_KEY = 'green_finance_pwa_banner_dismissed_until';
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

let waitingServiceWorker: ServiceWorker | null = null;

/**
 * Registra o Service Worker com segurança apenas em produção via HTTPS
 */
export function registerServiceWorker(onUpdateAvailable?: () => void): void {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }

  // Apenas em produção e sobre HTTPS (ou localhost para testes locais)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isSecure = window.location.protocol === 'https:' || isLocalhost;

  if (!isSecure) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // 1. Checa se já há um worker esperando ativação
        if (reg.waiting) {
          waitingServiceWorker = reg.waiting;
          if (onUpdateAvailable) onUpdateAvailable();
        }

        // 2. Escuta quando um novo worker é detectado
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Nova versão instalada em background, aguardando confirmação do usuário
                waitingServiceWorker = installingWorker;
                if (onUpdateAvailable) onUpdateAvailable();
              }
            }
          });
        });
      })
      .catch((err) => {
        console.warn('Registro do Service Worker ignorado:', err);
      });

    // 3. Recarrega suavemente quando o novo worker assume o controle
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

/**
 * Aplica a atualização pendente sem interromper formulários ativos
 */
export function applyPwaUpdate(): void {
  if (waitingServiceWorker) {
    waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
  } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
}

/**
 * Limpeza estrita de caches de dados e Service Worker no Logout
 */
export async function clearPwaCachesOnLogout(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // 1. Notifica o service worker ativo para purgar caches
    if ('serviceWorker' in window.navigator && window.navigator.serviceWorker.controller) {
      window.navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
    }

    // 2. Limpa diretamente da API de caches do navegador
    if ('caches' in window && window.caches) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    }
  } catch (err) {
    console.warn('Erro ao limpar caches no logout:', err);
  }
}

/**
 * Detecta se o app está rodando em modo Standalone (instalado na Tela Inicial)
 */
export function isAppStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMedia = window.matchMedia ? window.matchMedia('(display-mode: standalone)').matches : false;
  const isIOSStandalone = (window.navigator as any)?.standalone === true;

  return Boolean(isStandaloneMedia || isIOSStandalone);
}

/**
 * Detecta se o dispositivo é iOS (iPhone/iPad/iPod)
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  // iPads mais recentes identificam-se como MacIntel mas possuem multi-touch
  const isIPadOS = window.navigator.maxTouchPoints > 1 && /Macintosh/.test(ua);
  return isIos || isIPadOS;
}

/**
 * Detecta se o usuário está especificamente no Safari do iOS (onde o botão de Compartilhar funciona)
 */
export function isIOSSafari(): boolean {
  if (!isIOSDevice()) return false;
  const ua = window.navigator.userAgent || '';
  // Navegadores alternativos no iOS usam CriOS, FxiOS, etc. ou são WebViews do Instagram/WhatsApp
  const isOtherBrowser = /CriOS|FxiOS|OPiOS|mercury|Instagram|WhatsApp|FBAN|FBAV/i.test(ua);
  const hasSafari = /Safari/i.test(ua);
  return hasSafari && !isOtherBrowser;
}

/**
 * Detecta se está no iOS mas em navegador secundário (Chrome, Instagram, etc.)
 */
export function isIOSSecondaryBrowser(): boolean {
  if (!isIOSDevice()) return false;
  return !isIOSSafari();
}

/**
 * Verifica se o banner de instalação foi dispensado nos últimos 30 dias
 */
export function isInstallBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(PWA_DISMISS_KEY);
    if (!raw) return false;
    const dismissedUntil = parseInt(raw, 10);
    return Date.now() < dismissedUntil;
  } catch {
    return false;
  }
}

/**
 * Grava a dispensa do banner por 30 dias
 */
export function dismissInstallBanner(): void {
  if (typeof window === 'undefined') return;
  try {
    const until = Date.now() + DISMISS_DURATION_MS;
    window.localStorage.setItem(PWA_DISMISS_KEY, until.toString());
  } catch {
    // ignore
  }
}
