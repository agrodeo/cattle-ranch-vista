import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileLayout } from "@/components/mobile/MobileLayout";

const Layout = () => {
  const isMobile = useIsMobile();

  return (
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
  );
};

export default Layout;