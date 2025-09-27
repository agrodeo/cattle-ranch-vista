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
import { convertToISODate, isValidBirthDate, detectPartialDate } from '@/lib/dateUtils';
import { SexValueMappingDialog, SexMapping, getSexMapping, getDefaultSexMappings } from './SexValueMappingDialog';

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
  const [sexMappingOpen, setSexMappingOpen] = useState(false);
  const [sexMappings, setSexMappings] = useState<SexMapping>(getDefaultSexMappings());
  const [unrecognizedSexValues, setUnrecognizedSexValues] = useState<string[]>([]);

  if (rawData.length === 0) return null;

  const excelColumns = Object.keys(rawData[0]);
  const supportedFieldKeys = Object.keys(SUPPORTED_FIELDS) as (keyof typeof SUPPORTED_FIELDS)[];
  
  // Get unmapped required fields
  const mappedFields = Object.values(currentMapping).filter(Boolean);
  const unmappedRequiredFields = supportedFieldKeys.filter(
    field => SUPPORTED_FIELDS[field].required && !mappedFields.includes(field)
  );

  // Helper function to check for unrecognized sex values
  const checkForUnrecognizedSexValues = (): string[] => {
    const sexColumnKey = Object.keys(currentMapping).find(key => currentMapping[key] === 'sexo');
    if (!sexColumnKey) return [];

    const unrecognized = new Set<string>();
    
    rawData.forEach(row => {
      const sexValue = row[sexColumnKey];
      if (sexValue !== undefined && sexValue !== null && sexValue !== '') {
        const mappedValue = getSexMapping(sexValue.toString());
        if (!mappedValue && !sexMappings[sexValue.toString()]) {
          unrecognized.add(sexValue.toString());
        }
      }
    });

    return Array.from(unrecognized);
  };

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
        const originalSexValue = animal.sexo.toString();
        // First try automatic mapping
        let mappedSex = getSexMapping(originalSexValue);
        
        // If not found in default mappings, check user-defined mappings
        if (!mappedSex && sexMappings[originalSexValue]) {
          mappedSex = sexMappings[originalSexValue];
        }
        
        if (mappedSex) {
          animal.sexo = mappedSex;
        } else {
          errors.push(`Valor de sexo "${originalSexValue}" no reconocido. Use "Macho" o "Hembra".`);
        }
      }
      
      if (!animal.raza?.toString().trim()) {
        errors.push('Raza es requerida');
      }
      
      if (!animal.fecha_nacimiento?.toString().trim()) {
        errors.push('Fecha de nacimiento es requerida');
      } else {
        const originalValue = animal.fecha_nacimiento;
        const partialDateInfo = detectPartialDate(originalValue);
        const convertedDate = convertToISODate(animal.fecha_nacimiento);
        
        if (!convertedDate) {
          errors.push('Fecha de nacimiento no es válida o no se pudo convertir');
        } else if (!isValidBirthDate(convertedDate)) {
          errors.push('Fecha de nacimiento no puede ser en el futuro o muy antigua');
        } else {
          animal.fecha_nacimiento = convertedDate;
          
          // Add warning for partial dates
          if (partialDateInfo.isPartial) {
            animal._warnings = animal._warnings || [];
            animal._warnings.push(`Fecha de nacimiento parcial "${originalValue}": ${partialDateInfo.completedInfo}`);
          }
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

      // Validate date fields with automatic format detection
      const dateFields = ['fecha_destete', 'fecha_servicio', 'fecha_muerte'];
      dateFields.forEach(field => {
        if ((animal as any)[field] !== undefined && (animal as any)[field] !== null && (animal as any)[field] !== '') {
          const originalValue = (animal as any)[field];
          const partialDateInfo = detectPartialDate(originalValue);
          const convertedDate = convertToISODate(originalValue);
          
          if (!convertedDate) {
            errors.push(`${SUPPORTED_FIELDS[field as keyof typeof SUPPORTED_FIELDS]?.label} no es una fecha válida o no se pudo convertir`);
          } else {
            (animal as any)[field] = convertedDate;
            
            // Add warning for partial dates
            if (partialDateInfo.isPartial) {
              animal._warnings = animal._warnings || [];
              animal._warnings.push(`${SUPPORTED_FIELDS[field as keyof typeof SUPPORTED_FIELDS]?.label} parcial "${originalValue}": ${partialDateInfo.completedInfo}`);
            }
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
    // Check for unrecognized sex values first
    const unrecognizedValues = checkForUnrecognizedSexValues();
    if (unrecognizedValues.length > 0) {
      setUnrecognizedSexValues(unrecognizedValues);
      setSexMappingOpen(true);
      return;
    }

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

  const handleSexMappingsChange = (newMappings: SexMapping) => {
    setSexMappings(newMappings);
  };

  const handleSaveForFuture = (mappings: SexMapping) => {
    try {
      localStorage.setItem('sexValueMappings', JSON.stringify(mappings));
    } catch (error) {
      console.error('Error saving sex mappings to localStorage:', error);
    }
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
          <Select value={currentDefaults[field] || "__empty__"} onValueChange={(value) => updateDefault(field, value === "__empty__" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar valor por defecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__empty__">No seleccionar</SelectItem>
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
    <div className="w-full space-y-6 px-1">
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm">Paso 2: Mapear Columnas y Valores por Defecto</CardTitle>
          <CardDescription className="text-xs">
            Asocie las columnas de su archivo con los campos del sistema y proporcione valores por defecto para campos faltantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 w-full">
        {/* Preview of data */}
        <div className="w-full">
          <h4 className="font-medium mb-2">Vista previa de datos ({rawData.length} filas)</h4>
          <div className="border rounded max-h-40 overflow-y-auto w-full">
            <div className="space-y-2 p-3 w-full">
              {rawData.slice(0, 3).map((row, index) => (
                <Card key={index} className="p-2 w-full">
                  <div className="space-y-1 w-full">
                    {excelColumns.map(col => (
                      <div key={col} className="flex justify-between items-start text-xs gap-1 w-full min-w-0">
                        <span className="font-medium text-muted-foreground text-left max-w-[35%] break-words">{col}:</span>
                        <span className="text-right max-w-[65%] break-words min-w-0">{row[col]?.toString() || '-'}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Column mapping */}
        <div className="w-full">
          <h4 className="font-medium mb-3">Mapeo de Columnas</h4>
          <div className="space-y-3 w-full">
            {excelColumns.map(excelCol => (
              <div key={excelCol} className="space-y-2 w-full">
                <Label className="text-sm font-medium block break-words">
                  Columna: "{excelCol}"
                </Label>
                <Select 
                  value={currentMapping[excelCol] || "__no_mapping__"} 
                  onValueChange={(value) => updateMapping(excelCol, value === "__no_mapping__" ? null : value as keyof typeof SUPPORTED_FIELDS)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar campo del sistema" />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)]">
                    <SelectItem value="__no_mapping__">No mapear</SelectItem>
                    {supportedFieldKeys.map(field => (
                      <SelectItem key={field} value={field}>
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{SUPPORTED_FIELDS[field].label}</span>
                          {SUPPORTED_FIELDS[field].required && <Badge variant="destructive" className="ml-2 text-xs shrink-0">Req</Badge>}
                        </div>
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
          <div className="w-full">
            <h4 className="font-medium mb-3">Valores por Defecto para Campos Requeridos no Mapeados</h4>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Los siguientes campos son requeridos pero no están mapeadas a columnas. Proporcione valores por defecto:
              </AlertDescription>
            </Alert>
            <div className="space-y-3 w-full">
              {unmappedRequiredFields.map(field => (
                <div key={field} className="space-y-2 w-full">
                  <Label className="text-sm font-medium flex items-center gap-2 break-words">
                    <span className="break-words">{SUPPORTED_FIELDS[field].label}</span>
                    <Badge variant="destructive" className="text-xs shrink-0">Req</Badge>
                  </Label>
                  <div className="w-full">
                    {renderDefaultValueInput(field)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional default values */}
        <div className="w-full">
          <h4 className="font-medium mb-3">Valores por Defecto Opcionales</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Proporcione valores por defecto para campos que no estén en su archivo Excel
          </p>
          <div className="space-y-3 w-full">
            {supportedFieldKeys
              .filter(field => !SUPPORTED_FIELDS[field].required && !Object.values(currentMapping).includes(field))
              .map(field => (
                <div key={field} className="space-y-2 w-full">
                  <Label className="text-sm font-medium block break-words">
                    {SUPPORTED_FIELDS[field].label}
                  </Label>
                  <div className="w-full">
                    {renderDefaultValueInput(field)}
                  </div>
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
      <SexValueMappingDialog
        open={sexMappingOpen}
        onOpenChange={setSexMappingOpen}
        unrecognizedValues={unrecognizedSexValues}
        currentMappings={sexMappings}
        onMappingsChange={handleSexMappingsChange}
        onSaveForFuture={handleSaveForFuture}
      />
    </div>
  );
};