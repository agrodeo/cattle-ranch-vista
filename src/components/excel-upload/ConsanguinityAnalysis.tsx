import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AnimalFieldMapping } from "./AnimalExcelUploadAdvanced";

interface ConsanguinityResult {
  animalId: string;
  parentIds: {
    father?: string;
    mother?: string;
  };
  consanguinityCoefficient: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
}

interface ConsanguinityAnalysisProps {
  animals: AnimalFieldMapping[];
  onNext: (results: ConsanguinityResult[]) => void;
  onBack: () => void;
  onSkip: () => void;
}

export const ConsanguinityAnalysis = ({
  animals,
  onNext,
  onBack,
  onSkip
}: ConsanguinityAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [results, setResults] = useState<ConsanguinityResult[]>([]);
  const [hasStarted, setHasStarted] = useState(false);

  const analyzeConsanguinity = async () => {
    setIsAnalyzing(true);
    setHasStarted(true);
    setAnalysisProgress(0);
    
    const analysisResults: ConsanguinityResult[] = [];
    
    try {
      // Filter animals that have both parents specified
      const animalsWithParents = animals.filter(animal => 
        animal.padre_id && animal.madre_id && animal._isValid
      );

      if (animalsWithParents.length === 0) {
        toast({
          title: "Sin datos para análisis",
          description: "No hay animales con información de padres para analizar consanguinidad",
          variant: "default"
        });
        setResults([]);
        setIsAnalyzing(false);
        return;
      }

      for (let i = 0; i < animalsWithParents.length; i++) {
        const animal = animalsWithParents[i];
        setAnalysisProgress(((i + 1) / animalsWithParents.length) * 100);

        try {
          // Call the consanguinity check function
          const { data: consanguinityData, error } = await supabase
            .rpc('check_consanguinity', {
              animal_father_id: animal.padre_id,
              animal_mother_id: animal.madre_id
            });

          if (error) {
            console.error('Error checking consanguinity:', error);
            continue;
          }

          const coefficient = consanguinityData || 0;
          
          // Determine risk level
          let riskLevel: ConsanguinityResult['riskLevel'] = 'low';
          const warnings: string[] = [];
          
          if (coefficient >= 0.5) {
            riskLevel = 'critical';
            warnings.push('Consanguinidad crítica - Padres muy relacionados');
            warnings.push('Riesgo muy alto de problemas genéticos');
          } else if (coefficient >= 0.25) {
            riskLevel = 'high';
            warnings.push('Consanguinidad alta - Padres emparentados');
            warnings.push('Riesgo elevado de problemas genéticos');
          } else if (coefficient >= 0.125) {
            riskLevel = 'medium';
            warnings.push('Consanguinidad moderada');
            warnings.push('Monitorear salud y rendimiento');
          } else {
            riskLevel = 'low';
            warnings.push('Consanguinidad baja - Dentro de parámetros normales');
          }

          // Add specific warnings based on relationship
          if (coefficient >= 0.25) {
            warnings.push('Considerar diversificar líneas genéticas');
          }

          analysisResults.push({
            animalId: animal.identificacion,
            parentIds: {
              father: animal.padre_id,
              mother: animal.madre_id
            },
            consanguinityCoefficient: coefficient,
            riskLevel,
            warnings
          });

          // Update the animal with consanguinity information
          animal._consanguinityCoefficient = coefficient;

        } catch (error) {
          console.error(`Error analyzing animal ${animal.identificacion}:`, error);
        }
      }

      setResults(analysisResults);
      
      // Show summary toast
      const criticalCount = analysisResults.filter(r => r.riskLevel === 'critical').length;
      const highCount = analysisResults.filter(r => r.riskLevel === 'high').length;
      
      if (criticalCount > 0 || highCount > 0) {
        toast({
          title: "Alertas de Consanguinidad",
          description: `Se encontraron ${criticalCount} casos críticos y ${highCount} casos de alto riesgo`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Análisis Completado",
          description: "No se detectaron problemas críticos de consanguinidad"
        });
      }

    } catch (error) {
      console.error('Error during consanguinity analysis:', error);
      toast({
        title: "Error en el análisis",
        description: "No se pudo completar el análisis de consanguinidad",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(100);
    }
  };

  const getRiskBadgeVariant = (riskLevel: ConsanguinityResult['riskLevel']) => {
    switch (riskLevel) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'default';
    }
  };

  const getRiskColor = (riskLevel: ConsanguinityResult['riskLevel']) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-700';
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  // Summary statistics
  const criticalCount = results.filter(r => r.riskLevel === 'critical').length;
  const highCount = results.filter(r => r.riskLevel === 'high').length;
  const mediumCount = results.filter(r => r.riskLevel === 'medium').length;
  const lowCount = results.filter(r => r.riskLevel === 'low').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Paso 4: Análisis de Consanguinidad</CardTitle>
        <CardDescription>
          Detecte posibles problemas de consanguinidad en su ganado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {!hasStarted && (
          <div className="text-center space-y-4">
            <div className="p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Análisis de Consanguinidad</h3>
              <p className="text-muted-foreground mb-4">
                Este análisis revisará las relaciones familiares entre los animales para detectar posibles problemas de consanguinidad.
              </p>
              <p className="text-sm text-muted-foreground">
                Se analizarán {animals.filter(a => a.padre_id && a.madre_id && a._isValid).length} animales con información de padres.
              </p>
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button onClick={analyzeConsanguinity} disabled={isAnalyzing}>
                Iniciar Análisis
              </Button>
              <Button variant="outline" onClick={onSkip}>
                Omitir Análisis
              </Button>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm font-medium">Analizando consanguinidad...</p>
            </div>
            <Progress value={analysisProgress} className="w-full" />
            <p className="text-xs text-center text-muted-foreground">
              {Math.round(analysisProgress)}% completado
            </p>
          </div>
        )}

        {results.length > 0 && (
          <>
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-red-700">{criticalCount}</div>
                <div className="text-xs text-muted-foreground">Crítico</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-red-600">{highCount}</div>
                <div className="text-xs text-muted-foreground">Alto</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-yellow-600">{mediumCount}</div>
                <div className="text-xs text-muted-foreground">Medio</div>
              </div>
              <div className="text-center p-3 border rounded">
                <div className="text-2xl font-bold text-green-600">{lowCount}</div>
                <div className="text-xs text-muted-foreground">Bajo</div>
              </div>
            </div>

            {/* Critical alerts */}
            {criticalCount > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  <strong>¡Atención!</strong> Se detectaron {criticalCount} casos de consanguinidad crítica. 
                  Estos animales tienen alto riesgo de problemas genéticos.
                </AlertDescription>
              </Alert>
            )}

            {/* Results table */}
            <div className="space-y-3">
              <h4 className="font-medium">Resultados Detallados</h4>
              <div className="max-h-64 overflow-y-auto border rounded">
                <div className="space-y-2 p-4">
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{result.animalId}</span>
                          <Badge variant={getRiskBadgeVariant(result.riskLevel)}>
                            {result.riskLevel.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Padre: {result.parentIds.father} | Madre: {result.parentIds.mother}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Coeficiente: {(result.consanguinityCoefficient * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-right">
                        {result.riskLevel === 'critical' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                        {result.riskLevel === 'high' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        {result.riskLevel === 'medium' && <Info className="h-5 w-5 text-yellow-500" />}
                        {result.riskLevel === 'low' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Recomendaciones:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Monitoree de cerca los animales con consanguinidad alta o crítica</li>
                  <li>Considere diversificar las líneas genéticas en futuros apareamientos</li>
                  <li>Mantenga registros detallados de salud y rendimiento</li>
                  <li>Consulte con un genetista veterinario para casos críticos</li>
                </ul>
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          
          {(results.length > 0 || hasStarted) && (
            <Button onClick={() => onNext(results)}>
              Siguiente: Árbol Genealógico
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};