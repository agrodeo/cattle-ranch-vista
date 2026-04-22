import { Button } from "@/components/ui/button";
import { Plus, Syringe } from "lucide-react";

interface QuickActionsBarProps {
  onRegisterActivity: () => void;
  onVaccinate: () => void;
}

export function QuickActionsBar({ onRegisterActivity, onVaccinate }: QuickActionsBarProps) {
  return (
    <>
      {/* Desktop: Side-by-side buttons */}
      <div className="hidden lg:grid grid-cols-2 gap-3">
        <Button 
          onClick={onRegisterActivity}
          className="h-12 bg-brand-600 hover:bg-brand-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Registrar Actividad
        </Button>
        <Button 
          onClick={onVaccinate}
          variant="outline" 
          className="h-12 border-brand-200 text-brand-700 hover:bg-brand-50"
        >
          <Syringe className="h-4 w-4 mr-2" />
          Vacunar Ahora
        </Button>
      </div>

      {/* Mobile: Sticky FAB */}
      <div
        className="lg:hidden fixed inset-x-0 z-40 pointer-events-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
      >
        <div className="mx-auto max-w-screen-sm px-4 pointer-events-auto">
          <div className="rounded-full bg-white/95 shadow-lg backdrop-blur border border-ink-200 p-2 flex gap-2">
            <Button 
              onClick={onRegisterActivity}
              className="flex-1 h-11 bg-brand-600 hover:bg-brand-700 text-white shadow-none"
            >
              <Plus className="h-4 w-4 mr-1" />
              Registrar
            </Button>
            <Button 
              onClick={onVaccinate}
              variant="outline" 
              className="flex-1 h-11 border-brand-200 text-brand-700 hover:bg-brand-50 shadow-none"
            >
              <Syringe className="h-4 w-4 mr-1" />
              Vacunar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}