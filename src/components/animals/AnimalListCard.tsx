import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Edit, Trash2, Eye, Skull } from "lucide-react";
import { Animal } from "@/types/animal";
import { normalizeAnimalStatus } from "@/lib/statusUtils";
import { categorizeAnimal } from "@/lib/animalCategories";
import { getTranslatedCategory, getTranslatedSex, getTranslatedStatus } from "@/lib/translations";
import GenealogyTree from "@/components/GenealogyTree";
import { AnimalActivitiesHistory } from "@/components/animals/AnimalActivitiesHistory";
import { BrafordRegistrationDisplay } from "@/components/braford/BrafordRegistrationDisplay";
import { ReproductivePerformance } from "@/components/reproductive/ReproductivePerformance";
import { ReproductiveEventsTable } from "@/components/reproductive/ReproductiveEventsTable";
import type { RegistrationLevel } from "@/lib/brafordRegistration";

interface Props {
  animal: Animal;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (animal: Animal) => void;
  onDelete: (id: string) => void;
  onMarkDeath: (animal: Animal) => void;
}

export function AnimalListCard({ animal, isExpanded, onToggleExpand, onEdit, onDelete, onMarkDeath }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation(['animals', 'common']);
  const category = categorizeAnimal(animal, animal.is_castrated || false);
  const displayName = animal.name?.trim() ? `${animal.name} – ${animal.id_tag}` : animal.id_tag;

  const getStatusBadge = (status: string) => {
    const normalized = normalizeAnimalStatus(status);
    const display = getTranslatedStatus(normalized, t);
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    if (normalized === "sold") variant = "secondary";
    else if (normalized === "dead") variant = "destructive";
    return <Badge variant={variant}>{display}</Badge>;
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <h3
                    className="font-medium truncate cursor-pointer hover:text-primary"
                    onClick={e => { e.stopPropagation(); navigate(`/animales/${animal.id}`); }}
                  >
                    {displayName}
                  </h3>
                  <Badge variant="outline" className="shrink-0">
                    {getTranslatedCategory(category, t)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="truncate">{animal.breed}</span>
                  <span>{animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : "N/A"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                {getStatusBadge(animal.status)}
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t">
            <div className="flex flex-wrap gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => navigate(`/animales/${animal.id}`)}>
                <Eye className="h-4 w-4 mr-1" />{t('animals:actions.view')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(animal)}>
                <Edit className="h-4 w-4 mr-1" />{t('common:actions.edit')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDelete(animal.id)}>
                <Trash2 className="h-4 w-4 mr-1" />{t('common:actions.delete')}
              </Button>
              {animal.status !== 'muerto' && animal.status !== 'vendido' && (
                <Button variant="outline" size="sm" onClick={() => onMarkDeath(animal)} className="text-destructive hover:text-destructive">
                  <Skull className="h-4 w-4 mr-1" />{t('animals:actions.markDeath')}
                </Button>
              )}
            </div>

            {/* Animal details */}
            <div className="space-y-2">
              <AnimalActivitiesHistory animalId={animal.id} animalName={animal.name || animal.id_tag} />
            </div>
            {animal.sex === "Hembra" && (
              <div className="space-y-2">
                <ReproductivePerformance animalId={animal.id} animalSex={animal.sex} />
                <ReproductiveEventsTable animalId={animal.id} animalSex={animal.sex} cabaña_id={animal.cabaña_id} />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
