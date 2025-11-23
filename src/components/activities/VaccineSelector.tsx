import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { Plus, Check, Shield, AlertTriangle } from "lucide-react";

interface VaccineSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  selectedAnimals?: string[];
}

export function VaccineSelector({ 
  value, 
  onChange, 
  placeholder = "Seleccionar vacuna",
  selectedAnimals = []
}: VaccineSelectorProps) {
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customVaccineName, setCustomVaccineName] = useState("");
  const { toast } = useToast();
  const { requirements, loading } = useVaccinationRequirements();

  const handleAddCustomVaccine = () => {
    if (!customVaccineName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre de la vacuna es requerido"
      });
      return;
    }

    onChange(customVaccineName.trim());
    setCustomVaccineName("");
    setShowCustomDialog(false);

    toast({
      title: "Vacuna seleccionada",
      description: `Se usará "${customVaccineName.trim()}" como vacuna personalizada`
    });
  };

  return (
    <div className="space-y-2">
      <Label>Vacuna *</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1 bg-background">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-50 max-h-[300px] overflow-y-auto">
            {requirements.length > 0 ? (
              <>
                <div className="px-2 py-1 text-xs text-muted-foreground border-b">
                  Vacunas Configuradas para tu Cabaña
                </div>
                {requirements.map((requirement) => (
                  <SelectItem 
                    key={requirement.id} 
                    value={requirement.id}
                    className="bg-background hover:bg-muted"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {requirement.is_mandatory ? (
                          <Shield className="h-3 w-3 text-red-500" />
                        ) : (
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                        )}
                        <div>
                          <div className="font-medium">{requirement.vaccine_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {requirement.vaccine_type}
                            {requirement.doses_required && requirement.doses_required > 1 && 
                              ` • ${requirement.doses_required} dosis`
                            }
                          </div>
                        </div>
                      </div>
                      {requirement.is_mandatory && (
                        <div className="text-xs text-red-600 font-medium">
                          Obligatoria
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </>
            ) : (
              <div className="px-2 py-4 text-center text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mx-auto mb-2" />
                <div className="text-sm">No hay vacunas configuradas</div>
                <div className="text-xs">Configura vacunas en Configuración</div>
              </div>
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
        {requirements.length > 0 
          ? "Selecciona una vacuna de las configuradas en tu cabaña o agrega una personalizada"
          : "Configura vacunas en Configuración o agrega una personalizada con el botón +"
        }
      </p>
    </div>
  );
}
