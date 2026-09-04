import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAll";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { calculatePregnancyRate } from "@/lib/reproductiveCalculations";
import type { AnimalReproductiveData, PregnancyRecord, ServiceRecord, OffspringRecord } from "@/types/reproductive";
import { useTranslation } from "react-i18next";

interface ReproductiveMetrics {
  porcentaje_preñez: number;
  porcentaje_paricion: number;
  total_reproductive_years: number;
  confirmed_pregnancies: number;
  live_calves: number;
}

interface ReproductivePerformanceProps {
  animalId: string;
  animalSex?: string;
}

export function ReproductivePerformance({ animalId, animalSex }: ReproductivePerformanceProps) {
  const { t } = useTranslation('animals');
  const [metrics, setMetrics] = useState<ReproductiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (animalSex !== "Hembra") {
        setLoading(false);
        return;
      }

      try {
        // Get animal data
        const { data: animalData, error: animalError } = await supabase
          .from('animals')
          .select('*')
          .eq('id', animalId)
          .single();

        if (animalError) throw animalError;

        // Get pregnancy history
        const pregnancies = await fetchAllRows<any>((from, to) =>
          supabase.from('preñeces').select('*').eq('animal_id', animalId).range(from, to)
        );

        // Get services (from IA and eventos)
        const { data: services, error: servicesError } = await supabase
          .from('ia')
          .select('id, evento_id, animales_ids')
          .contains('animales_ids', [animalId]);

        if (servicesError) throw servicesError;

        // Get offspring
        const offspring = await fetchAllRows<any>((from, to) =>
          supabase.from('animals').select('id, mother_id, father_id, status').eq('mother_id', animalId).range(from, to)
        );

        // Convert to proper types
        const animal: AnimalReproductiveData = {
          id: animalData.id,
          id_tag: animalData.id_tag,
          name: animalData.name,
          birth_date: animalData.birth_date,
          esta_preñada: animalData.esta_preñada,
          fecha_ultima_preñez: animalData.fecha_ultima_preñez,
          fecha_probable_parto: animalData.fecha_probable_parto,
          sex: animalData.sex,
          status: animalData.status,
          corral_id: animalData.corral_id
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

        // Calculate metrics using pregnancy history
        const result = calculatePregnancyRate(animal, pregnancyRecords, serviceRecords, offspringRecords);

        setMetrics({
          porcentaje_preñez: result.pregnancy_rate,
          porcentaje_paricion: result.calving_rate,
          total_reproductive_years: result.reproductive_years,
          confirmed_pregnancies: result.total_pregnancies,
          live_calves: result.total_calvings
        });

      } catch (error) {
        console.error("Error fetching reproductive metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [animalId, animalSex]);

  if (animalSex !== "Hembra") {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.reproduction.reproductivePerformance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.reproduction.reproductivePerformance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('profile.reproduction.noDataAvailable')}</p>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceBadge = (percentage: number, type: "pregnancy" | "calving") => {
    if (percentage >= 90) return <Badge className="bg-primary">{t('profile.reproduction.performance.excellent')}</Badge>;
    if (percentage >= 75) return <Badge className="bg-blue-500">{t('profile.reproduction.performance.good')}</Badge>;
    if (percentage >= 50) return <Badge className="bg-yellow-500">{t('profile.reproduction.performance.regular')}</Badge>;
    return <Badge variant="destructive">{t('profile.reproduction.performance.low')}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.reproduction.reproductivePerformance')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('profile.reproduction.pregnancyPercentage')}</span>
              {getPerformanceBadge(metrics.porcentaje_preñez || 0, "pregnancy")}
            </div>
            <div className="text-2xl font-bold">
              {metrics.porcentaje_preñez?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('profile.reproduction.pregnanciesInYears', { count: metrics.confirmed_pregnancies, years: metrics.total_reproductive_years })}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('profile.reproduction.calvingPercentage')}</span>
              {getPerformanceBadge(metrics.porcentaje_paricion || 0, "calving")}
            </div>
            <div className="text-2xl font-bold">
              {metrics.porcentaje_paricion?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('profile.reproduction.liveCalvesOfPregnancies', { calves: metrics.live_calves, pregnancies: metrics.confirmed_pregnancies })}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">{t('profile.reproduction.reproductiveYears')}</span>
            <div className="text-xl font-semibold">{metrics.total_reproductive_years}</div>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">{t('profile.reproduction.liveCalves')}</span>
            <div className="text-xl font-semibold">{metrics.live_calves}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}