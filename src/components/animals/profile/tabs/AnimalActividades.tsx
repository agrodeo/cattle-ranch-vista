import { Animal } from "@/types/animal";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Filter, 
  Activity, 
  Scale, 
  Heart, 
  Syringe, 
  MapPin, 
  User,
  ExternalLink,
  Baby,
  Flame,
  Scissors,
  CircleSlash,
  Pill
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { useAnimalActivities } from "@/hooks/useAnimalActivities";
import { useAllActivities, UnifiedActivity } from "@/hooks/useAllActivities";
import { Link, useNavigate } from "react-router-dom";
import { ActivityDetailDialog } from "@/components/activities/ActivityDetailDialog";

interface AnimalActividadesProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalActividades({ animal }: AnimalActividadesProps) {
  const { t } = useTranslation(['common', 'activities']);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroFecha, setFiltroFecha] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [selectedBatchActivity, setSelectedBatchActivity] = useState<UnifiedActivity | null>(null);
  
  const { activities, isLoading } = useAnimalActivities(animal.id);
  const { activities: allActivities } = useAllActivities();
  const navigate = useNavigate();

  // Helper function to match activity types between batch and individual activities
  const matchActivityTypes = (batchTipo: string, actividadType: string): boolean => {
    const typeMap: Record<string, string[]> = {
      'VACUNACION': ['vaccination', 'vacunacion'],
      'PESAJE': ['pesaje'],
      'TACTO': ['tacto'],
      'IA': ['insemination', 'ia'],
      'PARTO': ['parto'],
      'MUERTE': ['muerte'],
      'GENERAL': ['general', 'destete', 'marcacion', 'castracion', 'descorne', 'tratamiento'],
    };
    
    const mappedTypes = typeMap[batchTipo] || [batchTipo.toLowerCase()];
    return mappedTypes.includes(actividadType.toLowerCase());
  };

  const actividadesFiltradas = activities.filter(actividad => {
    const cumpleTipo = filtroTipo === 'todos' || actividad.type === filtroTipo;
    const cumpleFecha = !filtroFecha || actividad.date.includes(filtroFecha);
    const cumpleBusqueda = !busqueda || 
      actividad.description.toLowerCase().includes(busqueda.toLowerCase()) ||
      (actividad.responsable && actividad.responsable.toLowerCase().includes(busqueda.toLowerCase()));
    
    return cumpleTipo && cumpleFecha && cumpleBusqueda;
  });

  const getTypeLabel = (tipo: string) => {
    const types: { [key: string]: string } = {
      'pesaje': 'Pesaje',
      'vaccination': 'Vacunación',
      'tacto': 'Tacto',
      'movimiento': 'Movimiento',
      'insemination': 'Inseminación',
      'reproductive': 'Reproductivo',
      'destete': 'Destete',
      'marcacion': 'Marcación',
      'castracion': 'Castración',
      'descorne': 'Descorne',
      'tratamiento': 'Tratamiento',
      'apareamiento': 'Apareamiento',
      'parto': 'Parto',
      'general': 'Manejo'
    };
    return types[tipo] || tipo;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "insemination":
        return Heart;
      case "vaccination":
        return Syringe;
      case "pesaje":
        return Scale;
      case "reproductive":
        return Heart;
      case "movimiento":
        return MapPin;
      case "destete":
        return Baby;
      case "marcacion":
        return Flame;
      case "castracion":
        return Scissors;
      case "descorne":
        return CircleSlash;
      case "tratamiento":
        return Pill;
      case "apareamiento":
        return Heart;
      case "parto":
        return Baby;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "insemination":
        return "bg-purple-500";
      case "vaccination":
        return "bg-green-500";
      case "pesaje":
        return "bg-blue-500";
      case "reproductive":
        return "bg-pink-500";
      case "movimiento":
        return "bg-yellow-500";
      case "destete":
        return "bg-blue-600";
      case "marcacion":
        return "bg-orange-500";
      case "castracion":
        return "bg-red-500";
      case "descorne":
        return "bg-amber-600";
      case "tratamiento":
        return "bg-emerald-500";
      case "apareamiento":
        return "bg-pink-600";
      case "parto":
        return "bg-purple-600";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Historial de Actividades</h2>
          <p className="text-muted-foreground">
            Registro completo de todas las actividades del animal
          </p>
        </div>
        
        <Link to="/activities" className="w-full sm:w-auto">
          <Button className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Agregar Actividad</span>
            <span className="sm:hidden">Agregar</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Actividad</label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="pesaje">Pesajes</SelectItem>
                  <SelectItem value="vaccination">Vacunaciones</SelectItem>
                  <SelectItem value="tacto">Tactos</SelectItem>
                  <SelectItem value="movimiento">Movimientos</SelectItem>
                  <SelectItem value="insemination">Inseminaciones</SelectItem>
                  <SelectItem value="reproductive">Reproductivos</SelectItem>
                  <SelectItem value="destete">Destete</SelectItem>
                  <SelectItem value="marcacion">Marcación</SelectItem>
                  <SelectItem value="castracion">Castración</SelectItem>
                  <SelectItem value="descorne">Descorne</SelectItem>
                  <SelectItem value="tratamiento">Tratamiento</SelectItem>
                  <SelectItem value="apareamiento">Apareamiento</SelectItem>
                  <SelectItem value="parto">Parto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Buscar en actividades..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline de Actividades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Timeline ({actividadesFiltradas.length} actividades)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando actividades...</p>
            </div>
          ) : actividadesFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay actividades</h3>
              <p className="text-muted-foreground mb-4">
                {activities.length === 0 
                  ? "Este animal aún no tiene actividades registradas"
                  : "No se encontraron actividades con los filtros aplicados"
                }
              </p>
              <Link to="/activities">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primera Actividad
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {actividadesFiltradas.map((actividad, index) => {
                const Icon = getActivityIcon(actividad.type);
                const color = getActivityColor(actividad.type);
                const isLast = index === actividadesFiltradas.length - 1;

                return (
                  <div key={actividad.id} className="relative">
                    {/* Línea conectora */}
                    {!isLast && (
                      <div className="absolute left-5 top-12 w-0.5 h-16 bg-border" />
                    )}
                    
                    <div className="flex items-start gap-4">
                      {/* Icono */}
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{actividad.description}</h4>
                            <Badge variant="outline">
                              {getTypeLabel(actividad.type)}
                            </Badge>
                          </div>
                          <time className="text-sm text-muted-foreground">
                            {format(new Date(actividad.date), 'dd/MM/yyyy', { locale: es })}
                          </time>
                        </div>
                        
                        {/* Detalles */}
                        {Object.keys(actividad.details).length > 0 && (
                          <div className="space-y-1 mb-2">
                            {Object.entries(actividad.details).map(([key, value]) => (
                              <p key={key} className="text-sm text-muted-foreground">
                                <span className="capitalize">{key}:</span> {value}
                              </p>
                            ))}
                          </div>
                        )}
                        
                        {/* Notas */}
                        {actividad.notes && (
                          <p className="text-sm text-muted-foreground mb-2">
                            <span className="font-medium">Notas:</span> {actividad.notes}
                          </p>
                        )}
                        
                         {/* Responsable */}
                        {actividad.responsable && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {actividad.responsable}
                          </div>
                        )}
                        
                        {/* Batch Activity Link */}
                        {(() => {
                          // Find if this activity is part of a batch
                          const batchActivity = allActivities.find(batch => 
                            batch.animales.some(a => a.id === animal.id) &&
                            batch.fecha === actividad.date &&
                            matchActivityTypes(batch.tipo, actividad.type)
                          );
                          
                          if (batchActivity && batchActivity.animales.length > 1) {
                            const otherAnimalsCount = batchActivity.animales.length - 1;
                            return (
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  +{otherAnimalsCount} {otherAnimalsCount === 1 ? 'animal' : 'animales'} más
                                </Badge>
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0 text-xs"
                                  onClick={() => setSelectedBatchActivity(batchActivity)}
                                >
                                  Ver actividad completa
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Activity Detail Dialog */}
      <ActivityDetailDialog
        activity={selectedBatchActivity}
        open={!!selectedBatchActivity}
        onClose={() => setSelectedBatchActivity(null)}
      />
    </div>
  );
}