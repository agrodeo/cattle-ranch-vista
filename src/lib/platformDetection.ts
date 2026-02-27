import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'ios' | 'android';

/**
 * Detect platform for general UI purposes.
 * For payment decisions, always use isNativeApp() + getNativePlatform().
 */
export const detectPlatform = (): Platform => {
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
  }
  // On web, always return 'web' — no user-agent fallback for payment safety
  return 'web';
};

/**
 * Strict check: is this running inside a native Capacitor shell?
 * Use this for all payment/purchase routing decisions.
 */
export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Get the native platform only when running natively.
 * Returns null on web.
 */
export const getNativePlatform = (): 'ios' | 'android' | null => {
  if (!Capacitor.isNativePlatform()) return null;
  const p = Capacitor.getPlatform();
  if (p === 'ios') return 'ios';
  if (p === 'android') return 'android';
  return null;
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
      window.open('https://apps.apple.com/app/agrodeo/id123456789', '_blank');
      break;
    case 'android':
      window.open('https://play.google.com/store/apps/details?id=com.agrodeo.app', '_blank');
      break;
    case 'web':
      break;
  }
};
