/**
 * RevenueCat Service - Enhanced for Offline Support
 * 
 * This service wraps the RevenueCat SDK with:
 * - Platform-specific API key handling
 * - Offline-aware initialization
 * - Error handling with fallbacks
 */

import { 
  Purchases, 
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage 
} from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { ENTITLEMENTS } from '@/config/revenueCatProducts';
import { isDespiaRuntime, isRevenueCatCapacitorAvailable } from '@/lib/platformDetection';

class RevenueCatService {
  private initialized = false;
  private configureFailed = false;
  private configuring: Promise<void> | null = null;
  private listeners: Array<(info: CustomerInfo) => void> = [];
  
  /**
   * Ensure RevenueCat is initialized before calling purchase/offerings methods.
   * Throws with actionable messages on failure.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    
    // In Despia runtime, the Capacitor Purchases plugin is intentionally not used.
    if (isDespiaRuntime()) {
      throw new Error('RevenueCat Capacitor SDK is disabled in Despia runtime. Use the native Despia purchase bridge.');
    }

    if (!Capacitor.isNativePlatform()) {
      throw new Error('RevenueCat is only available on native platforms (iOS/Android).');
    }

    if (!isRevenueCatCapacitorAvailable()) {
      throw new Error('RevenueCat Purchases plugin is not available in this native runtime.');
    }
    
    console.log('[RevenueCat] Not initialized, attempting auto-configure...');
    await this.configure();
    
    if (!this.initialized) {
      throw new Error(
        'RevenueCat SDK failed to initialize. ' +
        'Please check your internet connection and restart the app.'
      );
    }
  }
  
  /**
   * Configure RevenueCat SDK
   * Uses platform-specific API keys
   * Returns true if configuration succeeded, false otherwise.
   */
  async configure(userId?: string): Promise<boolean> {
    // In Despia runtime, skip Capacitor plugin configuration entirely.
    // RevenueCat is managed by the native bridge (despia('revenuecat://...')).
    if (isDespiaRuntime()) {
      console.log('[RevenueCat] Despia runtime — skipping Capacitor SDK configure');
      this.initialized = true;
      this.configureFailed = false;
      return true;
    }
    
    if (!Capacitor.isNativePlatform()) {
      console.log('[RevenueCat] Not a native platform, skipping');
      return false;
    }
    
    if (this.initialized) return true;
    
    // Prevent concurrent configuration attempts
    if (this.configuring) {
      await this.configuring;
      return this.initialized;
    }
    
    // Get platform-specific API key — check Capacitor first, fall back to Despia detection
    let platform = Capacitor.getPlatform();
    
    // If Capacitor reports 'web' but we're in Despia, infer from user agent
    if (platform === 'web' && isDespiaRuntime()) {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) platform = 'ios';
      else if (/android/.test(ua)) platform = 'android';
    }
    
    let apiKey: string | undefined;
    
    const REVENUECAT_IOS_KEY = 'appl_UBiuqNanQpBmPXTYgwPDzNSzznY';
    const REVENUECAT_ANDROID_KEY = 'goog_zhWmiLXrHhfKmiDyXgeryOVODhJ';

    if (platform === 'ios') {
      apiKey = REVENUECAT_IOS_KEY;
    } else if (platform === 'android') {
      apiKey = REVENUECAT_ANDROID_KEY;
    }
    
    if (!apiKey || apiKey.includes('YOUR_REVENUECAT')) {
      const msg = `[RevenueCat] API key not configured for platform: ${platform}`;
      console.error(msg);
      this.configureFailed = true;
      return false;
    }
    
    this.configuring = (async () => {
      try {
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
        
        await Purchases.configure({
          apiKey,
          appUserID: userId || undefined
        });
        
        this.initialized = true;
        this.configureFailed = false;
        console.log('[RevenueCat] Configured successfully for', platform);
      } catch (error: any) {
        this.configureFailed = true;
        console.error('[RevenueCat] Configuration failed:', {
          message: error?.message,
          code: error?.code,
          domain: error?.domain,
          raw: JSON.stringify(error)
        });
        // Re-throw so callers know configuration failed
        throw error;
      } finally {
        this.configuring = null;
      }
    })();
    
