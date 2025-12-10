import { Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { ReadOnlyModeModal } from "@/components/subscription/ReadOnlyModeModal";
import { useState } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresWriteAccess?: boolean;
}

const ProtectedRoute = ({ children, requiresWriteAccess = false }: ProtectedRouteProps) => {
  const { isAuthenticated, loading: authLoading, isOffline } = useSupabaseAuth();
  const { subscriptionStatus, loading: subscriptionLoading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { t } = useTranslation('common');

  // Show loading spinner while auth is being determined
  // Skip subscription loading check when offline since it requires network
  if (authLoading || (!isOffline && subscriptionLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // When offline, allow access but show offline indicator
  // Skip subscription checks when offline since they require network
  if (isOffline) {
    return (
      <>
        {/* Offline banner at top of protected content */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>{t('sync.offline')}</span>
        </div>
        <div className="pt-10">
          {children}
        </div>
      </>
    );
  }

  // Check if user is in read-only mode and trying to access write-required routes
  if (requiresWriteAccess && subscriptionStatus?.isReadOnly) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">Verificando acceso...</p>
          </div>
        </div>
        
        <ReadOnlyModeModal 
          open={true}
          onOpenChange={() => {}}
          onUpgrade={() => setShowUpgradeModal(true)}
        />
      </>
    );
  }

  // Render protected content
  return <>{children}</>;
};

export default ProtectedRoute;
