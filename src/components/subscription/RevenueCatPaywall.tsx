import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Star, Loader2 } from 'lucide-react';
import { usePlatformPurchase } from '@/hooks/usePlatformPurchase';
import { useToast } from '@/hooks/use-toast';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';

interface RevenueCatPaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseComplete?: () => void;
}

export function RevenueCatPaywall({ 
  open, 
  onOpenChange, 
  onPurchaseComplete 
}: RevenueCatPaywallProps) {
  const { offerings, initiatePurchase, restorePurchases } = usePlatformPurchase();
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();
  
  const packages = offerings?.current?.availablePackages || [];
  
  const handlePurchase = async (pkg: PurchasesPackage) => {
    setLoading(pkg.identifier);
    
    try {
      // Use the unified purchase flow — it handles native vs web internally
      await initiatePurchase({
        planId: pkg.product.identifier,
        billingCycle: pkg.identifier.toLowerCase().includes('annual') || pkg.identifier.toLowerCase().includes('year') ? 'annual' : 'monthly',
      });
      
      onPurchaseComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      if (error?.cancelled || error?.userCancelled) {
        return;
      }
      // Error toast already handled by usePlatformPurchase
    } finally {
      setLoading(null);
    }
  };
  
  const handleRestore = async () => {
    setLoading('restore');
    
    try {
      await restorePurchases();
    } catch (error) {
      // Error toast already handled by restorePurchases
    } finally {
      setLoading(null);
    }
  };
  
  const getPackageDetails = (pkg: PurchasesPackage) => {
    const id = pkg.identifier.toLowerCase();
    
    if (id.includes('lifetime')) {
      return { 
        label: 'De por vida', 
        icon: Crown, 
        badge: 'Mejor valor',
        color: 'bg-amber-500' 
      };
    }
    if (id.includes('year') || id.includes('annual')) {
      return { 
        label: 'Anual', 
        icon: Star, 
        badge: '-20%',
        color: 'bg-primary' 
      };
    }
    return { 
      label: 'Mensual', 
      icon: Zap, 
      badge: null,
      color: 'bg-blue-500' 
    };
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            🚀 agrodeo Pro
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {[
            'Animales ilimitados',
            'Reportes avanzados',
            'Múltiples usuarios',
            'Soporte prioritario',
            'Sin publicidad'
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
        
        <div className="space-y-3">
          {packages.map((pkg) => {
            const details = getPackageDetails(pkg);
            const Icon = details.icon;
            const isLoading = loading === pkg.identifier;
            
            return (
              <Card 
                key={pkg.identifier}
                className="p-4 cursor-pointer hover:border-primary transition-colors"
                onClick={() => !loading && handlePurchase(pkg)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${details.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {details.label}
                        {details.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {details.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {pkg.product.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="font-bold">
                        {pkg.product.priceString}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full mt-4"
          onClick={handleRestore}
          disabled={loading === 'restore'}
        >
          {loading === 'restore' ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Restaurar compras
        </Button>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          El pago se carga a tu cuenta de Apple ID. La suscripción se renueva 
          automáticamente. Podés cancelar en cualquier momento desde Configuración 
          del App Store.
        </p>
      </DialogContent>
    </Dialog>
  );
}
