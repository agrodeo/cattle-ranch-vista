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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
    title: "Usuarios",
    url: "/users",
    icon: UserCog,
  },
  {
    title: "Servicios",
    url: "/services",
    icon: FileText,
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
    title: "Configuración",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-4 py-6">
            {!isCollapsed && "AgroDeo"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}