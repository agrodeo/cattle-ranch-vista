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
  Trophy
} from "lucide-react";
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
  const { state } = useSidebar();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isCollapsed = state === "collapsed";
  const { t } = useTranslation(['menu', 'common']);

  return (
    <Sidebar 
      collapsible={isMobile ? "offcanvas" : "icon"} 
      className="border-r border-ink-200 bg-white"
      style={{ width: isCollapsed ? '64px' : '256px' }}
    >
      <SidebarContent className="bg-white">
        {/* Header/Logo Section */}
        <div className={cn(
          "py-4 border-b border-ink-100",
          isCollapsed ? "px-2" : "px-3"
        )}>
          <div className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "gap-3"
          )}>
            {(!isCollapsed || isMobile) && (
              <span className="text-xl font-bold text-ink-900">agrodeo</span>
            )}
          </div>
        </div>

        {/* Menu Items Section */}
        <SidebarGroup>
          <SidebarGroupContent className={cn("py-4", isCollapsed ? "px-2" : "px-3")}>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-auto p-0">
                      <NavLink 
                        to={item.url}
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
      </SidebarContent>
    </Sidebar>
  );
}