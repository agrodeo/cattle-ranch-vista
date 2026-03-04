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
          <div className="min-h-screen flex w-full bg-background relative">
            <div className="pointer-events-none absolute left-0 right-0 top-14 sm:top-16 border-t border-ink-200 z-20" />
            <AppSidebar />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 border-l border-ink-200">
              <Header />
              <ConnectivityBanner />
              <main className="flex-1 overflow-x-hidden overflow-y-auto pt-6">
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