import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Filter, X } from "lucide-react";

interface FilterOptions {
  corrales: string[];
  sexo: 'all' | 'macho' | 'hembra';
  edad: [number, number]; // [min, max] in months
  estado: string[];
}

interface FiltersSheetProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClearFilters: () => void;
  availableCorrales: Array<{ id: string; name: string }>;
  children: React.ReactNode;
}

export function FiltersSheet({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  availableCorrales,
  children 
}: FiltersSheetProps) {
  const [tempFilters, setTempFilters] = useState<FilterOptions>(filters);
  const [isOpen, setIsOpen] = useState(false);

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const defaultFilters: FilterOptions = {
      corrales: [],
      sexo: 'all',
      edad: [0, 120],
      estado: ['activo']
    };
    setTempFilters(defaultFilters);
    onClearFilters();
    setIsOpen(false);
  };

  const activeFiltersCount = 
    tempFilters.corrales.length + 
    (tempFilters.sexo !== 'all' ? 1 : 0) + 
    (tempFilters.edad[0] > 0 || tempFilters.edad[1] < 120 ? 1 : 0) +
    (tempFilters.estado.length > 1 || !tempFilters.estado.includes('activo') ? 1 : 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
        <SheetHeader className="pb-4 border-b border-ink-200">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="bg-brand-100 text-brand-800 text-xs px-2 py-1 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Corrales */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-ink-900">Corrales</h3>
            <div className="grid grid-cols-2 gap-2">
              {availableCorrales.map((corral) => (
                <div key={corral.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`corral-${corral.id}`}
                    checked={tempFilters.corrales.includes(corral.id)}
                    onCheckedChange={(checked) => {
                      setTempFilters(prev => ({
                        ...prev,
                        corrales: checked
                          ? [...prev.corrales, corral.id]
                          : prev.corrales.filter(id => id !== corral.id)
                      }));
                    }}
                  />
                  <label
                    htmlFor={`corral-${corral.id}`}
                    className="text-sm text-ink-700 cursor-pointer"
                  >
                    {corral.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Sexo */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-ink-900">Sexo</h3>
            <Select
              value={tempFilters.sexo}
              onValueChange={(value) => 
                setTempFilters(prev => ({ ...prev, sexo: value as any }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="macho">Macho</SelectItem>
                <SelectItem value="hembra">Hembra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Edad */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-ink-900">
              Edad: {tempFilters.edad[0]} - {tempFilters.edad[1]} meses
            </h3>
            <Slider
              value={tempFilters.edad}
              onValueChange={(value) => 
                setTempFilters(prev => ({ ...prev, edad: value as [number, number] }))
              }
              max={120}
              min={0}
              step={1}
              className="w-full"
            />
          </div>

          {/* Estado */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-ink-900">Estado</h3>
            <div className="space-y-2">
              {[
                { id: 'activo', label: 'Activo' },
                { id: 'vendido', label: 'Vendido' },
                { id: 'muerto', label: 'Muerto' }
              ].map((estado) => (
                <div key={estado.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`estado-${estado.id}`}
                    checked={tempFilters.estado.includes(estado.id)}
                    onCheckedChange={(checked) => {
                      setTempFilters(prev => ({
                        ...prev,
                        estado: checked
                          ? [...prev.estado, estado.id]
                          : prev.estado.filter(e => e !== estado.id)
                      }));
                    }}
                  />
                  <label
                    htmlFor={`estado-${estado.id}`}
                    className="text-sm text-ink-700 cursor-pointer"
                  >
                    {estado.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-ink-200 pt-4 flex gap-3">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="flex-1"
          >
            Limpiar
          </Button>
          <Button
            onClick={handleApplyFilters}
            className="flex-1 bg-brand-600 hover:bg-brand-700"
          >
            Aplicar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}