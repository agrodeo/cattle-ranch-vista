import { useEffect, useState, useSyncExternalStore } from 'react';

const SUPABASE_URL = 'https://yjzxbjwewzyhjquhrfzv.supabase.co';
const CHECK_INTERVAL_MS = 30_000; // 30 seconds
const TIMEOUT_MS = 5_000;

let lastKnownOnline = navigator.onLine;
let consecutiveFailures = 0;
const OFFLINE_THRESHOLD = 2;

// Subscribers for useSyncExternalStore
const listeners = new Set<() => void>();
function notifyListeners() {
  listeners.forEach(l => l());
}

/** Actually ping Supabase to verify connectivity */
export async function checkConnectivity(): Promise<boolean> {
  const prev = lastKnownOnline;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    // Any HTTP response (even 4xx/5xx) proves network connectivity
    lastKnownOnline = true;
    consecutiveFailures = 0;
  } catch (err: any) {
    // Only count as failure if it's a true network error (not an HTTP error response)
    // AbortError = timeout, TypeError "Failed to fetch" = no network
    const isNetworkError = err.name === 'AbortError' || 
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('Network request failed') ||
      err.name === 'TypeError';
    
    if (isNetworkError) {
      consecutiveFailures++;
      if (consecutiveFailures >= OFFLINE_THRESHOLD) {
        lastKnownOnline = false;
      }
    } else {
      // Non-network error (e.g. CORS with a response) = we have connectivity
      lastKnownOnline = true;
      consecutiveFailures = 0;
    }
  }
  if (lastKnownOnline !== prev) notifyListeners();
  return lastKnownOnline;
}

/** Synchronous getter */
export function isOnline(): boolean {
  return lastKnownOnline;
}

// Single module-level periodic check
let intervalId: ReturnType<typeof setInterval> | null = null;
function startPeriodicCheck() {
  if (intervalId) return;
  checkConnectivity();
  intervalId = setInterval(checkConnectivity, CHECK_INTERVAL_MS);
}
startPeriodicCheck();

// Listen for browser online/offline hints at module level
function handleHint() {
  checkConnectivity().then(() => notifyListeners());
}
window.addEventListener('online', handleHint);
window.addEventListener('offline', handleHint);

/** React hook – uses useSyncExternalStore for zero duplicate polling */
export function useConnectivity() {
  const online = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => lastKnownOnline
  );
  return { isOnline: online };
}
