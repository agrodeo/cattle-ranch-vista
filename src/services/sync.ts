import { flushOutbox, applyIdMapInCaches } from './outbox';
import { isOnline } from './connectivity';

export async function trySync() {
  if (!isOnline()) {
    console.log('Offline - skipping sync');
    return;
  }
  
  try {
    console.log('Starting sync...');
    await flushOutbox();
    await applyIdMapInCaches();
    console.log('Sync completed successfully');
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

// Registrar background sync si está disponible
export function registerBackgroundSync() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      // @ts-ignore - sync API might not be available in all browsers
      if ('sync' in registration && registration.sync) {
        // @ts-ignore
        return registration.sync.register('agrodeo-sync');
      }
    }).catch(err => {
      console.log('Background sync registration failed:', err);
    });
  }
}

// Escuchar mensajes del service worker
export function setupSyncListeners() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'BACKGROUND_SYNC') {
        trySync().catch(error => {
          console.error('Background sync failed:', error);
        });
      }
    });
  }
}