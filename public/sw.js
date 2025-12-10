// Service Worker v2 - Enhanced offline support with intelligent caching
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `agrodeo-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `agrodeo-runtime-${CACHE_VERSION}`;

// Static assets to precache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

// Install event - precache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName.startsWith('agrodeo-') && 
                   cacheName !== STATIC_CACHE && 
                   cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Supabase API calls - Network first, no cache (handled by IndexedDB)
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/rest/v1/')) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Static assets (JS, CSS, images) - Cache first, network fallback
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML navigation - Network first, cache fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Default - Stale while revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Check if URL is a static asset
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/.test(pathname) ||
         pathname.startsWith('/assets/');
}

// Network only - for API calls
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Return empty response for failed API calls - IndexedDB will handle offline data
    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cache first, network fallback
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Network first, cache fallback
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return cached index.html for navigation requests
    return caches.match('/index.html');
  }
}

// Stale while revalidate
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(RUNTIME_CACHE);
      cache.then((c) => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'agrodeo-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Notify the main thread to flush outbox
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'BACKGROUND_SYNC' });
  });
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'agrodeo-periodic-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    });
  }
});

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    });
  }
});
