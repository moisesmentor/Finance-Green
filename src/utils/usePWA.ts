import { useState, useEffect, useCallback } from 'react';
import {
  registerServiceWorker,
  applyPwaUpdate,
  isAppStandalone,
  isIOSDevice,
  isIOSSafari,
  isIOSSecondaryBrowser,
  isInstallBannerDismissed,
  dismissInstallBanner,
} from './pwa';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafariOnIOS, setIsSafariOnIOS] = useState(false);
  const [isSecondaryIOS, setIsSecondaryIOS] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // 1. Detecta ambiente
    const standalone = isAppStandalone();
    setIsStandalone(standalone);
    setIsIOS(isIOSDevice());
    setIsSafariOnIOS(isIOSSafari());
    setIsSecondaryIOS(isIOSSecondaryBrowser());
    setIsBannerDismissed(isInstallBannerDismissed());

    // 2. Registra Service Worker e escuta atualizações
    registerServiceWorker(() => {
      setUpdateAvailable(true);
    });

    // 3. Captura evento nativo beforeinstallprompt (Android / Chrome Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Escuta quando o app é instalado com sucesso
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Disparar instalação
  const triggerInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'show_ios_guide' | 'unsupported'> => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return choice.outcome;
    }

    if (isIOS) {
      return 'show_ios_guide';
    }

    return 'unsupported';
  }, [deferredPrompt, isIOS]);

  // Dispensar banner por 30 dias
  const dismissBanner = useCallback(() => {
    dismissInstallBanner();
    setIsBannerDismissed(true);
  }, []);

  // Pode instalar se houver prompt nativo guardado OU se estiver no iOS (não instalado)
  const canInstall = !isStandalone && (Boolean(deferredPrompt) || isIOS);

  // Exibir banner apenas se puder instalar e não tiver sido dispensado
  const showBanner = canInstall && !isBannerDismissed;

  return {
    canInstall,
    isStandalone,
    isIOS,
    isSafariOnIOS,
    isSecondaryIOS,
    showBanner,
    updateAvailable,
    triggerInstall,
    dismissBanner,
    applyUpdate: applyPwaUpdate,
  };
}
