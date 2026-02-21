import { db } from './db';

/**
 * Custom Supabase storage adapter that dual-writes to localStorage AND IndexedDB.
 * IndexedDB is more persistent across iframe reloads, Capacitor webviews,
 * and browsers with aggressive storage policies.
 *
 * Supabase's auth client expects a `SupportedStorage` interface with
 * getItem, setItem, and removeItem — all may return Promises.
 */
class IndexedDBStorage {
  async getItem(key: string): Promise<string | null> {
    // Fast path: try localStorage first (synchronous, available immediately)
    try {
      const localValue = localStorage.getItem(key);
      if (localValue !== null) return localValue;
    } catch {
      // localStorage may be unavailable in some contexts
    }

    // Fallback: read from IndexedDB
    try {
      const record = await db.auth_storage.get(key);
      if (record?.value) {
        // Re-hydrate localStorage for future synchronous reads
        try {
          localStorage.setItem(key, record.value);
        } catch {
          // Ignore localStorage write failures
        }
        return record.value;
      }
    } catch (error) {
      console.warn('⚠️ IndexedDB getItem failed:', error);
    }

    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    // Write to localStorage (fast synchronous access)
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore localStorage failures
    }

    // Write to IndexedDB (durable persistence)
    try {
      await db.auth_storage.put({ key, value });
    } catch (error) {
      console.warn('⚠️ IndexedDB setItem failed:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }

    try {
      await db.auth_storage.delete(key);
    } catch (error) {
      console.warn('⚠️ IndexedDB removeItem failed:', error);
    }
  }
}

export const indexedDBStorage = new IndexedDBStorage();
