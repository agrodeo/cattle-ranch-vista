import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useVaccinationLogic } from "@/hooks/useVaccinationLogic";
import { Plus, Check, Shield, AlertTriangle } from "lucide-react";

interface VaccineSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  selectedAnimals?: string[];
}

interface VaccineOption {
  id: string;
  code: string;
  name: string;
  type: string;
  mandatory: boolean;
  description?: string;
  category: 'requirement' | 'custom';
  requirement?: any;
}

export function VaccineSelector({ 
  value, 
  onChange, 
  placeholder = "Seleccionar vacuna",
  selectedAnimals = []
}: VaccineSelectorProps) {
  const [vaccines, setVaccines] = useState<VaccineOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customVaccineName, setCustomVaccineName] = useState("");
  const [customVaccines, setCustomVaccines] = useState<string[]>([]);
  const { toast } = useToast();
  const { getEligibleVaccines } = useVaccinationLogic();

  useEffect(() => {
    loadVaccines();
    loadCustomVaccines();
  }, [selectedAnimals]);

  const loadVaccines = async () => {
    try {
      setLoading(true);
      console.log('🩹 Loading vaccines for animals:', selectedAnimals);
      
      // Get vaccines from vaccination requirements
      const eligibleVaccines = getEligibleVaccines(selectedAnimals);
      console.log('✅ Eligible vaccines loaded:', eligibleVaccines.length);
      setVaccines(eligibleVaccines);
    } catch (error) {
      console.error('💥 Error loading vaccines:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las vacunas. Verifica tu configuración."
      });
      setVaccines([]);
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

  // Combine requirement-based and custom vaccines
  const allVaccineOptions = [
    ...vaccines,
    ...customVaccines.map(name => ({
      id: name,
      code: name,
      name: name,
      type: 'custom',
      mandatory: false,
      description: `Vacuna personalizada - ${name}`,
      category: 'custom' as const
    }))
  ];

  const requirementVaccines = allVaccineOptions.filter(v => v.category === 'requirement');
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
            {requirementVaccines.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                  Vacunas Configuradas para tu Cabaña
                </div>
                {requirementVaccines.map((vaccine) => (
                  <SelectItem 
                    key={vaccine.id} 
                    value={vaccine.id}
                    className="bg-background hover:bg-muted"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {vaccine.mandatory ? (
                          <Shield className="h-3 w-3 text-red-500" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                        )}
                        <div>
                          <div className="font-medium">{vaccine.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {vaccine.type}
                            {vaccine.category === 'requirement' && vaccine.requirement?.doses_required > 1 && 
                              ` • ${vaccine.requirement.doses_required} dosis`
                            }
                          </div>
                        </div>
                      </div>
                      {vaccine.mandatory && (
                        <div className="text-xs text-red-600 font-medium">
                          Obligatoria
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}

            {requirementVaccines.length === 0 && customVaccineOptions.length === 0 && (
              <div className="px-2 py-4 text-center text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mx-auto mb-2" />
                <div className="text-sm">No hay vacunas configuradas</div>
                <div className="text-xs">Configura vacunas en Configuración</div>
              </div>
            )}

            {customVaccineOptions.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-t mt-1 pt-2">
                  Vacunas Personalizadas
                </div>
                {customVaccineOptions.map((vaccine) => (
                  <SelectItem 
                    key={vaccine.id} 
                    value={vaccine.id}
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
        {requirementVaccines.length > 0 
          ? "Selecciona una vacuna de las configuradas en tu cabaña o agrega una personalizada"
          : "Configura vacunas en Configuración o agrega una personalizada con el botón +"
        }
      </p>
    </div>
  );
}