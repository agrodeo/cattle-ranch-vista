import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { categorizeAnimal } from "@/lib/animalCategories";
import { getTranslatedSex } from "@/lib/translations";

interface NewGeneralActivityDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  preselectedType?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface Animal {
  id: string;
  name?: string;
  id_tag: string;
  sex: string;
  breed: string;
  birth_date?: string;
  corral_id?: string;
  corral?: { name: string };
  is_castrated?: boolean;
}

const getActivityTypes = (t: any) => [
  { 
    value: "destete", 
    label: t('activities:managementActivityTypes.destete.label'),
    icon: "🐄",
    description: t('activities:managementActivityTypes.destete.description'),
    fields: ["peso_destete", "edad_destete", "metodo"]
  },
  { 
    value: "marcacion", 
    label: t('activities:managementActivityTypes.marcacion.label'),
    icon: "🔥",
    description: t('activities:managementActivityTypes.marcacion.description'),
    fields: ["ubicacion_marca", "tipo_hierro", "numero_marca"]
  },
  { 
    value: "castracion", 
    label: t('activities:managementActivityTypes.castracion.label'),
    icon: "✂️",
    description: t('activities:managementActivityTypes.castracion.description'),
    fields: ["metodo_castracion", "anestesia", "antibiotico"]
  },
  { 
    value: "descorne", 
    label: t('activities:managementActivityTypes.descorne.label'),
    icon: "🦏",
    description: t('activities:managementActivityTypes.descorne.description'),
    fields: ["metodo_descorne", "edad_animal", "cicatrizante"]
  },
  { 
    value: "traslado", 
    label: t('activities:managementActivityTypes.traslado.label'),
    icon: "📦",
    description: t('activities:managementActivityTypes.traslado.description'),
    fields: ["corral_origen", "corral_destino", "motivo_traslado"]
  },
  { 
    value: "tratamiento", 
    label: t('activities:managementActivityTypes.tratamiento.label'),
    icon: "💊",
    description: t('activities:managementActivityTypes.tratamiento.description'),
    fields: ["medicamento", "dosis", "via_administracion", "diagnostico"]
  },
  { 
    value: "revision", 
    label: t('activities:managementActivityTypes.revision.label'),
    icon: "🔍",
    description: t('activities:managementActivityTypes.revision.description'),
    fields: ["temperatura", "frecuencia_cardiaca", "estado_general", "hallazgos"]
  },
  { 
    value: "apareamiento", 
    label: t('activities:managementActivityTypes.apareamiento.label'),
    icon: "💕",
    description: t('activities:managementActivityTypes.apareamiento.description'),
    fields: ["toro_id", "toro_nombre", "metodo_monta"]
  },
  { 
    value: "parto", 
    label: t('activities:managementActivityTypes.parto.label'),
    icon: "🐄",
    description: t('activities:managementActivityTypes.parto.description'),
    fields: ["tipo_parto", "dificultad", "peso_cria", "sexo_cria", "vitalidad"]
  },
];

