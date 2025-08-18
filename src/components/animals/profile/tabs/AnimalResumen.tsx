import { Animal } from "@/types/animal";
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
  CheckCircle,
  XCircle
} from "lucide-react";
import { AnimalActivitiesHistory } from "@/components/animals/AnimalActivitiesHistory";
import { useVaccinationAlerts } from "@/hooks/useVaccinationAlerts";
import { calculateAge } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AnimalResumenProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalResumen({ animal }: AnimalResumenProps) {
  const age = animal.birth_date ? calculateAge(animal.birth_date) : null;
  const { alerts: vaccinationAlerts, loading: vaccinationLoading } = useVaccinationAlerts(animal.id);
  const [reproductiveData, setReproductiveData] = useState<{
    pregnancyPercentage: number;
    calvingPercentage: number;
    totalOffspring: number;
    liveOffspring: number;
  } | null>(null);

  useEffect(() => {
    const fetchReproductiveData = async () => {
      if (animal.sex !== 'Hembra') return;
      
      try {
        // Get reproductive events for this animal
        const { data: reproductiveEvents } = await supabase
          .from('reproductive_events')
          .select('*')
          .eq('animal_id', animal.id);

        // Get offspring count
        const { data: offspring } = await supabase
          .from('animals')
          .select('id, status')
          .or(`mother_id.eq.${animal.id},father_id.eq.${animal.id}`);

        const totalEvents = reproductiveEvents?.length || 0;
        const pregnancies = reproductiveEvents?.filter(e => e.pregnancy_status === 'confirmed').length || 0;
        const calvings = reproductiveEvents?.filter(e => e.calving_date).length || 0;
        const liveOffspring = offspring?.filter(o => o.status !== 'muerto').length || 0;
        const totalOffspring = offspring?.length || 0;

        setReproductiveData({
          pregnancyPercentage: totalEvents > 0 ? Math.round((pregnancies / totalEvents) * 100) : 0,
          calvingPercentage: pregnancies > 0 ? Math.round((calvings / pregnancies) * 100) : 0,
          totalOffspring,
          liveOffspring
        });
      } catch (error) {
        console.error('Error fetching reproductive data:', error);
      }
    };

    fetchReproductiveData();
  }, [animal.id, animal.sex]);

  const getVaccinationStatus = () => {
    if (vaccinationLoading) return { status: 'Cargando...', color: 'text-muted-foreground', nextDate: null };
    
    if (!vaccinationAlerts || vaccinationAlerts.length === 0) {
      return { status: 'Sin esquema', color: 'text-muted-foreground', nextDate: null };
    }

    const overdueAlerts = vaccinationAlerts.filter(alert => alert.status === 'overdue');
    const missingAlerts = vaccinationAlerts.filter(alert => alert.status === 'missing');
    const dueSoonAlerts = vaccinationAlerts.filter(alert => alert.status === 'due_soon');

    if (overdueAlerts.length > 0) {
      return { 
        status: `${overdueAlerts.length} vencida${overdueAlerts.length > 1 ? 's' : ''}`, 
        color: 'text-destructive',
        nextDate: null
      };
    }

    if (missingAlerts.length > 0) {
      return { 
        status: `${missingAlerts.length} faltante${missingAlerts.length > 1 ? 's' : ''}`, 
        color: 'text-warning',
        nextDate: null
      };
    }

    if (dueSoonAlerts.length > 0) {
      const nextAlert = dueSoonAlerts[0];
      return { 
        status: 'Próximas', 
        color: 'text-warning',
        nextDate: nextAlert.next_due_date
      };
    }

    return { status: 'Al día', color: 'text-success', nextDate: null };
  };

  const vaccinationStatus = getVaccinationStatus();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Peso Actual */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Peso</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {animal.peso_actual_kg ? `${animal.peso_actual_kg} kg` : 'Sin datos'}
            </div>
            {animal.ganancia_diaria_kg && (
              <p className="text-xs text-muted-foreground">
                GAN: +{animal.ganancia_diaria_kg.toFixed(2)} kg/día
              </p>
            )}
            {animal.fecha_ultimo_pesaje && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(animal.fecha_ultimo_pesaje), 'dd/MM/yyyy', { locale: es })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Estado Reproductivo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado Reproductivo</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {animal.esta_preñada ? 'Preñada' : 
               animal.sex === 'Hembra' ? 'Vacía' : 'N/A'}
            </div>
            {animal.fecha_probable_parto && (
              <p className="text-xs text-muted-foreground">
                FPP: {format(new Date(animal.fecha_probable_parto), 'dd/MM/yyyy', { locale: es })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vacunas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacunas</CardTitle>
            <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${vaccinationStatus.color}`}>
              {vaccinationStatus.status}
            </div>
            {vaccinationStatus.nextDate && (
              <p className="text-xs text-muted-foreground">
                Próxima: {format(new Date(vaccinationStatus.nextDate), 'dd/MM/yyyy', { locale: es })}
              </p>
            )}
            {!vaccinationStatus.nextDate && vaccinationStatus.status !== 'Cargando...' && (
              <p className="text-xs text-muted-foreground">
                {vaccinationStatus.status === 'Sin esquema' ? 'No hay vacunas configuradas' : 
                 vaccinationStatus.status === 'Al día' ? 'Todas las vacunas al día' : 'Revisar calendario'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Hijos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Descendencia</CardTitle>
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
              {animal.sex === 'Hembra' ? 'Vivos/Total' : 'Hijos registrados'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {animal.sex === 'Hembra' && reproductiveData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">% Preñez</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Histórico</span>
                  <span className="text-sm font-medium">{reproductiveData.pregnancyPercentage}%</span>
                </div>
                <Progress value={reproductiveData.pregnancyPercentage} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">% Parición</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Histórico</span>
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
      <div className="space-y-3">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Alertas y Avisos
        </h3>

        {/* Alertas de vacunación */}
        {vaccinationAlerts && vaccinationAlerts.length > 0 && (
          <>
            {vaccinationAlerts
              .filter(alert => alert.status === 'overdue' || alert.status === 'missing' || alert.status === 'due_soon')
              .map((alert, index) => (
                <Alert key={index} variant={alert.status === 'overdue' ? 'destructive' : 'default'}>
                  {alert.status === 'overdue' ? <XCircle className="h-4 w-4" /> : 
                   alert.status === 'missing' ? <AlertTriangle className="h-4 w-4" /> :
                   <Calendar className="h-4 w-4" />}
                  <AlertDescription>
                    <strong>
                      {alert.status === 'overdue' ? 'Vacuna vencida:' :
                       alert.status === 'missing' ? 'Vacuna faltante:' :
                       'Vacuna próxima:'}
                    </strong> {alert.vaccine_name}
                    {alert.status === 'overdue' && alert.days_since_last && 
                      ` - Vencida hace ${alert.days_since_last} días`}
                    {alert.status === 'due_soon' && alert.days_until_due && 
                      ` - Vence en ${alert.days_until_due} días`}
                    {alert.description && `. ${alert.description}`}
                  </AlertDescription>
                </Alert>
              ))
            }
          </>
        )}

        {/* Si no hay alertas de vacunación, mostrar mensaje informativo */}
        {(!vaccinationAlerts || vaccinationAlerts.length === 0) && !vaccinationLoading && (
          <Alert>
            <Syringe className="h-4 w-4" />
            <AlertDescription>
              <strong>Sin esquema de vacunación:</strong> No hay vacunas configuradas para este animal. 
              Considere configurar un plan de vacunación apropiado.
            </AlertDescription>
          </Alert>
        )}

        {age && age < 12 && (
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              <strong>Animal joven:</strong> Menor a 12 meses. 
              Seguimiento especial requerido.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}