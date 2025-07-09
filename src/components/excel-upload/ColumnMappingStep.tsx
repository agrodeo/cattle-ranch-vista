import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AnimalFieldMapping, ColumnMapping, DefaultValues, SUPPORTED_FIELDS } from "./AnimalExcelUploadAdvanced";

interface ColumnMappingStepProps {
  rawData: any[];
  columnMapping: ColumnMapping;
  defaultValues: DefaultValues;
  onMappingChange: (mapping: ColumnMapping) => void;
  onDefaultValuesChange: (defaults: DefaultValues) => void;
  onNext: (mappedData: AnimalFieldMapping[]) => void;
  onBack: () => void;
}

export const ColumnMappingStep = ({
  rawData,
  columnMapping,
  defaultValues,
  onMappingChange,
  onDefaultValuesChange,
  onNext,
  onBack
}: ColumnMappingStepProps) => {
  const [currentMapping, setCurrentMapping] = useState<ColumnMapping>(columnMapping);
  const [currentDefaults, setCurrentDefaults] = useState<DefaultValues>(defaultValues);

  if (rawData.length === 0) return null;

  const excelColumns = Object.keys(rawData[0]);
  const supportedFieldKeys = Object.keys(SUPPORTED_FIELDS) as (keyof typeof SUPPORTED_FIELDS)[];
  
  // Get unmapped required fields
  const mappedFields = Object.values(currentMapping).filter(Boolean);
  const unmappedRequiredFields = supportedFieldKeys.filter(
    field => SUPPORTED_FIELDS[field].required && !mappedFields.includes(field)
  );

  // Validate and map data
  const validateAndMapData = (): AnimalFieldMapping[] => {
    const mappedAnimals: AnimalFieldMapping[] = [];
    
    rawData.forEach((row, index) => {
      const animal: AnimalFieldMapping = {
        identificacion: '',
        sexo: '',
        raza: '',
        fecha_nacimiento: '',
        _originalIndex: index + 1,
        _isValid: true,
        _errors: [],
        _warnings: []
      };

      // Apply column mappings
      Object.entries(currentMapping).forEach(([excelCol, systemField]) => {
        if (systemField && row[excelCol] !== undefined && row[excelCol] !== null && row[excelCol] !== '') {
          (animal as any)[systemField] = row[excelCol];
        }
      });

      // Apply default values
      Object.entries(currentDefaults).forEach(([field, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          (animal as any)[field] = value;
        }
      });

      // Validate required fields
      const errors: string[] = [];
      
      if (!animal.identificacion?.toString().trim()) {
        errors.push('Identificación es requerida');
      }
      
      if (!animal.sexo?.toString().trim()) {
        errors.push('Sexo es requerido');
      } else {
        const sexo = animal.sexo.toString().toLowerCase().trim();
        if (!['macho', 'hembra', 'male', 'female', 'm', 'f'].includes(sexo)) {
          errors.push('Sexo debe ser "Macho" o "Hembra"');
        } else {
          animal.sexo = sexo === 'male' || sexo === 'm' || sexo === 'macho' ? 'Macho' : 'Hembra';
        }
      }
      
      if (!animal.raza?.toString().trim()) {
        errors.push('Raza es requerida');
      }
      
      if (!animal.fecha_nacimiento?.toString().trim()) {
        errors.push('Fecha de nacimiento es requerida');
      } else {
        const date = new Date(animal.fecha_nacimiento.toString());
        if (isNaN(date.getTime())) {
          errors.push('Fecha de nacimiento no es válida');
        } else if (date > new Date()) {
          errors.push('Fecha de nacimiento no puede ser en el futuro');
        } else {
          animal.fecha_nacimiento = date.toISOString().split('T')[0];
        }
      }

      // Validate numeric fields
      const numericFields = ['peso_nacer', 'peso_final', 'circunferencia_escrotal', 'condicion_corporal', 'peso_destete'];
      numericFields.forEach(field => {
        if ((animal as any)[field] !== undefined && (animal as any)[field] !== null && (animal as any)[field] !== '') {
          const value = parseFloat((animal as any)[field].toString());
          if (isNaN(value) || value < 0) {
            errors.push(`${SUPPORTED_FIELDS[field as keyof typeof SUPPORTED_FIELDS]?.label} debe ser un número positivo`);
          } else {
            (animal as any)[field] = value;
          }
        }
      });

      // Validate date fields
      const dateFields = ['fecha_destete', 'fecha_servicio', 'fecha_muerte'];
      dateFields.forEach(field => {
        if ((animal as any)[field] !== undefined && (animal as any)[field] !== null && (animal as any)[field] !== '') {
          const date = new Date((animal as any)[field].toString());
          if (isNaN(date.getTime())) {
            errors.push(`${SUPPORTED_FIELDS[field as keyof typeof SUPPORTED_FIELDS]?.label} no es una fecha válida`);
          } else {
            (animal as any)[field] = date.toISOString().split('T')[0];
          }
        }
      });

      animal._errors = errors;
      animal._isValid = errors.length === 0;
      
      mappedAnimals.push(animal);
    });

    return mappedAnimals;
  };

  const handleNext = () => {
    // Validate that all required fields are mapped or have defaults
    if (unmappedRequiredFields.length > 0) {
      const missingFields = unmappedRequiredFields.filter(field => !currentDefaults[field]);
      if (missingFields.length > 0) {
        toast({
          title: "Campos requeridos faltantes",
          description: `Los siguientes campos son requeridos: ${missingFields.map(f => SUPPORTED_FIELDS[f].label).join(', ')}`,
          variant: "destructive"
        });
        return;
      }
    }

    onMappingChange(currentMapping);
    onDefaultValuesChange(currentDefaults);
    
    const mappedData = validateAndMapData();
    onNext(mappedData);
  };

  const updateMapping = (excelColumn: string, systemField: keyof typeof SUPPORTED_FIELDS | null) => {
    const newMapping = { ...currentMapping };
    newMapping[excelColumn] = systemField;
    setCurrentMapping(newMapping);
  };

  const updateDefault = (field: string, value: any) => {
    const newDefaults = { ...currentDefaults };
    newDefaults[field] = value;
    setCurrentDefaults(newDefaults);
  };

  const renderDefaultValueInput = (field: keyof typeof SUPPORTED_FIELDS) => {
    const fieldConfig = SUPPORTED_FIELDS[field];
    
    switch (fieldConfig.type) {
      case 'select':
        return (
          <Select value={currentDefaults[field] || ""} onValueChange={(value) => updateDefault(field, value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar valor por defecto" />
            </SelectTrigger>
            <SelectContent>
              {('options' in fieldConfig && fieldConfig.options) && fieldConfig.options.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'textarea':
        return (
          <Textarea
            value={currentDefaults[field] || ""}
            onChange={(e) => updateDefault(field, e.target.value)}
            placeholder="Valor por defecto"
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={currentDefaults[field] || ""}
            onChange={(e) => updateDefault(field, parseFloat(e.target.value))}
            placeholder="Valor por defecto"
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={currentDefaults[field] || ""}
            onChange={(e) => updateDefault(field, e.target.value)}
          />
        );
      
      default:
        return (
          <Input
            value={currentDefaults[field] || ""}
            onChange={(e) => updateDefault(field, e.target.value)}
            placeholder="Valor por defecto"
          />
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Paso 2: Mapear Columnas y Valores por Defecto</CardTitle>
        <CardDescription>
          Asocie las columnas de su archivo con los campos del sistema y proporcione valores por defecto para campos faltantes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview of data */}
        <div>
          <h4 className="font-medium mb-2">Vista previa de datos ({rawData.length} filas)</h4>
          <div className="overflow-x-auto border rounded max-h-40">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {excelColumns.map(col => (
                    <th key={col} className="p-2 text-left border-r">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawData.slice(0, 3).map((row, index) => (
                  <tr key={index} className="border-t">
                    {excelColumns.map(col => (
                      <td key={col} className="p-2 border-r text-xs">{row[col]?.toString() || '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column mapping */}
        <div>
          <h4 className="font-medium mb-3">Mapeo de Columnas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {excelColumns.map(excelCol => (
              <div key={excelCol} className="space-y-2">
                <Label className="text-sm font-medium">
                  Columna: "{excelCol}"
                </Label>
                <Select 
                  value={currentMapping[excelCol] || ""} 
                  onValueChange={(value) => updateMapping(excelCol, value as keyof typeof SUPPORTED_FIELDS | null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar campo del sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No mapear</SelectItem>
                    {supportedFieldKeys.map(field => (
                      <SelectItem key={field} value={field}>
                        {SUPPORTED_FIELDS[field].label}
                        {SUPPORTED_FIELDS[field].required && <Badge variant="destructive" className="ml-2 text-xs">Requerido</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Default values for unmapped required fields */}
        {unmappedRequiredFields.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Valores por Defecto para Campos Requeridos no Mapeados</h4>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Los siguientes campos son requeridos pero no están mapeadas a columnas. Proporcione valores por defecto:
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unmappedRequiredFields.map(field => (
                <div key={field} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {SUPPORTED_FIELDS[field].label} <Badge variant="destructive" className="ml-1 text-xs">Requerido</Badge>
                  </Label>
                  {renderDefaultValueInput(field)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional default values */}
        <div>
          <h4 className="font-medium mb-3">Valores por Defecto Opcionales</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Proporcione valores por defecto para campos que no estén en su archivo Excel
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supportedFieldKeys
              .filter(field => !SUPPORTED_FIELDS[field].required && !Object.values(currentMapping).includes(field))
              .map(field => (
                <div key={field} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {SUPPORTED_FIELDS[field].label}
                  </Label>
                  {renderDefaultValueInput(field)}
                </div>
              ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button onClick={handleNext}>
            Siguiente: Previsualizar
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};