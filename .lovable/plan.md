
# Fix: False "offline" banner and unexpected logout

## Problem

Two separate bugs cause the user to (1) see an "offline" banner and (2) get logged out, despite having a working internet connection.

## Root Cause Analysis

### Bug 1: False logout on transient Supabase errors

In `src/hooks/useSupabaseAuth.tsx` (lines 379-441), the `onAuthStateChange` listener fires on events like `TOKEN_REFRESHED`. The handler calls `fetchUserProfile()`, and if the profile fetch fails (e.g., Supabase returns a transient 503), the code at **line 423-424** sets `isAuthenticated = false`:

```typescript
} else if (mounted) {
  setCurrentUser(null);
  setIsAuthenticated(false);  // <-- THIS LOGS THE USER OUT
}
```

Similarly, the `catch` block at **lines 428-430** also sets `isAuthenticated(false)`.

Since `ProtectedRoute` redirects to `/auth` when `isAuthenticated` is false, the user gets "logged out" even though their session token is still valid.

### Bug 2: False "offline" on connectivity ping timeout

In `src/services/connectivity.ts`, the ping has a 3-second timeout. If the Supabase API is slow (as seen with the 503 errors in the logs), the `AbortController` fires, the `catch` block runs, and `lastKnownOnline` is set to `false`. This triggers the offline banner in `ProtectedRoute`.

## Fix

### File 1: `src/hooks/useSupabaseAuth.tsx`

**Change**: When `fetchUserProfile` fails inside `onAuthStateChange`, do NOT set `isAuthenticated = false` if the user already has a cached profile or a valid session. Only de-authenticate on explicit `SIGNED_OUT` events.

Specifically:
- Lines 421-424: Instead of setting `isAuthenticated(false)` when profile fetch returns null, log a warning and keep the existing `currentUser` state. The user still has a valid Supabase session.
- Lines 426-431: Same -- on catch, log the error but do NOT de-authenticate.
- The `SIGNED_OUT` case (line 434-438) already correctly clears auth state -- that path remains unchanged.

### File 2: `src/services/connectivity.ts`

**Change**: Make connectivity detection more resilient to transient slowness:
- Increase `TIMEOUT_MS` from 3000 to 5000ms to tolerate slower Supabase responses.
- Add a "grace period" -- only mark offline after 2 consecutive failed pings, not just 1. This prevents a single slow request from flipping the entire app to offline mode.

## Technical Details

### useSupabaseAuth.tsx changes (lines ~387-433)

```typescript
// In the onAuthStateChange handler, inside the setTimeout:
try {
  if (event === 'SIGNED_IN') {
    await handlePendingCabanaCreation(session.user.id);
  }

  const userProfile = await fetchUserProfile(session.user.id);
  if (userProfile && mounted) {
    setCurrentUser(userProfile);
    setIsAuthenticated(true);
    await cacheUserProfile(userProfile);
    // ... sync logic unchanged
  } else if (mounted) {
    // CHANGED: Do NOT de-authenticate on profile fetch failure
    // The session is still valid, just the profile fetch failed transiently
    console.warn('Profile fetch returned null, keeping existing auth state');
    // Only de-auth if we have NO prior auth state at all
    if (!currentUser) {
      setIsAuthenticated(false);
    }
  }
} catch (error) {
  console.error('Error in auth state change handler:', error);
  // CHANGED: Do NOT de-authenticate on transient errors
  // Keep existing auth state intact
}
```

### connectivity.ts changes

```typescript
const TIMEOUT_MS = 5_000; // increased from 3s to 5s
let consecutiveFailures = 0;
const OFFLINE_THRESHOLD = 2; // require 2 consecutive failures

export async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    await fetch(/*...*/);
    clearTimeout(timeout);
    lastKnownOnline = true;
    consecutiveFailures = 0; // reset on success
  } catch {
    consecutiveFailures++;
    if (consecutiveFailures >= OFFLINE_THRESHOLD) {
      lastKnownOnline = false;
    }
    // If under threshold, keep lastKnownOnline as-is
  }
  return lastKnownOnline;
}
```

## Impact

- No database changes
- No schema changes
- No changes to routes, components, or business logic
- Existing offline detection for truly offline scenarios still works (after 2 consecutive failures)
- Existing logout flow via `signOut()` is untouched
- The user stays authenticated through transient Supabase outages
