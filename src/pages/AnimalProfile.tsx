import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { Animal } from "@/types/animal";
import { AnimalProfileHeader } from "@/components/animals/profile/AnimalProfileHeader";
import { AnimalProfileTabs } from "@/components/animals/profile/AnimalProfileTabs";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnimalProfile() {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useSupabaseAuth();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError('Animal no encontrado');
        return;
      }

      if (!data) {
        setError('Animal no encontrado');
        return;
      }

      // Now get additional related data
      const animalData: any = { ...data };

      // Get corral info if animal has corral_id
      if (data.corral_id) {
        const { data: corralData } = await supabase
          .from('corrales')
          .select('id, name')
          .eq('id', data.corral_id)
          .maybeSingle();
        
        if (corralData) {
          animalData.corral = corralData;
        }
      }

      // Get father info if animal has father_id
      if (data.father_id) {
        const { data: fatherData } = await supabase
          .from('animals')
          .select('id, id_tag, name')
          .eq('id', data.father_id)
          .maybeSingle();
        
        if (fatherData) {
          animalData.father = fatherData;
        }
      }

      // Get mother info if animal has mother_id
      if (data.mother_id) {
        const { data: motherData } = await supabase
          .from('animals')
          .select('id, id_tag, name')
          .eq('id', data.mother_id)
          .maybeSingle();
        
        if (motherData) {
          animalData.mother = motherData;
        }
      }

      // Get defuncion info if animal has defuncion_id
      if (data.defuncion_id) {
        const { data: defuncionData } = await supabase
          .from('defunciones')
          .select('id, fecha_defuncion, causa_texto')
          .eq('id', data.defuncion_id)
          .maybeSingle();
        
        if (defuncionData) {
          animalData.defuncion = defuncionData;
        }
      }

      setAnimal(animalData as Animal);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar el animal');
      toast({
        title: "Error",
        description: "No se pudo cargar la información del animal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnimalUpdate = (updatedAnimal: Animal) => {
    setAnimal(updatedAnimal);
  };

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
              {error || 'Animal no encontrado'}
            </h1>
            <p className="text-muted-foreground">
              El animal solicitado no existe o no tienes permisos para verlo.
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
      <div className="px-4 py-4 max-w-7xl mx-auto">
        <AnimalProfileTabs 
          animal={animal} 
          onAnimalUpdate={handleAnimalUpdate}
        />
      </div>
    </div>
  );
}