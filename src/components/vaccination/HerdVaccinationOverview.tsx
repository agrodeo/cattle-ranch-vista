import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HerdCompliance {
  totalAnimals: number;
  totalVaccinations: number;
  totalRequired: number;
  overallPercentage: number;
  fullyCompliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
}

export function HerdVaccinationOverview() {
  const [herdCompliance, setHerdCompliance] = useState<HerdCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadHerdCompliance();
  }, []);

  const loadHerdCompliance = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use RPC to get cabana_id
      const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
      if (!cabanaId) return;

      // Get all animals
      const { data: animals } = await supabase
        .from('animals')
        .select('id')
        .eq('cabaña_id', cabanaId)
        .not('status', 'in', '("muerto","vendido")');

      const totalAnimals = animals?.length || 0;
      
      // Simplified calculation for demo
      const compliance: HerdCompliance = {
        totalAnimals,
        totalVaccinations: 0,
        totalRequired: 0,
        overallPercentage: 0,
        fullyCompliant: 0,
        partiallyCompliant: 0,
        nonCompliant: totalAnimals
      };

      setHerdCompliance(compliance);
    } catch (error) {
      console.error('Error loading herd compliance:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el estado de vacunación del rodeo"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Estado General del Rodeo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!herdCompliance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Estado General del Rodeo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No se pudo cargar la información</p>
            <Button variant="outline" onClick={loadHerdCompliance} className="mt-2">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Estado General del Rodeo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="font-medium">Total de Animales: {herdCompliance.totalAnimals}</span>
        </div>
      </CardContent>
    </Card>
  );
}
