// Service Worker Oficial • Green Finance Pro PWA
// Regra Estrita: SOMENTE arquivos estáticos são cacheados.
// NUNCA cacheia dados financeiros, Firestore, Auth nem rotas de pagamento.

const CACHE_VERSION = 'green-finance-v1';
const STATIC_CACHE_NAME = `static-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Arquivos estáticos essenciais pré-cacheados na instalação
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
];

// Validação de segurança: rotas e domínios proibidos de entrar em cache
function isForbiddenFromCache(url) {
  try {
    const parsed = new URL(url);

    // 1. Firebase Firestore, Auth e Google APIs dinâmicas
    if (
      parsed.hostname.includes('firestore.googleapis.com') ||
      parsed.hostname.includes('identitytoolkit.googleapis.com') ||
      parsed.hostname.includes('securetoken.googleapis.com') ||
      parsed.hostname.includes('firebaseio.com') ||
      parsed.hostname.includes('googleapis.com')
    ) {
      return true;
    }

    // 2. Rotas internas de API e Webhooks (Asaas, Pluggy, etc.)
    if (
      parsed.pathname.startsWith('/api/') ||
      parsed.pathname.includes('/api/asaas') ||
      parsed.pathname.includes('/api/pluggy')
    ) {
      return true;
    }

    // 3. Gateways externos de pagamento e Open Finance
    if (
      parsed.hostname.includes('asaas.com') ||
      parsed.hostname.includes('pluggy.ai')
    ) {
      return true;
    }

    // 4. Métodos de streaming, websockets ou eventos SSE
    if (parsed.protocol === 'ws:' || parsed.protocol === 'wss:') {
      return true;
    }

    return false;
  } catch (err) {
    return true; // Se não puder parsear a URL, não cacheia por segurança
  }
}

// 1. Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// 2. Ativação e limpeza de versões antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== STATIC_CACHE_NAME) {
            return caches.delete(name);
          }
          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Interceptação segura de requisições
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Apenas métodos GET entram na avaliação de cache estático
  if (req.method !== 'GET') {
    return;
  }

  // Se a URL pertencer a dados financeiros, Firestore, Auth ou APIs: rede pura
  if (isForbiddenFromCache(req.url)) {
    return;
  }

  // A) Requisições de Navegação (HTML principal - SPA Shell)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          // Atualiza o shell no cache com a versão nova da rede
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put('/', resClone);
            });
          }
          return networkRes;
        })
        .catch(() => {
          // Se a rede falhar, tenta o shell em cache ou a tela offline
          return caches.match('/')
            .then((cachedShell) => cachedShell || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // B) Assets Estáticos Versionados (/assets/*.js, *.css, fontes e ícones)
  const isStaticAsset = 
    req.url.includes('/assets/') ||
    req.url.includes('fonts.googleapis.com') ||
    req.url.includes('fonts.gstatic.com') ||
    req.url.endsWith('.png') ||
    req.url.endsWith('.svg') ||
    req.url.endsWith('.ico') ||
    req.url.endsWith('.webmanifest');

  if (isStaticAsset) {
    // Stale-While-Revalidate: entrega rápido do cache e atualiza em background
    event.respondWith(
      caches.match(req).then((cachedRes) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const resClone = networkRes.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(req, resClone);
              });
            }
            return networkRes;
          })
          .catch(() => cachedRes);

        return cachedRes || fetchPromise;
      })
    );
    return;
  }

  // C) Demais requisições de assets secundários: Network-first com fallback de cache
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
          const resClone = networkRes.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      })
      .catch(() => caches.match(req))
  );
});

// 4. Mensageria interna (Skip Waiting e Limpeza de Logout)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Atualização suave sem recarregar forçadamente no meio de uma digitação
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Limpeza explícita de todos os caches no logout do usuário
  if (event.data.type === 'CLEAR_CACHES') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }
});
