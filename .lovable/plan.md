
# Fix In-App Purchase Not Triggering on Native (iOS/TestFlight)

## Root Causes Found

After tracing the full purchase flow across both screens (Plans page and SubscriptionPlansModal), I identified **5 issues** preventing the Apple purchase sheet from appearing:

### 1. RevenueCat initialization failure is silent
`revenueCatService.configure()` can fail, leaving `initialized = false`. Every subsequent purchase call throws `"RevenueCat not initialized"` -- but the error gets caught without clear user feedback. The `RevenueCatProvider` sets `isConfigured = true` even when configuration fails, masking the problem.

### 2. No initialization guard before purchase attempts
Both `Plans.tsx` and `SubscriptionPlansModal` call `revenueCatService.purchasePackage()` / `purchaseProduct()` directly without first checking if the SDK is actually ready. These methods throw immediately if not initialized.

### 3. Free plan crashes native purchase flow
Selecting the "free" plan on native calls `getAppStoreProductId('free', billingCycle)` which returns `''`, causing an immediate throw with no useful feedback.

### 4. Backend edge functions have stale product ID mappings
`sync-ios-purchase` and `apple-webhook` still reference OLD product IDs (`prodc6836489e3`, etc.) from a previous configuration. The new product IDs (`Personal_Monthly`, `Producer_Monthly`, etc.) won't match. The fallback string matching partially works but is fragile.

### 5. SubscriptionPlansModal hardcodes `platform: 'ios'`
Line 122 always passes `platform: 'ios'` regardless of actual device.

---

## Plan

### Step 1: Add initialization check + auto-retry to `revenueCatService.ts`
- Add an `ensureInitialized()` method that attempts to configure if not yet initialized
- Use it in `purchasePackage()`, `purchaseProduct()`, `getOfferings()`, and `getCustomerInfo()` instead of just throwing
- Add detailed console logging at each step for device-side debugging

### Step 2: Fix `Plans.tsx` purchase flow
- Skip purchase flow for the free plan (just navigate to dashboard)
- Add a check: if `revenueCatService` is not initialized, show a user-visible error toast instead of silently failing
- Log the full error object (not just `error?.message`) for debugging on device

### Step 3: Fix `SubscriptionPlansModal.tsx`
- Use `detectPlatform()` instead of hardcoded `'ios'`
- Add the same initialization guard and free plan handling

### Step 4: Update backend product ID mappings
Update both `sync-ios-purchase/index.ts` and `apple-webhook/index.ts` to include the **new** product IDs alongside the old ones:

```text
'Personal_Monthly'  -> 'personal'
'Personal_Yearly'   -> 'personal'
'Advanced_Monthly'  -> 'avanzado'
'Advanced_Yearly'   -> 'avanzado'
'Producer_Monthly'  -> 'productor'
'Producer_Yearly'   -> 'productor'
'Herd_Monthly'      -> 'cabana'
'Herd_Yearly'       -> 'cabana'
```

### Step 5: Expose `isConfigured` status to Plans page
- Pass `isConfigured` from `useRevenueCat()` to the Plans page so it can show a loading state or warning when RevenueCat isn't ready yet

---

## Files to Modify

| File | Change |
|------|--------|
| `src/services/revenueCatService.ts` | Add `ensureInitialized()` with auto-retry; use it in purchase/offerings methods |
| `src/pages/Plans.tsx` | Handle free plan; add RC init guard; improve error logging |
| `src/components/subscription/SubscriptionPlansModal.tsx` | Use `detectPlatform()`; add init guard |
| `supabase/functions/sync-ios-purchase/index.ts` | Add new product ID mappings |
| `supabase/functions/apple-webhook/index.ts` | Add new product ID mappings |

## Risk Assessment
- No database changes, no route changes, no plan limits altered
- Edge function changes are additive (old IDs preserved alongside new)
- Existing behavior preserved; only adds guards, logging, and correct mappings
