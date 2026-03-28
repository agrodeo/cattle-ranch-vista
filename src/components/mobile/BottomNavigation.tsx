import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Plus, BarChart3, Fence, PieChart, Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cowHead } from "@lucide/lab";

interface BottomNavigationProps {
  onAddClick: () => void;
}

export function BottomNavigation({ onAddClick }: BottomNavigationProps) {
  const { t } = useTranslation(['menu', 'common']);
  const location = useLocation();

  const tabs = [
    {
      key: 'home',
      label: t('home'),
      path: '/',
      icon: Home,
    },
    {
      key: 'animals',
      label: t('animals'),
      path: '/animals',
      icon: (props: any) => <Icon iconNode={cowHead} {...props} />,
    },
    {
      key: 'add',
      label: 'Cargar',
      path: '',
      icon: Plus,
      isAction: true,
    },
    {
      key: 'corrales',
      label: t('corrals'),
      path: '/corrales',
      icon: Fence,
    },
    {
      key: 'reports',
      label: t('reports'),
      path: '/reports',
      icon: PieChart,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '/dashboard')) {
      return true;
    }
    if (path === '/animals' && (location.pathname === '/animals' || location.pathname.startsWith('/animales/'))) {
      return true;
    }
    if (path === '/reports' && (location.pathname === '/reports' || location.pathname === '/activities')) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border w-full max-w-full overflow-hidden">
      {/* Safe area for iOS */}
      <div className="px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
        <nav className="flex items-center h-16">
          {tabs.map((tab) => {
            if (tab.isAction) {
              return (
                <Button
                  key={tab.key}
                  onClick={onAddClick}
                  size="lg"
                  className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                >
                  <tab.icon className="h-6 w-6" />
                  <span className="sr-only">{tab.label}</span>
                </Button>
              );
            }

            const active = isActive(tab.path);
            
            return (
              <NavLink
                key={tab.key}
                to={tab.path}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-1 py-1 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className={cn("h-5 w-5 mb-1", active && "text-primary")} />
                <span className="text-xs font-medium leading-none">
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}