import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Syringe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnimalSelector } from "./AnimalSelector";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { useTranslation } from 'react-i18next';

export function VaccinationManager() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const { requirements, loading: loadingRequirements } = useVaccinationRequirements();
  const { t } = useTranslation('activities');
  
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [lot, setLot] = useState<string>("");
  const [dose, setDose] = useState<string>("");
  const [route, setRoute] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const vaccinationEligibilityFilter = (animal: any): boolean => {
    // Exclude sold and dead animals, allow active and null status
    const status = animal.status?.toLowerCase();
    const isInactive = status === 'vendido' || status === 'muerto';
    
    console.log('Filtering animal for vaccination:', { 
      id: animal.id, 
      name: animal.name, 
      status: animal.status, 
      isInactive,
      eligible: !isInactive 
    });
    
    return !isInactive;
  };

  const handleSubmit = async () => {
    console.log('🔵 [VACCINATION] handleSubmit called', {
      selectedRequirementId,
      selectedAnimalsCount: selectedAnimals.length,
      date,
      lot,
      dose,
      route
    });

    if (!selectedRequirementId || selectedAnimals.length === 0) {
      console.log('⚠️ [VACCINATION] Validation failed - missing requirement or animals');
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: t('managers.vaccination.selectVaccineAndAnimals')
      });
      return;
    }

    try {
      setSubmitting(true);
      console.log('🔵 [VACCINATION] Starting vaccination recording for animals:', selectedAnimals);
      
      const promises = selectedAnimals.map(async animalId => {
        console.log('🔵 [VACCINATION] Recording vaccination for animal:', animalId);
        const { data, error } = await supabase.rpc('record_animal_vaccination' as any, {
          _animal_id: animalId,
          _requirement_id: selectedRequirementId,
          _date: date,
          _lot: lot || null,
          _dose: dose || null,
          _route: route || null
        });
        
        if (error) {
          console.error('❌ [VACCINATION] Error for animal', animalId, ':', error);
          throw error;
        }
        
        console.log('✅ [VACCINATION] Success for animal', animalId, ':', data);
        return data;
      });
      
      await Promise.all(promises);
      
      console.log('✅ [VACCINATION] All vaccinations recorded successfully');
      
      toast({
        title: t('managers.vaccination.vaccinationRegistered'),
        description: t('managers.vaccination.vaccinationSuccess', { count: selectedAnimals.length })
      });
      
      setSelectedAnimals([]);
      setSelectedRequirementId("");
      setLot("");
      setDose("");
      setRoute("");
    } catch (error: any) {
      console.error("❌ [VACCINATION] Error recording vaccination:", error);
      console.error("❌ [VACCINATION] Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        full: error
      });
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: error.message || t('managers.vaccination.vaccinationError')
      });
    } finally {
      setSubmitting(false);
      console.log('🔵 [VACCINATION] handleSubmit finished');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            {t('managers.vaccination.title')}
          </h3>
          <p className="text-muted-foreground">
            {t('managers.vaccination.subtitle')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('managers.vaccination.newVaccination')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">{t('managers.vaccination.date')}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="vaccine">{t('managers.vaccination.vaccine')}</Label>
              <Select value={selectedRequirementId} onValueChange={setSelectedRequirementId} disabled={loadingRequirements}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingRequirements ? t('managers.vaccination.loadingVaccines') : t('managers.vaccination.selectVaccine')} />
                </SelectTrigger>
                <SelectContent>
                  {requirements.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      {t('managers.vaccination.noVaccinesConfigured')}
                    </div>
                  ) : (
                    requirements.map(req => (
                      <SelectItem key={req.id} value={req.id}>
                        <div className="flex items-center gap-2">
                          <span>{req.vaccine_name}</span>
                          {req.is_mandatory && (
                            <Badge variant="destructive" className="text-xs">
                              {t('managers.vaccination.mandatory')}
                            </Badge>
                          )}
                          {req.doses_required && req.doses_required > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {req.doses_required} {t('managers.vaccination.doses')}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lot">{t('managers.vaccination.lot')}</Label>
              <Input
                id="lot"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                placeholder={t('managers.vaccination.lotNumber')}
              />
            </div>
            <div>
              <Label htmlFor="dose">{t('managers.vaccination.dose')}</Label>
              <Input
                id="dose"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder={t('managers.vaccination.dosePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="route">{t('managers.vaccination.route')}</Label>
              <Select value={route} onValueChange={setRoute}>
                <SelectTrigger>
                  <SelectValue placeholder={t('managers.vaccination.administrationRoute')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subcutanea">{t('managers.vaccination.subcutaneous')}</SelectItem>
                  <SelectItem value="intramuscular">{t('managers.vaccination.intramuscular')}</SelectItem>
                  <SelectItem value="intranasal">{t('managers.vaccination.intranasal')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <AnimalSelector
            eligibilityFilter={vaccinationEligibilityFilter}
            selectedAnimals={selectedAnimals}
            onSelectionChange={setSelectedAnimals}
            title={t('managers.vaccination.selectAnimalsTitle')}
            trigger={
              <Button variant="outline" className="w-full">
                <Syringe className="h-4 w-4 mr-2" />
                {selectedAnimals.length > 0 
                  ? `${selectedAnimals.length} ${t('managers.vaccination.animalsSelected')}`
                  : t('managers.vaccination.selectAnimalsButton')
                }
              </Button>
            }
          />

          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={submitting || !selectedRequirementId || selectedAnimals.length === 0 || requirements.length === 0}
          >
            {submitting ? t('managers.vaccination.registering') : t('managers.vaccination.registerVaccination')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}