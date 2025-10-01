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
    {/* Head */}
    <ellipse cx="12" cy="8" rx="4" ry="3" />
    {/* Ears */}
    <path d="M8 7.5 L7 6" />
    <path d="M16 7.5 L17 6" />
    {/* Eyes */}
    <circle cx="10.5" cy="8" r="0.5" fill="currentColor" />
    <circle cx="13.5" cy="8" r="0.5" fill="currentColor" />
    {/* Snout */}
    <ellipse cx="12" cy="9.5" rx="1.5" ry="1" />
    {/* Body */}
    <ellipse cx="12" cy="15" rx="5" ry="4" />
    {/* Legs */}
    <line x1="9" y1="19" x2="9" y2="22" />
    <line x1="11" y1="19" x2="11" y2="22" />
    <line x1="13" y1="19" x2="13" y2="22" />
    <line x1="15" y1="19" x2="15" y2="22" />
    {/* Tail */}
    <path d="M17 14 Q18 13 19 14" />
    {/* Spots */}
    <circle cx="10" cy="14" r="0.8" fill="currentColor" />
    <circle cx="14" cy="15.5" r="0.8" fill="currentColor" />
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