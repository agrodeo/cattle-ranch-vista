import { Animal } from "@/types/animal";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, ArrowRight, Home } from "lucide-react";
import { useAnimalCorralHistory } from "@/hooks/useAnimalCorralHistory";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AnimalCorralesProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalCorrales({ animal }: AnimalCorralesProps) {
  const { t } = useTranslation(['common', 'corrals']);
  const { movements, currentCorral, isLoading } = useAnimalCorralHistory(animal.id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Corral Actual</p>
                <p className="text-lg font-semibold">
                  {currentCorral || 'Sin asignar'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Movimientos</p>
                <p className="text-lg font-semibold">{movements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Último Movimiento</p>
                <p className="text-sm font-semibold">
                  {movements.length > 0 
                    ? format(new Date(movements[0].fecha_movimiento), 'dd/MM/yyyy', { locale: es })
                    : 'No registrado'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Corral Details */}
      {animal.corral && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Corral Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nombre:</span>
                <span>{animal.corral.name}</span>
              </div>
              {animal.corral.hectareas && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Hectáreas:</span>
                  <span>{animal.corral.hectareas} ha</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estado:</span>
                <Badge variant="secondary">Asignado</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Movement History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Historial de Movimientos
          </CardTitle>
          <CardDescription>
            Registro de cambios de corral del animal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length > 0 ? (
            <div className="space-y-4">
              {movements.map((movement, index) => (
                <div key={movement.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {movement.corral_anterior_nombre && (
                        <>
                          <span className="text-sm text-muted-foreground">
                            {movement.corral_anterior_nombre}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      )}
                      <span className="font-medium">{movement.corral_nuevo_nombre || 'Sin nombre'}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(movement.fecha_movimiento), 'dd/MM/yyyy', { locale: es })}
                      </span>
                      {movement.dias_en_corral && (
                        <Badge variant="outline" className="text-xs">
                          {movement.dias_en_corral} días
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay movimientos registrados</p>
              {!currentCorral && (
                <p className="text-sm text-muted-foreground mt-2">
                  Este animal no está asignado a ningún corral
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Información Adicional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Los movimientos de corrales se registran automáticamente cuando se asigna un animal a un nuevo corral.</p>
            <p>• El historial completo de movimientos ayuda a rastrear el manejo del animal a lo largo del tiempo.</p>
            <p>• Para mover el animal a otro corral, use la función "Mover Animal" en la sección de Corrales.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}