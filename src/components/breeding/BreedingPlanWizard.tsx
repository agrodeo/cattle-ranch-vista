import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Target, CheckCircle, AlertTriangle, HelpCircle, Settings, Info, Star, TrendingUp, Scale } from "lucide-react";
import { toast } from "sonner";
import { useBenchmarks } from "@/hooks/useBenchmarks";

interface Pairing {
  cow_id: string;
  bull_id: string;
  cow_name: string;
  bull_name: string;
  cow_tag?: string;
  bull_tag?: string;
  score: number;
  inbreeding_F: number;
  blocked: boolean;
  predicted: {
    birth_weight?: number;
    weaning_weight?: number;
    final_weight?: number;
    ce_cm?: number;
  };
  match_quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  explain: string;
  detailed_explanation: {
    genetic_merit: string;
    inbreeding_risk: string;
    predicted_performance: string;
    recommendation: string;
    scores: {
      birth_weight_score: number;
      weaning_weight_score: number;
      final_weight_score: number;
      ce_score: number;
      horn_match: boolean;
    };
  };
}

interface BreedingPlan {
  season: string;
  constraints: {
    cow_per_bull_max: number;
    max_bulls_per_corral: number;
    capacity_respected: boolean;
  };
  pairings: Pairing[];
  summary: {
    total_eligible_cows: number;
    total_eligible_bulls: number;
    total_pairings: number;
    excellent_matches: number;
    good_matches: number;
    acceptable_matches: number;
    blocked_combinations: number;
  };
  corral_plan: Array<{
    corral_id: string;
    corral_name: string;
    moves_in: Array<{
      animal_id: string;
      animal_name: string;
      from_corral?: string;
    }>;
    moves_out: Array<{
      animal_id: string;
      animal_name: string;
      to_corral?: string;
    }>;
    bulls_assigned: Array<{
      id: string;
      name: string;
    }>;
    capacity_ok: boolean;
    ratio_ok: boolean;
    suggestion: string;
  }>;
  warnings: string[];
}

interface BreedingPlanWizardProps {
  isOpen: boolean;
  onClose: () => void;
  cabanaId: string;
}

