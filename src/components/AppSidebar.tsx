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
  Crown
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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
    title: "Tablero",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Animales",
    url: "/animals",
    icon: Users,
  },
  {
    title: "Corrales",
    url: "/corrales",
    icon: MapPin,
  },
  {
    title: "Actividades",
    url: "/activities",
    icon: Activity,
  },
  {
    title: "Finanzas",
    url: "/finances",
    icon: DollarSign,
  },
  {
    title: "Reportes",
    url: "/reports",
    icon: BarChart3,
  },
  {
    title: "Suscripción",
    url: "/subscription",
    icon: Crown,
  },
  {
    title: "Planes",
    url: "/plans",
    icon: UserCog,
  },
  {
    title: "Configuración",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar 
      collapsible={isMobile ? "offcanvas" : "icon"} 
      className="border-r border-ink-200 bg-white w-64"
    >
      <SidebarContent className="bg-white">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 sm:px-6 py-4 sm:py-8 border-b border-ink-100">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              {(!isCollapsed || isMobile) && (
                <span className="text-xl font-bold text-ink-900">Agrodeo</span>
              )}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2 sm:px-3 py-4">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-auto p-0">
                      <NavLink 
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative min-h-[44px]",
                          isActive 
                            ? "bg-brand-50 text-brand-900 border-l-3 border-brand-500" 
                            : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                        )}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {(!isCollapsed || isMobile) && <span>{item.title}</span>}
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