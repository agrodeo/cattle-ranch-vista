import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Home, Plus, Users, ArrowRight, MapPin } from "lucide-react";

interface Corral {
  id: string;
  name: string;
  capacity: number;
  current_count: number;
  description?: string;
}

export function MobileCorrales() {
  const { t } = useTranslation(['corrals', 'common']);
  const { currentUser } = useSupabaseAuth();
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCorrales();
  }, []);

  const fetchCorrales = async () => {
    try {
      // This would be replaced with actual corral data
      const mockData: Corral[] = [
        { id: '1', name: 'Corral A', capacity: 50, current_count: 32, description: 'Corral principal para vaquillas' },
        { id: '2', name: 'Corral B', capacity: 75, current_count: 68, description: 'Corral para toros reproductores' },
        { id: '3', name: 'Corral C', capacity: 40, current_count: 15, description: 'Corral de cuarentena' },
        { id: '4', name: 'Corral D', capacity: 60, current_count: 60, description: 'Corral de engorde' },
      ];
      
      setCorrales(mockData);
    } catch (error) {
      console.error("Error fetching corrales:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getOccupancyLabel = (percentage: number) => {
    if (percentage >= 90) return 'Sobrecargado';
    if (percentage >= 75) return 'Casi lleno';
    return 'Disponible';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MobilePageHeader title={t('corrals:title', 'Corrales')} />
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobilePageHeader 
        title={t('corrals:title', 'Corrales')}
        subtitle={`${corrales.length} corrales disponibles`}
      />

      {/* Primary Actions - Centered */}
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary text-primary-foreground">
                  <ArrowRight className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Movimiento de Animales</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mover animales entre corrales
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-secondary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Nuevo Corral</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crear un nuevo corral
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Corrales List */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Corrales Existentes</h2>
        
        {corrales.length === 0 ? (
          <EmptyState
            icon={<Home className="h-12 w-12" />}
            title="No hay corrales"
            description="Crea tu primer corral para organizar tus animales"
          />
        ) : (
          <div className="space-y-3">
            {corrales.map((corral) => {
              const occupancyPercentage = Math.round((corral.current_count / corral.capacity) * 100);
              
              return (
                <Card key={corral.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-muted">
                          <Home className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium truncate">
                            {corral.name}
                          </CardTitle>
                          {corral.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {corral.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge 
                        className={`text-xs ${getOccupancyColor(occupancyPercentage)} text-white`}
                      >
                        {getOccupancyLabel(occupancyPercentage)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Capacity Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Ocupación</span>
                          <span className="font-medium">
                            {corral.current_count} / {corral.capacity} ({occupancyPercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${getOccupancyColor(occupancyPercentage)}`}
                            style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{corral.current_count} animales</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{corral.capacity - corral.current_count} espacios libres</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}