
# Fix: Persistent Login via IndexedDB Storage Adapter

## Root Cause

Supabase stores auth sessions in `localStorage` by default. In certain environments (embedded iframes, Capacitor webviews, browsers with aggressive storage policies), `localStorage` gets wiped between app opens. The logs confirm this: `INITIAL_SESSION no session` fires on every load despite `persistSession: true`.

## Solution

Create a custom Supabase storage adapter that uses **IndexedDB** (via the existing Dexie database) instead of `localStorage`. IndexedDB is more persistent and reliable across iframe, PWA, and native app contexts.

## Implementation

### Step 1: Add an `auth_storage` table to IndexedDB

**File:** `src/services/db.ts`

- Add a new `auth_storage` table to the Dexie schema (upgrade to version 4) with a simple key-value structure: `{ key: string, value: string }`.

### Step 2: Create a custom storage adapter

**File:** `src/services/supabaseStorage.ts` (new file)

- Implement the `getItem`, `setItem`, and `removeItem` methods required by Supabase's `SupportedStorage` interface.
- Each method reads/writes from the `auth_storage` IndexedDB table.
- Include a synchronous `localStorage` fallback for the brief window during Dexie initialization (Supabase calls `getItem` synchronously on startup, so we write to both stores and read localStorage first as a fast path).

### Step 3: Wire the adapter into the Supabase client

**File:** `src/integrations/supabase/client.ts`

- Import the custom storage adapter.
- Pass it as the `storage` option in the Supabase client auth config.

### Step 4: Remove the manual `getCachedSession()` workaround

**File:** `src/hooks/useSupabaseAuth.tsx`

- Remove the `getCachedSession()` function that manually reads `sb-*-auth-token` from localStorage -- this is now handled automatically by Supabase through the custom adapter.
- Simplify `initializeAuth` to rely on `supabase.auth.getSession()` which will now read from IndexedDB.
- Keep the `loadCachedUserProfile()` logic for offline profile data (separate concern).

---

## Technical Details

### Custom storage adapter structure

```typescript
// Implements Supabase's SupportedStorage interface
class IndexedDBStorage {
  async getItem(key: string): Promise<string | null> {
    // Try localStorage first (synchronous fast path)
    // Then fall back to IndexedDB
  }
  async setItem(key: string, value: string): Promise<void> {
    // Write to BOTH localStorage and IndexedDB
  }
  async removeItem(key: string): Promise<void> {
    // Remove from both stores
  }
}
```

### Files modified

| File | Change |
|------|--------|
| `src/services/db.ts` | Add `auth_storage` table (v4 upgrade) |
| `src/services/supabaseStorage.ts` | New: custom IndexedDB storage adapter |
| `src/integrations/supabase/client.ts` | Use custom storage adapter |
| `src/hooks/useSupabaseAuth.tsx` | Remove manual `getCachedSession()`, simplify init |

### Risk assessment

- No database schema changes (server-side)
- No routes, components, or flows altered
- Dexie version upgrade is additive (v3 to v4)
- Dual-write to localStorage + IndexedDB ensures backward compatibility
- Existing offline profile caching remains untouched
