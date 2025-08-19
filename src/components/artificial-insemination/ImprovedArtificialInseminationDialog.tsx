import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, X, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useHybridAuth } from '@/hooks/useHybridAuth';

interface Bull {
  id: string;
  name: string;
  breed: string;
  registration_level?: string;
  scrotal_circumference?: number;
  birth_weight?: number;
  weaning_weight?: number;
  final_weight?: number;
}

interface EligibleFemale {
  id: string;
  name: string;
  id_tag: string;
  birth_date: string;
  age_months: number;
  corral_id?: string;
  corral_name?: string;
  category: string;
  breed: string;
}

interface ManualBullData {
  nombre: string;
  identificador: string;
  raza: string;
  registro?: string;
  adn_verificado: boolean;
  ce_cm?: number;
  peso_nacer_kg?: number;
  peso_destete_kg?: number;
  peso_final_kg?: number;
  centro_semen?: string;
  horn_status?: string;
  pelaje?: string;
}

interface ImprovedArtificialInseminationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const BREEDS = ['Braford', 'Brangus', 'Angus', 'Brahman', 'Hereford', 'Charolais'];
const HORN_STATUS_OPTIONS = ['Astado', 'Mocho', 'Mocho homocigota'];
const PELAJE_OPTIONS = ['Negro', 'Colorado', 'Homocigota'];
const REGISTRATION_LEVELS = ['ABA-Controlado', 'Avanzado', 'Definitivo', 'Puro'];

