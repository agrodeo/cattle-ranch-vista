import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { convertToISODate, isValidBirthDate } from '@/lib/dateUtils';
import { ColumnMappingStep } from "./ColumnMappingStep";
import { PreviewAndEditStep } from "./PreviewAndEditStep";
import { ConsanguinityAnalysis } from "./ConsanguinityAnalysis";
import { FamilyTreeVisualization } from "./FamilyTreeVisualization";

export interface AnimalFieldMapping {
  // Required fields
  identificacion: string;
  sexo: string;
  raza: string;
  fecha_nacimiento: string;
  
  // Optional fields
  nombre?: string;
  peso_nacer?: number;
  peso_final?: number;
  circunferencia_escrotal?: number;
  estado?: string;
  padre_id?: string;
  madre_id?: string;
  mocho?: string;
  observaciones?: string;
  tipo_parto?: string;
  condicion_corporal?: number;
  fecha_destete?: string;
  peso_destete?: number;
  fecha_servicio?: string;
  toro_servicio_id?: string;
  tipo_servicio?: string;
  resultado_preñez?: string;
  fecha_muerte?: string;
  registration_level?: string;
  mother_name?: string;
  father_name?: string;
  mother_breed?: string;
  father_breed?: string;
  mother_registration?: string;
  father_registration?: string;
  
  // Metadata
  _originalIndex: number;
  _isValid: boolean;
  _errors: string[];
  _warnings: string[];
  _category?: string;
  _consanguinityCoefficient?: number;
  
  // Braford Registration Fields
  registro_padre?: string;
  registro_madre?: string;
  registro_sugerido?: string;
  registro_nivel_calculado?: string;
}

export interface ColumnMapping {
  [excelColumn: string]: keyof AnimalFieldMapping | null;
}

export interface DefaultValues {
  [field: string]: any;
}

interface AnimalExcelUploadAdvancedProps {
  userCabañaId: string;
  onUploadComplete: () => void;
  isMobileMode?: boolean;
}

export const SUPPORTED_FIELDS = {
  identificacion: { label: "Identificación", required: true, type: "text" },
  nombre: { label: "Nombre", required: false, type: "text" },
  sexo: { label: "Sexo", required: true, type: "select", options: ["Macho", "Hembra"] },
  raza: { label: "Raza", required: true, type: "select", options: ["Angus", "Hereford", "Shorthorn", "Charolais", "Limousin", "Simmental", "Brahman", "Nelore", "Braford", "Brangus", "Santa Gertrudis", "Senepol", "Bonsmara", "Holando Argentino", "Jersey", "Criollo", "Wagyu", "Corriente", "Otro"] },
  fecha_nacimiento: { label: "Fecha de Nacimiento", required: true, type: "date" },
  peso_nacer: { label: "Peso al Nacer (kg)", required: false, type: "number" },
  peso_final: { label: "Peso Final (kg)", required: false, type: "number" },
  circunferencia_escrotal: { label: "Circunferencia Escrotal (CE, cm)", required: false, type: "number" },
  estado: { label: "Estado", required: false, type: "select", options: ["Activo", "Vendido", "Muerto", "Transferido"] },
  padre_id: { label: "Padre ID", required: false, type: "text" },
  madre_id: { label: "Madre ID", required: false, type: "text" },
  mocho: { label: "¿Mocho?", required: false, type: "select", options: ["Mocho", "Con Cuernos", "Desconocido"] },
  observaciones: { label: "Observaciones / Notas", required: false, type: "textarea" },
  tipo_parto: { label: "Tipo de Parto", required: false, type: "select", options: ["Simple", "Gemelar", "Dificultoso", "Natural"] },
  condicion_corporal: { label: "Condición Corporal (1-5)", required: false, type: "number" },
  fecha_destete: { label: "Fecha de Destete", required: false, type: "date" },
  peso_destete: { label: "Peso al Destete (kg)", required: false, type: "number" },
  fecha_servicio: { label: "Fecha de Servicio", required: false, type: "date" },
  toro_servicio_id: { label: "Toro de Servicio ID", required: false, type: "text" },
  tipo_servicio: { label: "Tipo de Servicio", required: false, type: "select", options: ["Natural", "I.A.", "Transferencia Embrionaria"] },
  resultado_preñez: { label: "Resultado de Preñez", required: false, type: "select", options: ["Positiva", "Negativa", "Vacía", "Muerta"] },
  fecha_muerte: { label: "Fecha de Muerte", required: false, type: "date" },
  registration_level: { label: "Registro", required: false, type: "select", options: ["Avanzado", "Avanzado Definitivo", "Controlado", "Puro de Pedigree", "Puro Registrado", "Sin Registro", "Puro por Cruza", "Terneros Registrados", "PC (Puro Controlado)", "PR (Puro Registrado)", "PP (Puro de Pedigree)"] },
  mother_name: { label: "Nombre de la Madre", required: false, type: "text" },
  father_name: { label: "Nombre del Padre", required: false, type: "text" },
  mother_breed: { label: "Raza de la Madre", required: false, type: "select", options: ["Angus", "Hereford", "Shorthorn", "Charolais", "Limousin", "Simmental", "Brahman", "Nelore", "Braford", "Brangus", "Santa Gertrudis", "Senepol", "Bonsmara", "Holando Argentino", "Jersey", "Criollo", "Wagyu", "Corriente", "Otro"] },
  father_breed: { label: "Raza del Padre", required: false, type: "select", options: ["Angus", "Hereford", "Shorthorn", "Charolais", "Limousin", "Simmental", "Brahman", "Nelore", "Braford", "Brangus", "Santa Gertrudis", "Senepol", "Bonsmara", "Holando Argentino", "Jersey", "Criollo", "Wagyu", "Corriente", "Otro"] },
  mother_registration: { label: "Registro de la Madre", required: false, type: "select", options: ["Avanzado", "Avanzado Definitivo", "Controlado", "Puro de Pedigree", "Puro Registrado", "Sin Registro", "Puro por Cruza", "Terneros Registrados", "PC (Puro Controlado)", "PR (Puro Registrado)", "PP (Puro de Pedigree)"] },
  father_registration: { label: "Registro del Padre", required: false, type: "select", options: ["Avanzado", "Avanzado Definitivo", "Controlado", "Puro de Pedigree", "Puro Registrado", "Sin Registro", "Puro por Cruza", "Terneros Registrados", "PC (Puro Controlado)", "PR (Puro Registrado)", "PP (Puro de Pedigree)"] }
};

