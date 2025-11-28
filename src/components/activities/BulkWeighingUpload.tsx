import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
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
  id_tag?: string;
  caravana_electronica?: string; // NEW: Support for electronic tag
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
  const { t } = useTranslation(['activities', 'common']);
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
        title: t('activities:bulkWeighing.invalidFile'),
        description: t('activities:bulkWeighing.selectExcelOrCSV'),
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
        title: t('common:status.error'),
        description: t('activities:bulkWeighing.errorProcessing'),
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
              id_tag: row.id_tag || row.identificacion || row.caravana || row.tag || '',
              caravana_electronica: row.caravana_electronica || row.electronic_tag || row.rfid || row.chip || '',
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
      .select("id, id_tag, caravana_electronica, name")
      .not('status', 'ilike', 'vendido')
      .not('status', 'ilike', 'muerto');

    if (error) {
      console.error("Error fetching animals:", error);
      throw error;
    }

    // Create maps for both id_tag and electronic tag lookups
    const animalByIdTag = new Map(animals?.map(a => [a.id_tag, a]) || []);
    const animalByElectronicTag = new Map(
      animals?.filter(a => a.caravana_electronica).map(a => [a.caravana_electronica!, a]) || []
    );

    return weighings.map((weighing, index) => {
      const errors: string[] = [];
      let isValid = true;

      // Validate that at least one identifier is provided
      if ((!weighing.id_tag || weighing.id_tag.trim() === '') && 
          (!weighing.caravana_electronica || weighing.caravana_electronica.trim() === '')) {
        errors.push(t('activities:bulkWeighing.requiredIdentifier'));
        isValid = false;
      }

      if (!weighing.peso_kg || weighing.peso_kg <= 0) {
        errors.push(t('activities:bulkWeighing.weightMustBePositive'));
        isValid = false;
      }

      // Find animal by either id_tag or electronic tag
      let animal = null;
      if (weighing.id_tag) {
        animal = animalByIdTag.get(weighing.id_tag);
      }
      if (!animal && weighing.caravana_electronica) {
        animal = animalByElectronicTag.get(weighing.caravana_electronica);
      }

      if (!animal) {
        errors.push(t('activities:bulkWeighing.animalNotFound'));
        isValid = false;
      }

      return {
        ...weighing,
        isValid,
        errors,
        animalId: animal?.id,
        animalName: animal?.name || animal?.id_tag
      };
    });
  };

  const handleUpload = async () => {
    if (validData.length === 0) {
      toast({
        variant: "destructive",
        title: t('common:status.error'),
        description: t('activities:bulkWeighing.noValidData'),
      });
      return;
    }

    setUploading(true);

    try {
      // Use today's date if no specific date provided
      const eventDate = new Date();
      
      // Create the event
      const event = await createEvent('PESAJE', eventDate, t('activities:bulkWeighing.successDescription', { count: validData.length }));

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

      // Animals will be updated automatically by trigger
      
      toast({
        title: t('activities:bulkWeighing.successTitle'),
        description: t('activities:bulkWeighing.successDescription', { count: validData.length }),
      });

      // Reset and close
      resetForm();
      onSuccess?.();
    } catch (error) {
      console.error("Error uploading weighings:", error);
      toast({
        variant: "destructive",
        title: t('common:status.error'),
        description: t('activities:bulkWeighing.errorUpload'),
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
      <DialogContent className="w-full h-full max-h-[100vh] lg:max-h-[90vh] lg:h-auto lg:max-w-5xl overflow-y-auto p-0 lg:p-6 lg:rounded-lg">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-50 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-lg">{t('activities:bulkWeighing.title')}</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            ✕
          </Button>
        </div>

        {/* Content wrapper */}
        <div className="p-4 lg:p-0">
        {/* Desktop Header */}
        <DialogHeader className="hidden lg:block">
          <DialogTitle>{t('activities:bulkWeighing.title')}</DialogTitle>
          <DialogDescription>
            {t('activities:bulkWeighing.description')}
          </DialogDescription>
        </DialogHeader>

        {currentStep === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <FileSpreadsheet className="h-5 w-5" />
                  {t('activities:bulkWeighing.selectFile')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('activities:bulkWeighing.uploadDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 lg:p-8 text-center">
                  <Upload className="h-10 w-10 lg:h-12 lg:w-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {t('activities:bulkWeighing.dragOrClick')}
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
                      className="h-12 lg:h-10 w-full lg:w-auto"
                    >
                      {loading ? t('activities:bulkWeighing.processing') : t('activities:bulkWeighing.selectFile')}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <Button variant="link" onClick={downloadTemplate} className="p-0 h-auto text-sm">
                    <Download className="h-4 w-4 mr-2" />
                    {t('activities:bulkWeighing.downloadTemplate')}
                  </Button>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong className="text-sm">{t('activities:bulkWeighing.requiredColumns')}</strong>
                    <ul className="mt-2 space-y-1 text-xs lg:text-sm">
                      <li>• {t('activities:bulkWeighing.idTagColumn')}</li>
                      <li>• {t('activities:bulkWeighing.weightColumn')}</li>
                      <li>• {t('activities:bulkWeighing.notesColumn')}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4 lg:space-y-6">
            <div className="grid gap-3 grid-cols-3 lg:gap-4">
              <Card>
                <CardHeader className="pb-2 px-3 pt-3 lg:px-6 lg:pt-6">
                  <CardTitle className="text-xs lg:text-sm font-medium text-green-600">{t('activities:bulkWeighing.valid')}</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 lg:px-6 lg:pb-6">
                  <div className="text-xl lg:text-2xl font-bold">{validData.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2 px-3 pt-3 lg:px-6 lg:pt-6">
                  <CardTitle className="text-xs lg:text-sm font-medium text-red-600">{t('activities:bulkWeighing.withErrors')}</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 lg:px-6 lg:pb-6">
                  <div className="text-xl lg:text-2xl font-bold">{invalidData.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2 px-3 pt-3 lg:px-6 lg:pt-6">
                  <CardTitle className="text-xs lg:text-sm font-medium">{t('activities:bulkWeighing.total')}</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 lg:px-6 lg:pb-6">
                  <div className="text-xl lg:text-2xl font-bold">{weighingData.length}</div>
                </CardContent>
              </Card>
            </div>

            {invalidData.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
                  <span className="text-sm">{t('activities:bulkWeighing.errorsFound', { count: invalidData.length })}</span>
                  <Button variant="outline" size="sm" onClick={downloadErrorReport} className="w-full lg:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    {t('activities:bulkWeighing.downloadErrors')}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Mobile: Card List */}
            <div className="lg:hidden space-y-3 max-h-96 overflow-y-auto">
              {weighingData.slice(0, 50).map((row, index) => (
                <div key={index} className={`border rounded-lg p-3 ${!row.isValid ? 'bg-red-50 border-red-200' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {row.isValid ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-medium text-sm">{row.id_tag}</div>
                      <div className="text-xs text-muted-foreground">{row.animalName || t('activities:bulkWeighing.notFound')}</div>
                      <div className="text-sm font-semibold">{row.peso_kg} kg</div>
                      {row.notas && (
                        <div className="text-xs text-muted-foreground">{row.notas}</div>
                      )}
                      {!row.isValid && (
                        <div className="space-y-0.5 mt-2">
                          {row.errors.map((error, i) => (
                            <div key={i} className="text-xs text-red-600 flex items-start gap-1">
                              <span>•</span>
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {row.isValid && (
                        <div className="text-xs text-green-600 font-medium">✓ {t('activities:bulkWeighing.validRecord')}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden lg:block border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>ID/Caravana</TableHead>
                <TableHead>{t('activities:bulkWeighing.animal')}</TableHead>
                <TableHead>{t('activities:bulkWeighing.weight')} (kg)</TableHead>
                <TableHead>{t('activities:bulkWeighing.notes')}</TableHead>
                <TableHead>{t('activities:bulkWeighing.status')}</TableHead>
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
                    <TableCell>{row.animalName || t('activities:bulkWeighing.notFound')}</TableCell>
                    <TableCell>{row.peso_kg}</TableCell>
                    <TableCell>{row.notas || '-'}</TableCell>
                    <TableCell>
                      {row.isValid ? (
                        <span className="text-green-600">{t('activities:bulkWeighing.validRecord')}</span>
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
                  {t('activities:bulkWeighing.showing', { total: weighingData.length })}
                </div>
              )}
            </div>

            {weighingData.length > 50 && (
              <div className="lg:hidden p-3 text-center text-xs text-muted-foreground bg-muted rounded-lg">
                {t('activities:bulkWeighing.showing', { total: weighingData.length })}
              </div>
            )}

            {/* Actions */}
            <div className="sticky bottom-0 left-0 right-0 bg-background border-t lg:border-0 p-4 lg:p-0 lg:static flex flex-col lg:flex-row gap-2 lg:justify-between -mx-4 lg:mx-0">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(1)}
                className="h-12 lg:h-10 w-full lg:w-auto order-2 lg:order-1"
              >
                {t('activities:bulkWeighing.back')}
              </Button>
              <div className="flex flex-col lg:flex-row gap-2 order-1 lg:order-2">
                <Button 
                  variant="outline" 
                  onClick={resetForm}
                  className="h-12 lg:h-10 w-full lg:w-auto"
                >
                  {t('common:actions.cancel')}
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={uploading || validData.length === 0}
                  className="h-12 lg:h-10 w-full lg:w-auto"
                >
                  {uploading ? t('activities:bulkWeighing.uploading') : `${t('activities:bulkWeighing.uploadWeighings')} ${validData.length}`}
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}