export function ImprovedArtificialInseminationDialog({
  open,
  onOpenChange,
  onSuccess
}: ImprovedArtificialInseminationDialogProps) {
  const { currentUser } = useHybridAuth();
  const { toast } = useToast();

  // Form state
  const [date, setDate] = useState<Date>(new Date());
  const [veterinario, setVeterinario] = useState('');
  const [observaciones, setObservaciones] = useState('');
  
  // Bull selection state
  const [bullMode, setBullMode] = useState<'catalog' | 'manual'>('catalog');
  const [selectedBull, setSelectedBull] = useState<Bull | null>(null);
  const [manualBullData, setManualBullData] = useState<ManualBullData>({
    nombre: '',
    identificador: '',
    raza: '',
    adn_verificado: false
  });

  // Female selection state
  const [eligibleFemales, setEligibleFemales] = useState<EligibleFemale[]>([]);
  const [selectedFemales, setSelectedFemales] = useState<EligibleFemale[]>([]);
  const [ageRange, setAgeRange] = useState([15, 120]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCorrales, setSelectedCorrales] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Data loading state
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [corrales, setCorrales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFemales, setLoadingFemales] = useState(false);

  // Load bulls catalog
  useEffect(() => {
    if (open) {
      loadBulls();
      loadCorrales();
      loadEligibleFemales();
    }
  }, [open]);

  const loadBulls = async () => {
    try {
      // Use existing bulls table from schema
      const { data, error } = await supabase
        .from('bulls')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setBulls(data || []);
    } catch (error) {
      console.error('Error loading bulls:', error);
      // If no bulls table, use empty array
      setBulls([]);
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

  const loadEligibleFemales = async () => {
    if (!currentUser?.id) return;

    setLoadingFemales(true);
    try {
      // Get user's cabaña_id first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('"cabaña_id"')
        .eq('id', currentUser.id)
        .single();

      if (userError || !userData?.["cabaña_id"]) {
        throw new Error('Usuario sin cabaña asignada');
      }

      let query = supabase
        .from('animals')
        .select(`
          id,
          name,
          id_tag,
          birth_date,
          sex,
          status,
          esta_preñada,
          breed,
          corral_id,
          corrales:corral_id(name)
        `)
        .eq('sex', 'Hembra')
        .in('status', ['activo', 'en_rodeo'])
        .or('esta_preñada.is.null,esta_preñada.eq.false');

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,id_tag.ilike.%${searchTerm}%`);
      }

      if (selectedCorrales.length > 0) {
        query = query.in('corral_id', selectedCorrales);
      }

      const { data, error } = await query.order('name');

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log('Raw animals data:', data);
      
      let filteredData = (data || []).map((animal: any) => {
        if (!animal.birth_date) return null;
        
        const birthDate = new Date(animal.birth_date);
        const ageMonths = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        
        return {
          id: animal.id,
          name: animal.name || animal.id_tag,
          id_tag: animal.id_tag,
          birth_date: animal.birth_date,
          age_months: ageMonths,
          corral_id: animal.corral_id,
          corral_name: animal.corrales?.name,
          category: ageMonths < 24 ? 'Vaquillona' : 'Vaca',
          breed: animal.breed
        };
      }).filter((f: EligibleFemale | null): f is EligibleFemale => {
        return f !== null && f.age_months >= 15;
      });
      
      console.log('Filtered females after age check:', filteredData);
      
      // Apply category filter
      if (filterCategory !== 'all') {
        filteredData = filteredData.filter((f: EligibleFemale) => f.category === filterCategory);
      }

      // Apply age range filter
      filteredData = filteredData.filter((f: EligibleFemale) => 
        f.age_months >= ageRange[0] && f.age_months <= ageRange[1]
      );

      console.log('Final eligible females:', filteredData);
      setEligibleFemales(filteredData);
    } catch (error) {
      console.error('Error loading eligible females:', error);
      toast({
        title: "Error",
        description: "Error al cargar hembras elegibles: " + (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setLoadingFemales(false);
    }
  };

  // Reload females when filters change
  useEffect(() => {
    if (open) {
      const timeoutId = setTimeout(() => {
        loadEligibleFemales();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [ageRange, selectedCorrales, searchTerm, filterCategory, open, currentUser?.id]);

  const handleFemaleSelection = (female: EligibleFemale, selected: boolean) => {
    if (selected) {
      setSelectedFemales(prev => [...prev, female]);
    } else {
      setSelectedFemales(prev => prev.filter(f => f.id !== female.id));
    }
  };

  const handleSelectAllFromFilter = () => {
    const newSelections = eligibleFemales.filter(
      female => !selectedFemales.find(selected => selected.id === female.id)
    );
    setSelectedFemales(prev => [...prev, ...newSelections]);
  };

  const removeFemale = (femaleId: string) => {
    setSelectedFemales(prev => prev.filter(f => f.id !== femaleId));
  };

  const validateForm = () => {
    if (bullMode === 'catalog' && !selectedBull) {
      toast({
        title: "Error",
        description: "Debe seleccionar un toro del catálogo",
        variant: "destructive"
      });
      return false;
    }

    if (bullMode === 'manual') {
      if (!manualBullData.nombre || !manualBullData.identificador || !manualBullData.raza) {
        toast({
          title: "Error", 
          description: "Debe completar nombre, identificador y raza del toro",
          variant: "destructive"
        });
        return false;
      }
    }

    if (selectedFemales.length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos una hembra",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !currentUser?.id) return;

    setLoading(true);
    try {
      // Get user's cabaña_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('"cabaña_id"')
        .eq('id', currentUser.id)
        .single();

      if (userError || !userData?.["cabaña_id"]) {
        throw new Error('Usuario sin cabaña asignada');
      }

      const fechaControl = new Date(date);
      fechaControl.setDate(fechaControl.getDate() + 45);
      
      const fpp = new Date(date);
      fpp.setDate(fpp.getDate() + 283);

      // Create AI data
      const aiData = {
        fecha: format(date, 'yyyy-MM-dd'),
        toro_nombre: bullMode === 'catalog' ? selectedBull?.name : manualBullData.nombre,
        raza_toro: bullMode === 'catalog' ? selectedBull?.breed : manualBullData.raza,
        animales_ids: selectedFemales.map(f => f.id),
        extras_toro: bullMode === 'manual' ? manualBullData : selectedBull,
        veterinario: veterinario || null,
        observaciones: observaciones || null
      };

      // Create event record
      const { data: eventoData, error: eventoError } = await supabase
        .from('eventos')
        .insert({
          "cabaña_id": userData["cabaña_id"],
          tipo: 'inseminacion_artificial',
          fecha: format(date, 'yyyy-MM-dd'),
          creado_por: currentUser.id,
          notas: observaciones || null,
          payload: {
            veterinario,
            animal_count: selectedFemales.length,
            fecha_control: format(fechaControl, 'yyyy-MM-dd'),
            fpp: format(fpp, 'yyyy-MM-dd')
          }
        })
        .select()
        .single();

      if (eventoError) throw eventoError;

      // Create IA record
      const { error: iaError } = await supabase
        .from('ia')
        .insert({
          evento_id: eventoData.id,
          toro_nombre: aiData.toro_nombre,
          raza_toro: aiData.raza_toro,
          animales_ids: aiData.animales_ids,
          extras_toro: JSON.stringify(aiData.extras_toro)
        });

      if (iaError) throw iaError;

      toast({
        title: "Éxito",
        description: `Servicio creado: ${selectedFemales.length} hembras · Control: ${format(fechaControl, 'dd/MM/yyyy', { locale: es })} · FPP estimada: ${format(fpp, 'dd/MM/yyyy', { locale: es })}`,
      });

      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch (error: any) {
      console.error('Error creating IA service:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el servicio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDate(new Date());
    setVeterinario('');
    setObservaciones('');
    setBullMode('catalog');
    setSelectedBull(null);
    setManualBullData({
      nombre: '',
      identificador: '',
      raza: '',
      adn_verificado: false
    });
    setSelectedFemales([]);
    setAgeRange([15, 120]);
    setSearchTerm('');
    setSelectedCorrales([]);
    setFilterCategory('all');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inseminación Artificial</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha del Servicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, 'PPP', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    disabled={(date) => date > new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Veterinario</Label>
              <Input
                value={veterinario}
                onChange={(e) => setVeterinario(e.target.value)}
                placeholder="Nombre del profesional"
              />
            </div>
          </div>

          {/* Bull Selection */}
          <Accordion type="single" defaultValue="bull-data" collapsible>
            <AccordionItem value="bull-data">
              <AccordionTrigger>Datos del Toro (Obligatorio)</AccordionTrigger>
              <AccordionContent>
                <Tabs value={bullMode} onValueChange={(value) => setBullMode(value as 'catalog' | 'manual')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="catalog">Catálogo</TabsTrigger>
                    <TabsTrigger value="manual">Manual</TabsTrigger>
                  </TabsList>

                  <TabsContent value="catalog" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Seleccionar Toro</Label>
                      <Select
                        value={selectedBull?.id || ""}
                        onValueChange={(value) => {
                          const bull = bulls.find(b => b.id === value);
                          setSelectedBull(bull || null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Buscar y seleccionar toro..." />
                        </SelectTrigger>
                        <SelectContent>
                          {bulls.map((bull) => (
                            <SelectItem key={bull.id} value={bull.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{bull.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {bull.breed} • CE: {bull.scrotal_circumference}cm
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {bulls.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No hay toros en el catálogo. Use la opción manual.
                        </p>
                      )}
                    </div>

                    {selectedBull && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">{selectedBull.name}</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span>Raza: {selectedBull.breed}</span>
                          <span>Registro: {selectedBull.registration_level || 'N/A'}</span>
                          <span>CE: {selectedBull.scrotal_circumference}cm</span>
                          <span>Peso Final: {selectedBull.final_weight}kg</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="manual" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre *</Label>
                        <Input
                          value={manualBullData.nombre}
                          onChange={(e) => setManualBullData(prev => ({ ...prev, nombre: e.target.value }))}
                          placeholder="Nombre del toro"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Identificador/RP *</Label>
                        <Input
                          value={manualBullData.identificador}
                          onChange={(e) => setManualBullData(prev => ({ ...prev, identificador: e.target.value }))}
                          placeholder="RP o código de pajuela"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Raza *</Label>
                        <Select
                          value={manualBullData.raza}
                          onValueChange={(value) => setManualBullData(prev => ({ ...prev, raza: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar raza" />
                          </SelectTrigger>
                          <SelectContent>
                            {BREEDS.map((breed) => (
                              <SelectItem key={breed} value={breed}>{breed}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Registro</Label>
                        <Select
                          value={manualBullData.registro || ""}
                          onValueChange={(value) => setManualBullData(prev => ({ ...prev, registro: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Nivel de registro" />
                          </SelectTrigger>
                          <SelectContent>
                            {REGISTRATION_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Breed-specific fields */}
                      {manualBullData.raza === 'Braford' && (
                        <div className="space-y-2">
                          <Label>Estado de Cuernos</Label>
                          <Select
                            value={manualBullData.horn_status || ""}
                            onValueChange={(value) => setManualBullData(prev => ({ ...prev, horn_status: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Estado de cuernos" />
                            </SelectTrigger>
                            <SelectContent>
                              {HORN_STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {(manualBullData.raza === 'Brangus' || manualBullData.raza === 'Angus') && (
                        <div className="space-y-2">
                          <Label>Pelaje</Label>
                          <Select
                            value={manualBullData.pelaje || ""}
                            onValueChange={(value) => setManualBullData(prev => ({ ...prev, pelaje: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Color del pelaje" />
                            </SelectTrigger>
                            <SelectContent>
                              {PELAJE_OPTIONS.map((color) => (
                                <SelectItem key={color} value={color}>{color}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>CE (cm)</Label>
                        <Input
                          type="number"
                          value={manualBullData.ce_cm || ''}
                          onChange={(e) => setManualBullData(prev => ({ ...prev, ce_cm: Number(e.target.value) || undefined }))}
                          placeholder="Circunferencia escrotal"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="adn_verificado"
                          checked={manualBullData.adn_verificado}
                          onCheckedChange={(checked) => setManualBullData(prev => ({ ...prev, adn_verificado: checked as boolean }))}
                        />
                        <Label htmlFor="adn_verificado">ADN Verificado</Label>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Female Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Selección de Hembras Elegibles</h3>
              <div className="text-sm text-muted-foreground">
                {selectedFemales.length} seleccionadas de {eligibleFemales.length} elegibles
              </div>
            </div>

            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
              <strong>Criterios automáticos:</strong> Solo hembras activas ≥15 meses y no preñadas
            </div>

            {/* Filters */}
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Buscar por nombre/ID</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar hembra..."
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="Vaquillona">Vaquillonas (15-24m)</SelectItem>
                      <SelectItem value="Vaca">Vacas (24m+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Edad (meses): {ageRange[0]} - {ageRange[1]}</Label>
                <Slider
                  value={ageRange}
                  onValueChange={setAgeRange}
                  min={15}
                  max={120}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <button 
                    onClick={() => setAgeRange([15, 24])}
                    className="hover:underline px-2 py-1 rounded bg-white"
                  >
                    15-24m
                  </button>
                  <button 
                    onClick={() => setAgeRange([24, 36])}
                    className="hover:underline px-2 py-1 rounded bg-white"
                  >
                    24-36m
                  </button>
                  <button 
                    onClick={() => setAgeRange([36, 120])}
                    className="hover:underline px-2 py-1 rounded bg-white"
                  >
                    36m+
                  </button>
                </div>
              </div>

              <Button
                onClick={handleSelectAllFromFilter}
                variant="outline"
                size="sm"
                disabled={eligibleFemales.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Seleccionar todas las filtradas ({eligibleFemales.length})
              </Button>
            </div>

            {/* Selected Females */}
            {selectedFemales.length > 0 && (
              <div className="space-y-2">
                <Label>Hembras Seleccionadas ({selectedFemales.length})</Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                  {selectedFemales.map((female) => (
                    <Badge key={female.id} variant="secondary" className="flex items-center gap-1">
                      {female.name || female.id_tag}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeFemale(female.id)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Available Females */}
            <div className="space-y-2">
              <Label>Hembras Disponibles</Label>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {loadingFemales ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Cargando hembras elegibles...
                  </div>
                ) : eligibleFemales.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No hay hembras elegibles con los filtros actuales
                  </div>
                ) : (
                  <div className="space-y-2 p-2">
                    {eligibleFemales.map((female) => {
                      const isSelected = selectedFemales.some(selected => selected.id === female.id);
                      return (
                        <div
                          key={female.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleFemaleSelection(female, checked as boolean)}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {female.name || female.id_tag}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {female.age_months}m • {female.category} • {female.corral_name || 'Sin corral'} • {female.breed}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Observations */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Observaciones adicionales del servicio..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Creando..." : "Crear Servicio"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}