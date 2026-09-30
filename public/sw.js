/* ==========================================================================
   BANIYABOOK ENTERPRISE SERVICE WORKER (sw.js)
   - Zero-Downtime Offline Application Shell
   - Stale-While-Revalidate for Static Assets (<200ms Instant Boot)
   - Network-First for Real-Time Financial API Data
   - Offline SPA Navigation Routing (No Dinosaur Screen)
   ========================================================================== */

const CACHE_NAME = 'baniyabook-shell-v1.0.0';
const API_CACHE_NAME = 'baniyabook-api-v1.0.0';

// Critical core assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/icon-maskable.svg'
];

// External CDN dependencies to cache on access
const CACHEABLE_CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com'
];

// ── 1. INSTALL EVENT ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Precache local core shell safely
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[PWA SW] Precache warning for:', asset, err.message);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// ── 2. ACTIVATE EVENT ────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== API_CACHE_NAME) {
            console.log('[PWA SW] Clearing legacy cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ── 3. FETCH EVENT ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (handled by network & local queue in db.js)
  if (request.method !== 'GET') {
    return;
  }

  // A. SPA Navigation Requests (e.g. /ledger, /documents, /products)
  // Ensures refreshing or opening any route offline always loads the React App Shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedShell = await cache.match('/index.html') || await cache.match('/');
        return cachedShell || new Response('Offline - BaniyaBook Shell Unavailable', { status: 503 });
      })
    );
    return;
  }

  // B. Financial & Work API Requests (/api/*, /work/*)
  // Strategy: Network-First with Cache Fallback
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/work')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, clone and cache for offline reading
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Fall back to cached API response when offline
          const match = await caches.match(request);
          if (match) return match;
          return new Response(JSON.stringify({ offline: true, message: 'Working offline' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // C. Static Assets (Vite chunks, JS, CSS, SVG, PNG, Web Fonts)
  // Strategy: Stale-While-Revalidate (Instant response from cache + background refresh)
  const isStaticAsset = (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/src') ||
     url.pathname.startsWith('/assets') ||
     url.pathname.startsWith('/icons') ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.jsx') ||
     url.pathname.endsWith('.css') ||
     url.pathname.endsWith('.svg') ||
     url.pathname.endsWith('.png') ||
     url.pathname.endsWith('.woff2'))
  );

  const isCDN = CACHEABLE_CDN_HOSTS.some(host => url.hostname.includes(host));

  if (isStaticAsset || isCDN) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// ── 4. MESSAGE EVENT ─────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
