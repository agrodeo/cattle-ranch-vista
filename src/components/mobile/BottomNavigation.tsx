import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Plus, Fence, PieChart, Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { cowHead } from "@lucide/lab";

interface BottomNavigationProps {
  onAddClick: () => void;
}

export function BottomNavigation({ onAddClick }: BottomNavigationProps) {
  const { t } = useTranslation(['menu', 'common']);
  const location = useLocation();

  const tabs = [
    { key: 'home', label: t('home'), path: '/', icon: Home },
    {
      key: 'animals',
      label: t('animals'),
      path: '/animals',
      icon: (props: any) => <Icon iconNode={cowHead} {...props} />,
    },
    { key: 'corrales', label: t('corrals'), path: '/corrales', icon: Fence },
    { key: 'reports', label: t('reports'), path: '/reports', icon: PieChart },
  ];

  const isActive = (path: string) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '/dashboard')) return true;
    if (path === '/animals' && (location.pathname === '/animals' || location.pathname.startsWith('/animales/'))) return true;
    if (path === '/reports' && (location.pathname === '/reports' || location.pathname === '/activities')) return true;
    return location.pathname === path;
  };

  return (
    <div
      className="lg:hidden fixed inset-x-0 z-50 pointer-events-none"
      style={{
        bottom: 'max(env(safe-area-inset-bottom), 12px)',
        paddingLeft: 'max(env(safe-area-inset-left), 12px)',
        paddingRight: 'max(env(safe-area-inset-right), 12px)',
      }}
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-center gap-2 px-3">
        {/* Main glass pill - liquid glass outline */}
        <nav
          className={cn(
            "relative flex-1 flex items-center justify-around gap-1 h-16 px-2",
            "rounded-full isolate",
            "bg-white/55 dark:bg-white/[0.08]",
            "backdrop-blur-2xl backdrop-saturate-200",
            "border border-white/50 dark:border-white/20",
            // Layered glass: outer soft glow + crisp lift shadow + inner top highlight + inner bottom depth
            "shadow-[0_0_0_0.5px_rgba(255,255,255,0.35),0_1px_0_0_rgba(255,255,255,0.6)_inset,0_-1px_2px_0_rgba(15,23,42,0.08)_inset,0_8px_32px_rgba(15,23,42,0.12),0_0_40px_rgba(255,255,255,0.25)]",
            // Top light reflection
            "before:content-[''] before:absolute before:inset-x-3 before:top-px before:h-1/2 before:rounded-full before:pointer-events-none",
            "before:bg-gradient-to-b before:from-white/50 before:to-transparent before:opacity-70",
            // Edge gradient overlay (rim light)
            "after:content-[''] after:absolute after:inset-0 after:rounded-full after:pointer-events-none after:p-px",
            "after:bg-gradient-to-b after:from-white/60 after:via-white/10 after:to-white/25",
            "after:[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] after:[mask-composite:exclude] after:[-webkit-mask-composite:xor]"
          )}
        >
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <NavLink
                key={tab.key}
                to={tab.path}
                className={cn(
                  "relative z-10 flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 rounded-full",
                  "transition-all duration-200 active:scale-95",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className={cn("h-5 w-5 mb-0.5", active && "text-primary")} />
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Separated floating + button - liquid glass with brand tint */}
        <button
          onClick={onAddClick}
          aria-label="Cargar"
          className={cn(
            "relative shrink-0 h-16 w-16 rounded-full flex items-center justify-center isolate",
            "bg-primary/95 text-primary-foreground",
            "backdrop-blur-2xl backdrop-saturate-200",
            "border border-white/60 dark:border-white/25",
            // Stronger layered glass: rim + top highlight inset + bottom depth inset + lift + colored glow + outer white halo
            "shadow-[0_0_0_0.5px_rgba(255,255,255,0.45),0_1px_0_0_rgba(255,255,255,0.7)_inset,0_-2px_3px_0_rgba(0,0,0,0.12)_inset,0_10px_28px_rgba(34,197,94,0.45),0_0_50px_rgba(255,255,255,0.3)]",
            // Top reflection
            "before:content-[''] before:absolute before:inset-x-2 before:top-0.5 before:h-1/2 before:rounded-full before:pointer-events-none",
            "before:bg-gradient-to-b before:from-white/55 before:to-transparent",
            // Rim light
            "after:content-[''] after:absolute after:inset-0 after:rounded-full after:pointer-events-none after:p-px",
            "after:bg-gradient-to-b after:from-white/70 after:via-white/15 after:to-white/30",
            "after:[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] after:[mask-composite:exclude] after:[-webkit-mask-composite:xor]",
            "transition-all duration-200 active:scale-95 hover:bg-primary"
          )}
        >
          <Plus className="relative z-10 h-7 w-7" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}