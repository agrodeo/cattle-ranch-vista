import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(['reports', 'animals']);
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

        let reproductiveStatus = "unknown";
        if (animal.birth_date) {
          if (new Date(animal.birth_date) > new Date()) {
            reproductiveStatus = "future_date";
          } else if (ageMonths && ageMonths >= 15) {
            reproductiveStatus = "reproductive";
          } else {
            reproductiveStatus = "young";
          }
        } else {
          reproductiveStatus = "no_date";
        }

        return {
          id: animal.id,
          id_tag: animal.id_tag,
          name: animal.name,
          birth_date: animal.birth_date,
          corral_id: animal.corral_id,
          corral_name: animal.corrales?.name || null,
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
      case 'reproductive': return 'bg-emerald-100 text-emerald-800';
      case 'young': return 'bg-blue-100 text-blue-800';
      case 'no_date': return 'bg-gray-100 text-gray-800';
      case 'future_date': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'reproductive': return t('reports:reproductive.reproductiveStatus');
      case 'young': return t('reports:reproductive.young');
      case 'no_date': return t('reports:reproductive.noDate');
      case 'future_date': return t('reports:reproductive.futureDate');
      default: return t('common:unknown');
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
            {t('reports:reproductive.pregnantFemales')}
            <Badge variant="secondary" className="ml-2">
              <Skeleton className="h-4 w-8" />
            </Badge>
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
          {t('reports:reproductive.pregnantFemales')}
          <Badge variant="secondary" className="ml-2">
            {pregnantAnimals.length} {t('reports:reproductive.animals')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pregnantAnimals.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {t('reports:reproductive.noPregnantFound')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pregnantAnimals.map((animal) => (
              <Card
                key={animal.id}
                className="hover:bg-accent/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div>
                      <h4 className="font-semibold text-base truncate">
                        {animal.name || animal.id_tag}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {animal.id_tag}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <Badge className={`text-xs w-fit ${getStatusBadgeColor(animal.reproductive_status)}`}>
                      {getStatusLabel(animal.reproductive_status)}
                    </Badge>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground truncate">
                          {animal.corral_name || t('reports:production.noCorral')}
                        </span>
                      </div>
                      
                      {animal.age_months && (
                        <div className="text-muted-foreground">
                          {animal.age_months} {t('common:months')}
                        </div>
                      )}
                      
                      {animal.fecha_probable_parto && (
                        <div className="flex items-start gap-1.5">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground">
                              {t('reports:reproductive.calving')}
                            </div>
                            <div className="font-medium">
                              {formatDate(animal.fecha_probable_parto)}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {animal.fecha_ultima_preñez && (
                        <div className="pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            {t('reports:reproductive.pregnancy')}
                          </div>
                          <div className="font-medium">
                            {formatDate(animal.fecha_ultima_preñez)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}