import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { BottomNavigation } from "./BottomNavigation";
import { AddOverlay } from "./AddOverlay";
import { SupportFooter } from "@/components/SupportFooter";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Menu, Cloud, CloudOff } from "lucide-react";
import { AIChatButton } from "@/components/ai-chat/AIChatButton";
import { NotificationBell } from "./NotificationBell";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useConnectivity } from "@/services/connectivity";
import { db } from "@/services/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SyncCenter } from "@/components/SyncCenter";
import { useTranslation } from "react-i18next";

export function MobileLayout() {
  const isMobile = useIsMobile();
  const { currentUser } = useSupabaseAuth();
  const { isOnline } = useConnectivity();
  const { t } = useTranslation('common');
  const [showAddOverlay, setShowAddOverlay] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const count = await db.outbox.where('status').anyOf(['pending', 'failed']).count();
        setPendingCount(count);
      } catch (error) {
        console.error('Error loading pending count:', error);
      }
    };

    loadPendingCount();
    const interval = setInterval(loadPendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

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
        {/* Mobile header with hamburger menu, cabaña name, sync status, and notifications */}
        <header className="bg-background border-b border-border p-4 sticky top-0 z-30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <SidebarTrigger className="text-ink-600 hover:text-ink-900 h-9 w-9 p-2 shrink-0">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Toggle sidebar</span>
              </SidebarTrigger>
              
              {currentUser && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate leading-tight">
                    {currentUser.cabañaName || 'agrodeo'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {currentUser.fullName || 'Usuario'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {/* Sync Status Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    {isOnline ? (
                      <Cloud className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <CloudOff className="h-4 w-4 text-amber-500" />
                    )}
                    {pendingCount > 0 && (
                      <Badge 
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                      >
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      {isOnline ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5 text-amber-500" />}
                      {t('sync.syncCenter')}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <SyncCenter />
                  </div>
                </SheetContent>
              </Sheet>

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