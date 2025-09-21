import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { useVaccinationLogic, HerdCompliance } from "@/hooks/useVaccinationLogic";
import { useToast } from "@/hooks/use-toast";

export function HerdVaccinationOverview() {
  const [herdCompliance, setHerdCompliance] = useState<HerdCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const { calculateHerdCompliance } = useVaccinationLogic();
  const { toast } = useToast();

  useEffect(() => {
    loadHerdCompliance();
  }, []);

  const loadHerdCompliance = async () => {
    try {
      setLoading(true);
      const compliance = await calculateHerdCompliance();
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

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (percentage >= 70) return <TrendingUp className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Estado General del Rodeo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Compliance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(herdCompliance.overallPercentage)}
              <span className={`text-lg font-semibold ${getStatusColor(herdCompliance.overallPercentage)}`}>
                {herdCompliance.overallPercentage}% Cumplimiento
              </span>
            </div>
            <Badge variant={herdCompliance.overallPercentage >= 90 ? "default" : herdCompliance.overallPercentage >= 70 ? "secondary" : "destructive"}>
              {herdCompliance.totalVaccinations}/{herdCompliance.totalRequired}
            </Badge>
          </div>

          <Progress value={herdCompliance.overallPercentage} className="h-3" />
          
          <div className="text-sm text-muted-foreground">
            {herdCompliance.totalVaccinations} vacunaciones aplicadas de {herdCompliance.totalRequired} requeridas
          </div>
        </div>

        {/* Animals Distribution */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-medium">Distribución por Animales ({herdCompliance.totalAnimals} total)</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {herdCompliance.fullyCompliant}
              </div>
              <div className="text-xs text-green-700">Completos</div>
              <div className="text-xs text-muted-foreground">
                {herdCompliance.totalAnimals > 0 
                  ? Math.round((herdCompliance.fullyCompliant / herdCompliance.totalAnimals) * 100)
                  : 0}%
              </div>
            </div>

            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {herdCompliance.partiallyCompliant}
              </div>
              <div className="text-xs text-yellow-700">Parciales</div>
              <div className="text-xs text-muted-foreground">
                {herdCompliance.totalAnimals > 0 
                  ? Math.round((herdCompliance.partiallyCompliant / herdCompliance.totalAnimals) * 100)
                  : 0}%
              </div>
            </div>

            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {herdCompliance.nonCompliant}
              </div>
              <div className="text-xs text-red-700">Sin vacunas</div>
              <div className="text-xs text-muted-foreground">
                {herdCompliance.totalAnimals > 0 
                  ? Math.round((herdCompliance.nonCompliant / herdCompliance.totalAnimals) * 100)
                  : 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadHerdCompliance} size="sm">
            Actualizar
          </Button>
          {herdCompliance.overallPercentage < 100 && (
            <Button size="sm">
              Ver Animales Pendientes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}