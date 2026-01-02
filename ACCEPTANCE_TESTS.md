# AgroDeo Acceptance Test Checklist

Use this checklist to verify all offline-first and subscription features work correctly before store submission.

## A) Offline Boot & Data Access

### Setup
- [ ] Open app with internet connection
- [ ] Navigate to Animals, Corrales, Finances, Activities pages
- [ ] Ensure data is loaded (at least a few records in each)

### Tests

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | Force close app → Enable airplane mode → Open app | UI loads from local bundle, shows cached data | ☐ |
| 2 | Browse Animals page offline | Animals list displays from cache | ☐ |
| 3 | Browse Corrales page offline | Corrales list displays from cache | ☐ |
| 4 | Browse Finances page offline | Finances list displays from cache | ☐ |
| 5 | Browse Activities page offline | Activities list displays from cache | ☐ |
| 6 | Check Dashboard offline | Shows cached counts and recent activity | ☐ |

## B) Offline CRUD Operations

### Tests

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | Create new animal offline | Animal appears in list, pending badge shows | ☐ |
| 2 | Edit existing animal offline | Changes visible immediately | ☐ |
| 3 | Create new corral offline | Corral appears in list | ☐ |
| 4 | Create finance record offline | Finance appears in list | ☐ |
| 5 | Create activity offline | Activity appears in list | ☐ |
| 6 | Check sync status widget | Shows pending count > 0 | ☐ |

## C) Outbox Persistence

### Tests

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | Create record offline → Force close app → Reopen offline | Outbox still has pending items | ☐ |
| 2 | Check pending count after restart | Count matches pre-restart count | ☐ |
| 3 | Verify optimistic data persists | Created/edited records still visible | ☐ |

## D) Auto-Sync on Reconnection

### Tests

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | With pending items → Disable airplane mode | Toast shows "Sincronizando..." | ☐ |
| 2 | Wait for sync to complete | Toast shows "Sincronización completada" | ☐ |
| 3 | Check pending count | Pending count = 0 | ☐ |
| 4 | Verify data on server | Records synced correctly | ☐ |

## E) RevenueCat - Online Purchase

### Prerequisites
- RevenueCat sandbox configured
- Test account set up

### Tests

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | Open paywall (tap premium feature) | Paywall displays with packages | ☐ |
| 2 | Purchase subscription (sandbox) | Purchase completes, premium unlocks | ☐ |
| 3 | Premium features now accessible | Previously locked features work | ☐ |
| 4 | Check customer info | Shows active subscription | ☐ |

## F) RevenueCat - Offline Entitlement

### Tests

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | As premium user → Force close → Airplane mode → Reopen | Premium still works (cached) | ☐ |
| 2 | Check subscription status | Shows "cached" source | ☐ |
| 3 | Premium features work | All premium features accessible | ☐ |
| 4 | After 1+ days offline | Grace period countdown shows | ☐ |

## G) RevenueCat - Restore Purchases

### Tests

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | Tap "Restore Purchases" | Restore process starts | ☐ |
| 2 | If previous purchase exists | Subscription restored, premium unlocks | ☐ |
| 3 | If no previous purchase | Shows "no purchases found" message | ☐ |

## H) RevenueCat - Grace Period Expiry

### Tests (simulated - adjust device date)

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | Premium user offline 7+ days | Banner shows "grace period expired" | ☐ |
| 2 | Premium features | Features locked (downgraded to free) | ☐ |
| 3 | Reconnect to internet | Entitlement refreshed, status corrected | ☐ |

## I) Build & Export

### Web Build

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | `npm install` | Installs without errors | ☐ |
| 2 | `npm run build` | Builds successfully | ☐ |
| 3 | Check `dist/` folder | Contains index.html, assets/, icons/ | ☐ |
| 4 | `npx serve dist` | App loads locally | ☐ |

### iOS Build

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | Copy capacitor.config.production.ts | Production config in place | ☐ |
| 2 | `npx cap sync ios` | Syncs without errors | ☐ |
| 3 | `npx cap open ios` | Opens in Xcode | ☐ |
| 4 | Archive (Product → Archive) | Archives successfully | ☐ |
| 5 | Upload to TestFlight | Upload completes | ☐ |

### Android Build

| # | Test | Expected Result | Pass |
|---|------|-----------------|------|
| 1 | `npx cap sync android` | Syncs without errors | ☐ |
| 2 | `npx cap open android` | Opens in Android Studio | ☐ |
| 3 | `./gradlew bundleRelease` | AAB builds successfully | ☐ |
| 4 | Upload to Play Console | Upload completes | ☐ |

## J) Known Limitations

Document any discovered issues:

| Issue | Workaround | Severity |
|-------|-----------|----------|
| First purchase requires internet | Show message to connect | Low |
| Large initial download (~6MB) | Normal for PWA | Low |
| Grace period is 7 days fixed | Could be configurable | Low |

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |

---

## Quick Commands Reference

```bash
# Development
npm run dev

# Production build
npm run build

# iOS
cp capacitor.config.production.ts capacitor.config.ts
npx cap sync ios
npx cap open ios

# Android
npx cap sync android
npx cap open android
cd android && ./gradlew bundleRelease
```
