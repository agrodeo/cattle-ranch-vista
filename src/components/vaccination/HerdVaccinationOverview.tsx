import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";

interface HerdVaccinationSummary {
  totalAnimals: number;
  animalsWithVaccinations: number;
  averageCompliance: number;
  requirementsCount: number;
}

export function HerdVaccinationOverview() {
  const [summary, setSummary] = useState<HerdVaccinationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { requirements } = useVaccinationRequirements();

  useEffect(() => {
    loadHerdSummary();
  }, [requirements]);

  const loadHerdSummary = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
      if (!cabanaId) return;

      // Get all active animals
      const { data: animals } = await supabase
        .from('animals')
        .select('id')
        .eq('cabaña_id', cabanaId)
        .not('status', 'in', '("muerto","vendido")');

      const totalAnimals = animals?.length || 0;

      // Get animals with at least one vaccination
      const { data: vaccinatedAnimals } = await supabase
        .from('animal_vaccines')
        .select('animal_id')
        .eq('cabaña_id', cabanaId);

      const uniqueVaccinatedAnimals = new Set(vaccinatedAnimals?.map(v => v.animal_id) || []).size;

      // Calculate average compliance (simplified - could be enhanced with RPC)
      const averageCompliance = totalAnimals > 0 
        ? Math.round((uniqueVaccinatedAnimals / totalAnimals) * 100) 
        : 0;

      setSummary({
        totalAnimals,
        animalsWithVaccinations: uniqueVaccinatedAnimals,
        averageCompliance,
        requirementsCount: requirements.length
      });
    } catch (error) {
      console.error('Error loading herd vaccination summary:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el resumen de vacunación del rodeo"
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
            Resumen de Vacunación del Rodeo
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

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Resumen de Vacunación del Rodeo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No se pudo cargar la información</p>
            <Button variant="outline" onClick={loadHerdSummary} className="mt-2">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Resumen de Vacunación del Rodeo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(summary.averageCompliance)}
            <span className={`text-2xl font-bold ${getStatusColor(summary.averageCompliance)}`}>
              {summary.averageCompliance}%
            </span>
          </div>
          <Badge variant={summary.averageCompliance >= 80 ? "default" : "secondary"}>
            Cumplimiento Promedio
          </Badge>
        </div>

        <Progress value={summary.averageCompliance} className="h-3" />

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{summary.totalAnimals}</div>
            <div className="text-xs text-muted-foreground">Total Animales</div>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <Shield className="h-5 w-5 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{summary.animalsWithVaccinations}</div>
            <div className="text-xs text-muted-foreground">Con Vacunas</div>
          </div>
          
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <CheckCircle className="h-5 w-5 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{summary.requirementsCount}</div>
            <div className="text-xs text-muted-foreground">Vacunas Requeridas</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
