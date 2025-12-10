import { toast } from 'sonner';
import { trySync } from './sync';
import { incrementalSync } from './dataSync';
import { getOutboxStatus } from './outbox';
import { isOnline } from './connectivity';

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
let syncIntervalId: NodeJS.Timeout | null = null;
let currentCabañaId: string | null = null;

// Setup automatic sync on connectivity changes and periodic intervals
export function setupAutoSync(cabañaId: string): void {
  currentCabañaId = cabañaId;

  // Listen for online event
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Start periodic sync
  startPeriodicSync();

  console.log('Auto sync initialized for cabaña:', cabañaId);
}

// Cleanup auto sync listeners
export function cleanupAutoSync(): void {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  stopPeriodicSync();
  currentCabañaId = null;
  console.log('Auto sync cleaned up');
}

async function handleOnline(): Promise<void> {
  console.log('Connection restored, starting sync...');
  
  const status = await getOutboxStatus();
  const pendingCount = status.pending + status.failed;
  
  if (pendingCount > 0) {
    toast.info(`Conexión restaurada. Sincronizando ${pendingCount} cambios...`, {
      id: 'sync-reconnect'
    });
  }

  try {
    // Push local changes first
    await trySync();
    
    // Then pull server changes
    if (currentCabañaId) {
      await incrementalSync(currentCabañaId);
    }

    if (pendingCount > 0) {
      toast.success('Sincronización completada', {
        id: 'sync-reconnect'
      });
    }
  } catch (error) {
    console.error('Auto sync failed:', error);
    toast.error('Error al sincronizar. Se reintentará automáticamente.', {
      id: 'sync-reconnect'
    });
  }
}

function handleOffline(): void {
  console.log('Connection lost, working offline');
  toast.info('Sin conexión. Los cambios se guardarán localmente.', {
    duration: 3000
  });
}

function startPeriodicSync(): void {
  if (syncIntervalId) return;

  syncIntervalId = setInterval(async () => {
    if (!isOnline() || !currentCabañaId) return;

    try {
      // Check if there are pending changes
      const status = await getOutboxStatus();
      if (status.pending > 0 || status.failed > 0) {
        await trySync();
      }

      // Pull incremental changes
      await incrementalSync(currentCabañaId);
    } catch (error) {
      console.error('Periodic sync failed:', error);
    }
  }, SYNC_INTERVAL);

  console.log('Periodic sync started (every 5 minutes)');
}

function stopPeriodicSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('Periodic sync stopped');
  }
}

// Manual sync trigger (for UI buttons)
export async function manualSync(cabañaId?: string): Promise<{ success: boolean; message: string }> {
  const targetCabañaId = cabañaId || currentCabañaId;
  
  if (!isOnline()) {
    return { success: false, message: 'Sin conexión a internet' };
  }

  if (!targetCabañaId) {
    return { success: false, message: 'No se pudo determinar la cabaña' };
  }

  try {
    // Push local changes
    await trySync();
    
    // Pull server changes
    const result = await incrementalSync(targetCabañaId);
    
    return {
      success: true,
      message: `Sincronizado: ${result.recordsPulled} registros actualizados`
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Error de sincronización'
    };
  }
}
