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
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['activities', 'common']);
  const { currentUser } = useSupabaseAuth();
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
    if (!currentUser?.cabañaId) {
      toast({
        title: t('common:status.error'),
        description: t('activities:artificialInsemination.noCabanaError'),
        variant: "destructive"
      });
      return;
    }

    setLoadingFemales(true);
    try {
      console.log('Loading eligible females for cabaña:', currentUser.cabañaId);
      
      // Get all females for the current cabaña
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('cabaña_id', currentUser.cabañaId)
        .eq('sex', 'Hembra')
        .order('name');

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      console.log(`Total females in cabaña: ${data?.length || 0}`);
      
      // Valid statuses (case-insensitive)
      const validStatuses = ['activo', 'en_rodeo', 'disponible', 'presente'];
      const invalidStatuses = ['vendido', 'muerto', 'sold', 'dead'];
      
      // Filter data based on eligibility conditions
      let filteredData = (data || []).filter((animal: any) => {
        // Log each animal for debugging
        console.log(`Checking animal ${animal.id_tag}: status=${animal.status}, pregnant=${animal.esta_preñada}, birth_date=${animal.birth_date}`);
        
        // Basic eligibility checks
        if (!animal.birth_date) {
          console.log(`  - Rejected: no birth_date`);
          return false;
        }
        
        // Status check (case-insensitive and more flexible)
        const animalStatus = (animal.status || '').toLowerCase();
        const isValidStatus = validStatuses.includes(animalStatus) || 
                             !invalidStatuses.includes(animalStatus);
        
        if (!isValidStatus) {
          console.log(`  - Rejected: invalid status (${animal.status})`);
          return false;
        }
        
        if (animal.esta_preñada === true) {
          console.log(`  - Rejected: already pregnant`);
          return false;
        }
        
        // Age check (at least 15 months)
        const birthDate = new Date(animal.birth_date);
        const ageMonths = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        if (ageMonths < 15) {
          console.log(`  - Rejected: too young (${ageMonths} months)`);
          return false;
        }
        
        // Search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const name = (animal.name || '').toLowerCase();
          const idTag = (animal.id_tag || '').toLowerCase();
          if (!name.includes(searchLower) && !idTag.includes(searchLower)) {
            console.log(`  - Rejected: doesn't match search term`);
            return false;
          }
        }
        
        // Corral filter
        if (selectedCorrales.length > 0 && !selectedCorrales.includes(animal.corral_id)) {
          console.log(`  - Rejected: not in selected corrales`);
          return false;
        }
        
        console.log(`  - Accepted: ${animal.id_tag}`);
        return true;
      }).map((animal: any) => {
        const birthDate = new Date(animal.birth_date);
        const ageMonths = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        
        return {
          id: animal.id,
          name: animal.name || animal.id_tag,
          id_tag: animal.id_tag,
          birth_date: animal.birth_date,
          age_months: ageMonths,
          corral_id: animal.corral_id,
          corral_name: 'Sin corral',
          category: ageMonths < 24 ? 'Vaquillona' : 'Vaca',
          breed: animal.breed
        };
      });
      
      // Apply category filter
      if (filterCategory !== 'all') {
        filteredData = filteredData.filter((f: any) => f.category === filterCategory);
        console.log(`After category filter (${filterCategory}): ${filteredData.length}`);
      }

      // Apply age range filter
      filteredData = filteredData.filter((f: any) => 
        f.age_months >= ageRange[0] && f.age_months <= ageRange[1]
      );
      console.log(`After age range filter (${ageRange[0]}-${ageRange[1]}): ${filteredData.length}`);

      console.log('Final eligible females:', filteredData.length);
      setEligibleFemales(filteredData);
      
      if (filteredData.length === 0) {
        toast({
          title: t('activities:artificialInsemination.noEligibleFemales'),
          description: t('activities:artificialInsemination.noFemalesWithFilters', { total: data?.length || 0 }),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading eligible females:', error);
      toast({
        title: t('common:status.error'),
        description: t('activities:artificialInsemination.errorLoadingFemales') + ': ' + (error as Error).message,
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
        title: t('common:status.error'),
        description: t('activities:artificialInsemination.selectBullFromCatalog'),
        variant: "destructive"
      });
      return false;
    }

    if (bullMode === 'manual') {
      if (!manualBullData.nombre || !manualBullData.identificador || !manualBullData.raza) {
        toast({
          title: t('common:status.error'), 
          description: t('activities:artificialInsemination.completeBullData'),
          variant: "destructive"
        });
        return false;
      }
    }

    if (selectedFemales.length === 0) {
      toast({
        title: t('common:status.error'),
        description: t('activities:artificialInsemination.selectAtLeastOneFemale'),
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !currentUser?.cabañaId) {
      if (!currentUser?.cabañaId) {
        toast({
          title: t('common:status.error'),
          description: t('activities:artificialInsemination.noCabanaError'),
          variant: "destructive"
        });
      }
      return;
    }

    setLoading(true);
    try {

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
          "cabaña_id": currentUser.cabañaId,
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

      // Create AI records in artificial_inseminations table for each female
      for (const female of selectedFemales) {
        const { error: aiError } = await supabase
          .from('artificial_inseminations')
          .insert({
            cabaña_id: currentUser.cabañaId,
            female_id: female.id,
            bull_name: aiData.toro_nombre,
            insemination_date: format(date, 'yyyy-MM-dd'),
            notes: observaciones || null,
            created_by: currentUser.id,
          });

        if (aiError) throw aiError;
      }

      toast({
        title: t('common:status.success'),
        description: t('activities:artificialInsemination.serviceCreatedDetails', {
          count: selectedFemales.length,
          control: format(fechaControl, 'dd/MM/yyyy', { locale: es }),
          fpp: format(fpp, 'dd/MM/yyyy', { locale: es })
        }),
      });

      onOpenChange(false);
      onSuccess?.();
      resetForm();
    } catch (error: any) {
      console.error('Error creating IA service:', error);
      toast({
        title: t('common:status.error'),
        description: error.message || t('activities:artificialInsemination.errorCreatingService'),
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
          <DialogTitle>{t('activities:artificialInsemination.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('activities:artificialInsemination.serviceDate')}</Label>
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
              <Label>{t('activities:artificialInsemination.veterinarian')}</Label>
              <Input
                value={veterinario}
                onChange={(e) => setVeterinario(e.target.value)}
                placeholder={t('activities:artificialInsemination.veterinarianPlaceholder')}
              />
            </div>
          </div>

          {/* Bull Selection */}
          <Accordion type="single" defaultValue="bull-data" collapsible>
            <AccordionItem value="bull-data">
              <AccordionTrigger>{t('activities:artificialInsemination.bullDataRequired')}</AccordionTrigger>
              <AccordionContent>
                <Tabs value={bullMode} onValueChange={(value) => setBullMode(value as 'catalog' | 'manual')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="catalog">{t('activities:artificialInsemination.catalog')}</TabsTrigger>
                    <TabsTrigger value="manual">{t('activities:artificialInsemination.manual')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="catalog" className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('activities:artificialInsemination.selectBull')}</Label>
                      <Select
                        value={selectedBull?.id || ""}
                        onValueChange={(value) => {
                          const bull = bulls.find(b => b.id === value);
                          setSelectedBull(bull || null);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('activities:artificialInsemination.searchAndSelectBull')} />
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
                          {t('activities:artificialInsemination.noBullsInCatalog')}
                        </p>
                      )}
                    </div>

                    {selectedBull && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">{selectedBull.name}</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span>{t('activities:artificialInsemination.breed')}: {selectedBull.breed}</span>
                          <span>{t('activities:artificialInsemination.registration')}: {selectedBull.registration_level || 'N/A'}</span>
                          <span>{t('activities:artificialInsemination.ce')}: {selectedBull.scrotal_circumference}cm</span>
                          <span>{t('activities:artificialInsemination.finalWeight')}: {selectedBull.final_weight}kg</span>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="manual" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('activities:artificialInsemination.nameRequired')}</Label>
                        <Input
                          value={manualBullData.nombre}
                          onChange={(e) => setManualBullData(prev => ({ ...prev, nombre: e.target.value }))}
                          placeholder={t('activities:artificialInsemination.bullNamePlaceholder')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('activities:artificialInsemination.identifierRequired')}</Label>
                        <Input
                          value={manualBullData.identificador}
                          onChange={(e) => setManualBullData(prev => ({ ...prev, identificador: e.target.value }))}
                          placeholder={t('activities:artificialInsemination.identifierPlaceholder')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{t('activities:artificialInsemination.breedRequired')}</Label>
                        <Select
                          value={manualBullData.raza}
                          onValueChange={(value) => setManualBullData(prev => ({ ...prev, raza: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('activities:artificialInsemination.selectBreed')} />
                          </SelectTrigger>
                          <SelectContent>
                            {BREEDS.map((breed) => (
                              <SelectItem key={breed} value={breed}>{breed}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('activities:artificialInsemination.registration')}</Label>
                        <Select
                          value={manualBullData.registro || ""}
                          onValueChange={(value) => setManualBullData(prev => ({ ...prev, registro: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('activities:artificialInsemination.registrationLevel')} />
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
                          <Label>{t('activities:artificialInsemination.hornStatus')}</Label>
                          <Select
                            value={manualBullData.horn_status || ""}
                            onValueChange={(value) => setManualBullData(prev => ({ ...prev, horn_status: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('activities:artificialInsemination.hornStatusPlaceholder')} />
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
                          <Label>{t('activities:artificialInsemination.coatColor')}</Label>
                          <Select
                            value={manualBullData.pelaje || ""}
                            onValueChange={(value) => setManualBullData(prev => ({ ...prev, pelaje: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('activities:artificialInsemination.coatColorPlaceholder')} />
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
                        <Label>{t('activities:artificialInsemination.ce')}</Label>
                        <Input
                          type="number"
                          value={manualBullData.ce_cm || ''}
                          onChange={(e) => setManualBullData(prev => ({ ...prev, ce_cm: Number(e.target.value) || undefined }))}
                          placeholder={t('activities:artificialInsemination.scrotalCircumference')}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="adn_verificado"
                          checked={manualBullData.adn_verificado}
                          onCheckedChange={(checked) => setManualBullData(prev => ({ ...prev, adn_verificado: checked as boolean }))}
                        />
                        <Label htmlFor="adn_verificado">{t('activities:artificialInsemination.dnaVerified')}</Label>
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
              <h3 className="text-lg font-medium">{t('activities:artificialInsemination.eligibleFemalesSelection')}</h3>
              <div className="text-sm text-muted-foreground">
                {t('activities:artificialInsemination.selectedOfEligible', {
                  selected: selectedFemales.length,
                  eligible: eligibleFemales.length
                })}
              </div>
            </div>

            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
              <strong>{t('activities:artificialInsemination.automaticCriteria')}:</strong> {t('activities:artificialInsemination.criteriaDescription')}
            </div>

            {/* Filters */}
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('activities:artificialInsemination.searchByNameId')}</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t('activities:artificialInsemination.searchFemalePlaceholder')}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('activities:artificialInsemination.category')}</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('activities:artificialInsemination.all')}</SelectItem>
                      <SelectItem value="Vaquillona">{t('activities:artificialInsemination.heifers')}</SelectItem>
                      <SelectItem value="Vaca">{t('activities:artificialInsemination.cows')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('activities:artificialInsemination.ageMonths', { min: ageRange[0], max: ageRange[1] })}</Label>
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
                {t('activities:artificialInsemination.selectAllFiltered', { count: eligibleFemales.length })}
              </Button>
            </div>

            {/* Selected Females */}
            {selectedFemales.length > 0 && (
              <div className="space-y-2">
                <Label>{t('activities:artificialInsemination.selectedFemales', { count: selectedFemales.length })}</Label>
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
              <Label>{t('activities:artificialInsemination.availableFemales')}</Label>
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {loadingFemales ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('activities:artificialInsemination.loadingFemales')}
                  </div>
                ) : eligibleFemales.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('activities:artificialInsemination.noEligibleWithFilters')}
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
            <Label>{t('activities:artificialInsemination.observations')}</Label>
            <Textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder={t('activities:artificialInsemination.observationsPlaceholder')}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? t('activities:artificialInsemination.creating') : t('activities:artificialInsemination.createService')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}