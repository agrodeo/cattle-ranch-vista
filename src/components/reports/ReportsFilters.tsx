import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ReportsFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onApplyFilters?: () => void;
  className?: string;
}

export interface ReportFilters {
  season?: string;
  date_from?: Date | string;
  date_to?: Date | string;
  corral_ids?: string[];
  category?: string;
  breed?: string;
  include_sold_dead?: boolean;
}

export function ReportsFilters({ filters, onFiltersChange, onApplyFilters, className }: ReportsFiltersProps) {
  const [corrals, setCorrales] = useState<any[]>([]);
  const [breeds, setBreeds] = useState<string[]>([]);

  // Fetch corrals and breeds for filters
  useEffect(() => {
    const fetchData = async () => {
      const [corralesData, animalsData] = await Promise.all([
        supabase
          .from('corrales')
          .select('id, name')
          .order('name'),
        supabase
          .from('animals')
          .select('breed')
          .not('breed', 'is', null)
      ]);
      
      if (corralesData.data) setCorrales(corralesData.data);
      
      if (animalsData.data) {
        const uniqueBreeds = [...new Set(animalsData.data.map(a => a.breed).filter(Boolean))];
        setBreeds(uniqueBreeds.sort());
      }
    };
    
    fetchData();
  }, []);

  const updateFilter = (key: keyof ReportFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleCorral = (corralId: string) => {
    const current = filters.corral_ids || [];
    const updated = current.includes(corralId)
      ? current.filter(id => id !== corralId)
      : [...current, corralId];
    
    updateFilter('corral_ids', updated.length > 0 ? updated : undefined);
  };

  const clearFilters = () => {
    onFiltersChange({
      date_from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      date_to: new Date(),
      include_sold_dead: false
    });
  };

  const activeFiltersCount = Object.values(filters).filter(v => 
    v !== undefined && v !== false && (Array.isArray(v) ? v.length > 0 : true)
  ).length - 2; // Exclude date_from and date_to from count

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
          
          {onApplyFilters && (
            <Button
              size="sm"
              onClick={onApplyFilters}
              className="text-xs"
            >
              <Filter className="h-3 w-3 mr-1" />
              Aplicar Filtros
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-xs">Período</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.date_from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {filters.date_from ? (
                        format(filters.date_from, "dd/MM/yy", { locale: es })
                      ) : (
                        <span>Desde</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.date_from instanceof Date ? filters.date_from : undefined}
                      onSelect={(date) => updateFilter('date_from', date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.date_to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {filters.date_to ? (
                        format(filters.date_to, "dd/MM/yy", { locale: es })
                      ) : (
                        <span>Hasta</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.date_to instanceof Date ? filters.date_to : undefined}
                      onSelect={(date) => updateFilter('date_to', date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Corrals */}
            <div className="space-y-2">
              <Label className="text-xs">Corrales</Label>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {corrals.map((corral) => (
                  <Badge
                    key={corral.id}
                    variant={filters.corral_ids?.includes(corral.id) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleCorral(corral.id)}
                  >
                    {corral.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs">Categoría</Label>
              <Select
                value={filters.category || "all"}
                onValueChange={(value) => updateFilter('category', value === "all" ? undefined : value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Ternero">Ternero</SelectItem>
                  <SelectItem value="Ternera">Ternera</SelectItem>
                  <SelectItem value="Torete">Torete</SelectItem>
                  <SelectItem value="Vaquillona">Vaquillona</SelectItem>
                  <SelectItem value="Toro">Toro</SelectItem>
                  <SelectItem value="Vaca">Vaca</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Breed */}
            <div className="space-y-2">
              <Label className="text-xs">Raza</Label>
              <Select
                value={filters.breed || "all"}
                onValueChange={(value) => updateFilter('breed', value === "all" ? undefined : value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {breeds.map(breed => (
                    <SelectItem key={breed} value={breed}>
                      {breed}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label className="text-xs">Opciones</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-sold-dead"
                  checked={filters.include_sold_dead}
                  onCheckedChange={(checked) => 
                    updateFilter('include_sold_dead', checked)
                  }
                />
                <Label htmlFor="include-sold-dead" className="text-xs">
                  Incluir vendidos/muertos
                </Label>
              </div>
            </div>
          </div>
    </div>
  );
}