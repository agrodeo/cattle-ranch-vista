import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7240114acf5f4b1cbc891b5d3e2a51f9',
  appName: 'agrodeo',
  webDir: 'dist',
  server: {
    url: 'https://7240114a-cf5f-4b1c-bc89-1b5d3e2a51f9.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    // Allow offline access - let service worker handle caching
    errorPath: 'offline.html'
  },
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
    // Enable offline mode support
    limitsNavigationsToAppBoundDomains: false
  },
  android: {
    // Allow mixed content for offline service worker
    allowMixedContent: true
  }
};

export default config;