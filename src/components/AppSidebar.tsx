import { 
  Home, 
  Users, 
  Activity, 
  FileText, 
  DollarSign, 
  BarChart3,
  Settings,
  MapPin,
  UserCog,
  Crown,
  Trophy,
  LogOut
} from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "menu:dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "menu:animals",
    url: "/animals",
    icon: Users,
  },
  {
    title: "menu:corrals",
    url: "/corrales",
    icon: MapPin,
  },
  {
    title: "menu:activities",
    url: "/activities",
    icon: Activity,
  },
  {
    title: "menu:finance",
    url: "/finances",
    icon: DollarSign,
  },
  {
    title: "menu:reports",
    url: "/reports",
    icon: BarChart3,
  },
  {
    title: "menu:achievements",
    url: "/achievements",
    icon: Trophy,
  },
  {
    title: "menu:subscription",
    url: "/subscription",
    icon: Crown,
  },
  {
    title: "menu:settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { signOut } = useSupabaseAuth();
  const { state, setOpenMobile } = useSidebar();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isCollapsed = state === "collapsed";
  const { t } = useTranslation(['menu', 'common']);

  return (
    <Sidebar 
      collapsible={isMobile ? "offcanvas" : "none"} 
      className="border-r border-ink-200 bg-white overflow-hidden"
    >
      <SidebarContent className="bg-white overflow-hidden">
        {/* Header/Logo Section */}
        <div className={cn(
          "py-4 border-b border-ink-100",
          isCollapsed ? "px-0" : "px-3"
        )}>
          <div className={cn("flex items-center", isCollapsed ? "justify-center" : "pl-6")}>
            {(!isCollapsed || isMobile) ? (
              <span className="text-xl font-bold" style={{ color: 'hsl(142, 71%, 45%)' }}>agrodeo</span>
            ) : (
              <span className="text-lg font-bold" style={{ color: 'hsl(142, 71%, 45%)' }}>a</span>
            )}
          </div>
        </div>

        {/* Menu Items Section */}
        <SidebarGroup>
          <SidebarGroupContent className={cn("py-4", isCollapsed ? "px-0" : "px-3")}>
            <SidebarMenu className={cn("space-y-1", isCollapsed && "items-center")}>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-auto p-0">
                      <NavLink 
                        to={item.url}
                        onClick={() => { if (isMobile) setOpenMobile(false); }}
                        className={cn(
                          "flex items-center rounded-lg text-sm font-medium transition-all duration-200 relative min-h-[44px]",
                          isCollapsed ? "justify-center py-3" : "gap-3 px-3 py-2.5",
                          isActive 
                            ? isCollapsed 
                              ? "bg-brand-50 text-brand-900"
                              : "bg-brand-50 text-brand-900 border-l-3 border-brand-500"
                            : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {(!isCollapsed || isMobile) && <span>{t(item.title)}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Section */}
        <div className={cn("mt-auto border-t border-ink-100 py-4", isCollapsed ? "px-0 flex justify-center" : "px-3")}>
          <button
            onClick={() => {
              if (isMobile) setOpenMobile(false);
              signOut();
            }}
            className={cn(
              "flex items-center rounded-lg text-sm font-medium transition-all duration-200 w-full min-h-[44px] text-red-600 hover:bg-red-50",
              isCollapsed ? "justify-center py-3" : "gap-3 px-3 py-2.5"
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {(!isCollapsed || isMobile) && <span>{t('menu:logout')}</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}