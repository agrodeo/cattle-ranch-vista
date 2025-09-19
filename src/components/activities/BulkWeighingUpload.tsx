import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface WeighingRow {
  id_tag: string;
  peso_kg: number;
  fecha?: string;
  notas?: string;
  isValid: boolean;
  errors: string[];
  animalId?: string;
  animalName?: string;
}

interface BulkWeighingUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkWeighingUpload({ open, onOpenChange, onSuccess }: BulkWeighingUploadProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [weighingData, setWeighingData] = useState<WeighingRow[]>([]);
  const [validData, setValidData] = useState<WeighingRow[]>([]);
  const [invalidData, setInvalidData] = useState<WeighingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { createEvent } = useActivities();

  const handleFileSelect = async (selectedFile: File) => {
    if (!selectedFile) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(selectedFile.type)) {
      toast({
        variant: "destructive",
        title: "Archivo no válido",
        description: "Por favor, selecciona un archivo Excel (.xlsx, .xls) o CSV",
      });
      return;
    }

    setFile(selectedFile);
    setLoading(true);

    try {
      const weighings = await parseFile(selectedFile);
      const validated = await validateWeighingData(weighings);
      setWeighingData(validated);
      
      const valid = validated.filter(w => w.isValid);
      const invalid = validated.filter(w => !w.isValid);
      
      setValidData(valid);
      setInvalidData(invalid);
      setCurrentStep(2);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar el archivo",
      });
    } finally {
      setLoading(false);
    }
  };

  const parseFile = async (file: File): Promise<Omit<WeighingRow, 'isValid' | 'errors'>[]> => {
    return new Promise((resolve, reject) => {
      if (file.type === 'text/csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const weighings = results.data.map((row: any) => ({
              id_tag: row.id_tag || row.identificacion || row.caravana || '',
              peso_kg: parseFloat(row.peso_kg || row.peso || row.weight || '0'),
              fecha: row.fecha || row.date || '',
              notas: row.notas || row.observaciones || row.notes || ''
            }));
            resolve(weighings);
          },
          error: reject
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            const weighings = jsonData.map((row: any) => ({
              id_tag: row.id_tag || row.identificacion || row.caravana || '',
              peso_kg: parseFloat(row.peso_kg || row.peso || row.weight || '0'),
              fecha: row.fecha || row.date || '',
              notas: row.notas || row.observaciones || row.notes || ''
            }));
            
            resolve(weighings);
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const validateWeighingData = async (weighings: Omit<WeighingRow, 'isValid' | 'errors'>[]): Promise<WeighingRow[]> => {
    // Get all animals from the current cabaña
    const { data: animals, error } = await supabase
      .from("animals")
      .select("id, id_tag, name")
      .not('status', 'ilike', 'vendido')
      .not('status', 'ilike', 'muerto');

    if (error) {
      console.error("Error fetching animals:", error);
      throw error;
    }

    const animalMap = new Map(animals?.map(a => [a.id_tag, a]) || []);

    return weighings.map((weighing, index) => {
      const errors: string[] = [];
      let isValid = true;

      // Validate required fields
      if (!weighing.id_tag || weighing.id_tag.trim() === '') {
        errors.push('ID/Caravana es requerido');
        isValid = false;
      }

      if (!weighing.peso_kg || weighing.peso_kg <= 0) {
        errors.push('Peso debe ser mayor a 0 kg');
        isValid = false;
      }

      // Check if animal exists
      const animal = animalMap.get(weighing.id_tag);
      if (!animal) {
        errors.push('Animal no encontrado en la cabaña');
        isValid = false;
      }

      return {
        ...weighing,
        isValid,
        errors,
        animalId: animal?.id,
        animalName: animal?.name
      };
    });
  };

  const handleUpload = async () => {
    if (validData.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay datos válidos para cargar",
      });
      return;
    }

    setUploading(true);

    try {
      // Use today's date if no specific date provided
      const eventDate = new Date();
      
      // Create the event
      const event = await createEvent('PESAJE', eventDate, `Carga masiva de ${validData.length} pesajes`);

      // Prepare measurements data
      const mediciones = validData.map(row => ({
        animal_id: row.animalId,
        peso_kg: row.peso_kg
      }));

      // Create the weighing record
      const { error } = await supabase
        .from("pesajes")
        .insert({
          evento_id: event.id,
          mediciones,
        });

      if (error) throw error;

      // Update animal weights
      for (const row of validData) {
        await supabase
          .from("animals")
          .update({
            peso_actual_kg: row.peso_kg,
            fecha_ultimo_pesaje: eventDate.toISOString().split('T')[0]
          })
          .eq('id', row.animalId);
      }

      toast({
        title: "Pesajes cargados exitosamente",
        description: `Se registraron ${validData.length} pesajes`,
      });

      // Reset and close
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error("Error uploading weighings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los pesajes",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFile(null);
    setWeighingData([]);
    setValidData([]);
    setInvalidData([]);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const template = [
      { id_tag: 'A001', peso_kg: 350.5, notas: 'Ejemplo de pesaje' },
      { id_tag: 'A002', peso_kg: 280.0, notas: '' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Pesajes");
    XLSX.writeFile(workbook, "plantilla_pesajes.xlsx");
  };

  const downloadErrorReport = () => {
    if (invalidData.length === 0) return;

    const errorReport = invalidData.map(row => ({
      id_tag: row.id_tag,
      peso_kg: row.peso_kg,
      errores: row.errors.join('; ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(errorReport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Errores");
    XLSX.writeFile(workbook, "errores_pesajes.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carga Masiva de Pesajes</DialogTitle>
          <DialogDescription>
            Importa múltiples pesajes desde un archivo Excel o CSV
          </DialogDescription>
        </DialogHeader>

        {currentStep === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Seleccionar Archivo
                </CardTitle>
                <CardDescription>
                  Sube un archivo Excel (.xlsx, .xls) o CSV con los datos de pesaje
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Arrastra tu archivo aquí o haz clic para seleccionar
                    </p>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      {loading ? "Procesando..." : "Seleccionar Archivo"}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <Button variant="link" onClick={downloadTemplate} className="p-0">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Plantilla
                  </Button>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Columnas requeridas:</strong>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• <strong>id_tag</strong> o <strong>identificacion</strong>: Identificación del animal</li>
                      <li>• <strong>peso_kg</strong> o <strong>peso</strong>: Peso en kilogramos</li>
                      <li>• <strong>notas</strong> (opcional): Observaciones</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">Válidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{validData.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-600">Con Errores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{invalidData.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{weighingData.length}</div>
                </CardContent>
              </Card>
            </div>

            {invalidData.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Se encontraron {invalidData.length} registros con errores</span>
                  <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Errores
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>ID/Caravana</TableHead>
                    <TableHead>Animal</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weighingData.slice(0, 50).map((row, index) => (
                    <TableRow key={index} className={!row.isValid ? "bg-red-50" : ""}>
                      <TableCell>
                        {row.isValid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{row.id_tag}</TableCell>
                      <TableCell>{row.animalName || 'No encontrado'}</TableCell>
                      <TableCell>{row.peso_kg}</TableCell>
                      <TableCell>{row.notas || '-'}</TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <span className="text-green-600">Válido</span>
                        ) : (
                          <div className="space-y-1">
                            {row.errors.map((error, i) => (
                              <div key={i} className="text-xs text-red-600">{error}</div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {weighingData.length > 50 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t">
                  Mostrando primeros 50 registros de {weighingData.length} total
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Volver
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={uploading || validData.length === 0}
                >
                  {uploading ? "Cargando..." : `Cargar ${validData.length} Pesajes`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}