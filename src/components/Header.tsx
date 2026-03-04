import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { LogOut, Building2, HelpCircle, Menu, Cloud, CloudOff } from "lucide-react";
import { useSupport } from "@/components/SupportProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useConnectivity } from "@/services/connectivity";
import { db } from "@/services/db";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SyncCenter } from "@/components/SyncCenter";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { currentUser, signOut } = useSupabaseAuth();
  const support = useSupport();
  const { t } = useTranslation(['menu', 'common']);
  const { isOnline } = useConnectivity();
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

  const handleSignOut = () => {
    signOut();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Sidebar trigger only needed on mobile, but mobile uses MobileLayout */}
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Sync Status */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                {isOnline ? (
                  <Cloud className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <CloudOff className="h-5 w-5 text-amber-500" />
                )}
                {pendingCount > 0 && (
                  <Badge 
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {isOnline ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5 text-amber-500" />}
                  {t('common:sync.syncCenter')}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <SyncCenter />
              </div>
            </SheetContent>
          </Sheet>

          {/* Language Switcher */}
          <LanguageSwitcher variant="compact" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-ink-50">
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarFallback className="bg-brand-100 text-brand-800 font-medium text-xs sm:text-sm">
                    {currentUser?.fullName ? getInitials(currentUser.fullName) : <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 sm:w-64 p-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1 px-2 py-1.5">
                  <p className="text-sm font-semibold leading-none text-ink-900">
                    {currentUser?.fullName || t('common:user')}
                  </p>
                  <p className="text-xs leading-none text-ink-600">
                    {currentUser?.email || currentUser?.username}
                  </p>
                  <p className="text-xs leading-none text-ink-500">
                    {currentUser?.cabañaName || t('common:noHerd')} • {currentUser?.role || t('common:noRole')}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => support.open({ title: "Consulta desde menú de usuario" })} className="text-primary focus:text-primary focus:bg-primary/10">
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>{t('common:help')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('menu:logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}