    try {
      await this.configuring;
    } catch {
      // Error already logged above
    }
    return this.initialized;
  }
  
  /**
   * Log in a user (identifies them to RevenueCat)
   */
  async login(userId: string): Promise<CustomerInfo> {
    if (!this.initialized) {
      await this.configure(userId);
    }
    
    const { customerInfo } = await Purchases.logIn({ appUserID: userId });
    return customerInfo;
  }
  
  /**
   * Log out (resets to anonymous)
   */
  async logout(): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.logOut();
    return customerInfo;
  }
  
  /**
   * Get available offerings
   */
  async getOfferings(): Promise<PurchasesOfferings> {
    await this.ensureInitialized();
    return await Purchases.getOfferings();
  }
  
  /**
   * Get current customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo> {
    await this.ensureInitialized();
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  }
  
  /**
   * Check if user has a specific entitlement
   */
  async hasEntitlement(entitlementId: string): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return customerInfo.entitlements.active[entitlementId]?.isActive ?? false;
    } catch (error) {
      console.error('[RevenueCat] Failed to check entitlement:', error);
      return false;
    }
  }
  
  /**
   * Check if user has Pro access
   */
  async hasProAccess(): Promise<boolean> {
    return this.hasEntitlement(ENTITLEMENTS.PRO);
  }
  
  /**
   * Purchase a package
   */
  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    await this.ensureInitialized();
    console.log('[RevenueCat] purchasePackage:', pkg.identifier);
    
    const { customerInfo } = await Purchases.purchasePackage({ 
      aPackage: pkg 
    });
    return customerInfo;
  }
  
  /**
   * Purchase by product ID
   */
  async purchaseProduct(productId: string): Promise<CustomerInfo> {
    if (!productId) {
      throw new Error('Product ID is required for purchase');
    }
    
    await this.ensureInitialized();
    console.log('[RevenueCat] purchaseProduct:', productId);
    
    const offerings = await this.getOfferings();
    const packages = offerings.current?.availablePackages || [];
    
    // Try to find in offerings first
    const pkg = packages.find(p => p.product.identifier === productId);
    
    if (pkg) {
      return this.purchasePackage(pkg);
    }
    
    // Fallback to direct product purchase
    const { products } = await Purchases.getProducts({
      productIdentifiers: [productId]
    });
    
    if (products.length > 0) {
      const { customerInfo } = await Purchases.purchaseStoreProduct({
        product: products[0]
      });
      return customerInfo;
    }
    
    throw new Error(`Product not found in store: ${productId}. Please check your RevenueCat configuration.`);
  }
  
  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<CustomerInfo> {
    await this.ensureInitialized();
    
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo;
  }
  
  /**
   * Set user attributes
   */
  async setUserAttributes(attributes: Record<string, string | null>): Promise<void> {
    if (!this.initialized) return;
    await Purchases.setAttributes(attributes);
  }
  
  /**
   * Add listener for customer info updates
   * Returns cleanup function
   */
  addCustomerInfoUpdateListener(
    callback: (customerInfo: CustomerInfo) => void
  ): () => void {
    this.listeners.push(callback);
    
    // Set up native listener if not already — only when SDK is initialized
    if (this.listeners.length === 1 && this.initialized) {
      try {
        Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
          this.listeners.forEach(listener => listener(info));
        });
      } catch (error) {
        console.error('[RevenueCat] Failed to add listener:', error);
      }
    }
    
    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Check if RevenueCat is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if configuration has failed (useful for UI)
   */
  hasConfigFailed(): boolean {
    return this.configureFailed;
  }
}

export const revenueCatService = new RevenueCatService();
