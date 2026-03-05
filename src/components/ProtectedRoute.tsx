import { Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { ReadOnlyModeModal } from "@/components/subscription/ReadOnlyModeModal";
import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConnectivity } from "@/services/connectivity";
import { Progress } from "@/components/ui/progress";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresWriteAccess?: boolean;
}

/** Branded loading screen with animated progress bar */
const BrandedLoadingScreen = ({ message }: { message: string }) => {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(45), 400);
    const t2 = setTimeout(() => setProgress(70), 900);
    const t3 = setTimeout(() => setProgress(85), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 w-64">
        {/* Brand mark */}
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-3xl font-display font-bold text-primary-foreground tracking-tight">a</span>
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-brand-gradient opacity-20 blur-lg -z-10 animate-pulse" />
        </div>

        {/* App name */}
        <h1 className="text-xl font-display font-semibold text-foreground tracking-tight">agrodeo</h1>

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
    return <BrandedLoadingScreen message={t('loading')} />;
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
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
    return <BrandedLoadingScreen message={t('loading')} />;
  }

  // Check if user is in read-only mode and trying to access write-required routes
  if (requiresWriteAccess && subscriptionStatus?.isReadOnly) {
    return (
      <>
        <BrandedLoadingScreen message="Verificando acceso..." />
        
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
