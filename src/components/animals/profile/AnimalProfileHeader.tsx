import { Animal } from "@/types/animal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Heart, 
  Scale, 
  Syringe, 
  MapPin, 
  DollarSign, 
  Skull, 
  Truck,
  Calendar,
  Baby
} from "lucide-react";
import { calculateAge } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AnimalProfileHeaderProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalProfileHeader({ animal, onAnimalUpdate }: AnimalProfileHeaderProps) {
  const age = animal.birth_date ? calculateAge(animal.birth_date) : null;
  const isInactive = animal.status === 'vendido' || animal.status === 'muerto';
  
  const getDisplayName = () => {
    return animal.name || animal.id_tag || `Animal ${animal.id.slice(0, 8)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo': return 'bg-green-500';
      case 'vendido': return 'bg-blue-500';
      case 'muerto': return 'bg-red-500';
      case 'transferido': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getSexColor = (sex: string) => {
    switch (sex) {
      case 'Macho': return 'bg-blue-500';
      case 'Hembra': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const renderQuickActions = () => {
    if (isInactive) return null;

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={animal.sex !== 'Hembra' || age && age < 15}
          className="text-xs"
        >
          <Heart className="h-3 w-3 mr-1" />
          Inseminar
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={animal.sex !== 'Hembra' || age && age < 15}
          className="text-xs"
        >
          <Baby className="h-3 w-3 mr-1" />
          Tacto
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
        >
          <Scale className="h-3 w-3 mr-1" />
          Pesar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
        >
          <Syringe className="h-3 w-3 mr-1" />
          Vacunar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
        >
          <MapPin className="h-3 w-3 mr-1" />
          Mover
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
        >
          <DollarSign className="h-3 w-3 mr-1" />
          Vender
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="text-xs"
        >
          <Skull className="h-3 w-3 mr-1" />
          Fallecer
        </Button>
      </div>
    );
  };

  return (
    <Card className="rounded-none border-x-0 border-t-0">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Title and ID */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{getDisplayName()}</h1>
            {animal.id_tag && animal.name && (
              <Badge variant="outline">ID: {animal.id_tag}</Badge>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={`text-white ${getSexColor(animal.sex)}`}>
              {animal.sex}
            </Badge>
            
            <Badge variant="outline">
              {animal.breed}
              {animal.registration_level && ` • ${animal.registration_level}`}
            </Badge>

            {age && (
              <Badge variant="outline">
                {age} {age === 1 ? 'mes' : 'meses'}
              </Badge>
            )}

            <Badge className={`text-white ${getStatusColor(animal.status)}`}>
              {animal.status}
            </Badge>

            {animal.esta_preñada && (
              <Badge className="bg-orange-500 text-white">
                Preñada
                {animal.fecha_probable_parto && (
                  <span className="ml-1">
                    • FPP: {format(new Date(animal.fecha_probable_parto), 'dd/MM/yy')}
                  </span>
                )}
              </Badge>
            )}

            {animal.corral && (
              <Badge variant="outline">
                <MapPin className="h-3 w-3 mr-1" />
                {typeof animal.corral === 'object' ? animal.corral.name : animal.corral}
              </Badge>
            )}

            {animal.color && (
              <Badge variant="outline">
                {animal.color}
              </Badge>
            )}

            {animal.mocho && (
              <Badge variant="outline">
                {animal.mocho === 'Si' ? 'Mocho' : 'Con cuernos'}
              </Badge>
            )}
          </div>

          {/* Quick Actions */}
          {renderQuickActions()}

          {/* Status Message for Inactive Animals */}
          {isInactive && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              {animal.status === 'muerto' && <Skull className="h-4 w-4 text-red-500" />}
              {animal.status === 'vendido' && <Truck className="h-4 w-4 text-blue-500" />}
              <span className="text-sm text-muted-foreground">
                {animal.status === 'muerto' && 'Animal fallecido - Solo lectura'}
                {animal.status === 'vendido' && 'Animal vendido - Solo lectura'}
              </span>
              {animal.fecha_muerte && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(new Date(animal.fecha_muerte), 'dd/MM/yyyy', { locale: es })}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}