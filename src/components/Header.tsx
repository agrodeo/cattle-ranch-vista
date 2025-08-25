import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { LogOut, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const { currentUser, signOut } = useSupabaseAuth();

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
    <header className="border-b border-ink-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-ink-600 hover:text-ink-900" />
        </div>
        
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-ink-50">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-brand-100 text-brand-800 font-medium">
                    {currentUser?.fullName ? getInitials(currentUser.fullName) : <Building2 className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1 px-2 py-1.5">
                  <p className="text-sm font-semibold leading-none text-ink-900">
                    {currentUser?.fullName || "Usuario"}
                  </p>
                  <p className="text-xs leading-none text-ink-600">
                    {currentUser?.email || currentUser?.username}
                  </p>
                  <p className="text-xs leading-none text-ink-500">
                    {currentUser?.cabañaName || "Sin cabaña"} • {currentUser?.role || 'Sin rol'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};