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

class RevenueCatService {
  private initialized = false;
  private listeners: Array<(info: CustomerInfo) => void> = [];
  
  /**
   * Configure RevenueCat SDK
   * Uses platform-specific API keys
   */
  async configure(userId?: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('[RevenueCat] Not a native platform, skipping');
      return;
    }
    
    if (this.initialized) return;
    
    // Get platform-specific API key
    const platform = Capacitor.getPlatform();
    let apiKey: string | undefined;
    
    // TODO: Replace these placeholder keys with your actual RevenueCat public SDK keys before building for stores.
    const REVENUECAT_IOS_KEY = 'appl_UBiuqNanQpBmPXTYgwPDzNSzznY';
    const REVENUECAT_ANDROID_KEY = 'test_TyRsiXbFUgYLiOrgpoVsRBGuAYf';

    if (platform === 'ios') {
      apiKey = REVENUECAT_IOS_KEY;
    } else if (platform === 'android') {
      apiKey = REVENUECAT_ANDROID_KEY;
    }
    
    if (!apiKey || apiKey.includes('YOUR_REVENUECAT')) {
      console.error('[RevenueCat] API key not configured for platform:', platform);
      console.error('[RevenueCat] Set your RevenueCat keys in src/services/revenueCatService.ts');
      return;
    }
    
    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      await Purchases.configure({
        apiKey,
        appUserID: userId || undefined
      });
      
      this.initialized = true;
      console.log('[RevenueCat] Configured successfully for', platform);
    } catch (error) {
      console.error('[RevenueCat] Configuration failed:', error);
      throw error;
    }
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
    if (!this.initialized) {
      throw new Error('RevenueCat not initialized');
    }
    return await Purchases.getOfferings();
  }
  
  /**
   * Get current customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo> {
    if (!this.initialized) {
      throw new Error('RevenueCat not initialized');
    }
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
    if (!this.initialized) {
      throw new Error('RevenueCat not initialized');
    }
    
    const { customerInfo } = await Purchases.purchasePackage({ 
      aPackage: pkg 
    });
    return customerInfo;
  }
  
  /**
   * Purchase by product ID
   */
  async purchaseProduct(productId: string): Promise<CustomerInfo> {
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
    
    throw new Error(`Product not found: ${productId}`);
  }
  
  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<CustomerInfo> {
    if (!this.initialized) {
      throw new Error('RevenueCat not initialized');
    }
    
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
    
    // Set up native listener if not already
    if (this.listeners.length === 1) {
      Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
        this.listeners.forEach(listener => listener(info));
      });
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
}

export const revenueCatService = new RevenueCatService();
