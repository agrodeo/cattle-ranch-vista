import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNavigation } from "./BottomNavigation";
import { AddOverlay } from "./AddOverlay";
import { SupportFooter } from "@/components/SupportFooter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";

export function MobileLayout() {
  const isMobile = useIsMobile();
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
    setShowAddOverlay(false);
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with hamburger menu */}
        <header className="bg-background border-b border-border p-4 sticky top-0 z-30">
          <SidebarTrigger className="text-ink-600 hover:text-ink-900 h-10 w-10 p-2">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </SidebarTrigger>
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
    </>
  );
}