export function BreedingPlanWizard({ isOpen, onClose, cabanaId }: BreedingPlanWizardProps) {
  const { t } = useTranslation(['common', 'breeding']);
  const { hasBenchmarks, getBreedingTargets, loading: benchmarksLoading } = useBenchmarks();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<BreedingPlan | null>(null);

  const [config, setConfig] = useState({
    mode: 'BOTH',
    targets: {
      birth_weight: 32,
      weaning_weight: 200,
      final_weight: 450,
      ce_cm: 36
    },
    weights: {
      birth: 0.2,
      weaning: 0.3,
      final: 0.3,
      ce: 0.2
    },
    cow_per_bull_max: 25,
    max_bulls_per_corral: 1,
    min_cow_age_months: 15,
    min_bull_age_months: 15,
    density_per_hectare: 1.5
  });

  useEffect(() => {
    if (isOpen && !benchmarksLoading) {
      const targets = getBreedingTargets();
      setConfig(prev => ({
        ...prev,
        targets
      }));
    }
  }, [isOpen, benchmarksLoading, getBreedingTargets]);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setPlan(null);
    }
  }, [isOpen]);

  const generatePlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-plan-breeding', {
        body: {
          cabanaId,
          ...config
        }
      });

      if (error) throw error;
      
      setPlan(data);
      setStep(2);
      toast.success(t('common:success.created'));
    } catch (error) {
      console.error('Error generating plan:', error);
      toast.error(t('breeding:errorGeneratingPlan'));
    } finally {
      setLoading(false);
    }
  };

  const commitPlan = async (options: { createServices: boolean; createMoves: boolean }) => {
    if (!plan) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-plan-commit', {
        body: {
          cabanaId,
          plan,
          options
        }
      });

      if (error) throw error;
      
      toast.success(data.message);
      setStep(3);
    } catch (error) {
      console.error('Error committing plan:', error);
      toast.error(t('breeding:errorExecutingPlan'));
    } finally {
      setLoading(false);
    }
  };

  const getMatchBadge = (quality: string) => {
    switch (quality) {
      case 'excellent':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><Star className="h-3 w-3 mr-1" />{t('breeding:excellent')}</Badge>;
      case 'good':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"><TrendingUp className="h-3 w-3 mr-1" />{t('breeding:good')}</Badge>;
      case 'acceptable':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">{t('breeding:acceptable')}</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">{t('breeding:poor')}</Badge>;
    }
  };

  const getRiskBadge = (F: number) => {
    if (F <= 0.015) return <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">{t('breeding:lowRisk')}</Badge>;
    if (F <= 0.03) return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">{t('breeding:moderateRisk')}</Badge>;
    return <Badge variant="destructive">{t('breeding:highRisk')}</Badge>;
  };

  const resetWizard = () => {
    setStep(1);
    setPlan(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {t('breeding:planningStepTitle', { step })}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            {!hasBenchmarks && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
                  <span>{t('breeding:noBenchmarksConfigured')}</span>
                  <Button variant="link" asChild className="p-0 h-auto">
                    <Link to="/settings?tab=benchmarks" onClick={onClose}>
                      <Settings className="h-4 w-4 mr-1" />
                      {t('breeding:configureBenchmarks')}
                    </Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {hasBenchmarks && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {t('breeding:benchmarksLoaded')}
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {t('breeding:benchmarksTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>{t('breeding:birthWeight')}</Label>
                    <Input
                      type="number"
                      value={config.targets.birth_weight}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        targets: { ...prev.targets, birth_weight: Number(e.target.value) }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>{t('breeding:weaningWeight')}</Label>
                    <Input
                      type="number"
                      value={config.targets.weaning_weight}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        targets: { ...prev.targets, weaning_weight: Number(e.target.value) }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>{t('breeding:finalWeight')}</Label>
                    <Input
                      type="number"
                      value={config.targets.final_weight}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        targets: { ...prev.targets, final_weight: Number(e.target.value) }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>{t('breeding:scrotalCircumference')}</Label>
                    <Input
                      type="number"
                      value={config.targets.ce_cm}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        targets: { ...prev.targets, ce_cm: Number(e.target.value) }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('breeding:constraints')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>{t('breeding:cowsPerBull')}</Label>
                    <Input
                      type="number"
                      value={config.cow_per_bull_max}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        cow_per_bull_max: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label>{t('breeding:bullsPerCorral')}</Label>
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
                    <Label>{t('breeding:minCowAge')}</Label>
                    <Input
                      type="number"
                      value={config.min_cow_age_months}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        min_cow_age_months: Number(e.target.value)
                      }))}
                    />
                  </div>
                  <div>
                    <Label>{t('breeding:minBullAge')}</Label>
                    <Input
                      type="number"
                      value={config.min_bull_age_months}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        min_bull_age_months: Number(e.target.value)
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline">
                {t('common:cancel')}
              </Button>
              <Button onClick={generatePlan} disabled={loading}>
                {loading ? t('breeding:generating') : t('breeding:generatePlan')}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && plan && (
          <div className="space-y-6">
            {/* Summary Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-bold text-primary">{plan.summary.total_pairings}</div>
                <div className="text-sm text-muted-foreground">{t('breeding:totalPairings')}</div>
              </Card>
              <Card className="p-4 bg-green-50 dark:bg-green-950">
                <div className="text-2xl font-bold text-green-600">{plan.summary.excellent_matches}</div>
                <div className="text-sm text-green-700 dark:text-green-300">{t('breeding:excellentMatches')}</div>
              </Card>
              <Card className="p-4 bg-blue-50 dark:bg-blue-950">
                <div className="text-2xl font-bold text-blue-600">{plan.summary.good_matches}</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">{t('breeding:goodMatches')}</div>
              </Card>
              <Card className="p-4 bg-yellow-50 dark:bg-yellow-950">
                <div className="text-2xl font-bold text-yellow-600">{plan.summary.blocked_combinations}</div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">{t('breeding:blockedCombinations')}</div>
              </Card>
            </div>

            {/* Warnings */}
            {plan.warnings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {plan.warnings.map((warning, i) => (
                  <Badge key={i} variant="outline" className="bg-yellow-50 dark:bg-yellow-950">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {warning}
                  </Badge>
                ))}
              </div>
            )}

            {/* Pairings Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  {t('breeding:suggestedPairings')} ({plan.pairings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <TooltipProvider>
                    {plan.pairings.map((pairing, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="min-w-[200px]">
                            <div className="font-medium">{pairing.cow_name}</div>
                            <div className="text-xs text-muted-foreground">{pairing.cow_tag}</div>
                          </div>
                          <span className="text-muted-foreground">×</span>
                          <div className="min-w-[200px]">
                            <div className="font-medium">{pairing.bull_name}</div>
                            <div className="text-xs text-muted-foreground">{pairing.bull_tag}</div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {getMatchBadge(pairing.match_quality)}
                            {getRiskBadge(pairing.inbreeding_F)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-bold text-lg">{pairing.score}</div>
                            <div className="text-xs text-muted-foreground">pts</div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md p-4">
                              <div className="space-y-3">
                                <p className="font-medium">{pairing.detailed_explanation.recommendation}</p>
                                <div className="text-sm space-y-1">
                                  <p>{pairing.detailed_explanation.genetic_merit}</p>
                                  <p>{pairing.detailed_explanation.inbreeding_risk}</p>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {pairing.detailed_explanation.predicted_performance}
                                </div>
                                {pairing.predicted && (
                                  <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t">
                                    {pairing.predicted.birth_weight && (
                                      <div>Peso nacer: <span className="font-medium">{pairing.predicted.birth_weight.toFixed(1)}kg</span></div>
                                    )}
                                    {pairing.predicted.weaning_weight && (
                                      <div>Peso destete: <span className="font-medium">{pairing.predicted.weaning_weight.toFixed(1)}kg</span></div>
                                    )}
                                    {pairing.predicted.final_weight && (
                                      <div>Peso final: <span className="font-medium">{pairing.predicted.final_weight.toFixed(1)}kg</span></div>
                                    )}
                                    {pairing.predicted.ce_cm && (
                                      <div>CE: <span className="font-medium">{pairing.predicted.ce_cm.toFixed(1)}cm</span></div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>

            {/* Corral Plan */}
            <Card>
              <CardHeader>
                <CardTitle>{t('breeding:corralPlan')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {plan.corral_plan.slice(0, 5).map((corral, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <span className="font-medium">{corral.corral_name}</span>
                        <div className="text-sm text-muted-foreground">
                          {t('breeding:bullsAssigned')}: {corral.bulls_assigned.map(b => b.name).join(", ") || t('breeding:noBulls')}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          💡 {corral.suggestion}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {corral.capacity_ok ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {t('breeding:capacityOk')}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            {t('breeding:overCapacity')}
                          </Badge>
                        )}
                        {corral.ratio_ok ? (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                            {t('breeding:ratioOk')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                            {t('breeding:reviewBulls')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button onClick={resetWizard} variant="outline">
                {t('breeding:back')}
              </Button>
              <Button
                onClick={() => commitPlan({ createServices: true, createMoves: true })}
                disabled={loading}
                className="flex-1"
              >
                {loading ? t('breeding:executing') : t('breeding:confirmFullPlan')}
              </Button>
              <Button
                onClick={() => commitPlan({ createServices: true, createMoves: false })}
                disabled={loading}
                variant="outline"
              >
                {t('breeding:onlyPairings')}
              </Button>
              <Button
                onClick={() => commitPlan({ createServices: false, createMoves: true })}
                disabled={loading}
                variant="outline"
              >
                {t('breeding:onlyMoves')}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
            <h3 className="text-xl font-semibold">{t('breeding:planApplied')}</h3>
            <p className="text-muted-foreground">
              {t('breeding:planAppliedDescription')}
            </p>
            <Button onClick={onClose}>
              {t('common:close')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}