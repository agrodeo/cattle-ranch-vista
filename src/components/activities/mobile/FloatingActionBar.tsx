import { Button } from "@/components/ui/button";
import { Plus, Syringe } from "lucide-react";

interface FloatingActionBarProps {
  onRegisterActivity: () => void;
  onVaccinate: () => void;
}

export function FloatingActionBar({ onRegisterActivity, onVaccinate }: FloatingActionBarProps) {
  return (
    <>
      {/* Desktop: Side-by-side buttons */}
      <div className="hidden lg:grid grid-cols-2 gap-3">
        <Button 
          onClick={onRegisterActivity}
          className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Registrar Actividad
        </Button>
        <Button 
          onClick={onVaccinate}
          variant="outline" 
          className="h-12 border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <Syringe className="h-4 w-4 mr-2" />
          Vacunar Ahora
        </Button>
      </div>

      {/* Mobile: Floating Action Bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-screen-sm px-3 pb-[env(safe-area-inset-bottom)] pointer-events-auto">
          <div className="rounded-full bg-white/95 shadow-lg backdrop-blur border border-slate-200 p-2 mb-3 flex gap-2">
            <Button 
              onClick={onRegisterActivity}
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-none focus:ring-2 focus:ring-emerald-600"
            >
              <Plus className="h-4 w-4 mr-1" />
              Registrar
            </Button>
            <Button 
              onClick={onVaccinate}
              variant="outline" 
              className="flex-1 h-11 border-slate-300 text-slate-700 hover:bg-slate-50 shadow-none focus:ring-2 focus:ring-emerald-600"
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