type UploadStep = 'upload' | 'mapping' | 'preview' | 'consanguinity' | 'family-tree' | 'complete';

const AnimalExcelUploadAdvanced = ({ userCabañaId, onUploadComplete, isMobileMode = false }: AnimalExcelUploadAdvancedProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [defaultValues, setDefaultValues] = useState<DefaultValues>({});
  const [mappedAnimals, setMappedAnimals] = useState<AnimalFieldMapping[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [consanguinityResults, setConsanguinityResults] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse file (Excel or CSV)
  const parseFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            resolve(results.data);
          },
          error: (error) => reject(error)
        });
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (jsonData.length < 2) {
              reject(new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos'));
              return;
            }

            const headers = jsonData[0] as string[];
            const rows = jsonData.slice(1) as any[][];

            const objectData = rows.map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index];
              });
              return obj;
            });

            resolve(objectData);
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Formato de archivo no soportado. Use .xlsx, .xls o .csv'));
      }
    });
  };

  // Handle file selection
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    
    try {
      const parsedData = await parseFile(selectedFile);
      setRawData(parsedData);
      
      // Auto-detect column mappings
      const detectedMapping = autoDetectColumnMapping(parsedData);
      setColumnMapping(detectedMapping);
      
      setCurrentStep('mapping');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error procesando el archivo",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-detect column mappings based on header names
  const autoDetectColumnMapping = (data: any[]): ColumnMapping => {
    if (data.length === 0) return {};
    
    const headers = Object.keys(data[0]);
    const mapping: ColumnMapping = {};
    
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      // Simple mapping based on common column names
      const mappings: { [key: string]: keyof AnimalFieldMapping } = {
        'identificacion': 'identificacion',
        'identificación': 'identificacion',
        'id': 'identificacion',
        'tag': 'identificacion',
        'nombre': 'nombre',
        'name': 'nombre',
        'sexo': 'sexo',
        'sex': 'sexo',
        'género': 'sexo',
        'genero': 'sexo',
        'raza': 'raza',
        'breed': 'raza',
        'fecha_nacimiento': 'fecha_nacimiento',
        'fecha nacimiento': 'fecha_nacimiento',
        'birth_date': 'fecha_nacimiento',
        'nacimiento': 'fecha_nacimiento',
        'peso_nacer': 'peso_nacer',
        'peso nacer': 'peso_nacer',
        'peso_nacimiento': 'peso_nacer',
        'birth_weight': 'peso_nacer',
        'peso': 'peso_nacer',
        'padre_id': 'padre_id',
        'padre id': 'padre_id',
        'father': 'padre_id',
        'padre': 'padre_id',
        'madre_id': 'madre_id',
        'madre id': 'madre_id',
        'mother': 'madre_id',
        'madre': 'madre_id'
      };
      
      if (mappings[normalizedHeader]) {
        mapping[header] = mappings[normalizedHeader];
      }
    });
    
    return mapping;
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ['xlsx', 'xls', 'csv'].includes(ext || '');
    });
    
    if (validFile) {
      handleFileSelect(validFile);
    } else {
      toast({
        title: "Archivo no válido",
        description: "Por favor seleccione un archivo .xlsx, .xls o .csv",
        variant: "destructive",
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setCurrentStep('upload');
    setFile(null);
    setRawData([]);
    setColumnMapping({});
    setDefaultValues({});
    setMappedAnimals([]);
    setUploadProgress(0);
    setConsanguinityResults([]);
  };

  const handleComplete = () => {
    onUploadComplete();
    if (!isMobileMode) {
      setIsOpen(false);
    }
    resetForm();
  };

  // Mobile mode renders without dialog wrapper
  if (isMobileMode) {
    return (
      <div 
        className="space-y-4 w-full max-w-full overflow-x-hidden"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground overflow-x-hidden max-w-full px-2">
          <div className="flex items-center space-x-1">
            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-medium ${currentStep === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1</div>
            <span className="hidden sm:inline">Subir</span>
          </div>
          <div className="w-4 h-0.5 bg-muted flex-shrink-0" />
          <div className="flex items-center space-x-1">
            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-medium ${currentStep === 'mapping' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2</div>
            <span className="hidden sm:inline">Mapear</span>
          </div>
          <div className="w-4 h-0.5 bg-muted flex-shrink-0" />
          <div className="flex items-center space-x-1">
            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-medium ${currentStep === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>3</div>
            <span className="hidden sm:inline">Vista</span>
          </div>
          <div className="w-4 h-0.5 bg-muted flex-shrink-0" />
          <div className="flex items-center space-x-1">
            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-medium ${currentStep === 'consanguinity' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>4</div>
            <span className="hidden sm:inline">Análisis</span>
          </div>
        </div>

        {/* Step 1: File Upload */}
        {currentStep === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Paso 1: Seleccionar Archivo</CardTitle>
              <CardDescription>
                Formatos soportados: .xlsx, .xls, .csv
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                />
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {file ? file.name : 'Arrastre un archivo aquí o haga clic para seleccionar'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    El sistema detectará automáticamente las columnas y le permitirá mapearlas a los campos del sistema
                  </p>
                </div>
              </div>

              {isProcessing && (
                <div className="mt-4 flex items-center space-x-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="text-sm">Procesando archivo...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Column Mapping */}
        {currentStep === 'mapping' && (
          <div 
            className="overflow-y-auto max-h-[calc(100vh-200px)]"
            style={{ touchAction: 'pan-y' }}
          >
            <ColumnMappingStep
              rawData={rawData}
              columnMapping={columnMapping}
              defaultValues={defaultValues}
              onMappingChange={setColumnMapping}
              onDefaultValuesChange={setDefaultValues}
              onNext={(mappedData) => {
              setMappedAnimals(mappedData);
              setCurrentStep('preview');
            }}
            onBack={() => setCurrentStep('upload')}
          />
          </div>
        )}

        {/* Step 3: Preview and Edit */}
        {currentStep === 'preview' && (
          <PreviewAndEditStep
            animals={mappedAnimals}
            userCabañaId={userCabañaId}
            onEdit={setMappedAnimals}
            onNext={(animals) => {
              setMappedAnimals(animals);
              setCurrentStep('consanguinity');
            }}
            onBack={() => setCurrentStep('mapping')}
            onComplete={handleComplete}
          />
        )}

        {/* Step 4: Consanguinity Analysis */}
        {currentStep === 'consanguinity' && (
          <ConsanguinityAnalysis
            animals={mappedAnimals}
            onNext={(results) => {
              setConsanguinityResults(results);
              setCurrentStep('family-tree');
            }}
            onBack={() => setCurrentStep('preview')}
            onSkip={() => setCurrentStep('family-tree')}
          />
        )}

        {/* Step 5: Family Tree Visualization */}
        {currentStep === 'family-tree' && (
          <FamilyTreeVisualization
            animals={mappedAnimals}
            consanguinityResults={consanguinityResults}
            onComplete={handleComplete}
            onBack={() => setCurrentStep('consanguinity')}
          />
        )}
      </div>
    );
  }

  // Desktop mode with dialog
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <FileSpreadsheet className="h-4 w-4" />
          <span>📊 Carga Masiva Avanzada</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Carga Masiva Avanzada de Animales</DialogTitle>
          <DialogDescription>
            Sistema completo de carga masiva con mapeo de columnas, validación y análisis genealógico
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className={`w-3 h-3 rounded-full ${currentStep === 'upload' ? 'bg-primary' : 'bg-muted'}`} />
            <span>Subir</span>
            <div className="flex-1 h-0.5 bg-muted" />
            <div className={`w-3 h-3 rounded-full ${currentStep === 'mapping' ? 'bg-primary' : 'bg-muted'}`} />
            <span>Mapear</span>
            <div className="flex-1 h-0.5 bg-muted" />
            <div className={`w-3 h-3 rounded-full ${currentStep === 'preview' ? 'bg-primary' : 'bg-muted'}`} />
            <span>Previsualizar</span>
            <div className="flex-1 h-0.5 bg-muted" />
            <div className={`w-3 h-3 rounded-full ${currentStep === 'consanguinity' ? 'bg-primary' : 'bg-muted'}`} />
            <span>Análisis</span>
          </div>

          {/* Step 1: File Upload */}
          {currentStep === 'upload' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Paso 1: Seleccionar Archivo</CardTitle>
                <CardDescription>
                  Formatos soportados: .xlsx, .xls, .csv
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className="hidden"
                  />
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      {file ? file.name : 'Arrastre un archivo aquí o haga clic para seleccionar'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      El sistema detectará automáticamente las columnas y le permitirá mapearlas a los campos del sistema
                    </p>
                  </div>
                </div>

                {isProcessing && (
                  <div className="mt-4 flex items-center space-x-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="text-sm">Procesando archivo...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Column Mapping */}
          {currentStep === 'mapping' && (
            <ColumnMappingStep
              rawData={rawData}
              columnMapping={columnMapping}
              defaultValues={defaultValues}
              onMappingChange={setColumnMapping}
              onDefaultValuesChange={setDefaultValues}
              onNext={(mappedData) => {
                setMappedAnimals(mappedData);
                setCurrentStep('preview');
              }}
              onBack={() => setCurrentStep('upload')}
            />
          )}

          {/* Step 3: Preview and Edit */}
          {currentStep === 'preview' && (
            <PreviewAndEditStep
              animals={mappedAnimals}
              userCabañaId={userCabañaId}
              onEdit={setMappedAnimals}
              onNext={(animals) => {
                setMappedAnimals(animals);
                setCurrentStep('consanguinity');
              }}
              onBack={() => setCurrentStep('mapping')}
              onComplete={handleComplete}
            />
          )}

          {/* Step 4: Consanguinity Analysis */}
          {currentStep === 'consanguinity' && (
            <ConsanguinityAnalysis
              animals={mappedAnimals}
              onNext={(results) => {
                setConsanguinityResults(results);
                setCurrentStep('family-tree');
              }}
              onBack={() => setCurrentStep('preview')}
              onSkip={() => setCurrentStep('family-tree')}
            />
          )}

          {/* Step 5: Family Tree Visualization */}
          {currentStep === 'family-tree' && (
            <FamilyTreeVisualization
              animals={mappedAnimals}
              consanguinityResults={consanguinityResults}
              onComplete={handleComplete}
              onBack={() => setCurrentStep('consanguinity')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnimalExcelUploadAdvanced;