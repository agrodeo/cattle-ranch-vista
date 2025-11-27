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
  
  async configure(userId?: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('RevenueCat: Not a native platform, skipping');
      return;
    }
    
    if (this.initialized) return;
    
    const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;
    if (!apiKey) {
      console.error('VITE_REVENUECAT_API_KEY not configured');
      return;
    }
    
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    
    await Purchases.configure({
      apiKey,
      appUserID: userId || undefined
    });
    
    this.initialized = true;
    console.log('RevenueCat configured successfully');
  }
  
  async login(userId: string): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.logIn({ appUserID: userId });
    return customerInfo;
  }
  
  async logout(): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.logOut();
    return customerInfo;
  }
  
  async getOfferings(): Promise<PurchasesOfferings> {
    return await Purchases.getOfferings();
  }
  
  async getCustomerInfo(): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  }
  
  async hasEntitlement(entitlementId: string): Promise<boolean> {
    const customerInfo = await this.getCustomerInfo();
    return customerInfo.entitlements.active[entitlementId]?.isActive ?? false;
  }
  
  async hasProAccess(): Promise<boolean> {
    return this.hasEntitlement(ENTITLEMENTS.PRO);
  }
  
  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.purchasePackage({ 
      aPackage: pkg 
    });
    return customerInfo;
  }
  
  async purchaseProduct(productId: string): Promise<CustomerInfo> {
    const offerings = await this.getOfferings();
    const packages = offerings.current?.availablePackages || [];
    
    const pkg = packages.find(p => p.product.identifier === productId);
    
    if (pkg) {
      return this.purchasePackage(pkg);
    }
    
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
  
  async restorePurchases(): Promise<CustomerInfo> {
    const { customerInfo } = await Purchases.restorePurchases();
    return customerInfo;
  }
  
  async setUserAttributes(attributes: Record<string, string | null>): Promise<void> {
    await Purchases.setAttributes(attributes);
  }
  
  addCustomerInfoUpdateListener(
    callback: (customerInfo: CustomerInfo) => void
  ): void {
    Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
      callback(info);
    });
  }
}

export const revenueCatService = new RevenueCatService();
