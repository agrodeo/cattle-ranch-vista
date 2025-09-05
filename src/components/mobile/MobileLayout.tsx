import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNavigation } from "./BottomNavigation";
import { AddOverlay } from "./AddOverlay";
import { SupportFooter } from "@/components/SupportFooter";

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
    // For now, just close the overlay. Individual flows will be implemented separately
    setShowAddOverlay(false);
    console.log('Selected flow:', flow);
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
        <main className="flex-1 bg-background overflow-x-hidden pb-20">
          <Outlet />
        </main>
      </div>
      
      <BottomNavigation onAddClick={handleAddClick} />
      
      <AddOverlay
        isOpen={showAddOverlay}
        onClose={handleCloseOverlay}
        onSelectFlow={handleSelectFlow}
      />
    </>
  );
}