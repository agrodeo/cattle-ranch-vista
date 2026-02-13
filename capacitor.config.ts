import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7240114acf5f4b1cbc891b5d3e2a51f9',
  appName: 'agrodeo',
  webDir: 'dist',
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
    limitsNavigationsToAppBoundDomains: false
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
