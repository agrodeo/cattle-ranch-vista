import { CapacitorConfig } from '@capacitor/cli';

/**
 * PRODUCTION Capacitor Configuration
 * 
 * Use this config for App Store / Play Store builds.
 * The app loads from the local bundle (dist/) for true offline boot.
 * 
 * To use this config:
 * 1. npm run build
 * 2. Copy this file to capacitor.config.ts (replace the dev config)
 * 3. npx cap sync
 * 4. Build for iOS/Android
 */
const config: CapacitorConfig = {
  appId: 'com.despia.agrodeo',
  appName: 'AgroDeo',
  webDir: 'dist',
  // NO server.url - loads from local bundle for true offline support
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0b1220",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: false,
    // Required for iOS App Store
    scheme: 'agrodeo'
  },
  android: {
    allowMixedContent: false,
    // Required for Play Store
    backgroundColor: '#0b1220'
  }
};

export default config;
