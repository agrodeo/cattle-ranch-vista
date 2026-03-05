import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Calendar as CalendarIcon, Heart, AlertTriangle, CheckCircle, Users } from "lucide-react";
import { NewTactoDialog } from "./NewTactoDialog";
import { format, addDays, differenceInMonths, differenceInDays } from "date-fns";
import { es, enUS, pt } from "date-fns/locale";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useTranslation } from "react-i18next";
import { getCurrentLanguage } from "@/i18n";

interface Animal {
  id: string;
  name: string;
  id_tag: string;
  sex: string;
  birth_date: string;
  status: string;
  breed: string;
  corral_id: string;
  cabaña_id: string;
}

interface PregnancyRecord {
  animal: Animal;
  isPregnant: "yes" | "no" | null;
  detectionDate: Date;
  observations: string;
  estimatedDueDate: Date | null;
}

export function PregnancyDetectionManager() {
  const { t } = useTranslation(['reproductive', 'common']);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [corrales, setCorrales] = useState<any[]>([]);
  const [selectedCorral, setSelectedCorral] = useState<string>("all");
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [pregnancyRecords, setPregnancyRecords] = useState<PregnancyRecord[]>([]);
  const [detectionDate, setDetectionDate] = useState<Date>(new Date());
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultResult, setDefaultResult] = useState<"yes" | "no" | null>(null);
  const { toast } = useToast();
  const { currentUser } = useSupabaseAuth();

  const getDateLocale = () => {
    const lang = getCurrentLanguage();
    if (lang === 'en') return enUS;
    if (lang === 'pt') return pt;
    return es;
  };

  useEffect(() => {
    fetchEligibleAnimals();
    loadCorrales();
  }, []);

  const fetchEligibleAnimals = async () => {
    try {
      setLoading(true);
      
      if (!currentUser?.cabañaId) return;

      const { data: animalsData, error } = await supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", currentUser.cabañaId)
        .eq("sex", "Hembra")
        .not("status", "in", '("vendido","muerto","Vendido","Muerto","sold","dead")');

      if (error) throw error;

      const eligibleAnimals = animalsData?.filter(animal => {
        if (!animal.birth_date) return false;
        const ageInMonths = differenceInMonths(new Date(), new Date(animal.birth_date));
        const status = animal.status?.toLowerCase();
        const isInactive = status === 'vendido' || status === 'muerto';
        return ageInMonths >= 15 && !isInactive;
      }) || [];

      setAnimals(eligibleAnimals);
    } catch (error) {
      console.error("Error fetching animals:", error);
      toast({
        variant: "destructive",
        title: t('common:toast.error'),
        description: t('reproductive:detection.errorLoadAnimals'),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCorrales = async () => {
    try {
      const { data: corralesData, error } = await supabase
        .from('corrales')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setCorrales(corralesData || []);
    } catch (error) {
      console.error("Error loading corrales:", error);
    }
  };

  const handleAnimalSelection = (animalId: string, checked: boolean) => {
    if (checked) {
      setSelectedAnimals(prev => [...prev, animalId]);
      const animal = animals.find(a => a.id === animalId);
      if (animal) {
        setPregnancyRecords(prev => [...prev, {
          animal,
          isPregnant: null,
          detectionDate: detectionDate,
          observations: "",
          estimatedDueDate: null
        }]);
      }
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId));
      setPregnancyRecords(prev => prev.filter(record => record.animal.id !== animalId));
    }
  };

  const updatePregnancyRecord = (animalId: string, field: keyof PregnancyRecord, value: any) => {
    setPregnancyRecords(prev => prev.map(record => {
      if (record.animal.id === animalId) {
        const updated = { ...record, [field]: value };
        if (field === 'isPregnant' && value === 'yes') {
          updated.estimatedDueDate = addDays(updated.detectionDate, 283);
        } else if (field === 'isPregnant' && value === 'no') {
          updated.estimatedDueDate = null;
        }
        return updated;
      }
      return record;
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const finalRecords = pregnancyRecords.map(record => ({
        ...record,
        isPregnant: record.isPregnant || defaultResult
      }));

      const validRecords = finalRecords.filter(record => record.isPregnant !== null);
      
      if (validRecords.length === 0) {
        toast({
          variant: "destructive",
          title: t('common:toast.error'),
          description: t('reproductive:detection.errorNoResult'),
        });
        return;
      }

      if (!currentUser?.cabañaId) return;

      const reproductiveEvents = validRecords.map(record => ({
        animal_id: record.animal.id,
        year: new Date(record.detectionDate).getFullYear(),
        pregnancy_status: record.isPregnant === 'yes' ? 'pregnant' : 'not_pregnant',
        pregnancy_outcome: null,
        calving_date: record.isPregnant === 'yes' ? format(record.estimatedDueDate!, 'yyyy-MM-dd') : null,
        linked_calf_id: null,
        notes: record.observations || '',
        cabaña_id: currentUser.cabañaId
      }));

      const { error } = await supabase
        .from("reproductive_events")
        .insert(reproductiveEvents);

      if (error) throw error;

      toast({
        title: t('reproductive:detection.successTitle'),
        description: t('reproductive:detection.successDesc', { count: validRecords.length }),
      });

      setSelectedAnimals([]);
      setPregnancyRecords([]);
      setDialogOpen(false);
      
    } catch (error) {
      console.error("Error saving pregnancy detections:", error);
      toast({
        variant: "destructive",
        title: t('common:toast.error'),
        description: t('reproductive:detection.errorSaving'),
      });
    } finally {
      setLoading(false);
    }
  };

  const selectAllAnimals = () => {
    const allIds = filteredAnimals.map(a => a.id);
    setSelectedAnimals(allIds);
    setPregnancyRecords(filteredAnimals.map(animal => ({
      animal,
      isPregnant: defaultResult,
      detectionDate: detectionDate,
      observations: "",
      estimatedDueDate: defaultResult === 'yes' ? addDays(detectionDate, 283) : null
    })));
  };

  const selectCorralAnimals = (corralId: string) => {
    const corralAnimals = filteredAnimals.filter(a => a.corral_id === corralId);
    const corralIds = corralAnimals.map(a => a.id);
    const newSelectedAnimals = [...new Set([...selectedAnimals, ...corralIds])];
    
    setSelectedAnimals(newSelectedAnimals);
    
    const newRecords = corralAnimals
      .filter(animal => !pregnancyRecords.some(r => r.animal.id === animal.id))
      .map(animal => ({
        animal,
        isPregnant: defaultResult,
        detectionDate: detectionDate,
        observations: "",
        estimatedDueDate: defaultResult === 'yes' ? addDays(detectionDate, 283) : null
      }));
    
    setPregnancyRecords(prev => [...prev, ...newRecords]);
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
    setPregnancyRecords([]);
  };

  const filteredAnimals = selectedCorral && selectedCorral !== "all"
    ? animals.filter(a => a.corral_id === selectedCorral)
    : animals;

  const markAllAs = (result: "yes" | "no") => {
    setPregnancyRecords(prev => prev.map(record => ({
      ...record,
      isPregnant: result,
      estimatedDueDate: result === 'yes' ? addDays(record.detectionDate, 283) : null
    })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">{t('reproductive:detection.title')}</h3>
          <p className="text-muted-foreground">
            {t('reproductive:detection.subtitle')}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <NewTactoDialog onSuccess={fetchEligibleAnimals} />
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('reproductive:detection.dialogTitle')}</DialogTitle>
              <DialogDescription>
                {t('reproductive:detection.dialogDesc')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Filter by Corral */}
              {corrales.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('reproductive:detection.filterByCorral')}</Label>
                  <div className="flex gap-2">
                    <Select value={selectedCorral} onValueChange={setSelectedCorral}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t('reproductive:detection.allCorrals')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('reproductive:detection.allCorrals')}</SelectItem>
                        {corrales.map((corral) => (
                          <SelectItem key={corral.id} value={corral.id}>
                            {corral.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCorral && selectedCorral !== "all" && (
                      <Button
                        variant="outline"
                        onClick={() => selectCorralAnimals(selectedCorral)}
                        className="flex items-center gap-2"
                      >
                        <Users className="h-4 w-4" />
                        {t('reproductive:detection.addCorral')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {/* General config */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t('reproductive:detection.detectionDate')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(detectionDate, "PPP", { locale: getDateLocale() })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={detectionDate}
                        onSelect={(date) => date && setDetectionDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>{t('reproductive:detection.defaultResult')}</Label>
                  <RadioGroup
                    value={defaultResult || ""}
                    onValueChange={(value) => setDefaultResult(value as "yes" | "no" | null)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="def-pregnant" />
                      <Label htmlFor="def-pregnant" className="text-sm">{t('reproductive:detection.pregnant')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="def-empty" />
                      <Label htmlFor="def-empty" className="text-sm">{t('reproductive:detection.empty')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="" id="def-manual" />
                      <Label htmlFor="def-manual" className="text-sm">{t('reproductive:detection.manual')}</Label>
                    </div>
                  </RadioGroup>
                  {defaultResult && (
                    <p className="text-xs text-muted-foreground">
                      {t('reproductive:detection.autoApply')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>{t('reproductive:detection.generalObservations')}</Label>
                  <Textarea
                    placeholder={t('reproductive:detection.generalObservationsPlaceholder')}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                  />
                </div>
              </div>

              {/* Animal selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {t('reproductive:detection.eligibleFemales')} ({filteredAnimals.length} {selectedCorral !== "all" ? t('reproductive:detection.inSelectedCorral') : t('reproductive:detection.available')})
                  </Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllAnimals}>
                      {t('reproductive:detection.selectAll')} {selectedCorral !== "all" ? t('reproductive:detection.selectCorral') : ''}
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      {t('reproductive:detection.clear')}
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>{t('reproductive:detection.tableAnimal')}</TableHead>
                        <TableHead>{t('reproductive:detection.tableAge')}</TableHead>
                        <TableHead>{t('reproductive:detection.tableBreed')}</TableHead>
                        <TableHead>{t('reproductive:detection.tableStatus')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAnimals.map((animal) => (
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
                              <div className="font-medium">{animal.name || t('reproductive:detection.noName')}</div>
                              <div className="text-sm text-muted-foreground">{animal.id_tag}</div>
                              {animal.corral_id && (
                                <div className="text-xs text-muted-foreground">
                                  {t('reproductive:detection.corralLabel')}: {corrales.find(c => c.id === animal.corral_id)?.name || 'N/A'}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {animal.birth_date ? 
                              `${differenceInMonths(new Date(), new Date(animal.birth_date))} ${t('reproductive:detection.months')}`
                              : t('reproductive:detection.notRegistered')
                            }
                          </TableCell>
                          <TableCell>{animal.breed || t('reproductive:detection.notSpecified')}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {animal.status || t('reproductive:detection.active')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Detection results */}
              {pregnancyRecords.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {t('reproductive:detection.detectionResult')} ({pregnancyRecords.length} {t('reproductive:detection.animalsSelected')})
                    </Label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => markAllAs('yes')}
                        className="text-primary border-primary/20 hover:bg-primary/10"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t('reproductive:detection.allPregnant')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => markAllAs('no')}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {t('reproductive:detection.allEmpty')}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-h-60 overflow-y-auto border rounded-lg p-4">
                    {pregnancyRecords.map((record) => (
                      <Card key={record.animal.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{record.animal.name || t('reproductive:detection.noName')}</div>
                              <div className="text-sm text-muted-foreground">{record.animal.id_tag}</div>
                            </div>
                            {record.estimatedDueDate && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {t('reproductive:detection.expectedCalving')}: {format(record.estimatedDueDate, "dd/MM/yyyy")}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm">{t('reproductive:detection.isPregnant')}</Label>
                            <RadioGroup
                              value={record.isPregnant || ""}
                              onValueChange={(value) => 
                                updatePregnancyRecord(record.animal.id, 'isPregnant', value as "yes" | "no")
                              }
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`yes-${record.animal.id}`} />
                                <Label htmlFor={`yes-${record.animal.id}`} className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  {t('reproductive:detection.yesPregnant')}
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`no-${record.animal.id}`} />
                                <Label htmlFor={`no-${record.animal.id}`} className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                  {t('reproductive:detection.noEmpty')}
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">{t('reproductive:detection.animalObservations')}</Label>
                            <Textarea
                              placeholder={t('reproductive:detection.animalObservationsPlaceholder')}
                              value={record.observations}
                              onChange={(e) => 
                                updatePregnancyRecord(record.animal.id, 'observations', e.target.value)
                              }
                              rows={2}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('reproductive:detection.cancel')}
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || pregnancyRecords.length === 0}
                >
                  {loading ? t('reproductive:detection.saving') : t('reproductive:detection.saveDetections')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reproductive:detection.eligibleFemalesCard')}</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{animals.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('reproductive:detection.olderThan15')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reproductive:detection.detectionsToday')}</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              {t('reproductive:detection.todayRecords')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reproductive:detection.pregnantCard')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              {t('reproductive:detection.positiveResult')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reproductive:detection.expectedCalvings')}</CardTitle>
            <CalendarIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              {t('reproductive:detection.next30days')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detection history */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reproductive:detection.detectionHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h4 className="text-lg font-medium mb-2">{t('reproductive:detection.systemTitle')}</h4>
            <p className="mb-4">
              {t('reproductive:detection.systemDesc')}
            </p>
            <div className="text-sm space-y-2">
              <p>• {t('reproductive:detection.feature1')}</p>
              <p>• {t('reproductive:detection.feature2')}</p>
              <p>• {t('reproductive:detection.feature3')}</p>
              <p>• {t('reproductive:detection.feature4')}</p>
              <p>• {t('reproductive:detection.feature5')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
