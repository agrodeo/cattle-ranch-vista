import { ResumenTab } from './tabs/ResumenTab';

export function ActivitiesTabs() {
  return (
    <div className="space-y-3">
      {/* Header - Only on Desktop */}
      <div className="hidden lg:block space-y-2 mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
          Actividades
        </h1>
        <p className="text-base text-slate-600">
          Gestiona todas las actividades de tu cabaña
        </p>
      </div>

      {/* Single "Inicio" Tab */}
      <header className="sticky top-0 z-30 -mx-3 mb-2 bg-white/95 backdrop-blur px-3 py-2 border-b border-slate-200">
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-full text-sm bg-emerald-600 text-white border border-emerald-600"
            aria-pressed="true"
          >
            Inicio
          </button>
        </div>
      </header>

      {/* Unified Content */}
      <div className="pb-24">
        <ResumenTab />
      </div>
    </div>
  );
}