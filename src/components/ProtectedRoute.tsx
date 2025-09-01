import { Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { ReadOnlyModeModal } from "@/components/subscription/ReadOnlyModeModal";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresWriteAccess?: boolean;
}

const ProtectedRoute = ({ children, requiresWriteAccess = false }: ProtectedRouteProps) => {
  const { isAuthenticated, loading: authLoading } = useSupabaseAuth();
  const { subscriptionStatus, loading: subscriptionLoading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Show loading spinner while auth or subscription is being determined
  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
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