import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Eye, Calendar, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type { ReportFilters } from "./ReportsFilters";

interface PregnantAnimal {
  id: string;
  id_tag: string;
  name: string;
  birth_date: string | null;
  corral_id: string | null;
  corral_name: string | null;
  fecha_ultima_preñez: string | null;
  fecha_probable_parto: string | null;
  age_months: number | null;
  reproductive_status: string;
}

interface PregnantAnimalsReportProps {
  filters?: ReportFilters;
}

export function PregnantAnimalsReport({ filters }: PregnantAnimalsReportProps) {
  const { currentUser } = useSupabaseAuth();
  const [pregnantAnimals, setPregnantAnimals] = useState<PregnantAnimal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchPregnantAnimals();
    }
  }, [currentUser, filters]);

  const fetchPregnantAnimals = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      setLoading(true);

      let query = supabase
        .from("animals")
        .select(`
          id,
          id_tag,
          name,
          birth_date,
          corral_id,
          fecha_ultima_preñez,
          fecha_probable_parto,
          corrales!inner(name)
        `)
        .eq("cabaña_id", currentUser.cabañaId)
        .eq("sex", "Hembra")
        .eq("esta_preñada", true)
        .not("status", "in", '("vendido","muerto","Vendido","Muerto")');

      // Apply filters
      if (filters?.corral_ids && filters.corral_ids.length > 0) {
        query = query.in("corral_id", filters.corral_ids);
      }

      const { data, error } = await query;

      if (error) throw error;

      const processedData: PregnantAnimal[] = (data || []).map((animal: any) => {
        const ageMonths = animal.birth_date ? 
          Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44)) : 
          null;

        let reproductiveStatus = "Desconocido";
        if (animal.birth_date) {
          if (new Date(animal.birth_date) > new Date()) {
            reproductiveStatus = "Fecha futura";
          } else if (ageMonths && ageMonths >= 15) {
            reproductiveStatus = "Reproductiva";
          } else {
            reproductiveStatus = "Joven";
          }
        } else {
          reproductiveStatus = "Sin fecha";
        }

        return {
          id: animal.id,
          id_tag: animal.id_tag,
          name: animal.name,
          birth_date: animal.birth_date,
          corral_id: animal.corral_id,
          corral_name: animal.corrales?.name || 'Sin corral',
          fecha_ultima_preñez: animal.fecha_ultima_preñez,
          fecha_probable_parto: animal.fecha_probable_parto,
          age_months: ageMonths,
          reproductive_status: reproductiveStatus
        };
      });

      setPregnantAnimals(processedData);
    } catch (error) {
      console.error("Error fetching pregnant animals:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Reproductiva': return 'bg-emerald-100 text-emerald-800';
      case 'Joven': return 'bg-blue-100 text-blue-800';
      case 'Sin fecha': return 'bg-gray-100 text-gray-800';
      case 'Fecha futura': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Hembras Preñadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Hembras Preñadas ({pregnantAnimals.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pregnantAnimals.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No se encontraron hembras preñadas.
          </div>
        ) : (
          <div className="space-y-4">
            {pregnantAnimals.map((animal) => (
              <div
                key={animal.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-medium">
                        {animal.name || animal.id_tag}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        ID: {animal.id_tag}
                      </p>
                    </div>
                    <Badge className={`text-xs ${getStatusBadgeColor(animal.reproductive_status)}`}>
                      {animal.reproductive_status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{animal.corral_name}</span>
                    </div>
                    {animal.age_months && (
                      <span>{animal.age_months} meses</span>
                    )}
                    {animal.fecha_probable_parto && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Parto: {formatDate(animal.fecha_probable_parto)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right text-sm">
                    {animal.fecha_ultima_preñez && (
                      <p className="text-muted-foreground">
                        Preñez: {formatDate(animal.fecha_ultima_preñez)}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}