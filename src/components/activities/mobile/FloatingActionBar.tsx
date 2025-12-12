import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FloatingActionBarProps {
  onRegisterActivity: () => void;
}

export function FloatingActionBar({ onRegisterActivity }: FloatingActionBarProps) {
  const { t } = useTranslation('activities');

  return (
    <>
      {/* Desktop: Full width button */}
      <div className="hidden lg:block">
        <Button 
          onClick={onRegisterActivity}
          className="w-full h-12"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('quickActions.register')}
        </Button>
      </div>

      {/* Mobile: Floating Action Bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-screen-sm px-3 pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-auto">
          <div className="rounded-full bg-white/95 shadow-lg backdrop-blur border border-slate-200 p-2 mb-3">
            <Button 
              onClick={onRegisterActivity}
              className="w-full h-11 shadow-none focus:ring-2 focus:ring-ring"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('quickActions.register')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}