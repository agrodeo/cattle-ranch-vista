

# Fix Plan: Sync System Unification and Bug Fixes

## Problem Summary

The codebase has two competing sync systems (`outbox.ts` and `syncEngine.ts`) causing inconsistent behavior, missing sync handlers for several operations, a faulty retry mechanism, and `VITE_*` environment variables that are not supported by Lovable.

---

## Changes Overview

### 1. Unify Sync Systems -- Redirect old outbox imports to syncEngine

**Problem:** `outbox.ts` and `syncEngine.ts` both provide `enqueue`, `getOutboxStatus`, and `retryFailedEvents`. Most of the app imports from the old `outbox.ts`, while only `autoSync.ts` and `SyncStatusWidget.tsx` use the new engine.

**Fix:** Replace `outbox.ts` contents with re-exports from `syncEngine.ts`, making `syncEngine.ts` the single source of truth. This avoids touching every consumer file.

**File:** `src/services/outbox.ts`
- Replace all function implementations with re-exports:
  ```
  export { enqueue, getOutboxStatus, retryFailedEvents, syncOutbox as flushOutbox } from './syncEngine';
  export { applyIdMappings as applyIdMapInCaches } from './syncEngine';
  ```
  (Note: `applyIdMappings` is not currently exported from syncEngine, so we will export it.)

**File:** `src/services/syncEngine.ts`
- Export `applyIdMappings` so `outbox.ts` can re-export it.

### 2. Unify SyncCenter and SyncStatusBadge to use syncEngine

**File:** `src/components/SyncCenter.tsx`
- Change import from `@/services/outbox` to `@/services/syncEngine` for `getOutboxStatus` and `retryFailedEvents`.
- Change `trySync` import to use `syncOutbox` from `syncEngine`.

**File:** `src/components/SyncStatusBadge.tsx`
- Change `getOutboxStatus` import from `@/services/outbox` to `@/services/syncEngine`.

### 3. Add missing handlers in syncApi.ts

**Problem:** `ANIMAL_DELETE`, `CORRAL_DELETE`, `FINANCE_UPDATE`, `FINANCE_DELETE`, `DEATH_RECORD_INSERT`, `TACTO_INSERT` (and other types defined in `OutboxEventType`) are not handled, causing "Unsupported event type" errors.

**File:** `src/services/syncApi.ts`
- Add cases for:
  - `ANIMAL_DELETE`: delete from `animals` by id
  - `CORRAL_DELETE`: delete from `corrales` by id
  - `FINANCE_UPDATE`: update `finances` by id
  - `FINANCE_DELETE`: delete from `finances` by id
  - `DEATH_RECORD_INSERT`: insert into `defunciones`
  - `VACCINE_UPDATE`: update `animal_vaccines` by id
  - `VACCINE_DELETE`: delete from `animal_vaccines` by id
  - `WEIGHT_UPDATE`: update `animal_weight_history` by id
  - `INSEMINATION_UPDATE`: update `artificial_inseminations` by id
  - `EVENTO_UPDATE`: update `eventos` by id
  - `CORRAL_MOVEMENT_INSERT`: insert into `corral_movements`
  - `PREGNANCY_INSERT`: insert into `preñeces`
  - `PREGNANCY_UPDATE`: update `preñeces` by id

### 4. Fix VITE_ environment variables in RevenueCat

**Problem:** Lovable does not support `VITE_*` variables. The RevenueCat service uses `import.meta.env.VITE_REVENUECAT_API_KEY_*` which will always be undefined.

**File:** `src/services/revenueCatService.ts`
- Replace `import.meta.env.VITE_REVENUECAT_API_KEY_IOS` / `ANDROID` with hardcoded placeholder constants and a clear comment telling the developer to set them before building for stores. This follows the same pattern used for the Supabase client.

**File:** `src/services/iosPurchaseService.ts`
- Same fix: replace `import.meta.env.VITE_REVENUECAT_API_KEY` with the constant.

### 5. Fix faulty retry logic in outbox.ts (now moot)

Since `outbox.ts` will become a re-export file (change 1), the faulty `retryFailedEvents` that increments `retries` before the attempt is eliminated. The `syncEngine.ts` version correctly only resets status to `pending` without incrementing.

### 6. Fix incremental sync for animals (missing updated_at column)

**Problem:** `syncAnimalsIncremental` queries `.gte('updated_at', lastSync)` but the `animals` table has no `updated_at` column, so the query silently returns nothing.

**Fix (non-destructive):** Add a database migration to add `updated_at` column to `animals` with a default and trigger.

**Migration SQL:**
```sql
ALTER TABLE animals ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION update_animals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_animals_updated_at
  BEFORE UPDATE ON animals
  FOR EACH ROW
  EXECUTE FUNCTION update_animals_updated_at();

-- Backfill existing rows
UPDATE animals SET updated_at = COALESCE(created_at, now()) WHERE updated_at IS NULL;
```

(Note: `animals` table does not have `created_at` either based on schema. We will just use `now()` for the backfill.)

### 7. Fix finances incremental sync using date instead of updated_at

**Problem:** `syncFinancesIncremental` uses `.gte('date', lastSync)` which compares transaction dates against sync timestamps -- incorrect semantics.

**Fix:** The `finances` table also lacks `updated_at`. Since adding columns requires a migration, we will add `updated_at` to finances as well, then use it in the incremental query.

**Migration SQL:**
```sql
ALTER TABLE finances ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION update_finances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_finances_updated_at
  BEFORE UPDATE ON finances
  FOR EACH ROW
  EXECUTE FUNCTION update_finances_updated_at();

UPDATE finances SET updated_at = now() WHERE updated_at IS NULL;
```

**File:** `src/services/dataSync.ts` line 500-503
- Change `query = query.gte('date', lastSync)` to `query = query.gte('updated_at', lastSync)`

### 8. Remove dead sync.ts file

**Problem:** `src/services/sync.ts` is only imported by `SyncCenter` and offline hooks via `trySync`. After change 1, the offline hooks still import `enqueue` from outbox (now re-exporting syncEngine) and `trySync` from sync.ts.

**Fix:** Update `src/services/sync.ts` to use `syncOutbox` from syncEngine instead of `flushOutbox`/`applyIdMapInCaches` from outbox, keeping it as a thin wrapper.

---

## Technical Details

### Files Modified (8 files):
1. `src/services/outbox.ts` -- gutted, becomes re-exports
2. `src/services/syncEngine.ts` -- export `applyIdMappings`
3. `src/services/syncApi.ts` -- add 13 missing event handlers
4. `src/services/sync.ts` -- use syncEngine internally
5. `src/services/revenueCatService.ts` -- remove VITE_ vars
6. `src/services/iosPurchaseService.ts` -- remove VITE_ vars
7. `src/services/dataSync.ts` -- fix finances incremental sync field
8. `src/components/SyncStatusBadge.tsx` -- import from syncEngine
9. `src/components/SyncCenter.tsx` -- import from syncEngine

### Database Migrations (1 migration):
- Add `updated_at` column + trigger to `animals` and `finances` tables

### No Breaking Changes:
- All existing imports continue to work (outbox re-exports)
- No routes, components, or UI flows are altered
- No enum values or field meanings change
- Existing data is preserved (additive migration only)

