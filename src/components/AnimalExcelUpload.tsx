import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, Check, X, Download, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { convertToISODate, isValidBirthDate } from '@/lib/dateUtils';
import { useSubscription } from "@/hooks/useSubscription";

interface AnimalRow {
  identificacion: string;
  nombre?: string;
  sexo: string;
  raza: string;
  fecha_nacimiento?: string;
  peso_nacer?: number;
  estado?: string;
  padre_id?: string;
  madre_id?: string;
  mocho?: string;
  _originalIndex: number;
  _isValid: boolean;
  _errors: string[];
}

interface AnimalExcelUploadProps {
  userCabañaId: string;
  onUploadComplete: () => void;
}

const ARGENTINE_BREEDS = [
  "Angus", "Hereford", "Shorthorn", "Charolais", "Limousin", "Simmental",
  "Brahman", "Nelore", "Braford", "Brangus", "Santa Gertrudis", "Senepol",
  "Bonsmara", "Holando Argentino", "Jersey", "Criollo", "Wagyu", "Corriente", "Otro"
];

const AnimalExcelUpload = ({ userCabañaId, onUploadComplete }: AnimalExcelUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { subscriptionStatus, planNames } = useSubscription();

  // Column mapping (case-insensitive)
  const normalizeColumnName = (name: string): string => {
    const normalized = name.toLowerCase().trim();
    const mappings: { [key: string]: string } = {
      'identificación': 'identificacion',
      'identificacion': 'identificacion',
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
      'estado': 'estado',
      'status': 'estado',
      'padre_id': 'padre_id',
      'padre id': 'padre_id',
      'father': 'padre_id',
      'father_id': 'padre_id',
      'padre': 'padre_id',
      'madre_id': 'madre_id',
      'madre id': 'madre_id',
      'mother': 'madre_id',
      'mother_id': 'madre_id',
      'madre': 'madre_id',
      'mocho': 'mocho',
      'cuernos': 'mocho',
      'horns': 'mocho'
    };
    return mappings[normalized] || normalized;
  };

  // Validate individual animal row
  const validateAnimalRow = (row: any, index: number): AnimalRow => {
    const errors: string[] = [];
    const animal: AnimalRow = {
      identificacion: '',
      sexo: '',
      raza: '',
      _originalIndex: index,
      _isValid: true,
      _errors: []
    };

    // Required field: identificacion
    if (!row.identificacion || String(row.identificacion).trim() === '') {
      errors.push('Identificación es requerida');
    } else {
      animal.identificacion = String(row.identificacion).trim();
    }

    // Required field: sexo
    const sexo = String(row.sexo || '').trim().toLowerCase();
    if (!sexo) {
      errors.push('Sexo es requerido');
    } else if (!['macho', 'hembra', 'male', 'female', 'm', 'f'].includes(sexo)) {
      errors.push('Sexo debe ser "Macho" o "Hembra"');
    } else {
      animal.sexo = sexo === 'male' || sexo === 'm' || sexo === 'macho' ? 'Macho' : 'Hembra';
    }

    // Required field: raza
    if (!row.raza || String(row.raza).trim() === '') {
      errors.push('Raza es requerida');
    } else {
      const raza = String(row.raza).trim();
      if (!ARGENTINE_BREEDS.includes(raza)) {
        errors.push(`Raza "${raza}" no es válida`);
      } else {
        animal.raza = raza;
      }
    }

    // Optional fields
    if (row.nombre) animal.nombre = String(row.nombre).trim();
    if (row.padre_id) animal.padre_id = String(row.padre_id).trim();
    if (row.madre_id) animal.madre_id = String(row.madre_id).trim();
    if (row.estado) animal.estado = String(row.estado).trim();
    else animal.estado = 'Activo';

    // Validate fecha_nacimiento with automatic format detection
    if (row.fecha_nacimiento) {
      const convertedDate = convertToISODate(row.fecha_nacimiento);
      if (!convertedDate) {
        errors.push('Fecha de nacimiento no es válida o no se pudo convertir');
      } else if (!isValidBirthDate(convertedDate)) {
        errors.push('Fecha de nacimiento no puede ser en el futuro o muy antigua');
      } else {
        animal.fecha_nacimiento = convertedDate;
      }
    }

    // Validate peso_nacer
    if (row.peso_nacer) {
      const peso = parseFloat(String(row.peso_nacer));
      if (isNaN(peso) || peso < 0) {
        errors.push('Peso al nacer debe ser un número positivo');
      } else {
        animal.peso_nacer = peso;
      }
    }

    // Validate mocho
    if (row.mocho) {
      const mocho = String(row.mocho).toLowerCase().trim();
      if (['sí', 'si', 'yes', 'y', '1', 'true', 'mocho'].includes(mocho)) {
        animal.mocho = 'Mocho';
      } else if (['no', 'n', '0', 'false', 'con cuernos'].includes(mocho)) {
        animal.mocho = 'Con Cuernos';
      } else {
        animal.mocho = 'Desconocido';
      }
    } else {
      animal.mocho = 'Desconocido';
    }

    animal._errors = errors;
    animal._isValid = errors.length === 0;

    return animal;
  };

  // Parse file (Excel or CSV)
  const parseFile = (file: File): Promise<AnimalRow[]> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        // Parse CSV
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => normalizeColumnName(header),
          complete: (results) => {
            try {
              const validatedAnimals = results.data.map((row: any, index: number) => 
                validateAnimalRow(row, index + 1)
              );
              resolve(validatedAnimals);
            } catch (error) {
              reject(error);
            }
          },
          error: (error) => reject(error)
        });
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        // Parse Excel
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

            // Get headers and normalize them
            const headers = (jsonData[0] as string[]).map(normalizeColumnName);
            const rows = jsonData.slice(1) as any[][];

            // Convert to objects
            const objectData = rows.map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index];
              });
              return obj;
            });

            const validatedAnimals = objectData.map((row, index) => 
              validateAnimalRow(row, index + 1)
            );
            resolve(validatedAnimals);
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
    setErrors([]);
    
    try {
      const parsedAnimals = await parseFile(selectedFile);
      setAnimals(parsedAnimals);
      
      // Check for duplicate IDs within the file
      const idCounts: { [key: string]: number } = {};
      parsedAnimals.forEach(animal => {
        if (animal.identificacion) {
          idCounts[animal.identificacion] = (idCounts[animal.identificacion] || 0) + 1;
        }
      });
      
      // Mark duplicates
      const duplicateIds = Object.keys(idCounts).filter(id => idCounts[id] > 1);
      if (duplicateIds.length > 0) {
        setErrors([`IDs duplicados en el archivo: ${duplicateIds.join(', ')}`]);
      }
      
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

  // Bulk insert animals
  const handleBulkUpload = async () => {
    if (!userCabañaId) {
      toast({
        title: "Error",
        description: "No se pudo determinar su cabaña",
        variant: "destructive",
      });
      return;
    }

    const validAnimals = animals.filter(animal => animal._isValid);
    if (validAnimals.length === 0) {
      toast({
        title: "Error",
        description: "No hay animales válidos para cargar",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);
    setSuccessCount(0);
    setFailureCount(0);

    // Check subscription animal limit before bulk upload
    if (subscriptionStatus) {
      const activeAnimalsToAdd = validAnimals.filter(a => (a.estado || 'Activo') === 'Activo' || a.estado === 'activo').length;
      const wouldHave = subscriptionStatus.currentAnimalsCount + activeAnimalsToAdd;
      if (wouldHave > subscriptionStatus.maxAnimals) {
        toast({
          title: "Límite de animales superado",
          description: `Esta importación agregaría ${activeAnimalsToAdd} animales activos, superando el límite de ${subscriptionStatus.maxAnimals} del plan ${planNames[subscriptionStatus.plan]}. Tienes ${subscriptionStatus.currentAnimalsCount} actualmente. Actualiza tu plan para continuar.`,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
    }

    try {
      // Check for existing IDs in the database
      const existingIdRows = await fetchAllRows<{ id_tag: string | null }>((from, to) =>
        supabase
          .from('animals')
          .select('id_tag')
          .eq('cabaña_id', userCabañaId)
          .in('id_tag', validAnimals.map(a => a.identificacion))
          .range(from, to)
      );

      if (existingIdRows.length > 0) {
        const duplicateIds = existingIdRows.map(d => d.id_tag);
        toast({
          title: "IDs duplicados",
          description: `Los siguientes IDs ya existen: ${duplicateIds.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // Prepare data for insertion
      const animalsToInsert = validAnimals.map(animal => ({
        id_tag: animal.identificacion,
        name: animal.nombre || null,
        sex: animal.sexo,
        breed: animal.raza,
        birth_date: animal.fecha_nacimiento || null,
        peso_nacimiento: animal.peso_nacer || null,
        status: animal.estado || 'Activo',
        mocho: animal.mocho || null,
        cabaña_id: userCabañaId,
        // We'll handle parent relationships in a second pass
        mother_id: null,
        father_id: null
      }));

      // Bulk insert
      const { data: insertedAnimals, error: insertError } = await supabase
        .from('animals')
        .insert(animalsToInsert)
        .select();

      if (insertError) throw insertError;

      setSuccessCount(insertedAnimals?.length || 0);
      setUploadProgress(50);

      // Second pass: handle parent relationships
      if (insertedAnimals) {
        const parentUpdates = [];
        
        for (const [index, animal] of validAnimals.entries()) {
          const insertedAnimal = insertedAnimals[index];
          if (!insertedAnimal) continue;

          let motherUUID = null;
          let fatherUUID = null;

          // Look up parent UUIDs
          if (animal.madre_id) {
            const { data: motherData } = await supabase
              .from('animals')
              .select('id')
              .eq('id_tag', animal.madre_id)
              .eq('cabaña_id', userCabañaId)
              .eq('sex', 'Hembra')
              .single();
            motherUUID = motherData?.id || null;
          }

          if (animal.padre_id) {
            const { data: fatherData } = await supabase
              .from('animals')
              .select('id')
              .eq('id_tag', animal.padre_id)
              .eq('cabaña_id', userCabañaId)
              .eq('sex', 'Macho')
              .single();
            fatherUUID = fatherData?.id || null;
          }

          if (motherUUID || fatherUUID) {
            parentUpdates.push({
              id: insertedAnimal.id,
              mother_id: motherUUID,
              father_id: fatherUUID
            });
          }
        }

        // Update parent relationships
        if (parentUpdates.length > 0) {
          for (const update of parentUpdates) {
            await supabase
              .from('animals')
              .update({
                mother_id: update.mother_id,
                father_id: update.father_id
              })
              .eq('id', update.id);
          }
        }
      }

      setUploadProgress(100);
      
      toast({
        title: "¡Éxito!",
        description: `Se cargaron ${successCount} animales correctamente`,
      });

      onUploadComplete();
      setIsOpen(false);
      resetForm();

    } catch (error) {
      console.error('Error during bulk upload:', error);
      toast({
        title: "Error",
        description: "Error durante la carga masiva",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFile(null);
    setAnimals([]);
    setErrors([]);
    setUploadProgress(0);
    setSuccessCount(0);
    setFailureCount(0);
  };

  // Download error report
  const downloadErrorReport = () => {
    const invalidAnimals = animals.filter(a => !a._isValid);
    if (invalidAnimals.length === 0) return;

    const csvContent = [
      ['Fila', 'Identificación', 'Errores'].join(','),
      ...invalidAnimals.map(animal => 
        [animal._originalIndex, animal.identificacion, animal._errors.join('; ')].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errores_carga_animales.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = animals.filter(a => a._isValid).length;
  const invalidCount = animals.filter(a => !a._isValid).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <FileSpreadsheet className="h-4 w-4" />
          <span>📂 Cargar Animales desde Excel</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carga Masiva de Animales</DialogTitle>
          <DialogDescription>
            Cargue múltiples animales desde un archivo Excel (.xlsx) o CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">1. Seleccionar Archivo</CardTitle>
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
                    Columnas esperadas: identificación, nombre, sexo, raza, fecha_nacimiento, peso_nacer, estado, padre_id, madre_id, mocho
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Indicator */}
          {isProcessing && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Procesando archivo...</p>
                    {uploadProgress > 0 && (
                      <Progress value={uploadProgress} className="mt-2" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Results */}
          {animals.length > 0 && !isProcessing && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">2. Resultados de Validación</CardTitle>
                  <CardDescription>
                    Revise los datos antes de proceder con la carga
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{validCount}</div>
                      <div className="text-sm text-muted-foreground">Válidos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
                      <div className="text-sm text-muted-foreground">Con errores</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{animals.length}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                  </div>

                  {errors.length > 0 && (
                    <Alert className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {errors.map((error, index) => (
                            <div key={index}>{error}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {invalidCount > 0 && (
                    <div className="flex justify-end mb-4">
                      <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar Reporte de Errores
                      </Button>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="max-h-60 overflow-y-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Estado</TableHead>
                          <TableHead>Identificación</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Sexo</TableHead>
                          <TableHead>Raza</TableHead>
                          <TableHead>F. Nacimiento</TableHead>
                          <TableHead>Errores</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {animals.slice(0, 10).map((animal, index) => (
                          <TableRow key={index} className={animal._isValid ? '' : 'bg-red-50'}>
                            <TableCell>
                              {animal._isValid ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-red-600" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{animal.identificacion}</TableCell>
                            <TableCell>{animal.nombre || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={animal.sexo === 'Macho' ? 'default' : 'secondary'}>
                                {animal.sexo}
                              </Badge>
                            </TableCell>
                            <TableCell>{animal.raza}</TableCell>
                            <TableCell>{animal.fecha_nacimiento || '-'}</TableCell>
                            <TableCell>
                              {animal._errors.length > 0 && (
                                <div className="text-xs text-red-600">
                                  {animal._errors.slice(0, 2).join(', ')}
                                  {animal._errors.length > 2 && '...'}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {animals.length > 10 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              ... y {animals.length - 10} más
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleBulkUpload}
                  disabled={validCount === 0 || isProcessing}
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Cargar {validCount} Animales</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnimalExcelUpload;