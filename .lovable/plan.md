

## Plan: Bulletproof Offline Experience

### Problem Summary
When offline, the app produces multiple user-facing error toasts and alerts because:
1. **`useSubscription`** retries the `get_subscription_status` RPC 3 times and shows a destructive toast after all retries fail — even though it already has cached data.
2. **`errorHandlers.ts`** opens a support dialog for unhandled promise rejections (which spike offline as network calls fail).
3. **Various hooks** (`useAnimalVaccinations`, `useCorralVaccinationMetrics`, `useDashboardSummary`) call Supabase directly without checking `isOnline` first, producing failed fetch errors that bubble up as toasts.
4. The **connectivity check** pings Supabase every 30s; when offline this generates repeated failed fetches that can trigger error handlers.

### Changes

#### 1. Silence subscription toast when cached data exists (`src/hooks/useSubscription.tsx`)
- Remove the destructive toast on line 85-89. If `subscriptionStatus` is already populated from cache, there is no reason to alert the user. Only log to console.
- After all retries exhaust, silently fall back to cached status without any toast.

#### 2. Suppress network-related errors in global error handlers (`src/lib/errorHandlers.ts`)
- Add `"Failed to fetch"`, `"NetworkError"`, `"Network request failed"`, `"Load failed"`, `"AbortError"`, and `"error.loadFailed"` to the `shouldIgnoreErrorMessage` filter so they never open the support dialog.

#### 3. Guard hooks with `isOnline` before making Supabase calls
Files affected:
- **`src/hooks/useAnimalVaccinations.tsx`** — wrap fetch logic with `isOnline` check; load from cache if offline, skip toast on network errors.
- **`src/hooks/useCorralVaccinationMetrics.tsx`** — same pattern: skip fetch + skip error toast when offline.
- **`src/hooks/useVaccinationRequirements.tsx`** — mutating hooks should still queue to outbox offline, but avoid server calls and toasts.

#### 4. Prevent `autoSync.ts` from producing toast errors offline
- The `handleOnline` / periodic sync already check `isOnline()`, but the `handleOffline` function shows a toast every time. Add a simple dedup to avoid repeated offline toasts within a short window (e.g., 30s cooldown).

#### 5. Prevent connectivity service from triggering error handlers
- Wrap the `fetch` in `checkConnectivity()` so that failures are fully swallowed (they already are, but verify the `TypeError` from `fetch` doesn't leak into `unhandledrejection`).

### Scope
- ~5 files modified, no DB/RLS/migration changes.
- No UI layout, route, or component structure changes.
- No changes to plan names, limits, or trial logic.
- All existing offline hooks (`useOfflineAnimals`, `useOfflineCorrales`, etc.) continue unchanged — they already work correctly.

### Technical Details

```text
useSubscription.tsx
├─ Line 85-89: Remove toast({ ... destructive })
├─ Keep console.error for debugging
└─ subscriptionStatus remains populated from localStorage cache

errorHandlers.ts
├─ shouldIgnoreErrorMessage(): add network-error patterns
└─ Prevents support dialog spam when offline

useAnimalVaccinations.tsx / useCorralVaccinationMetrics.tsx
├─ Import useConnectivity
├─ Early-return from fetch when !isOnline
└─ Suppress toast.error for load failures when offline

autoSync.ts
├─ Add 30s cooldown to handleOffline toast
└─ Prevents repeated "working offline" toasts
```

