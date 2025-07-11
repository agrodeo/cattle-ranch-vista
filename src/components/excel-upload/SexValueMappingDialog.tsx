import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Info, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface SexMapping {
  [originalValue: string]: 'Macho' | 'Hembra' | null;
}

interface SexValueMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unrecognizedValues: string[];
  currentMappings: SexMapping;
  onMappingsChange: (mappings: SexMapping) => void;
  onSaveForFuture: (mappings: SexMapping) => void;
}

// Default sex value mappings
export const getDefaultSexMappings = (): SexMapping => {
  const saved = localStorage.getItem('sexValueMappings');
  const defaultMappings: SexMapping = {
    'M': 'Macho',
    'm': 'Macho',
    'Macho': 'Macho',
    'macho': 'Macho',
    'MACHO': 'Macho',
    'Male': 'Macho',
    'male': 'Macho',
    'MALE': 'Macho',
    'H': 'Hembra',
    'h': 'Hembra',
    'Hembra': 'Hembra',
    'hembra': 'Hembra',
    'HEMBRA': 'Hembra',
    'Female': 'Hembra',
    'female': 'Hembra',
    'FEMALE': 'Hembra',
    'F': 'Hembra',
    'f': 'Hembra'
  };
  
  if (saved) {
    try {
      const savedMappings = JSON.parse(saved);
      return { ...defaultMappings, ...savedMappings };
    } catch (e) {
      console.error('Error parsing saved sex mappings:', e);
    }
  }
  
  return defaultMappings;
};

export const getSexMapping = (value: string): 'Macho' | 'Hembra' | null => {
  const mappings = getDefaultSexMappings();
  return mappings[value] || null;
};

export const SexValueMappingDialog = ({
  open,
  onOpenChange,
  unrecognizedValues,
  currentMappings,
  onMappingsChange,
  onSaveForFuture
}: SexValueMappingDialogProps) => {
  const [mappings, setMappings] = useState<SexMapping>(currentMappings);
  const [saveForFuture, setSaveForFuture] = useState(false);
  const [applyToAll, setApplyToAll] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    setMappings(currentMappings);
  }, [currentMappings]);

  const handleMappingChange = (originalValue: string, newMapping: 'Macho' | 'Hembra' | null) => {
    const newMappings = { ...mappings };
    newMappings[originalValue] = newMapping;
    setMappings(newMappings);
  };

  const handleApplyToAllChange = (originalValue: string, checked: boolean) => {
    setApplyToAll(prev => ({ ...prev, [originalValue]: checked }));
  };

  const handleSave = () => {
    // Validate that all unrecognized values have mappings
    const unmappedValues = unrecognizedValues.filter(value => !mappings[value]);
    if (unmappedValues.length > 0) {
      toast({
        title: "Valores sin mapear",
        description: `Por favor defina el mapeo para: ${unmappedValues.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    onMappingsChange(mappings);

    if (saveForFuture) {
      onSaveForFuture(mappings);
      toast({
        title: "Configuración guardada",
        description: "Los mapeos se han guardado para futuros archivos",
      });
    }

    onOpenChange(false);
  };

  const getValueCount = (value: string) => {
    // This would ideally be passed from the parent component
    return 1; // Placeholder
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Valores de Sexo/Género No Reconocidos</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Se encontraron valores de sexo/género que no se pueden mapear automáticamente. 
              Por favor, defina el significado de cada valor para continuar con la importación.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mapeo de Valores</CardTitle>
              <CardDescription>
                Defina qué significa cada valor encontrado en su archivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {unrecognizedValues.map((value) => (
                <div key={value} className="space-y-3 p-4 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="font-mono">
                        "{value}"
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({getValueCount(value)} registro{getValueCount(value) !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Mapear a:</Label>
                      <Select 
                        value={mappings[value] || "undefined"} 
                        onValueChange={(newValue) => 
                          handleMappingChange(value, newValue === "undefined" ? null : newValue as 'Macho' | 'Hembra')
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar sexo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="undefined">No seleccionar</SelectItem>
                          <SelectItem value="Macho">Macho</SelectItem>
                          <SelectItem value="Hembra">Hembra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Aplicar a todos:</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          id={`apply-all-${value}`}
                          checked={applyToAll[value] || false}
                          onCheckedChange={(checked) => handleApplyToAllChange(value, checked as boolean)}
                        />
                        <Label htmlFor={`apply-all-${value}`} className="text-sm text-muted-foreground">
                          Aplicar este mapeo a todas las filas con "{value}"
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-for-future"
                  checked={saveForFuture}
                  onCheckedChange={(checked) => setSaveForFuture(checked as boolean)}
                />
                <Label htmlFor="save-for-future" className="text-sm">
                  Guardar estos mapeos como configuración por defecto para futuros archivos
                </Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Mapeos
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};