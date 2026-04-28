import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { Animal } from "@/types/animal";
import { AnimalProfileHeader } from "@/components/animals/profile/AnimalProfileHeader";
import { AnimalProfileTabs } from "@/components/animals/profile/AnimalProfileTabs";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ActivityTaskCard } from "@/components/activities/ActivityTaskCard";
import { CreateActivityDialog } from "@/components/activities/CreateActivityDialog";
import { useActivityTasks } from "@/hooks/useActivityTasks";

export default function AnimalProfile() {
  const { t } = useTranslation(['animals', 'common', 'activities']);
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useSupabaseAuth();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: allActivityTasks } = useActivityTasks("all");

  useEffect(() => {
    if (!id || !currentUser) return;
    
    fetchAnimal();
  }, [id, currentUser]);

  const fetchAnimal = async () => {
    if (!id || !currentUser) return;

    setLoading(true);
    setError(null);

    try {
      // First, get the animal basic data
      const { data, error } = await supabase
        .from('animals')
        .select('*, is_castrated')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching animal:', error);
        setError(t('animals:profile.animalNotFound'));
        return;
      }

      if (!data) {
        setError(t('animals:profile.animalNotFound'));
        return;
      }

      // Now get additional related data in parallel
      const animalData: any = { ...data };

      const [corralResult, fatherResult, motherResult, defuncionResult] = await Promise.all([
        data.corral_id
          ? supabase.from('corrales').select('id, name').eq('id', data.corral_id).maybeSingle()
          : Promise.resolve({ data: null }),
        data.father_id
          ? supabase.from('animals').select('id, id_tag, name').eq('id', data.father_id).maybeSingle()
          : Promise.resolve({ data: null }),
        data.mother_id
          ? supabase.from('animals').select('id, id_tag, name').eq('id', data.mother_id).maybeSingle()
          : Promise.resolve({ data: null }),
        data.defuncion_id
          ? supabase.from('defunciones').select('id, fecha_defuncion, causa_texto').eq('id', data.defuncion_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (corralResult.data) animalData.corral = corralResult.data;
      if (fatherResult.data) animalData.father = fatherResult.data;
      if (motherResult.data) animalData.mother = motherResult.data;
      if (defuncionResult.data) animalData.defuncion = defuncionResult.data;

      setAnimal(animalData as Animal);
    } catch (err) {
      console.error('Error:', err);
      setError(t('animals:profile.errorLoadingAnimal'));
      toast({
        title: t('common:common.error'),
        description: t('animals:profile.errorLoadingDesc'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnimalUpdate = (updatedAnimal: Animal) => {
    setAnimal(updatedAnimal);
  };

  const animalActivityTasks = (allActivityTasks || []).filter((activity) => activity.animal_id === animal?.id);
  const pendingActivityTasks = animalActivityTasks.filter((activity) => activity.status === "pending");
  const completedActivityTasks = animalActivityTasks.filter((activity) => activity.status === "completed");
  const canCreateTasks = ["owner", "manager", "admin"].includes(currentUser?.role || "");

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-20" />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-24" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold text-muted-foreground mb-2">
              {error || t('animals:profile.animalNotFound')}
            </h1>
            <p className="text-muted-foreground">
              {t('animals:profile.animalNotFoundDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background border-b shadow-sm">
        <AnimalProfileHeader 
          animal={animal} 
          onAnimalUpdate={handleAnimalUpdate}
        />
      </div>

      {/* Main Content */}
      <div className="w-full max-w-screen-sm mx-auto px-3 sm:px-4 lg:max-w-7xl lg:px-6 py-4">
        <AnimalProfileTabs 
          animal={animal} 
          onAnimalUpdate={handleAnimalUpdate}
        />

        {animalActivityTasks.length > 0 || canCreateTasks ? (
          <Card className="mt-4">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{t('activities:dashboard.title')}</CardTitle>
                {pendingActivityTasks.length > 0 && <Badge variant="secondary">{pendingActivityTasks.length} {t('activities:dashboard.pending').toLowerCase()}</Badge>}
              </div>
              {canCreateTasks && <CreateActivityDialog defaultAnimalId={animal.id} defaultAnimalTag={animal.id_tag || animal.name || ""} />}
            </CardHeader>
            {animalActivityTasks.length > 0 && (
              <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
                {pendingActivityTasks.map((activity) => <ActivityTaskCard key={activity.id} activity={activity} />)}
                {completedActivityTasks.length > 0 && (
                  <p className="text-sm text-muted-foreground">+ {completedActivityTasks.length} {t('activities:dashboard.completed').toLowerCase()}</p>
                )}
              </CardContent>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  );
}