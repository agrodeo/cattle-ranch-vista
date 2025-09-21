import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { OnboardingWrapper } from "@/components/onboarding/OnboardingWrapper";

const Layout = () => {
  const isMobile = useIsMobile();

  return (
    <OnboardingWrapper>
      <SidebarProvider defaultOpen={!isMobile}>
        {isMobile ? (
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <MobileLayout />
          </div>
        ) : (
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <MobileLayout />
          </div>
        )}
      </SidebarProvider>
    </OnboardingWrapper>
  );
};

export default Layout;