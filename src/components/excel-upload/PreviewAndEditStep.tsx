import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Edit, Check, X, Upload, Download, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AnimalFieldMapping, SUPPORTED_FIELDS } from "./AnimalExcelUploadAdvanced";
import { convertToISODate, isValidBirthDate, detectPartialDate } from '@/lib/dateUtils';
import { calculateBrafordRegistration, type RegistrationLevel, type ParentInfo } from "@/lib/brafordRegistration";
import { useSubscription } from "@/hooks/useSubscription";

// Registration levels by breed
const REGISTRATION_OPTIONS = {
  "Braford": [
    "Avanzado",
    "Avanzado Definitivo", 
    "Controlado",
    "Puro de Pedigree",
    "Puro Registrado",
    "Sin Registro"
  ],
  "Brangus": [
    "Puro por Cruza",
    "Puro Registrado", 
    "Puro de Pedigree",
    "Terneros Registrados",
    "Sin Registro"
  ],
  "Angus": [
    "PC (Puro Controlado)",
    "PR (Puro Registrado)",
    "PP (Puro de Pedigree)",
    "Sin Registro"
  ]
};

// Get registration options for a specific breed
const getRegistrationOptions = (breed: string): string[] => {
  return REGISTRATION_OPTIONS[breed as keyof typeof REGISTRATION_OPTIONS] || ["Sin Registro"];
};

// Check if breed requires registration field
const breedRequiresRegistration = (breed: string): boolean => {
  return Object.keys(REGISTRATION_OPTIONS).includes(breed);
};

// Normalize animal status values from Excel to expected format
const normalizeAnimalStatus = (status: string | undefined): string => {
  if (!status) return 'Activo';
  
  const normalizedStatus = status.toString().toLowerCase().trim();
  
  // Mapping of common Excel status values to expected format
  const statusMapping: { [key: string]: string } = {
    'vivo': 'Activo',
    'activo': 'Activo',
    'active': 'Activo',
    'alive': 'Activo',
    'vendido': 'Vendido',
    'sold': 'Vendido',
    'muerto': 'Muerto',
    'dead': 'Muerto',
    'muerte': 'Muerto',
    'fallecido': 'Muerto',
    'transferido': 'Transferido',
    'transferred': 'Transferido',
    'trasferido': 'Transferido' // Common typo
  };
  
  return statusMapping[normalizedStatus] || 'Activo';
};

interface PreviewAndEditStepProps {
  animals: AnimalFieldMapping[];
  userCabañaId: string;
  onEdit: (animals: AnimalFieldMapping[]) => void;
  onNext: (animals: AnimalFieldMapping[]) => void;
  onBack: () => void;
  onComplete: () => void;
}

