import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  caravana_electronica?: string;
  peso_kg: number;
  fecha?: string; // ISO YYYY-MM-DD
  notas?: string;
  isValid: boolean;
  errors: string[];
  animalId?: string;
  animalName?: string;
  matchedBy?: 'id_tag' | 'eid';
}

interface BulkWeighingUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// ---- Helpers ----

const digitsOnly = (s?: string) => (s ?? "").replace(/\D/g, "");

function tagKeys(raw?: string): string[] {
  const d = digitsOnly(raw);
  if (!d) return [];
  const noLeadingZeros = d.replace(/^0+/, "");
  const last12 = d.slice(-12);
  const last12NoZeros = last12.replace(/^0+/, "");
  return Array.from(new Set([d, noLeadingZeros, last12, last12NoZeros]))
    .filter(k => k.length >= 6);
}

function normalizeKeys(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(row)) {
    if (k == null) continue;
    out[String(k).trim().toLowerCase()] = row[k];
  }
  return out;
}

const ELECTRONIC_TAG_ALIASES = ['eid', 'electronic_id', 'rfid', 'chip', 'caravana_electronica', 'electronic_tag'];
const VISUAL_TAG_ALIASES = ['id_tag', 'identificacion', 'identificación', 'caravana', 'tag'];
const WEIGHT_ALIASES = ['weight', 'peso', 'peso_kg', 'kg'];
const DATE_ALIASES = ['date', 'fecha'];
const NOTES_ALIASES = ['notas', 'observaciones', 'notes'];

function pick(row: Record<string, any>, aliases: string[]): any {
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== null && String(row[a]).trim() !== '') return row[a];
  }
  return undefined;
}

function parseDateValue(v: any): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  // Excel date serial number
  if (typeof v === 'number' && isFinite(v)) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = epoch.getTime() + Math.round(v) * 86400000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  // ISO YYYY-MM-DD (optionally with time)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // DD/MM/YYYY or D/M/YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    let yyyy = dmy[3];
    if (yyyy.length === 2) yyyy = (parseInt(yyyy, 10) > 50 ? '19' : '20') + yyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  return undefined;
}

function mapRow(rawRow: Record<string, any>): Omit<WeighingRow, 'isValid' | 'errors'> {
  const r = normalizeKeys(rawRow);
  const id_tag = pick(r, VISUAL_TAG_ALIASES);
  const caravana_electronica = pick(r, ELECTRONIC_TAG_ALIASES);
  const weightRaw = pick(r, WEIGHT_ALIASES);
  const peso_kg = weightRaw !== undefined ? parseFloat(String(weightRaw).replace(',', '.')) : NaN;
  const fecha = parseDateValue(pick(r, DATE_ALIASES));
  const notas = pick(r, NOTES_ALIASES);
  return {
    id_tag: id_tag !== undefined ? String(id_tag).trim() : '',
    caravana_electronica: caravana_electronica !== undefined ? String(caravana_electronica).trim() : '',
    peso_kg: isFinite(peso_kg) ? peso_kg : 0,
    fecha,
    notas: notas !== undefined ? String(notas) : '',
  };
}

