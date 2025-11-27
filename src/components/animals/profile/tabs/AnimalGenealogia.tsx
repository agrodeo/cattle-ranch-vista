import { useState } from "react";
import { Animal } from "@/types/animal";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GitBranch, Users, Calendar, Award, TreePine } from "lucide-react";
import GenealogyTree from "@/components/GenealogyTree";

interface AnimalGenealogiaProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

export function AnimalGenealogia({ animal }: AnimalGenealogiaProps) {
  const { t } = useTranslation(['common', 'animals']);
  const [showFullTree, setShowFullTree] = useState(false);

  const getRegistrationBadgeColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'po': return 'bg-yellow-500';
      case 'pc': return 'bg-blue-500';
      case 'pura': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Genealogy Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nivel de Registro</p>
                <Badge className={getRegistrationBadgeColor(animal.registration_level)}>
                  {animal.registration_level || 'No definido'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">ADN Verificado</p>
                <p className="text-lg font-semibold">
                  {animal.dna_verified ? 'Sí' : 'No'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TreePine className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Raza</p>
                <p className="text-lg font-semibold">{animal.breed || 'No especificada'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parents Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Father */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Padre
            </CardTitle>
          </CardHeader>
          <CardContent>
            {animal.father_name || animal.father_id ? (
              <div className="space-y-2">
                <p className="font-semibold">{animal.father_name || 'Sin nombre'}</p>
                {animal.father_breed && (
                  <p className="text-sm text-muted-foreground">Raza: {animal.father_breed}</p>
                )}
                {animal.father_registration && (
                  <p className="text-sm text-muted-foreground">Registro: {animal.father_registration}</p>
                )}
                {animal.registration_father_level && (
                  <Badge className={getRegistrationBadgeColor(animal.registration_father_level)}>
                    {animal.registration_father_level}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No registrado</p>
            )}
          </CardContent>
        </Card>

        {/* Mother */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Madre
            </CardTitle>
          </CardHeader>
          <CardContent>
            {animal.mother_name || animal.mother_id ? (
              <div className="space-y-2">
                <p className="font-semibold">{animal.mother_name || 'Sin nombre'}</p>
                {animal.mother_breed && (
                  <p className="text-sm text-muted-foreground">Raza: {animal.mother_breed}</p>
                )}
                {animal.mother_registration && (
                  <p className="text-sm text-muted-foreground">Registro: {animal.mother_registration}</p>
                )}
                {animal.registration_mother_level && (
                  <Badge className={getRegistrationBadgeColor(animal.registration_mother_level)}>
                    {animal.registration_mother_level}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">No registrada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Genealogy Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Árbol Genealógico
          </CardTitle>
          <CardDescription>
            Visualización completa del linaje del animal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Dialog open={showFullTree} onOpenChange={setShowFullTree}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <TreePine className="h-4 w-4 mr-2" />
                  Ver Árbol Genealógico Completo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>
                    Árbol Genealógico - {animal.name || animal.id_tag}
                  </DialogTitle>
                </DialogHeader>
                <GenealogyTree 
                  animalId={animal.id} 
                  animalName={animal.name}
                  animalIdTag={animal.id_tag || ''}
                />
              </DialogContent>
            </Dialog>

            {/* Basic pedigree info */}
            <div className="border rounded-lg p-4">
              <div className="text-center mb-4">
                <p className="font-semibold text-lg">{animal.name || animal.id_tag}</p>
                <p className="text-sm text-muted-foreground">{animal.breed}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-1">Línea Paterna</p>
                  <p className="text-muted-foreground">
                    {animal.father_name || 'No registrado'}
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">Línea Materna</p>
                  <p className="text-muted-foreground">
                    {animal.mother_name || 'No registrada'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registration Override Info */}
      {animal.registration_level_override && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Award className="h-4 w-4" />
              Nivel de Registro Modificado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Nivel Original:</strong> {animal.registration_level}</p>
              <p><strong>Nivel Modificado:</strong> {animal.registration_level_override}</p>
              {animal.registration_override_reason && (
                <p><strong>Razón:</strong> {animal.registration_override_reason}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}