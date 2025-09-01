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

  // Using hardcoded vaccine list for now since database is empty
  const commonVaccineList = [
    { code: "aftosa", name: "Aftosa (Fiebre Aftosa)", description: "Vacuna contra fiebre aftosa", category: "official" as const },
    { code: "brucelosis", name: "Brucelosis", description: "Vacuna contra brucelosis bovina", category: "official" as const },
    { code: "carbunco", name: "Carbunco", description: "Vacuna contra carbunclo bacteridiano", category: "official" as const },
    { code: "mancha", name: "Mancha", description: "Vacuna contra mancha infecciosa", category: "official" as const },
    { code: "gangrena", name: "Gangrena Gaseosa", description: "Vacuna contra gangrena gaseosa", category: "official" as const },
    { code: "triple", name: "Vacuna Triple (Mancha, Carbunco, Gangrena)", description: "Vacuna combinada", category: "official" as const },
    { code: "ibr_dvb", name: "IBR/DVB/PI3/BRSV", description: "Vacuna combinada respiratoria", category: "official" as const },
    { code: "leptospirosis", name: "Leptospirosis", description: "Vacuna contra leptospirosis bovina", category: "official" as const },
    { code: "queratoconjuntivitis", name: "Queratoconjuntivitis", description: "Vacuna contra queratoconjuntivitis infecciosa", category: "official" as const },
    { code: "rabia", name: "Rabia", description: "Vacuna antirrábica", category: "official" as const }
  ];

  const loadVaccines = () => {
    setVaccines(commonVaccineList);
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

  // Common vaccines for Argentina/Latin America
  const commonVaccines = [
    "Aftosa (Fiebre Aftosa)",
    "Brucelosis",
    "Carbunco",
    "Mancha",
    "Gangrena Gaseosa",
    "Enterotoxemia",
    "IBR/DVB/PI3/BRSV",
    "Leptospirosis",
    "Queratoconjuntivitis",
    "Rabia",
    "Vacuna Triple (Mancha, Carbunco, Gangrena)"
  ];

  return (
    <div className="space-y-2">
      <Label>Vacuna *</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 bg-background">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50 max-h-[300px] overflow-y-auto">
            <div className="px-2 py-1 text-xs text-muted-foreground border-b">
              Vacunas Comunes para Bovinos
            </div>
            
            {/* Common vaccines */}
            {commonVaccines.map((vaccine) => (
              <SelectItem 
                key={vaccine} 
                value={vaccine}
                className="bg-background hover:bg-muted"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-blue-500 rounded-full" />
                  <div className="font-medium">{vaccine}</div>
                </div>
              </SelectItem>
            ))}

            {officialVaccines.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
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