const CACHE_NAME = 'corinfar-cmms-v12';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/icon-desktop.png',
  './icons/apple-touch-icon.png'
];

// Instalar el Service Worker y cachear recursos básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((asset) => cache.add(asset))
      );
    })
  );
  self.skipWaiting();
});

// Activar el Service Worker y limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de red con fallback a cache para asegurar funcionalidad básica
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticCdn = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com'].includes(url.hostname);

  // No interceptar Firebase, Google, Storage ni websockets: esas conexiones
  // deben quedar a cargo del navegador para evitar reintentos y ruido extra.
  if (!isSameOrigin && !isStaticCdn) return;

  event.respondWith(
    fetch(event.request)
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      })
  );
});


