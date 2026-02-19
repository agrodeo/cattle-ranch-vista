
# Fix: Mobile Loading Stuck on Activities and Tab Switching

## Problem Analysis

Three bugs are causing the app to get stuck in a loading state on mobile:

### Bug 1: `useConnectivity()` destructuring mismatch in `useAllActivities.tsx`
- `useConnectivity()` returns `{ isOnline: boolean }` (an object)
- But `useAllActivities.tsx` line 42 assigns it as: `const isOnline = useConnectivity()`
- Then line 76 checks `if (!isOnline) return` -- but `isOnline` is an **object**, which is always truthy
- **Impact**: When offline, `syncFromServer` still runs, all fetches fail silently, and the N+1 queries below compound the delay

### Bug 2: N+1 query waterfall in `syncFromServer` (useAllActivities.tsx)
- For each evento, it makes individual sequential queries (pesajes, tactos, animals)
- For each vaccine group, it queries animals + vaccination requirements individually
- For each insemination group, it queries animals individually
- On a slow mobile connection with 50+ events, this means 100+ sequential HTTP requests
- **Impact**: Loading takes 30+ seconds on mobile or times out entirely

### Bug 3: Subscription RPC blocks the entire app (`ProtectedRoute.tsx` line 22)
- `ProtectedRoute` waits for both `authLoading` AND `subscriptionLoading` before rendering anything
- `useSubscription` calls an RPC that retries up to 3 times with increasing delays (2s, 4s)
- If the RPC is slow or fails, the app shows a spinner for 6+ seconds before any content appears
- The `isOffline` check uses `navigator.onLine` which is unreliable on iOS WKWebView
- **Impact**: App stuck on loading spinner on flaky mobile connections

---

## Fix Plan

### Step 1: Fix `useConnectivity()` destructuring in `useAllActivities.tsx`
**File**: `src/hooks/useAllActivities.tsx`
- Change line 42 from `const isOnline = useConnectivity()` to `const { isOnline } = useConnectivity()`
- This ensures the offline guard on line 76 actually works

### Step 2: Eliminate N+1 queries in `syncFromServer`
**File**: `src/hooks/useAllActivities.tsx`
- Batch-fetch all animal details in a single query instead of per-event
- Collect all animal IDs first, then fetch once with `.in('id', allAnimalIds)`
- Fetch pesajes and tactos in bulk by evento_ids instead of one-by-one
- This reduces 100+ queries to approximately 5-6 queries total

### Step 3: Make subscription loading non-blocking
**File**: `src/components/ProtectedRoute.tsx`
- Use the robust `useConnectivity()` hook instead of `isOffline` from auth (which uses unreliable `navigator.onLine`)
- Add a 3-second timeout for subscription loading -- if it hasn't resolved, render the page anyway
- Subscription status will populate in the background without blocking the UI

### Step 4: Add connectivity timeout to `useSubscription`
**File**: `src/hooks/useSubscription.tsx`
- Check `isOnline` from the robust connectivity service before making the RPC call
- If offline, skip the RPC and set loading to false immediately
- This prevents the subscription check from blocking the app when there's no real connectivity

---

## Technical Details

### Files Modified
1. `src/hooks/useAllActivities.tsx` -- Fix destructuring + batch queries
2. `src/components/ProtectedRoute.tsx` -- Non-blocking subscription check
3. `src/hooks/useSubscription.tsx` -- Offline-aware subscription fetch

### Risk Assessment
- No database changes required
- No new tables, columns, or RLS policies
- No changes to existing routes, components, or flows
- All changes are performance/resilience improvements to existing hooks
- Existing buttons, labels, and flows remain unchanged
