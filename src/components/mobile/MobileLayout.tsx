import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNavigation } from "./BottomNavigation";
import { AddOverlay } from "./AddOverlay";
import { SupportFooter } from "@/components/SupportFooter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu, Home } from "lucide-react";
import { AIChatButton } from "@/components/ai-chat/AIChatButton";
import { NotificationBell } from "./NotificationBell";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export function MobileLayout() {
  const isMobile = useIsMobile();
  const { currentUser } = useSupabaseAuth();
  const [showAddOverlay, setShowAddOverlay] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);

  const handleAddClick = () => {
    setShowAddOverlay(true);
  };

  const handleCloseOverlay = () => {
    setShowAddOverlay(false);
    setSelectedFlow(null);
  };

  const handleSelectFlow = (flow: string) => {
    setSelectedFlow(flow);
  };

  if (!isMobile) {
    return (
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-3 sm:p-4 md:p-6 bg-background overflow-x-hidden">
          <Outlet />
        </main>
        <SupportFooter />
      </div>
    );
  }

  return (
    <>
      {/* AppSidebar needed for mobile offcanvas */}
      <AppSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Mobile header with hamburger menu, cabaña name, and notifications */}
        <header className="bg-background border-b border-border p-4 sticky top-0 z-30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <SidebarTrigger className="text-ink-600 hover:text-ink-900 h-9 w-9 p-2 shrink-0">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle sidebar</span>
              </SidebarTrigger>
              
              <div className="flex items-center gap-1.5 min-w-0">
                <Home className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {currentUser?.cabañaName || 'Mi Cabaña'}
                </span>
              </div>
            </div>
            
            <div className="shrink-0">
              <NotificationBell />
            </div>
          </div>
        </header>
        
        <main className="flex-1 bg-background overflow-x-hidden pb-20">
          <Outlet />
        </main>
      </div>
      
      <BottomNavigation onAddClick={handleAddClick} />
      
      <AddOverlay
        isOpen={showAddOverlay}
        onClose={handleCloseOverlay}
        onSelectFlow={handleSelectFlow}
        selectedFlow={selectedFlow}
      />
      
      <AIChatButton />
    </>
  );
}