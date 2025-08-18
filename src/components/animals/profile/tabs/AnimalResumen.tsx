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
  Calendar
} from "lucide-react";
import { AnimalActivitiesHistory } from "@/components/animals/AnimalActivitiesHistory";
import { calculateAge } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AnimalResumenProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalResumen({ animal }: AnimalResumenProps) {
  const age = animal.birth_date ? calculateAge(animal.birth_date) : null;

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
            <div className="text-2xl font-bold">Al día</div>
            <p className="text-xs text-muted-foreground">
              Próxima: 15/02/2024
            </p>
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
              {animal.sex === 'Hembra' ? '3/4' : '12'}
            </div>
            <p className="text-xs text-muted-foreground">
              {animal.sex === 'Hembra' ? 'Vivos/Total' : 'Hijos registrados'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {animal.sex === 'Hembra' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">% Preñez</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Este año</span>
                  <span className="text-sm font-medium">75%</span>
                </div>
                <Progress value={75} className="h-2" />
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
                  <span className="text-sm font-medium">85%</span>
                </div>
                <Progress value={85} className="h-2" />
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

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Vacuna vencida:</strong> Triple viral vence en 5 días. 
            Programar revacunación.
          </AlertDescription>
        </Alert>

        {animal.father_id && animal.mother_id && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Consanguinidad:</strong> Coeficiente de endogamia: 12.5%. 
              Considerar para próximos apareamientos.
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