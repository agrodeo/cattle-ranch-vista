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
    current_animals: number;
    total_capacity: number;
    adult_count: number;
    calf_count: number;
    current_risks: ConsanguinityRisk[];
    moves_suggested: Array<{
      animal_id: string;
      animal_name: string;
      from_corral: string;
      to_corral: string;
      reason: string;
      type?: 'consanguinity' | 'mother_calf';
      associated_animals?: string[];
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
    calves_moved_with_mothers: number;
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
    max_age_months_with_mother: 8,
    density_per_hectare: 1.5,
    calf_space_factor: 0.6,
    objectives: ['consanguinity'] as string[],
    targetWeights: {
      birth: 0,
      weaning: 0,
      final: 0
    }
  });

  const generateOptimization = async () => {
    setLoading(true);
    try {
      console.log('Invoking suggest-corral-distribution with cabanaId:', cabanaId);
      
      const { data, error } = await supabase.functions.invoke('suggest-corral-distribution', {
        body: {
          cabanaId,
          ...config
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Data error:', data.error);
        toast.error(data.error);
        return;
      }
      
      setPlan(data);
      setStep(2);
      toast.success("Optimización generada exitosamente");
    } catch (error) {
      console.error('Error generating optimization:', error);
      const errorMessage = error?.message || "Error al generar la optimización";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestions = async () => {
    if (!plan) return;

    setLoading(true);
    try {
      // Apply moves by updating animals directly
      const moves = plan.corral_plan.flatMap(corral => 
        corral.moves_suggested.filter(move => move.from_corral !== move.to_corral)
      );

      if (moves.length > 0) {
        let successfulMoves = 0;
        const errors: string[] = [];

        for (const move of moves) {
          try {
            // Update animal corral
            const { error: updateError } = await supabase
              .from('animals')
              .update({ corral_id: move.to_corral })
              .eq('id', move.animal_id);

            if (updateError) {
              errors.push(`Error moviendo ${move.animal_name}: ${updateError.message}`);
            } else {
              successfulMoves++;
            }
          } catch (error) {
            errors.push(`Error moviendo ${move.animal_name}: ${error.message}`);
          }
        }

        if (errors.length > 0) {
          console.warn('Some moves failed:', errors);
        }

        toast.success(`${successfulMoves} movimientos aplicados exitosamente`);
        
        if (errors.length > 0) {
          toast.error(`${errors.length} movimientos fallaron`);
        }
      } else {
        toast.info("No hay movimientos para aplicar");
      }

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
                {/* Objetivos de Optimización */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Objetivos de Optimización</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={config.objectives.includes('consanguinity')}
                        onChange={(e) => {
                          const objectives = e.target.checked
                            ? [...config.objectives, 'consanguinity']
                            : config.objectives.filter(o => o !== 'consanguinity');
                          setConfig(prev => ({ ...prev, objectives }));
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Reducir Consanguinidad</div>
                        <div className="text-sm text-muted-foreground">Evitar cruces entre animales emparentados</div>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={config.objectives.includes('reproduction')}
                        onChange={(e) => {
                          const objectives = e.target.checked
                            ? [...config.objectives, 'reproduction']
                            : config.objectives.filter(o => o !== 'reproduction');
                          setConfig(prev => ({ ...prev, objectives }));
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Optimizar Reproducción</div>
                        <div className="text-sm text-muted-foreground">Maximizar fertilidad y tasa de preñez</div>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={config.objectives.includes('production')}
                        onChange={(e) => {
                          const objectives = e.target.checked
                            ? [...config.objectives, 'production']
                            : config.objectives.filter(o => o !== 'production');
                          setConfig(prev => ({ ...prev, objectives }));
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Optimizar Producción</div>
                        <div className="text-sm text-muted-foreground">Maximizar ganancia de peso y producción</div>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={config.objectives.includes('benchmarks')}
                        onChange={(e) => {
                          const objectives = e.target.checked
                            ? [...config.objectives, 'benchmarks']
                            : config.objectives.filter(o => o !== 'benchmarks');
                          setConfig(prev => ({ ...prev, objectives }));
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="font-medium">Seguir Estándares de la Cabaña</div>
                        <div className="text-sm text-muted-foreground">Usar los estándares configurados en tu cabaña</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Parámetros de Peso (opcional) */}
                {(config.objectives.includes('production') || config.objectives.includes('benchmarks')) && (
                  <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                    <Label className="font-semibold">Objetivos de Peso (opcional)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-sm">Peso al Nacer (kg)</Label>
                        <Input
                          type="number"
                          placeholder="ej: 35"
                          value={config.targetWeights.birth || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            targetWeights: { ...prev.targetWeights, birth: Number(e.target.value) }
                          }))}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Peso al Destete (kg)</Label>
                        <Input
                          type="number"
                          placeholder="ej: 180"
                          value={config.targetWeights.weaning || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            targetWeights: { ...prev.targetWeights, weaning: Number(e.target.value) }
                          }))}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Peso Final (kg)</Label>
                        <Input
                          type="number"
                          placeholder="ej: 450"
                          value={config.targetWeights.final || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            targetWeights: { ...prev.targetWeights, final: Number(e.target.value) }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Parámetros Técnicos */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Parámetros Técnicos</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <Label>Edad máx. ternero con madre (meses)</Label>
                      <Input
                        type="number"
                        value={config.max_age_months_with_mother}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          max_age_months_with_mother: Number(e.target.value)
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
                    <div>
                      <Label>Factor espacio ternero (0-1)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={config.calf_space_factor}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          calf_space_factor: Number(e.target.value)
                        }))}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">💡 Cómo funciona</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Selecciona uno o más objetivos de optimización</li>
                    <li>• La IA analizará tu rodeo y generará movimientos específicos</li>
                    <li>• Los terneros se mueven automáticamente con sus madres</li>
                    <li>• Puedes ajustar parámetros técnicos según tus necesidades</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline">
                Cancelar
              </Button>
              <Button 
                onClick={generateOptimization} 
                disabled={loading || config.objectives.length === 0}
              >
                {loading ? "Analizando..." : "Generar Optimización"}
              </Button>
              {config.objectives.length === 0 && (
                <p className="text-sm text-red-600">Selecciona al menos un objetivo</p>
              )}
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{plan.summary.calves_moved_with_mothers}</div>
                    <div className="text-sm text-purple-600">Terneros c/Madre</div>
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
                              {corral.current_animals} animales ({corral.adult_count} adultos, {corral.calf_count} terneros) • 
                              {corral.current_risks.length} riesgos • {corral.moves_suggested.length} movimientos
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
                                <div key={j} className={`text-sm p-2 rounded ${
                                  move.type === 'mother_calf' ? 'bg-purple-50' : 'bg-blue-50'
                                }`}>
                                  <span className="font-medium">{move.animal_name}</span>
                                  <span className="text-muted-foreground"> • {move.reason}</span>
                                  {move.type === 'mother_calf' && (
                                    <span className="text-purple-600 text-xs ml-2">👶 Ternero</span>
                                  )}
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