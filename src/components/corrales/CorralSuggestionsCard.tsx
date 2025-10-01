import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Sparkles, TrendingUp, ArrowRight } from "lucide-react";

interface CorralSuggestionsCardProps {
  totalRisks: number;
  onOptimize: () => void;
  aiRecommendations?: {
    analysis: string;
    priorities: string[];
    shortTermActions: string[];
  } | null;
  loading?: boolean;
}

export function CorralSuggestionsCard({ 
  totalRisks, 
  onOptimize, 
  aiRecommendations,
  loading 
}: CorralSuggestionsCardProps) {
  const hasRisks = totalRisks > 0;

  return (
    <Card className={`border-l-4 ${hasRisks ? 'border-l-orange-500 bg-orange-50/50' : 'border-l-green-500 bg-green-50/50'}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasRisks ? (
              <>
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>Sugerencias de Optimización</span>
              </>
            ) : (
              <>
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Estado Óptimo</span>
              </>
            )}
          </div>
          {hasRisks && (
            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
              {totalRisks} {totalRisks === 1 ? 'riesgo detectado' : 'riesgos detectados'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasRisks ? (
          <>
            <p className="text-sm text-muted-foreground">
              Se detectaron riesgos de consanguinidad en tus corrales. La IA puede ayudarte a optimizar 
              la distribución de animales para reducir estos riesgos y mejorar la eficiencia productiva.
            </p>

            {aiRecommendations && (
              <div className="space-y-3 p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                  <Sparkles className="h-4 w-4" />
                  Recomendaciones IA
                </div>
                
                {aiRecommendations.priorities && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Prioridades:</p>
                    {aiRecommendations.priorities.slice(0, 3).map((priority, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>{priority}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={onOptimize} 
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
              size="lg"
              disabled={loading}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {loading ? 'Optimizando...' : 'Optimizar Corrales con IA'}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              ✓ Tus corrales están bien distribuidos sin riesgos de consanguinidad detectados.
              Puedes usar el asistente IA para obtener recomendaciones sobre mejoras adicionales.
            </p>
            
            <Button 
              onClick={onOptimize} 
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Consultar Asistente IA
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
