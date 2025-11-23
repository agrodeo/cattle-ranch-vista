import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";

export function VaccinationDashboard() {
  const { user } = useSupabaseAuth();
  const [loading, setLoading] = useState(true);
  const [herdSettings, setHerdSettings] = useState<any>(null);

  useEffect(() => {
    loadVaccinationData();
  }, [user]);

  const loadVaccinationData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Use RPC to get cabana_id
      const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
      if (!cabanaId) return;
      
      const { data: settings } = await supabase
        .from('cabañas')
        .select('country_code, province_code')
        .eq('id', cabanaId)
        .single();
      
      setHerdSettings(settings);
    } catch (error) {
      console.error("Error loading vaccination data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando datos de vacunación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Panel de Vacunación:</strong> Sistema configurado para {herdSettings?.country_code || 'Argentina'}
          {herdSettings?.province_code && ` - ${herdSettings.province_code}`}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Vacunación del Rodeo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Configure los requisitos de vacunación en la sección de Configuración para ver métricas detalladas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