export const PreviewAndEditStep = ({
  animals,
  userCabañaId,
  onEdit,
  onNext,
  onBack,
  onComplete
}: PreviewAndEditStepProps) => {
  const [editingAnimal, setEditingAnimal] = useState<AnimalFieldMapping | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { subscriptionStatus, planNames } = useSubscription();
  const [uploadProgress, setUploadProgress] = useState(0);

  const validAnimals = animals.filter(a => a._isValid);
  const invalidAnimals = animals.filter(a => !a._isValid);
  const animalsWithWarnings = animals.filter(a => a._warnings && a._warnings.length > 0);

  const handleEditAnimal = (animal: AnimalFieldMapping) => {
    setEditingAnimal({ ...animal });
  };

  const handleSaveEdit = () => {
    if (!editingAnimal) return;

    // Re-validate the edited animal
    const errors: string[] = [];
    
    if (!editingAnimal.identificacion?.toString().trim()) {
      errors.push('Identificación es requerida');
    }
    
    if (!editingAnimal.sexo?.toString().trim()) {
      errors.push('Sexo es requerido');
    }
    
    if (!editingAnimal.raza?.toString().trim()) {
      errors.push('Raza es requerida');
    }
    
    if (!editingAnimal.fecha_nacimiento?.toString().trim()) {
      errors.push('Fecha de nacimiento es requerida');
    } else {
      const convertedDate = convertToISODate(editingAnimal.fecha_nacimiento);
      if (!convertedDate) {
        errors.push('Fecha de nacimiento no es válida o no se pudo convertir');
      } else if (!isValidBirthDate(convertedDate)) {
        errors.push('Fecha de nacimiento no puede ser en el futuro o muy antigua');
      } else {
        editingAnimal.fecha_nacimiento = convertedDate;
      }
    }

    editingAnimal._errors = errors;
    editingAnimal._isValid = errors.length === 0;

    // Categorize animal based on age and sex
    if (editingAnimal.fecha_nacimiento && editingAnimal.sexo) {
      const birthDate = new Date(editingAnimal.fecha_nacimiento);
      const ageMonths = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      if (editingAnimal.sexo === 'Macho') {
        if (ageMonths < 12) editingAnimal._category = 'Ternero';
        else if (ageMonths < 24) editingAnimal._category = 'Torete';
        else editingAnimal._category = 'Toro';
      } else {
        if (ageMonths < 12) editingAnimal._category = 'Ternera';
        else if (ageMonths < 24) editingAnimal._category = 'Vaquillona';
        else editingAnimal._category = 'Vaca';
      }
    }

    // Calculate Braford registration if applicable
    if (editingAnimal.raza === 'Braford') {
      let fatherInfo: ParentInfo | undefined;
      let motherInfo: ParentInfo | undefined;

      // Get father registration info from excel data
      if (editingAnimal.padre_id && editingAnimal.registro_padre) {
        fatherInfo = {
          level: editingAnimal.registro_padre as RegistrationLevel,
          hasDNA: true,
        };
      }

      // Get mother registration info from excel data
      if (editingAnimal.madre_id && editingAnimal.registro_madre) {
        const isBoMother = editingAnimal.registro_madre === 'Bo';
        motherInfo = {
          level: isBoMother ? 'Controlado' : editingAnimal.registro_madre as RegistrationLevel,
          isBoMother,
          birthYear: editingAnimal.fecha_nacimiento ? new Date(editingAnimal.fecha_nacimiento).getFullYear() - 2 : undefined,
        };
      }

      // Calculate registration level
      const registrationResult = calculateBrafordRegistration(
        editingAnimal.raza,
        fatherInfo,
        motherInfo,
        false
      );

      editingAnimal.registro_nivel_calculado = registrationResult.level;
      editingAnimal.registro_sugerido = registrationResult.level;

      // Add registration warnings to validation
      if (registrationResult.warnings.length > 0) {
        editingAnimal._warnings = editingAnimal._warnings || [];
        editingAnimal._warnings.push(...registrationResult.warnings);
      }
      if (registrationResult.errors.length > 0) {
        editingAnimal._errors.push(...registrationResult.errors);
        editingAnimal._isValid = false;
      }
    }

    const updatedAnimals = animals.map(a => 
      a._originalIndex === editingAnimal._originalIndex ? editingAnimal : a
    );
    
    onEdit(updatedAnimals);
    setEditingAnimal(null);
  };

  const handleBulkUpload = async () => {
    if (!userCabañaId) {
      toast({
        title: "Error",
        description: "No se pudo determinar su cabaña",
        variant: "destructive",
      });
      return;
    }

    if (validAnimals.length === 0) {
      toast({
        title: "Error",
        description: "No hay animales válidos para cargar",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Check subscription animal limit before bulk upload
    if (subscriptionStatus) {
      const activeAnimalsToAdd = validAnimals.filter(a => normalizeAnimalStatus(a.estado) === 'Activo').length;
      const wouldHave = subscriptionStatus.currentAnimalsCount + activeAnimalsToAdd;
      if (wouldHave > subscriptionStatus.maxAnimals) {
        toast({
          title: "Límite de animales superado",
          description: `Esta importación agregaría ${activeAnimalsToAdd} animales activos, superando el límite de ${subscriptionStatus.maxAnimals} del plan ${planNames[subscriptionStatus.plan]}. Tienes ${subscriptionStatus.currentAnimalsCount} actualmente. Actualiza tu plan para continuar.`,
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
    }

    try {
      // Check for existing IDs in the database
      const existingIds = await supabase
        .from('animals')
        .select('id_tag')
        .eq('cabaña_id', userCabañaId)
        .in('id_tag', validAnimals.map(a => a.identificacion));

      if (existingIds.data && existingIds.data.length > 0) {
        const duplicateIds = existingIds.data.map(d => d.id_tag);
        toast({
          title: "IDs duplicados",
          description: `Los siguientes IDs ya existen: ${duplicateIds.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      setUploadProgress(25);

      // Prepare data for insertion
      const animalsToInsert = validAnimals.map(animal => ({
        id_tag: animal.identificacion,
        name: animal.nombre || null,
        sex: animal.sexo,
        breed: animal.raza,
        birth_date: animal.fecha_nacimiento || null,
        peso_nacimiento: animal.peso_nacer || null,
        peso_final: animal.peso_final || null,
        circunferencia_escrotal: animal.circunferencia_escrotal || null,
        status: normalizeAnimalStatus(animal.estado),
        mocho: animal.mocho || null,
        color: (animal as any).pelaje || null,
        observaciones: animal.observaciones || null,
        tipo_parto: animal.tipo_parto || null,
        condicion_corporal: animal.condicion_corporal?.toString() || null,
        fecha_destete: animal.fecha_destete || null,
        peso_destete: animal.peso_destete || null,
        fecha_servicio: animal.fecha_servicio || null,
        tipo_servicio: animal.tipo_servicio || null,
        resultado_preñez: animal.resultado_preñez || null,
        fecha_muerte: animal.fecha_muerte || null,
        cabaña_id: userCabañaId,
        // Braford registration fields
        registration_level: animal.registration_level || animal.registro_nivel_calculado || null,
        
        // Parent information - flexible handling
        mother_name: animal.mother_name || (animal.madre_id && !String(animal.madre_id)?.match(/^\d+$/) ? String(animal.madre_id) : null),
        father_name: animal.father_name || (animal.padre_id && !String(animal.padre_id)?.match(/^\d+$/) ? String(animal.padre_id) : null),
        mother_breed: animal.mother_breed || null,
        father_breed: animal.father_breed || null,
        mother_registration: animal.mother_registration || null,
        father_registration: animal.father_registration || null,
        registration_father_level: animal.registro_padre || null,
        registration_mother_level: animal.registro_madre || null,
        // We'll handle parent relationships in a second pass
        mother_id: null,
        father_id: null,
        toro_servicio_id: null
      }));

      setUploadProgress(50);

      // Bulk insert
      const { data: insertedAnimals, error: insertError } = await supabase
        .from('animals')
        .insert(animalsToInsert)
        .select();

      if (insertError) throw insertError;

      setUploadProgress(75);

      // Second pass: handle parent relationships
      if (insertedAnimals) {
        const parentUpdates = [];
        
        for (const [index, animal] of validAnimals.entries()) {
          const insertedAnimal = insertedAnimals[index];
          if (!insertedAnimal) continue;

          let motherUUID = null;
          let fatherUUID = null;
          let toroServicioUUID = null;

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

          if (animal.toro_servicio_id) {
            const { data: toroData } = await supabase
              .from('animals')
              .select('id')
              .eq('id_tag', animal.toro_servicio_id)
              .eq('cabaña_id', userCabañaId)
              .eq('sex', 'Macho')
              .single();
            toroServicioUUID = toroData?.id || null;
          }

          if (motherUUID || fatherUUID || toroServicioUUID) {
            parentUpdates.push({
              id: insertedAnimal.id,
              mother_id: motherUUID,
              father_id: fatherUUID,
              toro_servicio_id: toroServicioUUID
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
                father_id: update.father_id,
                toro_servicio_id: update.toro_servicio_id
              })
              .eq('id', update.id);
          }
        }
      }

      setUploadProgress(100);
      
      toast({
        title: "¡Éxito!",
        description: `Se cargaron ${validAnimals.length} animales correctamente`,
      });

      onComplete();

    } catch (error) {
      console.error('Error during bulk upload:', error);
      toast({
        title: "Error",
        description: "Error durante la carga masiva",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadErrorReport = () => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Paso 3: Previsualizar y Editar</CardTitle>
        <CardDescription>
          Revise los datos mapeados y realice ajustes antes de la carga final
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{validAnimals.length}</div>
            <div className="text-sm text-muted-foreground">Válidos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{invalidAnimals.length}</div>
            <div className="text-sm text-muted-foreground">Con errores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{animalsWithWarnings.length}</div>
            <div className="text-sm text-muted-foreground">Con avisos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{animals.length}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Error report download */}
        {invalidAnimals.length > 0 && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={downloadErrorReport}>
              <Download className="h-4 w-4 mr-2" />
              Descargar Reporte de Errores
            </Button>
          </div>
        )}

        {/* Preview table - Desktop only */}
        <div className="hidden lg:block max-h-96 overflow-auto border rounded">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Identificación</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Raza</TableHead>
                <TableHead>F. Nacimiento</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Registro Braford</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {animals.slice(0, 20).map((animal, index) => (
                <TableRow key={index} className={animal._isValid ? '' : 'bg-red-50'}>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      {animal._isValid ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-600" />
                      )}
                      {animal._warnings && animal._warnings.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Avisos: {animal._warnings.join('; ')}</p>
                            </TooltipContent>
                           </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
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
                    {animal._category && (
                      <Badge variant="outline">{animal._category}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {animal.raza === 'Braford' && animal.registro_sugerido && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        title={`Padre: ${animal.registro_padre || 'N/A'}, Madre: ${animal.registro_madre || 'N/A'}`}
                      >
                        {animal.registro_sugerido}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAnimal(animal)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {animals.length > 20 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    ... y {animals.length - 20} más
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards view */}
        <div className="lg:hidden space-y-3 max-w-full overflow-x-hidden">
          {animals.slice(0, 20).map((animal, index) => (
            <Card 
              key={index} 
              className={`w-full ${animal._isValid ? '' : 'border-red-200 bg-red-50'}`}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Status and action row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {animal._isValid ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-600" />
                      )}
                      {animal._warnings && animal._warnings.length > 0 && (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {animal._isValid ? 'Válido' : 'Error'}
                        {animal._warnings && animal._warnings.length > 0 && ' + Avisos'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAnimal(animal)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      <span className="text-xs">Editar</span>
                    </Button>
                  </div>

                  {/* Animal details */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">ID:</span>
                      <span className="text-sm font-mono">{animal.identificacion}</span>
                    </div>
                    
                    {animal.nombre && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Nombre:</span>
                        <span className="text-sm">{animal.nombre}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Sexo:</span>
                        <Badge variant={animal.sexo === 'Macho' ? 'default' : 'secondary'} className="text-xs">
                          {animal.sexo}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Raza:</span>
                        <span className="ml-1">{animal.raza}</span>
                      </div>
                    </div>

                    {animal.fecha_nacimiento && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">F. Nacimiento:</span>
                        <span className="text-sm">{animal.fecha_nacimiento}</span>
                      </div>
                    )}

                    {animal._category && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Categoría:</span>
                        <Badge variant="outline" className="text-xs">{animal._category}</Badge>
                      </div>
                    )}

                    {animal.raza === 'Braford' && animal.registro_sugerido && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Registro:</span>
                        <Badge variant="secondary" className="text-xs">
                          {animal.registro_sugerido}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Errors and warnings */}
                  {(!animal._isValid || (animal._warnings && animal._warnings.length > 0)) && (
                    <div className="pt-3 border-t space-y-1">
                      {animal._errors?.map((error, errorIndex) => (
                        <p key={errorIndex} className="text-xs text-red-600 flex items-start gap-1">
                          <X className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </p>
                      ))}
                      {animal._warnings?.map((warning, warningIndex) => (
                        <p key={warningIndex} className="text-xs text-yellow-600 flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{warning}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {animals.length > 20 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              ... y {animals.length - 20} animales más
            </div>
          )}
        </div>

        {/* Navigation and actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between items-stretch sm:items-center pt-4">
          <Button variant="outline" onClick={onBack} className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onNext(animals)} className="w-full sm:w-auto text-sm px-3">
              Siguiente: Análisis
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button 
              onClick={handleBulkUpload}
              disabled={validAnimals.length === 0 || isUploading}
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cargando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Cargar {validAnimals.length} Animales
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso de carga</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Edit dialog */}
        <Dialog open={editingAnimal !== null} onOpenChange={() => setEditingAnimal(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Animal</DialogTitle>
              <DialogDescription>
                Modifique los datos del animal antes de la carga
              </DialogDescription>
            </DialogHeader>
            
            {editingAnimal && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  <Label>Identificación *</Label>
                  <Input
                    value={editingAnimal.identificacion}
                    onChange={(e) => setEditingAnimal({...editingAnimal, identificacion: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={editingAnimal.nombre || ''}
                    onChange={(e) => setEditingAnimal({...editingAnimal, nombre: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Sexo *</Label>
                  <Select value={editingAnimal.sexo} onValueChange={(value) => setEditingAnimal({...editingAnimal, sexo: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Macho">Macho</SelectItem>
                      <SelectItem value="Hembra">Hembra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Raza *</Label>
                  <Select value={editingAnimal.raza} onValueChange={(value) => setEditingAnimal({...editingAnimal, raza: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
        {SUPPORTED_FIELDS.raza.options && SUPPORTED_FIELDS.raza.options.map(option => (
          <SelectItem key={option} value={option}>{option}</SelectItem>
        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Fecha de Nacimiento *</Label>
                  <Input
                    type="date"
                    value={editingAnimal.fecha_nacimiento}
                    onChange={(e) => setEditingAnimal({...editingAnimal, fecha_nacimiento: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Peso al Nacer (kg)</Label>
                  <Input
                    type="number"
                    value={editingAnimal.peso_nacer || ''}
                    onChange={(e) => setEditingAnimal({...editingAnimal, peso_nacer: parseFloat(e.target.value)})}
                  />
                </div>
                
                {/* Conditional Registration field */}
                {editingAnimal.raza && breedRequiresRegistration(editingAnimal.raza) && (
                  <div className="space-y-2">
                    <Label>Registro</Label>
                    <Select 
                      value={editingAnimal.registration_level || ''} 
                      onValueChange={(value) => setEditingAnimal({...editingAnimal, registration_level: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar registro" />
                      </SelectTrigger>
                      <SelectContent>
                        {getRegistrationOptions(editingAnimal.raza).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingAnimal(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Guardar Cambios
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};