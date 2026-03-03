import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/services/db';
import { isOnline } from '@/services/connectivity';

interface OfflineReportResult<T> {
  data: T | null;
  loading: boolean;
  isStale: boolean;
  lastUpdated: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook that wraps any async report fetcher with offline caching.
 * When online: calls fetcher, caches result in IndexedDB, returns fresh data.
 * When offline: returns cached data with isStale=true.
 */
export function useOfflineReport<T>(
  cacheKey: string | null,
  fetcher: () => Promise<T | null>,
  deps: any[] = []
): OfflineReportResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const loadCached = useCallback(async () => {
    if (!cacheKey) return null;
    try {
      const cached = await db.reports_cache.get(cacheKey);
      if (cached) {
        return { data: cached.data as T, updated_at: cached.updated_at };
      }
    } catch (e) {
      console.warn('Failed to load cached report:', e);
    }
    return null;
  }, [cacheKey]);

  const saveToCache = useCallback(async (result: T) => {
    if (!cacheKey) return;
    try {
      await db.reports_cache.put({
        key: cacheKey,
        data: result,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Failed to cache report:', e);
    }
  }, [cacheKey]);

  const execute = useCallback(async () => {
    if (!cacheKey) {
      setLoading(false);
      return;
    }

    // If offline, load from cache immediately
    if (!isOnline()) {
      const cached = await loadCached();
      if (cached) {
        setData(cached.data);
        setLastUpdated(cached.updated_at);
        setIsStale(true);
      } else {
        setData(null);
        setIsStale(true);
      }
      setLoading(false);
      return;
    }

    // Online: try fetching fresh data
    setLoading(true);
    try {
      const result = await fetcherRef.current();
      if (result !== null && result !== undefined) {
        setData(result);
        setIsStale(false);
        setLastUpdated(new Date().toISOString());
        await saveToCache(result);
      }
    } catch (error) {
      console.error('Report fetch failed, trying cache:', error);
      // Fall back to cache on error
      const cached = await loadCached();
      if (cached) {
        setData(cached.data);
        setLastUpdated(cached.updated_at);
        setIsStale(true);
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, loadCached, saveToCache]);

  useEffect(() => {
    execute();
  }, [cacheKey, ...deps]);

  return { data, loading, isStale, lastUpdated, refetch: execute };
}
