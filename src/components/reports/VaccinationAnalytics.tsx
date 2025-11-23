import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";

interface VaccinationAnalyticsProps {
  filters?: any;
}

export const VaccinationAnalytics = ({ filters: globalFilters }: VaccinationAnalyticsProps) => {
  const { user } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchVaccinationStats();
    }
  }, [user, globalFilters]);

  const fetchVaccinationStats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
      if (!cabanaId) return;

      // Fetch vaccination history
      const { data: history } = await supabase
        .from('animal_vaccines')
        .select('*, animals(name, id_tag)')
        .eq('cabaña_id', cabanaId);

      setStats({
        totalVaccinations: history?.length || 0,
        history: history || []
      });
    } catch (error) {
      console.error("Error fetching vaccination stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Analítica de Vacunación:</strong> Total de vacunaciones registradas: {stats?.totalVaccinations || 0}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Vacunaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Configure los requisitos de vacunación en Configuración para ver métricas detalladas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
