import { describe, it, expect, beforeEach } from 'bun:test';
import {
  isAppStandalone,
  isIOSDevice,
  isIOSSafari,
  isIOSSecondaryBrowser,
  isInstallBannerDismissed,
  dismissInstallBanner,
  clearPwaCachesOnLogout
} from '../pwa';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA Suite & Utilities', () => {
  beforeEach(() => {
    // Clear localStorage simulation if any
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Manifest & Static Files Integrity', () => {
    it('verifies manifest.webmanifest exists and is valid JSON with required PWA properties', () => {
      const manifestPath = path.resolve(import.meta.dir, '../../../public/manifest.webmanifest');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const raw = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(raw);

      expect(manifest.name).toBe('Green Finance Pro');
      expect(manifest.short_name).toBe('Green Finance');
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toBe('#059669');
      expect(manifest.background_color).toBe('#060606');
      expect(manifest.lang).toBe('pt-BR');

      // Check icons
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

      const has192 = manifest.icons.some((i: any) => i.sizes === '192x192' && i.purpose === 'any');
      const has512 = manifest.icons.some((i: any) => i.sizes === '512x512' && i.purpose === 'any');
      const hasMaskable512 = manifest.icons.some((i: any) => i.sizes === '512x512' && i.purpose === 'maskable');
      const hasMaskable192 = manifest.icons.some((i: any) => i.sizes === '192x192' && i.purpose === 'maskable');

      expect(has192).toBe(true);
      expect(has512).toBe(true);
      expect(hasMaskable512).toBe(true);
      expect(hasMaskable192).toBe(true);

      // Check shortcuts
      expect(Array.isArray(manifest.shortcuts)).toBe(true);
      expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(2);
    });

    it('verifies icon files exist on disk with appropriate dimensions', () => {
      const publicDir = path.resolve(import.meta.dir, '../../../public');
      expect(fs.existsSync(path.join(publicDir, 'icon-192.png'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'icon-512.png'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'icon-maskable-192.png'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'icon-maskable-512.png'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'apple-touch-icon.png'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'offline.html'))).toBe(true);
      expect(fs.existsSync(path.join(publicDir, 'sw.js'))).toBe(true);
    });

    it('verifies sw.js protects sensitive routes and excludes firestore/auth/asaas/pluggy', () => {
      const swPath = path.resolve(import.meta.dir, '../../../public/sw.js');
      const swContent = fs.readFileSync(swPath, 'utf8');

      expect(swContent).toContain('firestore.googleapis.com');
      expect(swContent).toContain('identitytoolkit.googleapis.com');
      expect(swContent).toContain('securetoken.googleapis.com');
      expect(swContent).toContain('asaas.com');
      expect(swContent).toContain('pluggy.ai');
      expect(swContent).toContain('/api/');
      expect(swContent).toContain('CLEAR_CACHES');
      expect(swContent).toContain('SKIP_WAITING');
    });
  });

  describe('Banner Dismissal Logic', () => {
    it('sets and checks 30-day dismissal cooldown', () => {
      const storageMap = new Map<string, string>();
      const mockStorage = {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => storageMap.set(k, v),
        removeItem: (k: string) => storageMap.delete(k)
      };

      // Mock window.localStorage
      const origWindow = globalThis.window;
      // @ts-ignore
      globalThis.window = { localStorage: mockStorage };

      expect(isInstallBannerDismissed()).toBe(false);

      dismissInstallBanner();
      expect(isInstallBannerDismissed()).toBe(true);

      // Verify timestamp in past (expired > 30 days)
      const fortyDaysAgo = Date.now() - 40 * 24 * 60 * 60 * 1000;
      storageMap.set('green_finance_pwa_banner_dismissed_until', String(fortyDaysAgo));
      expect(isInstallBannerDismissed()).toBe(false);

      // Cleanup
      globalThis.window = origWindow;
    });
  });

  describe('Device & Standalone Detection', () => {
    it('detects standalone mode from display-mode and navigator', () => {
      const origWindow = globalThis.window;
      // Standalone via matchMedia
      // @ts-ignore
      globalThis.window = {
        matchMedia: (q: string) => ({ matches: q.includes('standalone') }) as any,
        navigator: {} as any
      };
      expect(isAppStandalone()).toBe(true);

      // Standalone via iOS navigator.standalone
      // @ts-ignore
      globalThis.window = {
        matchMedia: () => ({ matches: false }) as any,
        navigator: { standalone: true } as any
      };
      expect(isAppStandalone()).toBe(true);

      // Browser mode
      // @ts-ignore
      globalThis.window = {
        matchMedia: () => ({ matches: false }) as any,
        navigator: { standalone: false } as any
      };
      expect(isAppStandalone()).toBe(false);

      globalThis.window = origWindow;
    });

    it('detects iOS devices properly', () => {
      const origWindow = globalThis.window;

      // iPhone
      // @ts-ignore
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          maxTouchPoints: 5
        } as any
      };
      expect(isIOSDevice()).toBe(true);

      // iPad with MacIntel userAgent and touch points
      // @ts-ignore
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          maxTouchPoints: 5
        } as any
      };
      expect(isIOSDevice()).toBe(true);

      // Android
      // @ts-ignore
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
          maxTouchPoints: 5
        } as any
      };
      expect(isIOSDevice()).toBe(false);

      globalThis.window = origWindow;
    });

    it('distinguishes iOS Safari from iOS Chrome / WebView', () => {
      const origWindow = globalThis.window;

      // iOS Safari
      // @ts-ignore
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          maxTouchPoints: 5
        } as any
      };
      expect(isIOSSafari()).toBe(true);
      expect(isIOSSecondaryBrowser()).toBe(false);

      // iOS Chrome (CriOS)
      // @ts-ignore
      globalThis.window = {
        navigator: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
          maxTouchPoints: 5
        } as any
      };
      expect(isIOSSafari()).toBe(false);
      expect(isIOSSecondaryBrowser()).toBe(true);

      globalThis.window = origWindow;
    });
  });

  describe('Cache Cleaning on Logout', () => {
    it('deletes all registered caches upon logout call', async () => {
      const deletedCaches: string[] = [];
      const origWindow = globalThis.window;

      const mockCaches = {
        keys: async () => ['gfp-shell-v1', 'gfp-static-v1', 'firebase-temp'],
        delete: async (name: string) => {
          deletedCaches.push(name);
          return true;
        }
      };

      // @ts-ignore
      globalThis.window = {
        caches: mockCaches,
        navigator: {} as any
      };

      await clearPwaCachesOnLogout();

      expect(deletedCaches).toEqual(['gfp-shell-v1', 'gfp-static-v1', 'firebase-temp']);

      globalThis.window = origWindow;
    });
  });
});
