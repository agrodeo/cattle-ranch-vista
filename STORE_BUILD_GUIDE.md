# AgroDeo - Production Build & Store Deployment Guide

This document provides step-by-step instructions for building AgroDeo for iOS App Store and Google Play Store.

## Prerequisites

- Node.js 18+ and npm
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- Apple Developer Account ($99/year)
- Google Play Developer Account ($25 one-time)
- RevenueCat account with apps configured

## 1. Environment Setup

### RevenueCat API Keys

Add these environment variables to your build system:

```bash
# iOS
VITE_REVENUECAT_API_KEY_IOS=your_ios_api_key

# Android  
VITE_REVENUECAT_API_KEY_ANDROID=your_android_api_key
```

**In RevenueCat Dashboard:**
1. Create an iOS app with Bundle ID: `com.agrodeo.app`
2. Create an Android app with Package Name: `com.agrodeo.app`
3. Copy the public SDK keys for each platform

## 2. Build the Web Bundle

```bash
# Install dependencies
npm install

# Build production bundle
npm run build
```

**Output:** `dist/` folder containing:
- `index.html` - Main entry point
- `assets/` - JS, CSS, and other assets
- `icons/` - PWA icons

## 3. Configure Capacitor for Production

Replace `capacitor.config.ts` with the production version:

```bash
# Copy production config
cp capacitor.config.production.ts capacitor.config.ts
```

The production config:
- Uses `webDir: 'dist'` (local bundle)
- Removes `server.url` (no remote server)
- Enables true offline boot

## 4. iOS Build (App Store)

### 4.1 Add iOS Platform

```bash
npx cap add ios
npx cap sync ios
```

### 4.2 Open in Xcode

```bash
npx cap open ios
```

### 4.3 Configure Signing

1. Select the `App` target
2. Go to **Signing & Capabilities**
3. Select your Team
4. Ensure Bundle Identifier is: `com.agrodeo.app`

### 4.4 Configure In-App Purchases

1. Go to **Signing & Capabilities**
2. Click **+ Capability**
3. Add **In-App Purchase**

### 4.5 Archive for App Store

1. Select **Any iOS Device (arm64)** as build target
2. Menu: **Product → Archive**
3. In Organizer, click **Distribute App**
4. Select **App Store Connect**
5. Upload to App Store Connect

### 4.6 TestFlight

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to **TestFlight** tab
4. Add internal/external testers

## 5. Android Build (Play Store)

### 5.1 Add Android Platform

```bash
npx cap add android
npx cap sync android
```

### 5.2 Open in Android Studio

```bash
npx cap open android
```

### 5.3 Configure Signing

Create a keystore for signing:

```bash
keytool -genkey -v -keystore agrodeo-release.keystore -alias agrodeo -keyalg RSA -keysize 2048 -validity 10000
```

Add to `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file('path/to/agrodeo-release.keystore')
            storePassword 'your_store_password'
            keyAlias 'agrodeo'
            keyPassword 'your_key_password'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### 5.4 Build AAB (App Bundle)

```bash
cd android
./gradlew bundleRelease
```

**Output:** `android/app/build/outputs/bundle/release/app-release.aab`

### 5.5 Upload to Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app (or create new)
3. Go to **Production → Create new release**
4. Upload the `.aab` file
5. Complete store listing

## 6. RevenueCat Configuration

### Products Setup

Create these products in App Store Connect / Google Play Console:

| Plan | Monthly ID | Annual ID |
|------|-----------|-----------|
| Personal | `prodc6836489e3` | `prodc8d8f05de3` |
| Avanzado | `prodc70244af0c` | `prod089fc06f3e` |
| Productor | `prod994aa82559` | `prod698531dc0f` |
| Cabaña | `prod303c757d05` | `prodf140665f04` |

### Entitlement

Create entitlement: `agrodeo Pro`

Link all subscription products to this entitlement.

### Offerings

Create a default offering with all products as packages.

## 7. Offline Behavior

### How It Works

1. **Local Bundle Loading**: The app loads from the local `dist/` folder, not a remote server
2. **IndexedDB Storage**: All data is cached in IndexedDB for offline access
3. **Outbox Pattern**: Offline changes are queued and synced when online
4. **Entitlement Caching**: Subscription status is cached with 7-day grace period

### Grace Period Policy

- Premium users can access premium features offline for up to 7 days
- After 7 days without verification, user is downgraded to free
- On reconnection, entitlement is verified and UI updated

## 8. Acceptance Test Checklist

### Offline Tests

- [ ] Force close app → Airplane mode → Open → UI loads
- [ ] Browse Animals/Corrales/Finances/Activities offline
- [ ] Create/edit/delete records offline → Pending count increases
- [ ] Kill app with pending outbox → Reopen offline → Outbox persists
- [ ] Go online → Auto-sync completes → Pending clears

### RevenueCat Tests

- [ ] Online purchase in sandbox → Premium unlocks
- [ ] Force close → Airplane mode → Reopen → Premium still works (cached)
- [ ] Restore purchases works
- [ ] Reconnect after expired subscription → Properly downgrades

### Build Tests

- [ ] `npm run build` produces `dist/`
- [ ] Capacitor loads local bundle (no server.url)
- [ ] Android AAB builds successfully
- [ ] iOS archive uploads to TestFlight

## 9. Known Limitations

1. **First Purchase Requires Internet**: Users must be online to make initial purchase
2. **7-Day Grace Period**: Offline premium access limited to 7 days
3. **Large Bundle Size**: Initial download ~5-6MB (includes all assets)
4. **Background Sync**: Requires app to be in foreground for sync

## 10. Troubleshooting

### iOS: "No provisioning profile"
- Ensure you're signed into Xcode with your Apple Developer account
- Enable automatic signing

### Android: "keystore not found"
- Ensure keystore path is correct in build.gradle
- Use forward slashes or escaped backslashes

### RevenueCat: "Product not found"
- Verify product IDs match exactly in store and RevenueCat
- Ensure products are in "Ready to Submit" status

### Offline: "Data not loading"
- Clear app data and re-login
- Check IndexedDB storage quota

## File Structure

```
├── dist/                          # Production build output
├── ios/                           # iOS native project
├── android/                       # Android native project
├── capacitor.config.ts            # Development config
├── capacitor.config.production.ts # Production config
└── src/
    ├── services/
    │   ├── revenueCatService.ts   # RevenueCat SDK wrapper
    │   ├── entitlementCache.ts    # Offline entitlement caching
    │   ├── syncEngine.ts          # Enhanced sync with retry
    │   └── db.ts                  # IndexedDB schema
    └── hooks/
        └── useSubscriptionStatus.tsx  # Subscription state hook
```
