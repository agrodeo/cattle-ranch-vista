export type Platform = 'web' | 'ios' | 'android';

export const detectPlatform = (): Platform => {
  // Check if running in a mobile app webview
  const userAgent = navigator.userAgent.toLowerCase();
  
  // iOS detection
  if (/iphone|ipad|ipod/.test(userAgent) && 'standalone' in window.navigator) {
    return 'ios';
  }
  
  // Android detection  
  if (/android/.test(userAgent) && window.location.hostname !== 'localhost') {
    // Additional check for Android app wrapper
    if ((window as any).AndroidInterface || (window as any).webkit?.messageHandlers) {
      return 'android';
    }
  }
  
  // Default to web
  return 'web';
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
