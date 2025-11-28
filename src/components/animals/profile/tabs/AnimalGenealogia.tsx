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
  const { t } = useTranslation(['animals', 'common']);
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
                <p className="text-sm font-medium text-muted-foreground">{t('animals:profile.genealogy.registrationLevel')}</p>
                <Badge className={getRegistrationBadgeColor(animal.registration_level)}>
                  {animal.registration_level || t('animals:profile.genealogy.notDefined')}
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
                <p className="text-sm font-medium text-muted-foreground">{t('animals:profile.genealogy.dnaVerified')}</p>
                <p className="text-lg font-semibold">
                  {animal.dna_verified ? t('animals:profile.genealogy.yes') : t('animals:profile.genealogy.no')}
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
                <p className="text-sm font-medium text-muted-foreground">{t('animals:profile.genealogy.breed')}</p>
                <p className="text-lg font-semibold">{animal.breed || t('animals:profile.genealogy.notSpecified')}</p>
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
              {t('animals:profile.genealogy.father')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {animal.father_name || animal.father_id ? (
              <div className="space-y-2">
                <p className="font-semibold">{animal.father_name || t('animals:profile.genealogy.noName')}</p>
                {animal.father_breed && (
                  <p className="text-sm text-muted-foreground">{t('animals:profile.genealogy.breedLabel')}: {animal.father_breed}</p>
                )}
                {animal.father_registration && (
                  <p className="text-sm text-muted-foreground">{t('animals:profile.genealogy.registrationLabel')}: {animal.father_registration}</p>
                )}
                {animal.registration_father_level && (
                  <Badge className={getRegistrationBadgeColor(animal.registration_father_level)}>
                    {animal.registration_father_level}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('animals:profile.genealogy.notRegistered')}</p>
            )}
          </CardContent>
        </Card>

        {/* Mother */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('animals:profile.genealogy.mother')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {animal.mother_name || animal.mother_id ? (
              <div className="space-y-2">
                <p className="font-semibold">{animal.mother_name || t('animals:profile.genealogy.noName')}</p>
                {animal.mother_breed && (
                  <p className="text-sm text-muted-foreground">{t('animals:profile.genealogy.breedLabel')}: {animal.mother_breed}</p>
                )}
                {animal.mother_registration && (
                  <p className="text-sm text-muted-foreground">{t('animals:profile.genealogy.registrationLabel')}: {animal.mother_registration}</p>
                )}
                {animal.registration_mother_level && (
                  <Badge className={getRegistrationBadgeColor(animal.registration_mother_level)}>
                    {animal.registration_mother_level}
                  </Badge>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">{t('animals:profile.genealogy.notRegisteredFemale')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Genealogy Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {t('animals:profile.genealogy.genealogyTree')}
          </CardTitle>
          <CardDescription>
            {t('animals:profile.genealogy.fullLineageVisualization')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Dialog open={showFullTree} onOpenChange={setShowFullTree}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <TreePine className="h-4 w-4 mr-2" />
                  {t('animals:profile.genealogy.viewFullTree')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>
                    {t('animals:profile.genealogy.genealogyTreeTitle')} - {animal.name || animal.id_tag}
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
                  <p className="font-medium mb-1">{t('animals:profile.genealogy.paternalLine')}</p>
                  <p className="text-muted-foreground">
                    {animal.father_name || t('animals:profile.genealogy.notRegistered')}
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">{t('animals:profile.genealogy.maternalLine')}</p>
                  <p className="text-muted-foreground">
                    {animal.mother_name || t('animals:profile.genealogy.notRegisteredFemale')}
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
              {t('animals:profile.genealogy.registrationOverride')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>{t('animals:profile.genealogy.originalLevel')}:</strong> {animal.registration_level}</p>
              <p><strong>{t('animals:profile.genealogy.modifiedLevel')}:</strong> {animal.registration_level_override}</p>
              {animal.registration_override_reason && (
                <p><strong>{t('animals:profile.genealogy.reason')}:</strong> {animal.registration_override_reason}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}