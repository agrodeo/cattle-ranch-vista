import { useEffect, useState } from 'react';

const SUPABASE_URL = 'https://yjzxbjwewzyhjquhrfzv.supabase.co';
const CHECK_INTERVAL_MS = 30_000; // 30 seconds
const TIMEOUT_MS = 3_000; // 3 seconds

let lastKnownOnline = navigator.onLine;

/** Actually ping Supabase to verify connectivity (iOS WKWebView lies about navigator.onLine) */
export async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    lastKnownOnline = res.ok;
  } catch {
    lastKnownOnline = false;
  }
  return lastKnownOnline;
}

/** Synchronous getter — returns the result of the last active check */
export function isOnline(): boolean {
  return lastKnownOnline;
}

// Start periodic background checks
let intervalId: ReturnType<typeof setInterval> | null = null;
function startPeriodicCheck() {
  if (intervalId) return;
  // Initial check
  checkConnectivity();
  intervalId = setInterval(checkConnectivity, CHECK_INTERVAL_MS);
}
startPeriodicCheck();

export function useConnectivity() {
  const [online, setOnline] = useState(lastKnownOnline);

  useEffect(() => {
    // Browser events as hints → trigger real check
    const verify = () => {
      checkConnectivity().then(setOnline);
    };

    window.addEventListener('online', verify);
    window.addEventListener('offline', verify);

    // Also poll in sync with module-level interval
    const poll = setInterval(() => {
      checkConnectivity().then(setOnline);
    }, CHECK_INTERVAL_MS);

    // Initial real check
    verify();

    return () => {
      window.removeEventListener('online', verify);
      window.removeEventListener('offline', verify);
      clearInterval(poll);
    };
  }, []);

  return { isOnline: online };
}
