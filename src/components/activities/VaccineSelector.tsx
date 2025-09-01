import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Check } from "lucide-react";

interface VaccineSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface VaccineOption {
  code: string;
  name: string;
  description?: string;
  category: 'official' | 'custom';
}

export function VaccineSelector({ value, onChange, placeholder = "Seleccionar vacuna" }: VaccineSelectorProps) {
  const [vaccines, setVaccines] = useState<VaccineOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customVaccineName, setCustomVaccineName] = useState("");
  const [customVaccines, setCustomVaccines] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadVaccines();
    loadCustomVaccines();
  }, []);

  const loadVaccines = async () => {
    try {
      setLoading(true);
      
      // Load official vaccines from the catalog
      const { data: officialVaccines, error: officialError } = await supabase
        .from('vaccines')
        .select('code, name, description')
        .eq('active', true)
        .eq('species', 'bovine')
        .order('name');

      if (officialError) throw officialError;

      // Convert to our interface format
      const allVaccines: VaccineOption[] = [
        ...(officialVaccines || []).map(v => ({
          code: v.code,
          name: v.name,
          description: v.description,
          category: 'official' as const
        }))
      ];

      setVaccines(allVaccines);
    } catch (error) {
      console.error('Error loading vaccines:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las vacunas disponibles"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomVaccines = () => {
    // Load custom vaccines from localStorage for now
    const stored = localStorage.getItem('custom_vaccines');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCustomVaccines(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.error('Error parsing custom vaccines:', error);
        setCustomVaccines([]);
      }
    }
  };

  const handleAddCustomVaccine = () => {
    try {
      if (!customVaccineName.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El nombre de la vacuna es requerido"
        });
        return;
      }

      // Check if vaccine already exists
      const existingOfficial = vaccines.find(v => 
        v.name.toLowerCase() === customVaccineName.trim().toLowerCase()
      );
      const existingCustom = customVaccines.find(v => 
        v.toLowerCase() === customVaccineName.trim().toLowerCase()
      );

      if (existingOfficial || existingCustom) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Ya existe una vacuna con ese nombre"
        });
        return;
      }

      // Add to custom vaccines
      const newCustomVaccines = [...customVaccines, customVaccineName.trim()];
      setCustomVaccines(newCustomVaccines);
      
      // Save to localStorage
      localStorage.setItem('custom_vaccines', JSON.stringify(newCustomVaccines));

      onChange(customVaccineName.trim());
      setCustomVaccineName("");
      setShowCustomDialog(false);

      toast({
        title: "Vacuna agregada",
        description: `Se agregó "${customVaccineName.trim()}" a la lista de vacunas personalizadas`
      });

    } catch (error) {
      console.error('Error adding custom vaccine:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo agregar la vacuna personalizada"
      });
    }
  };

  // Combine official and custom vaccines
  const allVaccineOptions = [
    ...vaccines,
    ...customVaccines.map(name => ({
      code: name,
      name: name,
      description: `Vacuna personalizada - ${name}`,
      category: 'custom' as const
    }))
  ];

  const officialVaccines = allVaccineOptions.filter(v => v.category === 'official');
  const customVaccineOptions = allVaccineOptions.filter(v => v.category === 'custom');

  // No hardcoded vaccines - users must add their own

  return (
    <div className="space-y-2">
      <Label>Vacuna *</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 bg-background">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50 max-h-[300px] overflow-y-auto">
            {officialVaccines.length === 0 && customVaccineOptions.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <div className="text-sm">No hay vacunas disponibles</div>
                <div className="text-xs mt-1">Agregue una vacuna personalizada con el botón +</div>
              </div>
            )}

            {officialVaccines.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-b">
                  Catálogo Oficial
                </div>
                {officialVaccines.map((vaccine) => (
                  <SelectItem 
                    key={vaccine.code} 
                    value={vaccine.name}
                    className="bg-background hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <div>
                        <div className="font-medium">{vaccine.name}</div>
                        {vaccine.description && (
                          <div className="text-xs text-muted-foreground">
                            {vaccine.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}

            {customVaccineOptions.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                  Vacunas Personalizadas
                </div>
                {customVaccineOptions.map((vaccine) => (
                  <SelectItem 
                    key={vaccine.code} 
                    value={vaccine.name}
                    className="bg-background hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-primary rounded-full" />
                      <div>
                        <div className="font-medium">{vaccine.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Personalizada
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>

        <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" title="Agregar vacuna personalizada">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background">
            <DialogHeader>
              <DialogTitle>Agregar Vacuna Personalizada</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customVaccine">Nombre de la Vacuna</Label>
                <Input
                  id="customVaccine"
                  value={customVaccineName}
                  onChange={(e) => setCustomVaccineName(e.target.value)}
                  placeholder="Ej: Vacuna Triple, Brucelosis, etc."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCustomVaccineName("");
                    setShowCustomDialog(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddCustomVaccine}
                  disabled={!customVaccineName.trim()}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Selecciona una vacuna del listado o agrega una personalizada con el botón +
      </p>
    </div>
  );
}