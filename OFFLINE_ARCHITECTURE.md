# AgroDeo Offline-First Architecture

## Overview

AgroDeo implements a comprehensive offline-first architecture that allows the app to boot, display data, and accept user input without any network connection. Changes made offline are automatically synchronized when connectivity is restored.

## Core Components

### 1. Local Storage (IndexedDB via Dexie)

**File:** `src/services/db.ts`

All data is stored in IndexedDB using Dexie.js ORM:

```typescript
// Tables
- animals_cache        // Animal records
- corrales_cache       // Corral records  
- eventos_cache        // Activity events
- finances_cache       // Financial records
- outbox               // Pending sync operations
- id_map               // Temp ID → Real ID mappings
- sync_metadata        // Last sync timestamps + entitlement cache
```

### 2. Outbox Pattern

**File:** `src/services/syncEngine.ts`

All mutations (create/update/delete) are:
1. Applied immediately to local cache (optimistic UI)
2. Queued to the outbox for later sync
3. Synced in batches when online

```typescript
interface OutboxEvent {
  id: string;
  type: 'ANIMAL_INSERT' | 'ANIMAL_UPDATE' | ...;
  payload: any;
  tempIds?: { tempId: string };
  createdAt: string;
  retries: number;
  status: 'pending' | 'synced' | 'failed' | 'failed_permanent';
  reason?: string;
}
```

### 3. Sync Engine Features

- **Sync Lock**: Prevents concurrent sync operations
- **Batch Processing**: Processes up to 50 events at a time
- **Exponential Backoff**: Retries with increasing delays
- **Per-Item Failure**: One failed item doesn't block others
- **Max Retries**: After 5 failures, item is marked permanent failure
- **ID Mapping**: Temp IDs are replaced with server IDs after sync

### 4. Conflict Resolution

**Strategy:** Last-Write-Wins (LWW)

- Each record has an `updated_at` timestamp
- Server compares timestamps and keeps the most recent
- Client trusts server response after sync

### 5. Offline Hooks

Each entity has a dedicated offline hook:

```typescript
// Animals
useOfflineAnimals({ cabañaId })
  → { animals, createAnimal, updateAnimal, ... }

// Corrales  
useOfflineCorrales({ cabañaId })
  → { corrales, createCorral, updateCorral, ... }

// Finances
useOfflineFinances({ cabañaId })
  → { finances, createFinance, updateFinance, ... }
```

### 6. Cache-First Loading

All pages load in this order:
1. Instantly display cached data from IndexedDB
2. Show loading indicator for background refresh
3. Sync with server if online
4. Update UI with fresh data

## RevenueCat Offline Entitlements

**File:** `src/services/entitlementCache.ts`

### Caching Strategy

1. On successful verification, cache entitlement status locally
2. Include timestamp of last verification
3. On app start, check cache first

### Grace Period

- Premium users get 7 days of offline access
- After 7 days without verification, downgrade to free
- On reconnection, immediately verify and update

### State Machine

```
Online + Verified → isPremium: true
Offline + Within Grace Period → isPremium: true (cached)
Offline + Grace Period Expired → isPremium: false
Never Verified → needsConnectionToVerify: true
```

## Data Flow Diagrams

### Offline Write

```
User Action
    ↓
Update Local Cache (optimistic)
    ↓
Generate Temp ID (t_xxx)
    ↓
Queue to Outbox
    ↓
Show Success to User
    ↓
(Later, when online)
    ↓
Sync Engine Flushes Outbox
    ↓
Server Processes & Returns Real ID
    ↓
Update Cache with Real ID
```

### Offline Read

```
Page Load
    ↓
Load from IndexedDB Cache
    ↓
Display Immediately
    ↓
Check Connectivity
    ↓
If Online: Fetch from Server
    ↓
Merge with Cache
    ↓
Update UI
```

## Testing Offline Mode

### Manual Test

1. Open app normally (let it cache data)
2. Enable Airplane Mode
3. Close app completely
4. Reopen app
5. Verify UI loads with cached data

### Automated Tests

```typescript
// Check pending count
const { pending } = await getOutboxStatus();
expect(pending).toBeGreaterThan(0);

// Check cache exists
const animals = await db.animals_cache.count();
expect(animals).toBeGreaterThan(0);
```

## Performance Considerations

- **Bundle Size**: Keep main bundle under 6MB for reasonable offline caching
- **IndexedDB Quota**: Browsers typically allow 50MB+
- **Batch Sync**: Process max 50 items per batch to avoid timeouts
- **Cleanup**: Remove old synced events (keep last 100)

## Troubleshooting

### "Data not showing offline"
- Clear IndexedDB and re-sync
- Check that cabañaId is set correctly

### "Changes not syncing"
- Check outbox for failed_permanent items
- Verify network connectivity
- Check server logs for errors

### "Wrong subscription status offline"
- Clear entitlement cache
- Re-verify online
- Check grace period settings
