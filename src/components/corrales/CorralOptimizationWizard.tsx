import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  const [hasCustomBenchmarks, setHasCustomBenchmarks] = useState(false);
  const [checkingBenchmarks, setCheckingBenchmarks] = useState(true);
  const [showExplanation, setShowExplanation] = useState(false);

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

  // Step 1.5: Animal selection with productive/reproductive data
  const [allAnimals, setAllAnimals] = useState<any[]>([]);
  const [allCorrals, setAllCorrals] = useState<any[]>([]);
  const [reproMetrics, setReproMetrics] = useState<Map<string, any>>(new Map());
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<Set<string>>(new Set());
  const [selectedCorralIds, setSelectedCorralIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMoves, setSelectedMoves] = useState<Set<string>>(new Set());

  // Check if custom benchmarks exist
  useEffect(() => {
    const checkBenchmarks = async () => {
      if (!isOpen || !cabanaId) return;
      
      try {
        const { data, error } = await supabase
          .from('custom_benchmarks')
          .select('id')
          .eq('cabaña_id', cabanaId)
          .limit(1);
        
        setHasCustomBenchmarks(!error && data && data.length > 0);
      } catch (error) {
        console.error('Error checking benchmarks:', error);
      } finally {
        setCheckingBenchmarks(false);
      }
    };

    if (isOpen) {
      setCheckingBenchmarks(true);
      checkBenchmarks();
    }
  }, [isOpen, cabanaId]);

  const loadAnimalsAndCorrals = async () => {
    try {
      const [animalsRes, corralsRes] = await Promise.all([
        supabase
          .from('animals')
          .select('id, id_tag, name, sex, birth_date, corral_id, status, peso_actual_kg, ganancia_diaria_kg, fecha_ultimo_pesaje, esta_preñada')
          .eq('cabaña_id', cabanaId)
          .not('status', 'in', '("vendido","muerto")'),
        supabase
          .from('corrales')
          .select('*')
          .eq('cabaña_id', cabanaId)
      ]);

      if (animalsRes.data) setAllAnimals(animalsRes.data);
      if (corralsRes.data) setAllCorrals(corralsRes.data);
      
      // Load reproductive metrics if reproduction objective is selected
      if (config.objectives.includes('reproduction') || config.objectives.includes('production')) {
        const { data: metrics } = await supabase.rpc('calculate_reproductive_kpis', {
          _cabana_id: cabanaId
        });
        
        if (metrics) {
          const metricsMap = new Map(metrics.map((m: any) => [m.animal_id, m]));
          setReproMetrics(metricsMap);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Error al cargar datos");
    }
  };

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
      
      // Select all moves by default
      const allMoveIds = new Set<string>();
      data.corral_plan.forEach((corral: any) => {
        corral.moves_suggested.forEach((move: any) => {
          allMoveIds.add(`${move.animal_id}-${move.from_corral}-${move.to_corral}`);
        });
      });
      setSelectedMoves(allMoveIds);
      
      setPlan(data);
      setStep(3);
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
      // Apply only selected moves
      const allMoves = plan.corral_plan.flatMap(corral => 
        corral.moves_suggested.filter(move => 
          move.from_corral !== move.to_corral &&
          selectedMoves.has(`${move.animal_id}-${move.from_corral}-${move.to_corral}`)
        )
      );

      if (allMoves.length > 0) {
        let successfulMoves = 0;
        const errors: string[] = [];

        for (const move of allMoves) {
          try {
            // Determine if animal_id is a UUID or id_tag
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(move.animal_id);
            
            // Update animal corral using appropriate field
            const { error: updateError } = await supabase
              .from('animals')
              .update({ corral_id: move.to_corral })
              .eq(isUUID ? 'id' : 'id_tag', move.animal_id);

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

      setStep(4);
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
    setSelectedMoves(new Set());
    setSelectedAnimalIds(new Set());
    setSelectedCorralIds(new Set());
  };

  const toggleMoveSelection = (moveId: string) => {
    setSelectedMoves(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moveId)) {
        newSet.delete(moveId);
      } else {
        newSet.add(moveId);
      }
      return newSet;
    });
  };

  const selectAllMoves = () => {
    if (!plan) return;
    const allMoveIds = new Set<string>();
    plan.corral_plan.forEach(corral => {
      corral.moves_suggested.forEach(move => {
        allMoveIds.add(`${move.animal_id}-${move.from_corral}-${move.to_corral}`);
      });
    });
    setSelectedMoves(allMoveIds);
  };

  const deselectAllMoves = () => {
    setSelectedMoves(new Set());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden w-[95vw] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap min-w-0">
            <Shuffle className="h-5 w-5 flex-shrink-0" />
            <span className="break-words min-w-0">Optimización de Corrales - Paso {step} de 4</span>
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExplanation(!showExplanation)}
            className="mt-2"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            {showExplanation ? "Ocultar" : "¿Cómo funciona?"}
          </Button>
        </DialogHeader>

        {showExplanation && (
          <Card className="mb-4 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Cómo funciona la Optimización de Corrales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold mb-1">🧬 Detección de Consanguinidad</h4>
                <p className="text-muted-foreground">
                  El sistema analiza las relaciones familiares entre animales (padre-hijo, hermanos, medio-hermanos) 
                  que están en el mismo corral y tienen edad reproductiva (≥15 meses). 
                  Detecta parejas macho-hembra emparentadas que podrían cruzarse.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">📊 Datos Productivos y Reproductivos</h4>
                <p className="text-muted-foreground">
                  El sistema recopila métricas clave de cada animal:
                  <ul className="list-disc ml-5 mt-1">
                    <li>Peso actual, ganancia diaria promedio (GDP), historial de pesajes</li>
                    <li>Tasas de preñez y parición (% de éxito reproductivo)</li>
                    <li>Nivel de rendimiento (Excelente, Bueno, Regular, Bajo)</li>
                    <li>Métricas agregadas por corral para análisis comparativo</li>
                  </ul>
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">🤖 Análisis con IA</h4>
                <p className="text-muted-foreground">
                  Usando GPT-4, el sistema:
                  <ul className="list-disc ml-5 mt-1">
                    <li>Evalúa la distribución actual de animales con datos productivos</li>
                    <li>Identifica conflictos de consanguinidad y bajo rendimiento</li>
                    <li>Genera movimientos específicos con razones basadas en datos reales</li>
                    <li>Considera capacidad, edades, objetivos y métricas de performance</li>
                    <li>Prioriza animales de alto rendimiento para agrupación estratégica</li>
                  </ul>
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">🎯 Objetivos Personalizables</h4>
                <p className="text-muted-foreground">
                  Puedes elegir optimizar para:
                  <ul className="list-disc ml-5 mt-1">
                    <li><strong>Consanguinidad:</strong> Reduce cruces entre parientes</li>
                    <li><strong>Reproducción:</strong> Agrupa hembras &gt;70% preñez/parición, aísla bajo rendimiento</li>
                    <li><strong>Producción:</strong> Agrupa animales con GDP &gt;0.7kg/d, separa bajo rendimiento</li>
                    <li><strong>Estándares:</strong> Sigue benchmarks específicos de tu cabaña</li>
                  </ul>
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">✅ Control Total con Datos</h4>
                <p className="text-muted-foreground">
                  Puedes ver métricas de cada animal (peso, GDP, % preñez, % parición), 
                  revisar cada movimiento con razones basadas en datos reales, 
                  seleccionar cuáles aplicar y descartar los que no quieras. 
                  El sistema muestra el impacto esperado antes de aplicar cambios.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

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
                        disabled={checkingBenchmarks}
                      />
                      <div className="flex-1">
                        <div className="font-medium">Seguir Estándares de la Cabaña</div>
                        <div className="text-sm text-muted-foreground">
                          {checkingBenchmarks ? (
                            "Verificando estándares configurados..."
                          ) : hasCustomBenchmarks ? (
                            "Usar los estándares personalizados configurados en tu cabaña"
                          ) : (
                            <>
                              Se usarán estándares por defecto. 
                              <Link 
                                to="/settings?tab=benchmarks" 
                                className="ml-1 underline text-primary hover:text-primary/80" 
                                onClick={onClose}
                              >
                                Configura estándares personalizados aquí
                              </Link>
                            </>
                          )}
                        </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm">Toros por Corral (máx)</Label>
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
                      <Label className="text-xs sm:text-sm">Edad máx. ternero con madre (meses)</Label>
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
                      <Label className="text-xs sm:text-sm">Densidad por Hectárea</Label>
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
                      <Label className="text-xs sm:text-sm">Factor espacio ternero (0-1)</Label>
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
                onClick={() => {
                  loadAnimalsAndCorrals();
                  setStep(2);
                }} 
                disabled={config.objectives.length === 0 || checkingBenchmarks}
              >
                {checkingBenchmarks ? "Verificando..." : "Siguiente: Seleccionar Animales"}
              </Button>
              {config.objectives.length === 0 && (
                <p className="text-sm text-red-600">Selecciona al menos un objetivo</p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Seleccionar Animales para Análisis (Opcional)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Si no seleccionas ningún animal, se analizarán todos los animales activos.
                  Puedes filtrar por corral o seleccionar individualmente.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Buscar Animal</Label>
                  <Input
                    placeholder="Nombre o tag..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Filtrar por Corral</Label>
                   <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
                     {allCorrals.map(corral => (
                       <label key={corral.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-accent min-w-0 overflow-hidden">
                         <input
                           type="checkbox"
                           checked={selectedCorralIds.has(corral.id)}
                           onChange={(e) => {
                             const newSet = new Set(selectedCorralIds);
                             if (e.target.checked) {
                               newSet.add(corral.id);
                             } else {
                               newSet.delete(corral.id);
                             }
                             setSelectedCorralIds(newSet);
                           }}
                           className="flex-shrink-0 w-4 h-4"
                         />
                         <span className="text-sm truncate min-w-0">{corral.name}</span>
                       </label>
                     ))}
                   </div>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <Label>Animales ({
                      allAnimals.filter(a => 
                        (!searchTerm || a.id_tag?.includes(searchTerm) || a.name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
                        (selectedCorralIds.size === 0 || selectedCorralIds.has(a.corral_id))
                      ).length
                    })</Label>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => {
                        const filtered = allAnimals.filter(a => 
                          (!searchTerm || a.id_tag?.includes(searchTerm) || a.name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
                          (selectedCorralIds.size === 0 || selectedCorralIds.has(a.corral_id))
                        );
                        setSelectedAnimalIds(new Set(filtered.map(a => a.id)));
                      }}>
                        Seleccionar Visibles
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelectedAnimalIds(new Set())}>
                        Limpiar
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto border rounded p-2 space-y-1">
                    {allAnimals
                      .filter(a => 
                        (!searchTerm || a.id_tag?.includes(searchTerm) || a.name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
                        (selectedCorralIds.size === 0 || selectedCorralIds.has(a.corral_id))
                      )
                      .map(animal => {
                        const corral = allCorrals.find(c => c.id === animal.corral_id);
                        const metric = reproMetrics.get(animal.id);
                        const ageMonths = animal.birth_date 
                          ? Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
                          : 0;
                        
                        return (
                           <label key={animal.id} className="flex items-start gap-2 p-2 hover:bg-accent rounded cursor-pointer min-w-0 overflow-hidden">
                             <input
                               type="checkbox"
                               checked={selectedAnimalIds.has(animal.id)}
                               onChange={(e) => {
                                 const newSet = new Set(selectedAnimalIds);
                                 if (e.target.checked) {
                                   newSet.add(animal.id);
                                 } else {
                                   newSet.delete(animal.id);
                                 }
                                 setSelectedAnimalIds(newSet);
                               }}
                               className="mt-1 flex-shrink-0 w-4 h-4"
                             />
                             <div className="flex-1 text-sm min-w-0 overflow-hidden">
                               <div className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-0">
                                 <span className="font-medium break-words min-w-0">{animal.id_tag || animal.name}</span>
                                <span className="text-muted-foreground whitespace-nowrap">
                                  {animal.sex === 'Hembra' ? '♀' : '♂'} {ageMonths}m
                                </span>
                                {animal.esta_preñada && (
                                  <Badge variant="secondary" className="text-xs whitespace-nowrap">PREÑADA</Badge>
                                 )}
                                 {corral && (
                                   <span className="text-xs text-muted-foreground truncate min-w-0">• {corral.name}</span>
                                 )}
                               </div>
                               <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground mt-1 flex-wrap min-w-0">
                                {animal.peso_actual_kg && (
                                  <span className="whitespace-nowrap">💪 {Math.round(animal.peso_actual_kg)}kg</span>
                                )}
                                {animal.ganancia_diaria_kg && (
                                  <span className="whitespace-nowrap">📈 +{animal.ganancia_diaria_kg.toFixed(2)}kg/d</span>
                                )}
                                {metric && (
                                  <>
                                    {metric.individual_pregnancy_rate > 0 && (
                                      <span className="whitespace-nowrap">🤰 {Math.round(metric.individual_pregnancy_rate)}%</span>
                                    )}
                                    {metric.individual_calving_rate > 0 && (
                                      <span className="whitespace-nowrap">🐄 {Math.round(metric.individual_calving_rate)}%</span>
                                    )}
                                    {metric.performance_level && metric.performance_level !== 'Sin servicios' && (
                                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                                        {metric.performance_level}
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={resetWizard} variant="outline">
                Volver
              </Button>
              <Button 
                onClick={generateOptimization} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Analizando..." : "Generar Optimización"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && plan && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold break-words">Plan de Optimización</h3>
                <p className="text-sm text-muted-foreground">
                  {plan.summary.total_moves_suggested} movimientos sugeridos
                </p>
              </div>
              <div className="flex gap-2 flex-wrap min-w-0">
                {plan.warnings.map((warning, i) => (
                  <Badge key={i} variant="outline" className="bg-yellow-50 text-xs max-w-full">
                    <AlertTriangle className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="break-words min-w-0 overflow-hidden">{warning}</span>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 min-w-0">
                  <div className="text-center p-2 sm:p-3 bg-red-50 rounded-lg min-w-0">
                    <div className="text-xl sm:text-2xl font-bold text-red-600">{plan.summary.total_risks_before}</div>
                    <div className="text-xs sm:text-sm text-red-600 break-words">Riesgos Actuales</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-green-50 rounded-lg min-w-0">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">{plan.summary.total_risks_after}</div>
                    <div className="text-xs sm:text-sm text-green-600 break-words">Riesgos Después</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg min-w-0">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{plan.summary.risk_reduction_percentage}%</div>
                    <div className="text-xs sm:text-sm text-blue-600 break-words">Reducción</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-orange-50 rounded-lg min-w-0">
                    <div className="text-xl sm:text-2xl font-bold text-orange-600">{plan.summary.total_moves_suggested}</div>
                    <div className="text-xs sm:text-sm text-orange-600 break-words">Movimientos</div>
                  </div>
                  <div className="text-center p-2 sm:p-3 bg-purple-50 rounded-lg min-w-0">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">{plan.summary.calves_moved_with_mothers}</div>
                    <div className="text-xs sm:text-sm text-purple-600 break-words">Terneros c/Madre</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Corral Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Detallado por Corral</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <div className="space-y-3 min-w-0">
                  <TooltipProvider>
                    {plan.corral_plan.map((corral, i) => (
                      <div key={i} className="p-2 sm:p-3 md:p-4 border rounded-lg bg-card overflow-hidden min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 min-w-0">
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <span className="font-medium break-words min-w-0">{corral.corral_name}</span>
                            <div className="text-xs sm:text-sm text-muted-foreground break-words min-w-0 overflow-hidden">
                              <span className="block sm:inline">{corral.current_animals} animales ({corral.adult_count} adultos, {corral.calf_count} terneros)</span>
                              <span className="hidden sm:inline"> • </span>
                              <span className="block sm:inline">{corral.current_risks.length} riesgos • {corral.moves_suggested.length} movimientos</span>
                            </div>
                          </div>
                          <div className="flex gap-1 sm:gap-2 flex-wrap min-w-0 flex-shrink-0">
                            {corral.risk_reduction_score > 0 && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 text-xs whitespace-nowrap">
                                -{corral.risk_reduction_score.toFixed(0)}% riesgo
                              </Badge>
                            )}
                            {corral.capacity_ok ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs whitespace-nowrap">
                                Capacidad OK
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs whitespace-nowrap">
                                Sobre capacidad
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Current Risks */}
                        {corral.current_risks.length > 0 && (
                          <div className="mb-3 min-w-0 overflow-hidden">
                            <h5 className="text-sm font-medium mb-2">Riesgos Detectados:</h5>
                            <div className="space-y-1 min-w-0">
                              {corral.current_risks.slice(0, 3).map((risk, j) => (
                                <div key={j} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs sm:text-sm p-2 bg-red-50 rounded overflow-hidden min-w-0">
                                  <span className="break-words min-w-0 flex-1 overflow-hidden">{risk.description}</span>
                                  <div className="flex-shrink-0 mt-1 sm:mt-0">{getSeverityBadge(risk.severity)}</div>
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
                          <div className="mb-3 min-w-0 overflow-hidden">
                            <h5 className="text-sm font-medium mb-2">Movimientos Sugeridos:</h5>
                            <div className="space-y-1 min-w-0">
                              {corral.moves_suggested.map((move, j) => {
                                const moveId = `${move.animal_id}-${move.from_corral}-${move.to_corral}`;
                                const isSelected = selectedMoves.has(moveId);
                                return (
                                  <label 
                                    key={j} 
                                    className={`flex items-start gap-2 text-sm p-2 rounded cursor-pointer overflow-hidden min-w-0 ${
                                      move.type === 'mother_calf' ? 'bg-purple-50' : 'bg-blue-50'
                                    } ${!isSelected ? 'opacity-50' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleMoveSelection(moveId)}
                                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-0">
                                        <span className="font-medium break-words min-w-0">{move.animal_name}</span>
                                        {move.type === 'mother_calf' && (
                                          <span className="text-purple-600 text-xs whitespace-nowrap flex-shrink-0">👶 Ternero</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1 break-words overflow-hidden min-w-0">
                                        {move.reason}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-blue-600 mt-2 break-words overflow-hidden min-w-0">
                          💡 {corral.suggestion}
                        </div>
                      </div>
                    ))}
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={selectAllMoves}>
                  Seleccionar Todos
                </Button>
                <Button size="sm" variant="outline" onClick={deselectAllMoves}>
                  Deseleccionar Todos
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={resetWizard} variant="outline">
                  Volver
                </Button>
                <Button
                  onClick={applySuggestions}
                  disabled={loading || selectedMoves.size === 0}
                  className="flex-1"
                >
                  {loading ? "Aplicando..." : `Aplicar ${selectedMoves.size} Movimientos Seleccionados`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h3 className="text-xl font-semibold">Optimización Aplicada</h3>
            <p className="text-muted-foreground">
              Los movimientos seleccionados han sido aplicados exitosamente.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={onClose} variant="outline">
                Cerrar
              </Button>
              <Button onClick={resetWizard}>
                Nueva Optimización
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}