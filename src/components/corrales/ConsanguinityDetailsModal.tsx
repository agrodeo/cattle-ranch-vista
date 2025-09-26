import { useState, useEffect } from "react";
import { AlertTriangle, Users, Calendar, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { analyzeCorralConsanguinity, RelationshipRisk } from "@/lib/consanguinityAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { cn } from "@/lib/utils";

interface ConsanguinityDetailsModalProps {
  corralId: string;
}

export function ConsanguinityDetailsModal({ corralId }: ConsanguinityDetailsModalProps) {
  const { currentUser } = useSupabaseAuth();
  const [risks, setRisks] = useState<RelationshipRisk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConsanguinityRisks();
  }, [corralId]);

  const fetchConsanguinityRisks = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      setLoading(true);

      // Fetch animals in the corral
      const { data: animals, error } = await supabase
        .from("animals")
        .select("id, sex, birth_date, father_id, mother_id, id_tag, name, status")
        .eq("corral_id", corralId)
        .eq("status", "activo");

      if (error) throw error;

      if (animals && animals.length > 0) {
        const risksData = await analyzeCorralConsanguinity(animals, currentUser.cabañaId);
        setRisks(risksData);
      }
    } catch (error) {
      console.error("Error fetching consanguinity risks:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'bg-red-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'Alto';
      case 'medium':
        return 'Medio';
      case 'low':
        return 'Bajo';
      default:
        return 'Desconocido';
    }
  };

  if (loading) {
    return (
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
          <div className="h-3 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (risks.length === 0) {
    return (
      <div className="bg-muted/50 rounded-lg p-3 text-center">
        <Info className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">
          No se encontraron riesgos de consanguinidad
        </p>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 rounded-lg overflow-hidden">
      <div className="p-3 border-b border-muted">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium">Detalles de Consanguinidad</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Se encontraron {risks.length} parejas con riesgo de consanguinidad
        </p>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        <div className="p-2 space-y-2">
          {risks.map((risk, index) => (
            <div key={index} className="bg-background rounded-lg p-2 border border-muted/50">
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium break-words">
                        {risk.animal1.id_tag || risk.animal1.name} × {risk.animal2.id_tag || risk.animal2.name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {risk.relationship}
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs px-1.5 py-0 text-white border-0 flex-shrink-0",
                      getSeverityColor(risk.severity)
                    )}
                  >
                    {getSeverityLabel(risk.severity)}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  {risk.inbreedingCoefficient && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Coeficiente:</span>
                      <span className="font-mono">{(risk.inbreedingCoefficient * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  
                  <div className="text-xs">
                    <span className="text-muted-foreground">Descripción: </span>
                    <span className="text-xs break-words">{risk.description}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-2 border-t border-muted bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <strong>Consejo:</strong> Evita cruzar animales con coeficiente de consanguinidad alto
        </p>
      </div>
    </div>
  );
}