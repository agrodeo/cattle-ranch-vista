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
import { supabase } from "@/integrations/supabase/client";
import { Brain, Target, CheckCircle, AlertTriangle, HelpCircle, Settings, Info } from "lucide-react";
import { toast } from "sonner";
import { useBenchmarks } from "@/hooks/useBenchmarks";

interface Pairing {
  cow_id: string;
  bull_id: string;
  cow_name: string;
  bull_name: string;
  score: number;
  inbreeding_F: number;
  blocked: boolean;
  predicted: {
    birth_weight?: number;
    weaning_weight?: number;
    final_weight?: number;
    ce_cm?: number;
  };
  explain: string;
  detailed_explanation: {
    genetic_merit: string;
    inbreeding_risk: string;
    predicted_performance: string;
    recommendation: string;
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

  // Step 1: Configuration - load from settings
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

  // Load targets from settings when dialog opens
  useEffect(() => {
    if (isOpen && !benchmarksLoading) {
      const targets = getBreedingTargets();
      setConfig(prev => ({
        ...prev,
        targets
      }));
    }
  }, [isOpen, benchmarksLoading, getBreedingTargets]);

  // Reset state when dialog closes
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

  const getRiskBadge = (F: number) => {
    if (F <= 0.015) return <Badge variant="default" className="bg-green-100 text-green-800">{t('breeding:lowRisk')}</Badge>;
    if (F <= 0.03) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">{t('breeding:moderateRisk')}</Badge>;
    if (F <= 0.0625) return <Badge variant="default" className="bg-orange-100 text-orange-800">{t('breeding:highRisk')}</Badge>;
    return <Badge variant="destructive">{t('breeding:criticalRisk')}</Badge>;
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
            <Brain className="h-5 w-5" />
            {t('breeding:planningStepTitle', { step })}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            {/* Benchmark Settings Notice */}
            {!hasBenchmarks && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
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
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
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
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t('breeding:planPreview', { season: plan.season })}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('breeding:suggestedPairingsCount', { count: plan.pairings.length })}
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

            {/* Pairings Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t('breeding:suggestedPairings')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <TooltipProvider>
                    {plan.pairings.slice(0, 10).map((pairing, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="font-medium">{pairing.cow_name}</span>
                            <span className="mx-2 text-muted-foreground">×</span>
                            <span className="font-medium">{pairing.bull_name}</span>
                          </div>
                          {getRiskBadge(pairing.inbreeding_F)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {t('breeding:score', { score: (pairing.score * 100).toFixed(0) })}
                          </Badge>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">
                              <div className="space-y-2">
                                <p className="font-medium">{pairing.detailed_explanation.recommendation}</p>
                                <p className="text-sm">{pairing.detailed_explanation.genetic_merit}</p>
                                <p className="text-sm">{pairing.detailed_explanation.inbreeding_risk}</p>
                                <p className="text-sm">{pairing.detailed_explanation.predicted_performance}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </TooltipProvider>
                  {plan.pairings.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      {t('breeding:morePairings', { count: plan.pairings.length - 10 })}
                    </p>
                  )}
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
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            {t('breeding:capacityOk')}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            {t('breeding:overCapacity')}
                          </Badge>
                        )}
                        {corral.ratio_ok ? (
                          <Badge variant="default" className="bg-blue-100 text-blue-800">
                            {t('breeding:ratioOk')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
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
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h3 className="text-xl font-semibold">{t('breeding:planCompletedTitle')}</h3>
            <p className="text-muted-foreground">
              {t('breeding:planCompletedDesc')}
            </p>
            <Button onClick={onClose}>{t('breeding:close')}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
