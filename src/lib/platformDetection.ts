import { Capacitor } from '@capacitor/core';

export type Platform = 'web' | 'ios' | 'android';

const inferPlatformFromNavigator = (): 'ios' | 'android' | null => {
  if (typeof navigator === 'undefined') return null;

  const ua = navigator.userAgent?.toLowerCase() || '';
  const uaDataPlatform = ((navigator as any).userAgentData?.platform as string | undefined)?.toLowerCase() || '';
  const navPlatform = navigator.platform?.toLowerCase() || '';

  const isAndroid =
    /android/.test(ua) ||
    uaDataPlatform.includes('android') ||
    navPlatform.includes('android') ||
    navPlatform.includes('linux arm');

  if (isAndroid) return 'android';

  const isiOS =
    /iphone|ipad|ipod/.test(ua) ||
    uaDataPlatform.includes('ios') ||
    uaDataPlatform.includes('iphone') ||
    uaDataPlatform.includes('ipad') ||
    navPlatform.includes('iphone') ||
    navPlatform.includes('ipad') ||
    navPlatform.includes('ipod') ||
    // iPadOS can report itself as MacIntel with touch support
    (navPlatform === 'macintel' && navigator.maxTouchPoints > 1);

  if (isiOS) return 'ios';

  return null;
};

/**
 * Detect if running inside a Despia native container.
 * Despia serves from http://localhost and may expose window.bundleNumber.
 */
export const isDespiaRuntime = (): boolean => {
  try {
    if (typeof window !== 'undefined') {
      if ((window as any).bundleNumber != null) return true;
      if (window.location.hostname === 'localhost' && window.location.port === '') return true;
    }
  } catch {}
  return false;
};

/**
 * Infer the platform when running inside Despia.
 */
export const getDespiaPlatform = (): 'ios' | 'android' | null => {
  if (!isDespiaRuntime()) return null;
  return inferPlatformFromNavigator();
};

/**
 * Detect platform for general UI purposes.
 * Checks both Capacitor and Despia runtimes.
 */
export const detectPlatform = (): Platform => {
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
  }

  const despiaPlatform = getDespiaPlatform();
  if (despiaPlatform) return despiaPlatform;

  return 'web';
};

/**
 * Strict check: is this running inside a native shell (Capacitor OR Despia)?
 * Use this for all payment/purchase routing decisions.
 */
export const isNativeApp = (): boolean => {
  return Capacitor.isNativePlatform() || isDespiaRuntime();
};

/**
 * Get the native platform only when running natively (Capacitor or Despia).
 * Returns null on web.
 */
export const getNativePlatform = (): 'ios' | 'android' | null => {
  if (Capacitor.isNativePlatform()) {
    const p = Capacitor.getPlatform();
    if (p === 'ios') return 'ios';
    if (p === 'android') return 'android';
    return null;
  }

  return getDespiaPlatform();
};

/**
 * Check if Capacitor native bridge is truly available (for RevenueCat calls).
 */
export const isCapacitorNative = (): boolean => {
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
      window.open('https://apps.apple.com/app/agrodeo/id123456789', '_blank');
      break;
    case 'android':
      window.open('https://play.google.com/store/apps/details?id=com.agrodeo.app', '_blank');
      break;
    case 'web':
      break;
  }
};
