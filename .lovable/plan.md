

# Fix: Animals tab stuck on loading

## Root Cause

The connectivity checker (`src/services/connectivity.ts`) pings `https://...supabase.co/rest/v1/` with a HEAD request **without authentication headers**. Supabase returns **401 Unauthorized**. The code checks `res.ok` (which is only `true` for 2xx responses), so a 401 is treated as "offline."

This causes a chain reaction:
1. `useConnectivity()` reports `isOnline = false`
2. `syncFromServer()` in `Animals.tsx` returns early (`if (!isOnline) return`) without fetching data and without setting `loading = false`
3. `loadFromCache()` finds nothing for a new user, so it also does not set `loading = false`
4. The page stays stuck on the loading spinner, and the error toast eventually fires

## Fix (1 file)

### `src/services/connectivity.ts` (line 21)

Change the online check from `res.ok` (2xx only) to accept **any HTTP response** as proof of connectivity. A 401 means the server responded -- the network is working. Only a network failure (caught by the `catch` block) should be treated as offline.

```typescript
// BEFORE
lastKnownOnline = res.ok;

// AFTER
lastKnownOnline = true;  // Any HTTP response (even 401/403) means we have connectivity
```

This is the correct approach because:
- The purpose of this check is to detect **network connectivity**, not authentication status
- A 401 response proves the server is reachable
- The `catch` block already handles actual network failures (timeout, DNS, no connection)

## Impact

- No database changes
- No schema changes
- No changes to existing routes, components, or business logic
- Only the connectivity detection logic is corrected
- All existing offline behavior continues to work (true network failures still detected via `catch`)

