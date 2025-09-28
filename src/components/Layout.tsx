import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { OnboardingWrapper } from "@/components/onboarding/OnboardingWrapper";
import { AIChatButton } from "@/components/ai-chat/AIChatButton";

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
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-auto">
                <div className="container mx-auto px-4 py-6">
                  <div className="max-w-7xl mx-auto">
                    <div className="bg-card rounded-lg border p-6">
                      <div className="text-center py-12">
                        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
                        <p className="text-muted-foreground">
                          Selecciona una opción del menú lateral para comenzar
                        </p>
                      </div>
                    </div>
                  </div>
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