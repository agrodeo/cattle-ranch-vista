import { Purchases, type CustomerInfo, type PurchasesOfferings } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

export class IOSPurchaseService {
  private static initialized = false;

  static async initialize(userId: string) {
    if (Capacitor.getPlatform() !== 'ios') {
      console.log('Not iOS platform, skipping Purchases initialization');
      return;
    }
    
    if (this.initialized) {
      console.log('Purchases already initialized');
      return;
    }

    try {
      // TODO: Replace with your actual RevenueCat iOS public SDK key before building for App Store.
      const apiKey = 'appl_UBiuqNanQpBmPXTYgwPDzNSzznY';
      if (apiKey.includes('YOUR_REVENUECAT')) {
        console.error('[RevenueCat] iOS API key not configured in iosPurchaseService.ts');
        return;
      }

      await Purchases.configure({
        apiKey,
        appUserID: userId
      });
      
      this.initialized = true;
      console.log('Purchases initialized successfully for user:', userId);
    } catch (error) {
      console.error('Failed to initialize Purchases:', error);
      throw error;
    }
  }

  static async getOfferings(): Promise<PurchasesOfferings> {
    try {
      return await Purchases.getOfferings();
    } catch (error) {
      console.error('Failed to get offerings:', error);
      throw error;
    }
  }

  static async purchaseProduct(productId: string): Promise<CustomerInfo> {
    try {
      // First get the offerings to find the product
      const offerings = await Purchases.getOfferings();
      const products = offerings.current?.availablePackages || [];
      
      // Find the package with matching product identifier
      const pkg = products.find(p => p.product.identifier === productId);
      
      if (pkg) {
        // Purchase using package
        const result = await Purchases.purchasePackage({ 
          aPackage: pkg
        });
        console.log('Purchase successful:', result);
        return result.customerInfo;
      } else {
        // Fallback: get product by ID and purchase directly
        const { products: productList } = await Purchases.getProducts({
          productIdentifiers: [productId]
        });
        
        if (productList.length > 0) {
          const result = await Purchases.purchaseStoreProduct({ 
            product: productList[0]
          });
          console.log('Purchase successful:', result);
          return result.customerInfo;
        }
        
        throw new Error('Product not found');
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  static async restorePurchases(): Promise<CustomerInfo> {
    try {
      const result = await Purchases.restorePurchases();
      console.log('Purchases restored:', result);
      return result.customerInfo;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }

  static async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      const result = await Purchases.getCustomerInfo();
      return result.customerInfo;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      throw error;
    }
  }

  static async syncWithBackend(customerInfo: CustomerInfo, supabaseInvoke: (name: string, options: any) => Promise<any>) {
    try {
      await supabaseInvoke('sync-ios-purchase', {
        body: { 
          customerInfo: {
            originalAppUserId: customerInfo.originalAppUserId,
            activeSubscriptions: customerInfo.activeSubscriptions,
            allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
            entitlements: customerInfo.entitlements
          }
        }
      });
      console.log('Purchase synced with backend');
    } catch (error) {
      console.error('Failed to sync purchase with backend:', error);
    }
  }
}
