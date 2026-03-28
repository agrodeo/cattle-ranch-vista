import { Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { ReadOnlyModeModal } from "@/components/subscription/ReadOnlyModeModal";
import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConnectivity } from "@/services/connectivity";
import { Progress } from "@/components/ui/progress";
import { db } from "@/services/db";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresWriteAccess?: boolean;
}

/** Clean loading screen with animated progress bar */
const LoadingScreen = ({ message }: { message: string }) => {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(45), 400);
    const t2 = setTimeout(() => setProgress(70), 900);
    const t3 = setTimeout(() => setProgress(85), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5 w-56">
        {/* Progress bar */}
        <Progress value={progress} className="h-1.5 w-full bg-muted" />

        {/* Message */}
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, requiresWriteAccess = false }: ProtectedRouteProps) => {
  const { isAuthenticated, loading: authLoading } = useSupabaseAuth();
  const { subscriptionStatus, loading: subscriptionLoading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { t } = useTranslation('common');
  const { isOnline } = useConnectivity();

  // 3-second timeout so subscription never blocks UI indefinitely
  const [subTimedOut, setSubTimedOut] = useState(false);
  useEffect(() => {
    if (!subscriptionLoading) return;
    const timer = setTimeout(() => setSubTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, [subscriptionLoading]);

  // Show branded loading while auth is being determined
  if (authLoading) {
    return <LoadingScreen message={t('loading')} />;
  }

  // Redirect to auth if not authenticated — BUT NEVER when offline with a cached session
  if (!isAuthenticated) {
    // If offline, check for cached session before redirecting
    if (!isOnline) {
      // The auth provider should have loaded from cache already.
      // If still not authenticated offline, show offline message instead of redirecting.
      return (
        <>
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>{t('sync.offline')}</span>
          </div>
          <div className="pt-10 flex items-center justify-center min-h-screen">
            <p className="text-muted-foreground text-sm">{t('sync.offline')}</p>
          </div>
        </>
      );
    }
    return <Navigate to="/auth" replace />;
  }

  // When offline, allow access but show offline indicator
  if (!isOnline) {
    return (
      <>
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

  // Wait for subscription only if online AND not timed out
  if (subscriptionLoading && !subTimedOut) {
    return <LoadingScreen message={t('loading')} />;
  }

  // Check if user is in read-only mode and trying to access write-required routes
  if (requiresWriteAccess && subscriptionStatus?.isReadOnly) {
    return (
      <>
        <LoadingScreen message="Verificando acceso..." />
        
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
