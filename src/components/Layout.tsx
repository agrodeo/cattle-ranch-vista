import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { OnboardingWrapper } from "@/components/onboarding/OnboardingWrapper";
import { AIChatButton } from "@/components/ai-chat/AIChatButton";
import { ConnectivityBanner } from "@/components/ConnectivityBanner";
import { Outlet } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { setupAutoSync, setCabañaId, cleanupAutoSync } from "@/services/autoSync";

const Layout = () => {
  const isMobile = useIsMobile();
  const { currentUser } = useSupabaseAuth();

  // Initialize auto-sync when user is authenticated
  useEffect(() => {
    if (currentUser?.cabañaId) {
      setupAutoSync(currentUser.cabañaId);
      setCabañaId(currentUser.cabañaId);
    }

    return () => {
      cleanupAutoSync();
    };
  }, [currentUser?.cabañaId]);

  return (
    <OnboardingWrapper>
      <SidebarProvider defaultOpen={!isMobile}>
        {isMobile ? (
          <MobileLayout />
        ) : (
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <Header />
              <ConnectivityBanner />
              <main className="flex-1 overflow-auto pt-6">
                <Outlet />
              </main>
            </div>
          </div>
        )}
        {!isMobile && <AIChatButton />}
      </SidebarProvider>
    </OnboardingWrapper>
  );
};

export default Layout;