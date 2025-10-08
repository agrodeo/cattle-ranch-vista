import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { OnboardingWrapper } from "@/components/onboarding/OnboardingWrapper";
import { AIChatButton } from "@/components/ai-chat/AIChatButton";
import { Outlet } from "react-router-dom";

const Layout = () => {
  const isMobile = useIsMobile();

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
              <main className="flex-1 overflow-auto">
                <div className="container mx-auto p-4 md:p-6 max-w-[1600px]">
                  <Outlet />
                </div>
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