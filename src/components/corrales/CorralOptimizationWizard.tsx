import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Shuffle, Target, CheckCircle, AlertTriangle, HelpCircle, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface ConsanguinityRisk {
  animal1_id: string;
  animal2_id: string;
  relationship: string;
  severity: 'severe' | 'medium' | 'low';
  description: string;
  inbreeding_coefficient: number;
}

interface CorralOptimizationPlan {
  corral_plan: Array<{
    corral_id: string;
    corral_name: string;
    current_risks: ConsanguinityRisk[];
    moves_suggested: Array<{
      animal_id: string;
      animal_name: string;
      from_corral: string;
      to_corral: string;
      reason: string;
    }>;
    risk_reduction_score: number;
    capacity_ok: boolean;
    suggestion: string;
  }>;
  summary: {
    total_risks_before: number;
    total_risks_after: number;
    risk_reduction_percentage: number;
    total_moves_suggested: number;
  };
  warnings: string[];
}

interface CorralOptimizationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  cabanaId: string;
}

export function CorralOptimizationWizard({ isOpen, onClose, cabanaId }: CorralOptimizationWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<CorralOptimizationPlan | null>(null);

  // Step 1: Configuration
  const [config, setConfig] = useState({
    max_bulls_per_corral: 1,
    min_age_months: 18,
    density_per_hectare: 1.5
  });

  const generateOptimization = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-corral-distribution', {
        body: {
          cabanaId,
          ...config
        }
      });

      if (error) throw error;
      
      setPlan(data);
      setStep(2);
      toast.success("Optimización generada exitosamente");
    } catch (error) {
      console.error('Error generating optimization:', error);
      toast.error("Error al generar la optimización");
    } finally {
      setLoading(false);
    }
  };

  const applySuggestions = async () => {
    if (!plan) return;

    setLoading(true);
    try {
      // Apply moves via bulk-move-animals function
      const moves = plan.corral_plan.flatMap(corral => 
        corral.moves_suggested.filter(move => move.from_corral !== move.to_corral)
      );

      if (moves.length > 0) {
        const { error } = await supabase.functions.invoke('bulk-move-animals', {
          body: {
            cabanaId,
            moves: moves.map(move => ({
              animalId: move.animal_id,
              targetCorralId: move.to_corral,
              motivo: `Optimización: ${move.reason}`
            }))
          }
        });

        if (error) throw error;
      }

      toast.success(`${moves.length} movimientos aplicados exitosamente`);
      setStep(3);
    } catch (error) {
      console.error('Error applying suggestions:', error);
      toast.error("Error al aplicar las sugerencias");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: 'severe' | 'medium' | 'low') => {
    const severityConfig = {
      severe: { label: 'Alto Riesgo', variant: 'destructive' as const, emoji: '🔴' },
      medium: { label: 'Riesgo Medio', variant: 'secondary' as const, emoji: '🟠' },
      low: { label: 'Riesgo Bajo', variant: 'outline' as const, emoji: '🟡' }
    };
    
    const config = severityConfig[severity];
    return (
      <Badge variant={config.variant}>
        {config.emoji} {config.label}
      </Badge>
    );
  };

  const resetWizard = () => {
    setStep(1);
    setPlan(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Optimización de Corrales - Paso {step} de 3
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Configuración de Optimización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Toros por Corral (máx)</Label>
                    <Input
                      type="number"
                      value={config.max_bulls_per_corral}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        max_bulls_per_corral: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Edad Mínima (meses)</Label>
                    <Input
                      type="number"
                      value={config.min_age_months}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        min_age_months: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Densidad por Hectárea</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.density_per_hectare}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        density_per_hectare: Number(e.target.value)
                      }))}
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Objetivo de la Optimización</h4>
                  <p className="text-sm text-blue-700">
                    Esta herramienta analizará los corrales actuales para detectar riesgos de consanguinidad 
                    y sugerirá movimientos de animales para minimizar estos riesgos, priorizando la separación 
                    de animales con parentesco directo.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline">
                Cancelar
              </Button>
              <Button onClick={generateOptimization} disabled={loading}>
                {loading ? "Analizando..." : "Generar Optimización"}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && plan && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Plan de Optimización</h3>
                <p className="text-sm text-muted-foreground">
                  {plan.summary.total_moves_suggested} movimientos sugeridos
                </p>
              </div>
              <div className="flex gap-2">
                {plan.warnings.map((warning, i) => (
                  <Badge key={i} variant="outline" className="bg-yellow-50">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {warning}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Summary Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Métricas de Reducción de Riesgo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{plan.summary.total_risks_before}</div>
                    <div className="text-sm text-red-600">Riesgos Actuales</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{plan.summary.total_risks_after}</div>
                    <div className="text-sm text-green-600">Riesgos Después</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{plan.summary.risk_reduction_percentage}%</div>
                    <div className="text-sm text-blue-600">Reducción</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{plan.summary.total_moves_suggested}</div>
                    <div className="text-sm text-orange-600">Movimientos</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Corral Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Detallado por Corral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <TooltipProvider>
                    {plan.corral_plan.map((corral, i) => (
                      <div key={i} className="p-4 border rounded-lg bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="font-medium">{corral.corral_name}</span>
                            <div className="text-sm text-muted-foreground">
                              {corral.current_risks.length} riesgos actuales • {corral.moves_suggested.length} movimientos sugeridos
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {corral.risk_reduction_score > 0 && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                -{corral.risk_reduction_score.toFixed(0)}% riesgo
                              </Badge>
                            )}
                            {corral.capacity_ok ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                Capacidad OK
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                Sobre capacidad
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Current Risks */}
                        {corral.current_risks.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium mb-2">Riesgos Detectados:</h5>
                            <div className="space-y-1">
                              {corral.current_risks.slice(0, 3).map((risk, j) => (
                                <div key={j} className="flex items-center justify-between text-sm p-2 bg-red-50 rounded">
                                  <span>{risk.description}</span>
                                  {getSeverityBadge(risk.severity)}
                                </div>
                              ))}
                              {corral.current_risks.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  ... y {corral.current_risks.length - 3} riesgos más
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Suggested Moves */}
                        {corral.moves_suggested.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium mb-2">Movimientos Sugeridos:</h5>
                            <div className="space-y-1">
                              {corral.moves_suggested.map((move, j) => (
                                <div key={j} className="text-sm p-2 bg-blue-50 rounded">
                                  <span className="font-medium">{move.animal_name}</span>
                                  <span className="text-muted-foreground"> • {move.reason}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-blue-600 mt-2">
                          💡 {corral.suggestion}
                        </div>
                      </div>
                    ))}
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={resetWizard} variant="outline">
                Volver
              </Button>
              <Button
                onClick={applySuggestions}
                disabled={loading || plan.summary.total_moves_suggested === 0}
                className="flex-1"
              >
                {loading ? "Aplicando..." : "Aplicar Sugerencias"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h3 className="text-xl font-semibold">Optimización Aplicada</h3>
            <p className="text-muted-foreground">
              Los movimientos sugeridos han sido aplicados para reducir los riesgos de consanguinidad.
            </p>
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}