export function NewGeneralActivityDialog({ open: externalOpen, onOpenChange, preselectedType, onClose, onSuccess }: NewGeneralActivityDialogProps) {
  const { t } = useTranslation('activities');
  const activityTypes = getActivityTypes(t);
  const [open, setOpen] = useState(externalOpen || false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedType, setSelectedType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSex, setFilterSex] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCorral, setFilterCorral] = useState<string>("all");
  const [corrales, setCorrales] = useState<Array<{ id: string; name: string }>>([]);
  
  // Activity-specific fields
  const [activityData, setActivityData] = useState<Record<string, any>>({});
  
  const { toast } = useToast();
  const { createEvent } = useActivities();

  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  useEffect(() => {
    if (open) {
      loadAnimals();
      loadCorrales();
      if (preselectedType) {
        setSelectedType(preselectedType);
      }
    }
  }, [open, preselectedType]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      onClose?.();
    }
  };

  const loadAnimals = async () => {
    setLoadingAnimals(true);
    try {
      const { data, error } = await supabase
        .from('animals')
        .select(`
          id,
          name,
          id_tag,
          sex,
          breed,
          birth_date,
          status,
          corral_id,
          is_castrated,
          corral:corrales(name)
        `)
        .not('status', 'ilike', 'vendido')
        .not('status', 'ilike', 'muerto')
        .order('id_tag');

      if (error) throw error;
      setAnimals(data || []);
    } catch (error) {
      console.error('Error loading animals:', error);
      toast({
        title: t('activities:newGeneralActivity.errorTitle'),
        description: t('activities:newGeneralActivity.errorRequired'),
        variant: "destructive",
      });
    } finally {
      setLoadingAnimals(false);
    }
  };

  const loadCorrales = async () => {
    try {
      const { data, error } = await supabase
        .from('corrales')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCorrales(data || []);
    } catch (error) {
      console.error('Error loading corrales:', error);
    }
  };

  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = searchTerm === "" || 
      animal.id_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (animal.name && animal.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSex = filterSex === "all" || animal.sex === filterSex;
    
    const category = categorizeAnimal(animal, animal.is_castrated || false);
    const matchesCategory = filterCategory === "all" || category === filterCategory;
    
    const matchesCorral = filterCorral === "all" || animal.corral_id === filterCorral;
    
    return matchesSearch && matchesSex && matchesCategory && matchesCorral;
  });

  const handleAnimalSelection = (animalId: string, checked: boolean) => {
    if (checked) {
      setSelectedAnimals(prev => [...prev, animalId]);
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId));
    }
  };

  const selectAllAnimals = () => {
    setSelectedAnimals(animals.map(a => a.id));
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedType) {
      toast({
        title: t('activities:newGeneralActivity.errorTitle'),
        description: t('activities:newGeneralActivity.errorRequired'),
        variant: "destructive",
      });
      return;
    }

    if (selectedAnimals.length === 0) {
      toast({
        title: t('activities:newGeneralActivity.errorTitle'), 
        description: t('activities:newGeneralActivity.errorSelectAnimal'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const eventPayload = {
        tipo_actividad: selectedType,
        responsable: responsiblePerson,
        animales_ids: selectedAnimals,
        detalles: activityData,
      };

      await createEvent("GENERAL", selectedDate, notes, eventPayload);
      
      toast({
        title: t('activities:newGeneralActivity.success'),
        description: `${selectedType} ${t('activities:newGeneralActivity.successDesc')} ${selectedAnimals.length} ${t('activities:newGeneralActivity.animal')}(es)`,
      });
      
      // Call success callback
      onSuccess?.();
      
      // Reset form
      setSelectedDate(undefined);
      setSelectedType("");
      setNotes("");
      setResponsiblePerson("");
      setSelectedAnimals([]);
      setActivityData({});
      setOpen(false);
      onOpenChange?.(false);
      onClose?.();
    } catch (error) {
      toast({
        title: t('activities:newGeneralActivity.errorTitle'),
        description: t('activities:newGeneralActivity.errorSaving'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedActivityType = activityTypes.find(type => type.value === selectedType);

  const renderActivitySpecificFields = () => {
    if (!selectedActivityType?.fields) return null;

    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <Label className="text-sm font-medium">{t('activities:newGeneralActivity.specificInfo')} - {selectedActivityType.label}</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedActivityType.fields.map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{getFieldLabel(field)}</Label>
              {getFieldInput(field)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getFieldLabel = (field: string): string => {
    return t(`activityFields.${field}`, field);
  };

  const getFieldInput = (field: string) => {
    const fieldType = getFieldType(field);
    
    if (fieldType === 'select') {
      return (
        <Select 
          value={activityData[field] || ""} 
          onValueChange={(value) => setActivityData(prev => ({ ...prev, [field]: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('activityOptions.selectOption')} />
          </SelectTrigger>
          <SelectContent>
            {getSelectOptions(field).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    if (fieldType === 'number') {
      return (
        <Input
          type="number"
          step="0.1"
          value={activityData[field] || ""}
          onChange={(e) => setActivityData(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder="0.0"
        />
      );
    }
    
    return (
        <Input
          value={activityData[field] || ""}
          onChange={(e) => setActivityData(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder={`${t('activityFields.enterValue')} ${getFieldLabel(field).toLowerCase()}`}
        />
    );
  };

  const getFieldType = (field: string): 'text' | 'number' | 'select' => {
    const numberFields = ['peso_destete', 'edad_destete', 'peso_cria', 'temperatura', 'frecuencia_cardiaca', 'dosis'];
    const selectFields = ['metodo', 'tipo_hierro', 'metodo_castracion', 'metodo_descorne', 'via_administracion', 'tipo_parto', 'dificultad', 'sexo_cria', 'vitalidad', 'estado_general', 'metodo_monta'];
    
    if (numberFields.includes(field)) return 'number';
    if (selectFields.includes(field)) return 'select';
    return 'text';
  };

  const getSelectOptions = (field: string) => {
    const optionsMap: Record<string, string[]> = {
      metodo: ['tradicional', 'gradual', 'temporal'],
      tipo_hierro: ['electrico', 'fuego', 'frio'],
      metodo_castracion: ['quirurgico', 'elastico', 'pinza'],
      metodo_descorne: ['cauterizacion', 'pasta', 'quirurgico'],
      via_administracion: ['oral', 'intramuscular', 'subcutanea', 'intravenosa'],
      tipo_parto: ['normal', 'distocico', 'cesarea'],
      dificultad: ['sin_dificultad', 'leve', 'moderada', 'severa'],
      sexo_cria: ['macho', 'hembra'],
      vitalidad: ['vivo', 'muerto', 'debil'],
      estado_general: ['excelente', 'bueno', 'regular', 'malo'],
      metodo_monta: ['libre', 'controlada', 'dirigida']
    };
    
    return (optionsMap[field] || []).map(value => ({
      value,
      label: t(`activityOptions.${value}`)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('activities:newGeneralActivity.title')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity-type">{t('activityFields.activityType')} *</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('activityFields.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <div>
                          <div>{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('activities:common.dateRequired')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : t('activities:common.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsible">{t('newGeneralActivity.responsible')}</Label>
            <Input
              id="responsible"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              placeholder={t('newGeneralActivity.responsiblePlaceholder')}
            />
          </div>

          {/* Animal Selection */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <Label className="text-sm font-medium">
                {t('newGeneralActivity.animalsLabel')} ({filteredAnimals.length} {t('common.of')} {animals.length})
              </Label>
          <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedAnimals(filteredAnimals.map(a => a.id))} 
                  className="flex-1 sm:flex-initial"
                >
                  {t('activities:newGeneralActivity.all')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearSelection} className="flex-1 sm:flex-initial">
                  {t('activities:newGeneralActivity.clear')}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label className="text-xs">{t('activities:common.search')}</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('newGeneralActivity.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('newGeneralActivity.sex')}</Label>
                <Select value={filterSex} onValueChange={setFilterSex}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('activities:common.all')}</SelectItem>
                    <SelectItem value="Macho">{t('newGeneralActivity.males')}</SelectItem>
                    <SelectItem value="Hembra">{t('newGeneralActivity.females')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('activities:common.category')}</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('newGeneralActivity.allCategories')}</SelectItem>
                    <SelectItem value="Ternero">{t('newGeneralActivity.calves')}</SelectItem>
                    <SelectItem value="Ternera">{t('newGeneralActivity.heiferCalves')}</SelectItem>
                    <SelectItem value="Novillo">{t('newGeneralActivity.steers')}</SelectItem>
                    <SelectItem value="Vaquillona">{t('newGeneralActivity.heifers')}</SelectItem>
                    <SelectItem value="Toro">{t('newGeneralActivity.bulls')}</SelectItem>
                    <SelectItem value="Vaca">{t('newGeneralActivity.cows')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('newGeneralActivity.corral')}</Label>
                <Select value={filterCorral} onValueChange={setFilterCorral}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('activities:common.all')}</SelectItem>
                    {corrales.map(corral => (
                      <SelectItem key={corral.id} value={corral.id}>
                        {corral.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {loadingAnimals ? (
                <div className="p-4 text-center">{t('newGeneralActivity.loadingAnimals')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>{t('newGeneralActivity.tableHeaders.animal')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('newGeneralActivity.tableHeaders.sex')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('common.breed')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('newGeneralActivity.tableHeaders.corral')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnimals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t('activities:common.noAnimalsFound')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAnimals.map((animal) => (
                        <TableRow key={animal.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedAnimals.includes(animal.id)}
                              onCheckedChange={(checked) => 
                                handleAnimalSelection(animal.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{animal.name || t('newGeneralActivity.noName')}</div>
                              <div className="text-xs text-muted-foreground">{animal.id_tag}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">{getTranslatedSex(animal.sex, t)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{animal.breed}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {animal.corral?.name || t('newGeneralActivity.noCorral')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            {selectedAnimals.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {t('activities:common.animalsSelected', { count: selectedAnimals.length })}
              </div>
            )}
          </div>

          {/* Activity-specific fields */}
          {renderActivitySpecificFields()}

          <div className="space-y-2">
            <Label htmlFor="notes">{t('activities:common.notesAndObservations')}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('newGeneralActivity.notesPlaceholder')}
              rows={4}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {t('activities:common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? t('activities:common.saving') : t('activities:common.registerActivity')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}