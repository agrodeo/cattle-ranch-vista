import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Plus, BarChart3, Fence, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Custom Cow Icon Component
const CowIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 12c0-1.657 4.03-3 9-3s9 1.343 9 3" />
    <path d="M3 12v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6" />
    <path d="M12 21V9" />
    <circle cx="8" cy="7" r="1.5" />
    <circle cx="16" cy="7" r="1.5" />
    <path d="M5 7c0-2.21 3.13-4 7-4s7 1.79 7 4" />
    <path d="M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3" />
  </svg>
);

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
      icon: CowIcon,
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
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border">
      {/* Safe area for iOS */}
      <div className="px-3 pb-[env(safe-area-inset-bottom)] pt-2">
        <nav className="flex items-center justify-around h-16">
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