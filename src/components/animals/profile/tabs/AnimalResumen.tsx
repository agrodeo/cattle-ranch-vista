import { Animal } from "@/types/animal";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Scale, 
  Heart, 
  Syringe, 
  Baby, 
  AlertTriangle, 
  Calendar,
  CheckCircle
} from "lucide-react";
import { AnimalActivitiesHistory } from "@/components/animals/AnimalActivitiesHistory";
import { useAnimalVaccinations } from "@/hooks/useAnimalVaccinations";
import { calculateAge } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculatePregnancyRate } from "@/lib/reproductiveCalculations";
import type { AnimalReproductiveData, PregnancyRecord, ServiceRecord, OffspringRecord } from "@/types/reproductive";

interface AnimalResumenProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

interface WeightData {
  peso_kg: number;
  fecha: string;
  ganancia_diaria?: number;
}

export function AnimalResumen({ animal }: AnimalResumenProps) {
  const { t } = useTranslation(['common', 'animals']);
  const age = animal.birth_date ? calculateAge(animal.birth_date) : null;
  const { status: vaccinationStatus, loading: vaccinationLoading } = useAnimalVaccinations(animal.id);
  const [reproductiveData, setReproductiveData] = useState<{
    pregnancyPercentage: number;
    calvingPercentage: number;
    totalOffspring: number;
    liveOffspring: number;
  } | null>(null);
  const [latestWeight, setLatestWeight] = useState<WeightData | null>(null);

  // Fetch latest weight from animal_weight_history
  useEffect(() => {
    const fetchLatestWeight = async () => {
      try {
        const { data, error } = await supabase
          .from('animal_weight_history')
          .select('peso_kg, fecha, ganancia_diaria')
          .eq('animal_id', animal.id)
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setLatestWeight(data);
        }
      } catch (error) {
        console.error('Error fetching latest weight:', error);
      }
    };

    fetchLatestWeight();
  }, [animal.id]);

  // Fetch reproductive data using the same logic as ReproductivePerformance
  useEffect(() => {
    const fetchReproductiveData = async () => {
      if (animal.sex !== 'Hembra') return;
      
      try {
        // Get pregnancy history from preñeces table
        const { data: pregnancies } = await supabase
          .from('preñeces')
          .select('*')
          .eq('animal_id', animal.id);

        // Get services from IA table
        const { data: services } = await supabase
          .from('ia')
          .select('id, evento_id, animales_ids')
          .contains('animales_ids', [animal.id]);

        // Get offspring count
        const { data: offspring } = await supabase
          .from('animals')
          .select('id, mother_id, father_id, status')
          .eq('mother_id', animal.id);

        // Convert to proper types
        const animalData: AnimalReproductiveData = {
          id: animal.id,
          id_tag: animal.id_tag,
          name: animal.name,
          birth_date: animal.birth_date,
          esta_preñada: animal.esta_preñada,
          fecha_ultima_preñez: undefined, // Not available in Animal type, but pregnancy detection exists in preñeces
          fecha_probable_parto: animal.fecha_probable_parto,
          sex: animal.sex,
          status: animal.status,
          corral_id: animal.corral_id
        };

        const pregnancyRecords: PregnancyRecord[] = (pregnancies || []).map(p => ({
          id: p.id,
          animal_id: p.animal_id,
          estado: p.estado,
          estado_final: (p.estado_final as 'activa' | 'exitosa' | 'fallida') || 'activa',
          fecha_inicio: p.fecha_inicio,
          fecha_estimada_parto: p.fecha_estimada_parto,
          fecha_finalizacion: p.fecha_finalizacion,
          motivo_finalizacion: p.motivo_finalizacion,
          cria_id: p.cria_id
        }));

        const serviceRecords: ServiceRecord[] = (services || []).map(s => ({
          id: s.id,
          animales_ids: s.animales_ids,
          evento_id: s.evento_id
        }));

        const offspringRecords: OffspringRecord[] = (offspring || []).map(o => ({
          id: o.id,
          mother_id: o.mother_id,
          father_id: o.father_id,
          status: o.status
        }));

        // Calculate using the same function as ReproductivePerformance
        const result = calculatePregnancyRate(animalData, pregnancyRecords, serviceRecords, offspringRecords);

        const liveOffspring = offspring?.filter(o => o.status !== 'muerto').length || 0;
        const totalOffspring = offspring?.length || 0;

        setReproductiveData({
          pregnancyPercentage: result.pregnancy_rate,
          calvingPercentage: result.calving_rate,
          totalOffspring,
          liveOffspring
        });
      } catch (error) {
        console.error('Error fetching reproductive data:', error);
      }
    };

    fetchReproductiveData();
  }, [animal.id, animal.sex]);

  const getVaccinationSummary = () => {
    if (vaccinationLoading) return { text: t('animals:profile.summary.loading'), color: 'text-muted-foreground' };
    
    if (!vaccinationStatus || vaccinationStatus.length === 0) {
      return { text: t('animals:profile.summary.noSchema'), color: 'text-muted-foreground' };
    }

    const overdue = vaccinationStatus.filter(v => v.status === 'vencida').length;
    const pending = vaccinationStatus.filter(v => v.status === 'pendiente').length;
    const complete = vaccinationStatus.filter(v => v.status === 'completa').length;

    if (overdue > 0) {
      return { text: `${overdue} ${t('animals:profile.summary.overdueCount')}`, color: 'text-destructive' };
    }
    if (pending > 0) {
      return { text: `${pending} ${t('animals:profile.summary.pendingCount')}`, color: 'text-warning' };
    }
    return { text: t('animals:profile.summary.upToDate'), color: 'text-success' };
  };

  const vaccinationSummary = getVaccinationSummary();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Peso Actual */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('animals:profile.summary.lastWeight')}</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestWeight?.peso_kg ? `${latestWeight.peso_kg} kg` : 
               animal.peso_actual_kg ? `${animal.peso_actual_kg} kg` : 
               t('animals:profile.summary.noData')}
            </div>
            {(latestWeight?.ganancia_diaria || animal.ganancia_diaria_kg) && (
              <p className="text-xs text-muted-foreground">
                {t('animals:profile.summary.dailyGainShort')}: +{(latestWeight?.ganancia_diaria || animal.ganancia_diaria_kg)?.toFixed(2)} kg/día
              </p>
            )}
            {(latestWeight?.fecha || animal.fecha_ultimo_pesaje) && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(latestWeight?.fecha || animal.fecha_ultimo_pesaje!), 'dd/MM/yyyy', { locale: es })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Estado Reproductivo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('animals:profile.summary.reproductiveStatus')}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {animal.esta_preñada ? t('animals:profile.summary.pregnant') : 
               animal.sex === 'Hembra' ? t('animals:profile.summary.open') : t('animals:profile.summary.notApplicable')}
            </div>
            {animal.fecha_probable_parto && (
              <p className="text-xs text-muted-foreground">
                {t('animals:profile.summary.expectedDueDate')}: {format(new Date(animal.fecha_probable_parto), 'dd/MM/yyyy', { locale: es })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vacunas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('animals:profile.summary.vaccines')}</CardTitle>
            <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${vaccinationSummary.color}`}>
              {vaccinationSummary.text}
            </div>
            <p className="text-xs text-muted-foreground">
              {vaccinationStatus.length} {t('animals:profile.summary.vaccinesConfigured')}
            </p>
          </CardContent>
        </Card>

        {/* Hijos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('animals:profile.summary.offspring')}</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reproductiveData ? 
                (animal.sex === 'Hembra' ? 
                  `${reproductiveData.liveOffspring}/${reproductiveData.totalOffspring}` : 
                  reproductiveData.totalOffspring.toString()
                ) : 
                '0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {animal.sex === 'Hembra' ? t('animals:profile.summary.liveOfTotal') : t('animals:profile.summary.registeredOffspring')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {animal.sex === 'Hembra' && reproductiveData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('animals:profile.summary.pregnancyRate')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">{t('animals:profile.summary.historical')}</span>
                  <span className="text-sm font-medium">{reproductiveData.pregnancyPercentage}%</span>
                </div>
                <Progress value={reproductiveData.pregnancyPercentage} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('animals:profile.summary.calvingRate')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">{t('animals:profile.summary.historical')}</span>
                  <span className="text-sm font-medium">{reproductiveData.calvingPercentage}%</span>
                </div>
                <Progress value={reproductiveData.calvingPercentage} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeline de Actividades Recientes */}
      <AnimalActivitiesHistory animalId={animal.id} animalName={animal.name || animal.id_tag} />

      {/* Alertas */}
      {age && age < 12 && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('animals:profile.summary.youngAnimal')}:</strong> {t('animals:profile.summary.youngAnimalNote')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
