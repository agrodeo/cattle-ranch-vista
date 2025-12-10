// Service Worker v3 - Enhanced offline support with dynamic asset caching
const CACHE_VERSION = 'v3';
const STATIC_CACHE = `agrodeo-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `agrodeo-runtime-${CACHE_VERSION}`;

// Install event - activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v3');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        // Only precache the root - let other assets be cached on demand
        return cache.addAll(['/']);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v3');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName.startsWith('agrodeo-') && 
                   cacheName !== STATIC_CACHE && 
                   cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
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

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Supabase API calls - Network only (handled by IndexedDB offline)
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/rest/v1/')) {
    event.respondWith(networkOnly(request));
    return;
  }

  // External resources - Network first
  if (url.origin !== self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Vite-built assets (JS, CSS with hashes) - Cache first (immutable)
  if (url.pathname.startsWith('/assets/') || isImmutableAsset(url.pathname)) {
    event.respondWith(cacheFirstImmutable(request));
    return;
  }

  // HTML navigation - Network first with offline fallback to index.html
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Static assets (images, fonts, icons) - Cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default - Stale while revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Check if URL is an immutable Vite asset (has hash in filename)
function isImmutableAsset(pathname) {
  // Vite adds hashes like: index-DZ3kr98C.js, index-B2YtF4cR.css
  return /\.[a-zA-Z0-9]{8,}\.(js|css|woff2?)$/.test(pathname);
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  return /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|webp|avif)$/.test(pathname);
}

// Network only - for API calls
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Return offline indicator for failed API calls
    return new Response(JSON.stringify({ offline: true, error: 'Network unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cache first for immutable assets (Vite builds with hashes)
async function cacheFirstImmutable(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      // Clone before caching since response can only be used once
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch immutable asset:', request.url);
    return new Response('Asset unavailable offline', { status: 503 });
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
    console.error('[SW] Failed to fetch asset:', request.url);
    return new Response('Asset unavailable offline', { status: 503 });
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
    return new Response('Resource unavailable offline', { status: 503 });
  }
}

// Network first with fallback to index.html for SPA navigation
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation request failed, trying cache:', request.url);
    
    // Try to return cached version of requested page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fall back to cached index.html for SPA routing
    const indexResponse = await caches.match('/') || await caches.match('/index.html');
    if (indexResponse) {
      console.log('[SW] Returning cached index.html for offline navigation');
      return indexResponse;
    }
    
    // Last resort - return offline page with multilingual support
    return new Response(
      `<!DOCTYPE html>
      <html lang="es">
        <head>
          <title>Offline - agrodeo</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh; 
              background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
              padding: 20px;
            }
            .container { 
              text-align: center;
              max-width: 400px;
              background: white;
              padding: 40px 30px;
              border-radius: 16px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .icon { font-size: 64px; margin-bottom: 24px; }
            h1 { 
              color: #1a1a1a; 
              font-size: 24px; 
              font-weight: 600;
              margin-bottom: 12px;
            }
            p { 
              color: #666; 
              font-size: 16px;
              line-height: 1.5;
              margin-bottom: 24px;
            }
            .hint {
              color: #888;
              font-size: 14px;
              background: #f5f5f5;
              padding: 12px;
              border-radius: 8px;
              margin-bottom: 24px;
            }
            button {
              padding: 14px 32px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
            }
            button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
            }
            button:active { transform: translateY(0); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📡</div>
            <h1>Sin conexión</h1>
            <p>No hay conexión a internet. Verifica tu conexión e intenta nuevamente.</p>
            <div class="hint">
              💡 Para usar agrodeo sin conexión, primero debes iniciar sesión al menos una vez con internet.
            </div>
            <button onclick="location.reload()">Reintentar</button>
          </div>
        </body>
      </html>`,
      { 
        status: 200, 
        headers: { 'Content-Type': 'text/html; charset=utf-8' } 
      }
    );
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
  console.log('[SW] Background sync triggered');
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
    console.log('[SW] Clearing all caches');
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    });
  }

  // Precache assets on demand
  if (event.data && event.data.type === 'CACHE_ASSETS') {
    const assets = event.data.assets || [];
    console.log('[SW] Precaching assets:', assets.length);
    caches.open(RUNTIME_CACHE).then((cache) => {
      return Promise.all(
        assets.map((url) => {
          return fetch(url).then((response) => {
            if (response.ok) {
              return cache.put(url, response);
            }
          }).catch((err) => {
            console.warn('[SW] Failed to cache:', url, err);
          });
        })
      );
    });
  }
});

// Push notification handling
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
