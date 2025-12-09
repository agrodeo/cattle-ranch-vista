import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  Calendar, 
  RefreshCw, 
  ExternalLink,
  HelpCircle,
  Mail,
  Loader2
} from 'lucide-react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { revenueCatService } from '@/services/revenueCatService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomerCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerCenter({ open, onOpenChange }: CustomerCenterProps) {
  const { 
    isPro, 
    customerInfo, 
    activeSubscriptions,
    expirationDate,
    refreshCustomerInfo 
  } = useEntitlements();
  const [restoring, setRestoring] = useState(false);
  const { toast } = useToast();
  
  const handleRestore = async () => {
    setRestoring(true);
    try {
      await revenueCatService.restorePurchases();
      await refreshCustomerInfo();
      toast({
        title: "Compras restauradas",
        description: "Se verificaron tus compras anteriores",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se encontraron compras anteriores",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };
  
  const openManageSubscriptions = () => {
    window.open('https://apps.apple.com/account/subscriptions', '_blank');
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Centro de Suscripción</DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className={`h-5 w-5 ${isPro ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <span className="font-semibold text-lg">
                  {isPro ? 'agrodeo Pro' : 'Plan Gratuito'}
                </span>
              </div>
              <Badge variant={isPro ? 'default' : 'secondary'}>
                {isPro ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            
            {isPro && expirationDate && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Vence: {formatDate(expirationDate)}</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        {activeSubscriptions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Suscripciones Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {activeSubscriptions.map((sub) => (
                  <li key={sub} className="text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {sub}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleRestore}
            disabled={restoring}
          >
            {restoring ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Restaurar Compras
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={openManageSubscriptions}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Administrar Suscripción
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => window.open('mailto:soporte@agrodeo.farm', '_blank')}
          >
            <Mail className="h-4 w-4 mr-2" />
            Contactar Soporte
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => window.open('/terms', '_blank')}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Términos y Condiciones
          </Button>
        </div>
        
        {customerInfo?.originalAppUserId && (
          <p className="text-xs text-muted-foreground text-center">
            ID: {customerInfo.originalAppUserId}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
