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
  Baby,
  ArrowLeft
} from "lucide-react";
import { calculateAge } from "@/lib/utils";
import { categorizeAnimal } from "@/lib/animalCategories";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getTranslatedCategory, getTranslatedSex, getTranslatedStatus } from "@/lib/translations";

interface AnimalProfileHeaderProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalProfileHeader({ animal, onAnimalUpdate }: AnimalProfileHeaderProps) {
  const { t } = useTranslation(['animals', 'common']);
  const navigate = useNavigate();
  const age = animal.birth_date ? calculateAge(animal.birth_date) : null;
  const isInactive = animal.status === 'vendido' || animal.status === 'muerto';
  const category = categorizeAnimal(animal, animal.is_castrated || false);
  
  const getDisplayName = () => {
    return animal.name || animal.id_tag || `Animal ${animal.id.slice(0, 8)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo': return 'bg-primary';
      case 'vendido': return 'bg-accent';
      case 'muerto': return 'bg-destructive';
      case 'transferido': return 'bg-secondary';
      default: return 'bg-muted';
    }
  };

  const getSexColor = (sex: string) => {
    switch (sex) {
      case 'Macho': return 'bg-accent';
      case 'Hembra': return 'bg-primary';
      default: return 'bg-muted';
    }
  };


  return (
    <div className="w-full">
      <div className="w-full max-w-screen-sm mx-auto px-3 sm:px-4 lg:max-w-7xl lg:px-6 py-4">
        <div className="space-y-4">
          {/* Back Button and Title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/animals')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('animals:profile.backToAnimals')}</span>
              <span className="sm:hidden">{t('animals:profile.back')}</span>
            </Button>
          </div>
          
          {/* Title and ID */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold break-words">{getDisplayName()}</h1>
            {animal.id_tag && animal.name && (
              <Badge variant="outline" className="self-start sm:self-auto">ID: {animal.id_tag}</Badge>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={`text-white ${getSexColor(animal.sex)}`}>
              {getTranslatedSex(animal.sex, t)}
            </Badge>
            
            <Badge variant="outline">
              {animal.breed}
              {animal.registration_level && ` • ${animal.registration_level}`}
            </Badge>

            <Badge variant="outline" className="bg-primary/10">
              {getTranslatedCategory(category, t)}
            </Badge>

            {age && (
              <Badge variant="outline">
                {age} {age === 1 ? t('animals:profile.month') : t('animals:profile.months')}
              </Badge>
            )}

            <Badge className={`text-white ${getStatusColor(animal.status)}`}>
              {getTranslatedStatus(animal.status, t)}
            </Badge>

            {animal.esta_preñada && (
              <Badge className="bg-secondary text-secondary-foreground">
                {t('animals:profile.pregnant')}
                {animal.fecha_probable_parto && (
                  <span className="ml-1 hidden sm:inline">
                    • {t('animals:profile.expectedCalving')}: {format(new Date(animal.fecha_probable_parto), 'dd/MM/yy')}
                  </span>
                )}
                {animal.fecha_probable_parto && (
                  <span className="ml-1 sm:hidden block text-xs">
                    {format(new Date(animal.fecha_probable_parto), 'dd/MM/yy')}
                  </span>
                )}
              </Badge>
            )}

            {animal.caravana_electronica && (
              <Badge variant="outline" className="bg-muted">
                RFID: {animal.caravana_electronica}
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
                {animal.mocho === 'Si' ? t('animals:hornOptions.polled') : t('animals:hornOptions.horned')}
              </Badge>
            )}
          </div>

          {/* Status Message for Inactive Animals */}
          {isInactive && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {animal.status === 'muerto' && <Skull className="h-4 w-4 text-destructive shrink-0" />}
                {animal.status === 'vendido' && <Truck className="h-4 w-4 text-accent-foreground shrink-0" />}
                <span className="text-sm text-muted-foreground">
                  {animal.status === 'muerto' && t('animals:profile.deadReadOnly')}
                  {animal.status === 'vendido' && t('animals:profile.soldReadOnly')}
                </span>
              </div>
              {animal.fecha_muerte && (
                <span className="text-xs text-muted-foreground sm:ml-auto">
                  {format(new Date(animal.fecha_muerte), 'dd/MM/yyyy', { locale: es })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}