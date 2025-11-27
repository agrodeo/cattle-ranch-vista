import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'ios' | 'android';

export const detectPlatform = (): Platform => {
  // Use Capacitor for accurate platform detection
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
  }
  
  // Fallback: Check user agent for web-based detection
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent) && 'standalone' in window.navigator) {
    return 'ios';
  }
  
  if (/android/.test(userAgent)) {
    return 'android';
  }
  
  return 'web';
};

export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatformStoreName = (platform: Platform): string => {
  switch (platform) {
    case 'ios': return 'App Store';
    case 'android': return 'Google Play';
    case 'web': return 'Mercado Pago';
  }
};

export const openPlatformStore = (platform: Platform, planId?: string) => {
  switch (platform) {
    case 'ios':
      // Open App Store with specific app/subscription
      window.open('https://apps.apple.com/app/agrodeo/id123456789', '_blank');
      break;
    case 'android':
      // Open Google Play with specific app/subscription
      window.open('https://play.google.com/store/apps/details?id=com.agrodeo.app', '_blank');
      break;
    case 'web':
      // Keep current web flow (Mercado Pago)
      break;
  }
};
