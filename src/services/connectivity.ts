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

    await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    lastKnownOnline = true;
    consecutiveFailures = 0;
  } catch {
    consecutiveFailures++;
    if (consecutiveFailures >= OFFLINE_THRESHOLD) {
      lastKnownOnline = false;
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