export function BulkWeighingUpload({ open, onOpenChange, onSuccess }: BulkWeighingUploadProps) {
  const { t } = useTranslation(['activities', 'common']);
  const [currentStep, setCurrentStep] = useState(1);
  const [, setFile] = useState<File | null>(null);
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

    const name = selectedFile.name.toLowerCase();
    const isCSV = name.endsWith('.csv');
    const isXLSX = name.endsWith('.xlsx') || name.endsWith('.xls');

    if (!isCSV && !isXLSX) {
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
      const weighings = await parseFile(selectedFile, isCSV);
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

  const parseFile = async (file: File, isCSV: boolean): Promise<Omit<WeighingRow, 'isValid' | 'errors'>[]> => {
    return new Promise((resolve, reject) => {
      if (isCSV) {
        // Read as text to normalize \r-only line endings before parsing
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            let text = String(e.target?.result ?? '');
            // Normalize old-Mac \r-only and Windows \r\n line endings
            text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const results = Papa.parse<Record<string, any>>(text, {
              header: true,
              skipEmptyLines: true,
              delimitersToGuess: [';', ',', '\t', '|'],
              transformHeader: (h) => String(h).trim(),
            });
            const weighings = (results.data || []).map(mapRow);
            resolve(weighings);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array', cellDates: false });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true });
            resolve(jsonData.map(mapRow));
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const validateWeighingData = async (
    weighings: Omit<WeighingRow, 'isValid' | 'errors'>[]
  ): Promise<WeighingRow[]> => {
    const { data: animals, error } = await supabase
      .from("animals")
      .select("id, id_tag, caravana_electronica, name")
      .not('status', 'ilike', 'vendido')
      .not('status', 'ilike', 'muerto');

    if (error) {
      console.error("Error fetching animals:", error);
      throw error;
    }

    // Build unified lookup map across both id_tag and caravana_electronica variants.
    // Value tracks origin field; collisions are marked ambiguous.
    type LookupEntry = { animal: { id: string; id_tag: string; caravana_electronica?: string | null; name?: string | null }; field: 'id_tag' | 'eid'; ambiguous: boolean };
    const lookup = new Map<string, LookupEntry>();

    const addKey = (key: string, animal: any, field: 'id_tag' | 'eid') => {
      const existing = lookup.get(key);
      if (!existing) {
        lookup.set(key, { animal, field, ambiguous: false });
        return;
      }
      if (existing.animal.id !== animal.id) {
        existing.ambiguous = true;
      }
    };

    for (const a of animals || []) {
      for (const k of tagKeys(a.id_tag || undefined)) addKey(k, a, 'id_tag');
      for (const k of tagKeys(a.caravana_electronica || undefined)) addKey(k, a, 'eid');
    }

    const allStoredKeys = Array.from(lookup.keys());

    const findAnimal = (
      visual?: string,
      eid?: string
    ): { entry?: LookupEntry; ambiguous: boolean } => {
      const incomingKeys = [
        ...tagKeys(visual).map(k => ({ k, field: 'id_tag' as const })),
        ...tagKeys(eid).map(k => ({ k, field: 'eid' as const })),
      ];

      // 1) Exact normalized match
      for (const { k } of incomingKeys) {
        const entry = lookup.get(k);
        if (entry) {
          if (entry.ambiguous) return { ambiguous: true };
          return { entry, ambiguous: false };
        }
      }

      // 2) Suffix match (>=8 digit overlap), must be unique animal
      const matches = new Map<string, LookupEntry>();
      for (const { k } of incomingKeys) {
        if (k.length < 8) continue;
        for (const stored of allStoredKeys) {
          if (stored.length < 8) continue;
          if (stored.endsWith(k) || k.endsWith(stored)) {
            const overlap = Math.min(stored.length, k.length);
            if (overlap >= 8) {
              const entry = lookup.get(stored)!;
              if (!entry.ambiguous) matches.set(entry.animal.id, entry);
              else return { ambiguous: true };
            }
          }
        }
      }
      if (matches.size === 1) return { entry: Array.from(matches.values())[0], ambiguous: false };
      if (matches.size > 1) return { ambiguous: true };
      return { ambiguous: false };
    };

    return weighings.map((weighing) => {
      const errors: string[] = [];
      let isValid = true;

      const hasVisual = !!(weighing.id_tag && weighing.id_tag.trim());
      const hasEid = !!(weighing.caravana_electronica && weighing.caravana_electronica.trim());

      if (!hasVisual && !hasEid) {
        errors.push(t('activities:bulkWeighing.requiredIdentifier'));
        isValid = false;
      }

      if (!weighing.peso_kg || weighing.peso_kg <= 0) {
        errors.push(t('activities:bulkWeighing.weightMustBePositive'));
        isValid = false;
      }

      let matchedAnimal: any = undefined;
      let matchedBy: 'id_tag' | 'eid' | undefined;

      if (hasVisual || hasEid) {
        const { entry, ambiguous } = findAnimal(weighing.id_tag, weighing.caravana_electronica);
        if (ambiguous) {
          errors.push(t('activities:bulkWeighing.ambiguousMatch'));
          isValid = false;
        } else if (entry) {
          matchedAnimal = entry.animal;
          matchedBy = entry.field;
        } else {
          errors.push(t('activities:bulkWeighing.animalNotFound'));
          isValid = false;
        }
      }

      return {
        ...weighing,
        isValid,
        errors,
        animalId: matchedAnimal?.id,
        animalName: matchedAnimal?.name || matchedAnimal?.id_tag || matchedAnimal?.caravana_electronica,
        matchedBy,
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
      // Group rows by date (fall back to today when missing)
      const todayIso = new Date().toISOString().slice(0, 10);
      const groups = new Map<string, WeighingRow[]>();
      for (const row of validData) {
        const key = row.fecha || todayIso;
        const arr = groups.get(key) || [];
        arr.push(row);
        groups.set(key, arr);
      }

      let totalRegistered = 0;
      for (const [dateIso, rows] of groups.entries()) {
        const [y, m, d] = dateIso.split('-').map(Number);
        const eventDate = new Date(y, (m || 1) - 1, d || 1);

        const event = await createEvent(
          'PESAJE',
          eventDate,
          t('activities:bulkWeighing.successDescription', { count: rows.length })
        );

        const mediciones = rows.map(r => ({
          animal_id: r.animalId,
          peso_kg: r.peso_kg,
        }));

        const { error } = await supabase
          .from("pesajes")
          .insert({
            evento_id: event.id,
            mediciones,
          });

        if (error) throw error;
        totalRegistered += rows.length;
      }

      toast({
        title: t('activities:bulkWeighing.successTitle'),
        description: t('activities:bulkWeighing.successDescription', { count: totalRegistered }),
      });

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
    const wb = XLSX.utils.book_new();

    const simple = [
      { id_tag: 'A001', peso_kg: 350.5, fecha: '2026-05-04', notas: 'Ejemplo' },
      { id_tag: 'A002', peso_kg: 280.0, fecha: '2026-05-04', notas: '' },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(simple), "Simple");

    const scale = [
      { EID: '964 001045680595', Date: '2026-05-04', Time: '10:33:11', Weight: 318.0 },
      { EID: '964 001045680615', Date: '2026-05-04', Time: '10:33:58', Weight: 344.0 },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scale), "Bascula");

    XLSX.writeFile(wb, "plantilla_pesajes.xlsx");
  };

  const downloadErrorReport = () => {
    if (invalidData.length === 0) return;

    const errorReport = invalidData.map(row => ({
      id_tag: row.id_tag,
      caravana_electronica: row.caravana_electronica,
      peso_kg: row.peso_kg,
      fecha: row.fecha,
      errores: row.errors.join('; ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(errorReport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Errores");
    XLSX.writeFile(workbook, "errores_pesajes.xlsx");
  };

  const renderMatch = (row: WeighingRow) => {
    if (!row.matchedBy) return null;
    const label = row.matchedBy === 'eid'
      ? t('activities:bulkWeighing.matchedByEid')
      : t('activities:bulkWeighing.matchedByVisual');
    return <span className="text-xs text-muted-foreground">({label})</span>;
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

        <div className="p-4 lg:p-0">
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
                        <li>• {t('activities:bulkWeighing.eidColumn')}</li>
                        <li>• {t('activities:bulkWeighing.weightColumn')}</li>
                        <li>• {t('activities:bulkWeighing.dateColumn')}</li>
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

              {/* Mobile list */}
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
                        <div className="font-medium text-sm">{row.id_tag || row.caravana_electronica}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.animalName || t('activities:bulkWeighing.notFound')} {renderMatch(row)}
                        </div>
                        <div className="text-sm font-semibold">{row.peso_kg} kg {row.fecha ? `· ${row.fecha}` : ''}</div>
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

              {/* Desktop table */}
              <div className="hidden lg:block border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>ID / EID</TableHead>
                      <TableHead>{t('activities:bulkWeighing.animal')}</TableHead>
                      <TableHead>{t('activities:bulkWeighing.weight')} (kg)</TableHead>
                      <TableHead>{t('activities:bulkWeighing.dateHeader')}</TableHead>
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
                        <TableCell className="font-medium">
                          <div>{row.id_tag || '—'}</div>
                          {row.caravana_electronica && (
                            <div className="text-xs text-muted-foreground">{row.caravana_electronica}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.animalName || t('activities:bulkWeighing.notFound')} {renderMatch(row)}
                        </TableCell>
                        <TableCell>{row.peso_kg}</TableCell>
                        <TableCell>{row.fecha || '—'}</TableCell>
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
