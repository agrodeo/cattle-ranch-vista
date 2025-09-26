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
    <div className="bg-muted/50 rounded-lg overflow-hidden w-full">
      <div className="p-2 border-b border-muted">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />
          <span className="text-xs font-medium truncate">Detalles de Consanguinidad</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {risks.length} parejas con riesgo
        </p>
      </div>
      
      <div className="max-h-48 overflow-y-auto">
        <div className="p-2 space-y-2">
          {risks.map((risk, index) => (
            <div key={index} className="bg-background rounded p-2 border border-muted/50 w-full overflow-hidden">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <Users className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs font-medium truncate">
                      {(risk.animal1.id_tag || risk.animal1.name)?.substring(0, 8)} × {(risk.animal2.id_tag || risk.animal2.name)?.substring(0, 8)}
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs px-1 py-0 text-white border-0 flex-shrink-0 min-w-fit",
                      getSeverityColor(risk.severity)
                    )}
                  >
                    {getSeverityLabel(risk.severity)}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {risk.relationship}
                  </p>
                  
                  {risk.inbreedingCoefficient && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Coef:</span>
                      <span className="font-mono">{(risk.inbreedingCoefficient * 100).toFixed(1)}%</span>
                    </div>
                  )}
                  
                  <div className="text-xs">
                    <span className="text-muted-foreground">Desc: </span>
                    <span className="text-xs break-words line-clamp-2">{risk.description}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-2 border-t border-muted bg-muted/30">
        <p className="text-xs text-muted-foreground break-words">
          <strong>Consejo:</strong> Evita cruzar animales con alto coeficiente
        </p>
      </div>
    </div>
  );
}