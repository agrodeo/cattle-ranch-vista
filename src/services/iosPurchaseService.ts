import { CapacitorPurchases, type CustomerInfo, type PurchasesOfferings } from '@capgo/capacitor-purchases';
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
      const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;
      if (!apiKey) {
        console.error('VITE_REVENUECAT_API_KEY not configured');
        return;
      }

      await CapacitorPurchases.setUpPurchases({
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
      const result = await CapacitorPurchases.getOfferings();
      return result.offerings;
    } catch (error) {
      console.error('Failed to get offerings:', error);
      throw error;
    }
  }

  static async purchaseProduct(productId: string): Promise<CustomerInfo> {
    try {
      const result = await CapacitorPurchases.purchaseStoreProduct({ 
        identifier: productId,
        offeringIdentifier: 'default'
      });
      console.log('Purchase successful:', result);
      return result.customerInfo;
    } catch (error: any) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  static async restorePurchases(): Promise<CustomerInfo> {
    try {
      const result = await CapacitorPurchases.restorePurchases();
      console.log('Purchases restored:', result);
      return result.customerInfo;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }

  static async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      const result = await CapacitorPurchases.getCustomerInfo();
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
