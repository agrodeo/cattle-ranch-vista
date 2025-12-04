import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, Users, CheckCircle2, Loader2, ArrowRight, 
  Baby, Dna, Heart, Scale, Home, ChevronRight 
} from "lucide-react";

interface CorralOptimizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type ObjectiveType = 'consanguinity' | 'fertility' | 'weight';
type StepType = 'objective' | 'scope' | 'analyzing' | 'review' | 'preview';

interface Corral {
  id: string;
  name: string;
  capacity: number | null;
  animal_count: number;
}

interface SuggestedMove {
  animal_id: string;
  animal_name: string;
  from_corral_id: string | null;
  from_corral_name: string | null;
  to_corral_id: string;
  to_corral_name: string;
  reason: string;
  issue_type: 'consanguinity' | 'capacity' | 'separation' | 'fertility' | 'weight' | 'future_consanguinity';
  expectedBenefit?: string;
}

interface FutureRisk {
  animal1_id: string;
  animal1_name: string;
  animal1_age_months: number;
  animal2_id: string;
  animal2_name: string;
  animal2_age_months: number;
  relationship: string;
  corral_id: string;
  corral_name: string;
  months_until_active: number;
  warning: string;
  severity: 'severe' | 'medium' | 'low';
}

interface PreviewCorral {
  corral_id: string;
  corral_name: string;
  count: number;
  capacity: number | null;
  animals: string[];
}

export function CorralOptimizer({ open, onOpenChange, onSuccess }: CorralOptimizerProps) {
  const { t } = useTranslation(['corrals', 'common']);
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<StepType>("objective");
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveType | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  
  // Corral selection state
  const [corrals, setCorrals] = useState<Corral[]>([]);
  const [sourceCorrals, setSourceCorrals] = useState<Set<string>>(new Set());
  const [destinationCorrals, setDestinationCorrals] = useState<Set<string>>(new Set());
  
  // Results state
  const [suggestedMoves, setSuggestedMoves] = useState<SuggestedMove[]>([]);
  const [selectedMoves, setSelectedMoves] = useState<Set<string>>(new Set());
  const [expectedImprovement, setExpectedImprovement] = useState<string>('');
  const [riskMetrics, setRiskMetrics] = useState<{
    riskBefore?: string;
    riskAfter?: string;
    riskReduction?: string;
    risksResolved?: string;
    risksRemaining?: string;
    futureRisksDetected?: number;
    futureRisksMessage?: string;
  }>({});
  const [futureRisks, setFutureRisks] = useState<FutureRisk[]>([]);
  const [previewData, setPreviewData] = useState<{ before: PreviewCorral[]; after: PreviewCorral[] } | null>(null);
  
  // Breeding ratio configuration
  const [femalesPerBull, setFemalesPerBull] = useState(25);
  const [minBullsPerCorral, setMinBullsPerCorral] = useState(1);

  const objectives: { id: ObjectiveType; icon: any; color: string }[] = [
    { id: 'consanguinity', icon: Dna, color: 'text-purple-600' },
    { id: 'fertility', icon: Heart, color: 'text-pink-600' },
    { id: 'weight', icon: Scale, color: 'text-blue-600' },
  ];

  // Load corrals when dialog opens
  useEffect(() => {
    if (open && currentUser?.cabañaId) {
      loadCorrals();
    }
  }, [open, currentUser?.cabañaId]);

  const loadCorrals = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      const { data: corralsData, error } = await supabase
        .from('corrales')
        .select('id, name, capacity')
        .eq('cabaña_id', currentUser.cabañaId);

      if (error) throw error;

      // Count animals per corral
      const { data: animalsData } = await supabase
        .from('animals')
        .select('id, corral_id')
        .eq('cabaña_id', currentUser.cabañaId)
        .eq('status', 'activo');

      const animalCounts: Record<string, number> = {};
      (animalsData || []).forEach(animal => {
        if (animal.corral_id) {
          animalCounts[animal.corral_id] = (animalCounts[animal.corral_id] || 0) + 1;
        }
      });

      const corralsWithCounts = (corralsData || []).map(corral => ({
        ...corral,
        animal_count: animalCounts[corral.id] || 0,
      }));

      setCorrals(corralsWithCounts);
      // Initially select all corrals as both source and destination
      const allIds = new Set(corralsWithCounts.map(c => c.id));
      setSourceCorrals(allIds);
      setDestinationCorrals(allIds);
    } catch (error) {
      console.error('Error loading corrals:', error);
    }
  };

  const handleObjectiveSelect = (objective: ObjectiveType) => {
    setSelectedObjective(objective);
  };

  const handleContinueToScope = () => {
    if (!selectedObjective) return;
    setStep('scope');
  };

  const handleContinueToAnalyze = async () => {
    setStep('analyzing');
    await handleAnalyze();
  };

  const handleAnalyze = async () => {
    if (!currentUser?.cabañaId || !selectedObjective) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('optimize-corrals', {
        body: {
          cabanaId: currentUser.cabañaId,
          language: localStorage.getItem('language') || 'es',
          objective: selectedObjective,
          sourceCorrals: Array.from(sourceCorrals),
          destinationCorrals: Array.from(destinationCorrals),
          females_per_bull: femalesPerBull,
          min_bulls_per_corral: minBullsPerCorral,
        }
      });

      if (error) throw error;

      setSuggestedMoves(data.suggestedMoves || []);
      setExpectedImprovement(data.summary?.expectedImprovement || '');
      setRiskMetrics({
        riskBefore: data.summary?.riskBefore,
        riskAfter: data.summary?.riskAfter,
        riskReduction: data.summary?.riskReduction,
        risksResolved: data.summary?.risksResolved,
        risksRemaining: data.summary?.risksRemaining,
        futureRisksDetected: data.summary?.futureRisksDetected,
        futureRisksMessage: data.summary?.futureRisksMessage,
      });
      setFutureRisks(data.issues?.futureConsanguinity || []);
      setPreviewData(data.preview || null);
      
      // Select all moves by default
      const allMoveIds = new Set<string>((data.suggestedMoves || []).map((m: SuggestedMove) => m.animal_id));
      setSelectedMoves(allMoveIds);

      if (data.suggestedMoves && data.suggestedMoves.length > 0) {
        setStep('review');
      } else {
        toast({
          title: t('common:success.title'),
          description: t('corrals:optimizer.noIssuesFound'),
        });
        setStep('objective');
      }
    } catch (error: any) {
      console.error('Error analyzing corrals:', error);
      toast({
        title: t('common:error.title'),
        description: error.message || t('corrals:optimizer.analyzeError'),
        variant: "destructive",
      });
      setStep('objective');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToPreview = () => {
    // Generate client-side preview if not provided by API
    if (!previewData && corrals.length > 0) {
      const movesToApply = suggestedMoves.filter(m => selectedMoves.has(m.animal_id));
      
      const beforeState = corrals.map(c => ({
        corral_id: c.id,
        corral_name: c.name,
        count: c.animal_count,
        capacity: c.capacity,
        animals: [],
      }));

      const afterCounts: Record<string, number> = {};
      corrals.forEach(c => {
        afterCounts[c.id] = c.animal_count;
      });

      movesToApply.forEach(move => {
        if (move.from_corral_id && afterCounts[move.from_corral_id] !== undefined) {
          afterCounts[move.from_corral_id]--;
        }
        if (afterCounts[move.to_corral_id] !== undefined) {
          afterCounts[move.to_corral_id]++;
        }
      });

      const afterState = corrals.map(c => ({
        corral_id: c.id,
        corral_name: c.name,
        count: afterCounts[c.id] || 0,
        capacity: c.capacity,
        animals: [],
      }));

      setPreviewData({ before: beforeState, after: afterState });
    }
    
    setStep('preview');
  };

  const handleApply = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      setApplying(true);

      const movesToApply = suggestedMoves.filter(m => selectedMoves.has(m.animal_id));

      // Apply moves in batches
      for (const move of movesToApply) {
        const { error } = await supabase
          .from('animals')
          .update({ corral_id: move.to_corral_id })
          .eq('id', move.animal_id);

        if (error) throw error;
      }

      toast({
        title: t('common:success.title'),
        description: t('corrals:optimizer.successMessage', { count: movesToApply.length }),
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error applying moves:', error);
      toast({
        title: t('common:error.title'),
        description: error.message || t('corrals:optimizer.applyError'),
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    setStep('objective');
    setSelectedObjective(null);
    setSuggestedMoves([]);
    setSelectedMoves(new Set());
    setExpectedImprovement('');
    setRiskMetrics({});
    setFutureRisks([]);
    setPreviewData(null);
    setSourceCorrals(new Set());
    setDestinationCorrals(new Set());
    onOpenChange(false);
  };

  const toggleMove = (animalId: string) => {
    const newSelected = new Set(selectedMoves);
    if (newSelected.has(animalId)) {
      newSelected.delete(animalId);
    } else {
      newSelected.add(animalId);
    }
    setSelectedMoves(newSelected);
  };

  const toggleSourceCorral = (corralId: string) => {
    const newSet = new Set(sourceCorrals);
    if (newSet.has(corralId)) {
      newSet.delete(corralId);
    } else {
      newSet.add(corralId);
    }
    setSourceCorrals(newSet);
  };

  const toggleDestinationCorral = (corralId: string) => {
    const newSet = new Set(destinationCorrals);
    if (newSet.has(corralId)) {
      newSet.delete(corralId);
    } else {
      newSet.add(corralId);
    }
    setDestinationCorrals(newSet);
  };

  const selectAllCorrals = (type: 'source' | 'destination') => {
    const allIds = new Set(corrals.map(c => c.id));
    if (type === 'source') {
      setSourceCorrals(allIds);
    } else {
      setDestinationCorrals(allIds);
    }
  };

  const clearCorrals = (type: 'source' | 'destination') => {
    if (type === 'source') {
      setSourceCorrals(new Set());
    } else {
      setDestinationCorrals(new Set());
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'consanguinity': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'future_consanguinity': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'capacity': return <Users className="h-5 w-5" />;
      case 'separation': return <Baby className="h-5 w-5" />;
      case 'fertility': return <Heart className="h-5 w-5" />;
      case 'weight': return <Scale className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getOccupancyColor = (count: number, capacity: number | null) => {
    if (!capacity) return 'bg-blue-500';
    const percentage = (count / capacity) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Group moves by destination corral
  const movesByDestination = suggestedMoves
    .filter(m => selectedMoves.has(m.animal_id))
    .reduce((acc, move) => {
      if (!acc[move.to_corral_id]) {
        acc[move.to_corral_id] = {
          corral_name: move.to_corral_name,
          moves: [],
        };
      }
      acc[move.to_corral_id].moves.push(move);
      return acc;
    }, {} as Record<string, { corral_name: string; moves: SuggestedMove[] }>);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'objective' && t('corrals:optimizer.selectObjectiveTitle')}
            {step === 'scope' && t('corrals:optimizer.scope.title')}
            {step === 'analyzing' && t('corrals:optimizer.title')}
            {step === 'review' && t('corrals:optimizer.reviewTitle')}
            {step === 'preview' && t('corrals:optimizer.previewTitle')}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select Objective */}
        {step === 'objective' && (
          <div className="space-y-6">
            <p className="text-center text-muted-foreground">
              {t('corrals:optimizer.selectObjectiveSubtitle')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {objectives.map(({ id, icon: Icon, color }) => (
                <Card
                  key={id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedObjective === id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleObjectiveSelect(id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg bg-muted ${color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-base">
                        {t(`corrals:optimizer.objectives.${id}.title`)}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t(`corrals:optimizer.objectives.${id}.description`)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Breeding Ratio Configuration - shown after selecting objective */}
            {selectedObjective && (
              <Card className="mt-4 border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('corrals:optimizer.breedingConfig.title')}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t('corrals:optimizer.breedingConfig.hint')}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('corrals:optimizer.breedingConfig.femalesPerBull')}</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={femalesPerBull}
                        onChange={(e) => setFemalesPerBull(Math.max(1, Math.min(50, parseInt(e.target.value) || 25)))}
                        className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                      />
                      <p className="text-xs text-muted-foreground">{t('corrals:optimizer.breedingConfig.femalesPerBullHint')}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('corrals:optimizer.breedingConfig.minBullsPerCorral')}</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={minBullsPerCorral}
                        onChange={(e) => setMinBullsPerCorral(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                        className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                      />
                      <p className="text-xs text-muted-foreground">{t('corrals:optimizer.breedingConfig.minBullsHint')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleContinueToScope}
                disabled={!selectedObjective}
                size="lg"
              >
                {t('corrals:optimizer.continueButton')}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Scope (Corrals) */}
        {step === 'scope' && (
          <div className="space-y-6">
            <p className="text-center text-muted-foreground">
              {t('corrals:optimizer.scope.subtitle')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Source Corrals */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-1">{t('corrals:optimizer.scope.sourceCorrals')}</h3>
                  <p className="text-sm text-muted-foreground">{t('corrals:optimizer.scope.sourceDescription')}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => selectAllCorrals('source')}>
                    {t('corrals:optimizer.scope.selectAll')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => clearCorrals('source')}>
                    {t('corrals:optimizer.scope.selectNone')}
                  </Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                  {corrals.map(corral => (
                    <div
                      key={`source-${corral.id}`}
                      className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                      onClick={() => toggleSourceCorral(corral.id)}
                    >
                      <Checkbox
                        checked={sourceCorrals.has(corral.id)}
                        onCheckedChange={() => toggleSourceCorral(corral.id)}
                      />
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{corral.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('corrals:optimizer.scope.currentOccupancy', {
                            count: corral.animal_count,
                            capacity: corral.capacity || t('corrals:optimizer.scope.noCapacity'),
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destination Corrals */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-1">{t('corrals:optimizer.scope.destinationCorrals')}</h3>
                  <p className="text-sm text-muted-foreground">{t('corrals:optimizer.scope.destinationDescription')}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => selectAllCorrals('destination')}>
                    {t('corrals:optimizer.scope.selectAll')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => clearCorrals('destination')}>
                    {t('corrals:optimizer.scope.selectNone')}
                  </Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                  {corrals.map(corral => (
                    <div
                      key={`dest-${corral.id}`}
                      className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer"
                      onClick={() => toggleDestinationCorral(corral.id)}
                    >
                      <Checkbox
                        checked={destinationCorrals.has(corral.id)}
                        onCheckedChange={() => toggleDestinationCorral(corral.id)}
                      />
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{corral.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('corrals:optimizer.scope.currentOccupancy', {
                            count: corral.animal_count,
                            capacity: corral.capacity || t('corrals:optimizer.scope.noCapacity'),
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('objective')}
                className="flex-1"
              >
                {t('common:actions.back')}
              </Button>
              <Button
                onClick={handleContinueToAnalyze}
                disabled={sourceCorrals.size === 0 || destinationCorrals.size === 0}
                className="flex-1"
              >
                {t('corrals:optimizer.continueButton')}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Analyzing */}
        {step === 'analyzing' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">{t('corrals:optimizer.analyzing')}</h3>
              <p className="text-muted-foreground">
                {t('corrals:optimizer.subtitle')}
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review Movements */}
        {step === 'review' && (
          <div className="space-y-6">
            {/* Show selected objective */}
            {selectedObjective && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Badge variant="outline">
                  {t('corrals:optimizer.selectedObjective')}
                </Badge>
                <span className="font-medium">
                  {t(`corrals:optimizer.objectives.${selectedObjective}.title`)}
                </span>
              </div>
            )}

            {/* Expected improvement summary */}
            {expectedImprovement && (
              <Card className="bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-sm">
                    {t('corrals:optimizer.summary.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{expectedImprovement}</p>
                  
                  {/* Risk metrics for consanguinity objective */}
                  {selectedObjective === 'consanguinity' && (riskMetrics.riskBefore || riskMetrics.riskAfter) && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        {riskMetrics.riskBefore && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('corrals:optimizer.metrics.riskBefore')}</p>
                            <p className="text-lg font-bold text-red-600">{riskMetrics.riskBefore}</p>
                          </div>
                        )}
                        {riskMetrics.riskAfter && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{t('corrals:optimizer.metrics.riskAfter')}</p>
                            <p className="text-lg font-bold text-green-600">{riskMetrics.riskAfter}</p>
                          </div>
                        )}
                      </div>
                      
                      {riskMetrics.riskReduction && (
                        <div className="space-y-1 pt-2">
                          <p className="text-xs text-muted-foreground">{t('corrals:optimizer.metrics.riskReduction')}</p>
                          <p className="text-2xl font-bold text-primary">{riskMetrics.riskReduction}</p>
                        </div>
                      )}
                      
                      {(riskMetrics.risksResolved || riskMetrics.risksRemaining) && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          {riskMetrics.risksResolved && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">{t('corrals:optimizer.metrics.risksResolved')}</p>
                              <p className="text-sm font-medium">{riskMetrics.risksResolved}</p>
                            </div>
                          )}
                          {riskMetrics.risksRemaining && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">{t('corrals:optimizer.metrics.risksRemaining')}</p>
                              <p className="text-sm font-medium">{riskMetrics.risksRemaining}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Future Risks Warning */}
            {futureRisks.length > 0 && (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-sm text-amber-600">
                      {t('corrals:optimizer.futureRisks.title')}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('corrals:optimizer.futureRisks.description')}
                  </p>
                  <div className="space-y-2">
                    {futureRisks.slice(0, 5).map((risk, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 bg-amber-500/10 rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{risk.animal1_name}</span>
                          <span className="text-muted-foreground">↔</span>
                          <span className="font-medium">{risk.animal2_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-amber-600 border-amber-500/50">
                            {risk.months_until_active} {t('corrals:optimizer.futureRisks.monthsLeft')}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {risk.corral_name}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {futureRisks.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        {t('corrals:optimizer.futureRisks.andMore', { count: futureRisks.length - 5 })}
                      </p>
                    )}
                  </div>
                  {riskMetrics.futureRisksMessage && (
                    <p className="text-sm text-amber-600 mt-3 font-medium">
                      {riskMetrics.futureRisksMessage}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>{t('corrals:optimizer.suggestedMoves')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suggestedMoves.map((move) => (
                    <div key={move.animal_id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                      <Checkbox
                        checked={selectedMoves.has(move.animal_id)}
                        onCheckedChange={() => toggleMove(move.animal_id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getIssueIcon(move.issue_type)}
                          <span className="font-medium">{move.animal_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{move.from_corral_name || t('corrals:optimizer.unassigned')}</span>
                          <ArrowRight className="h-4 w-4" />
                          <span>{move.to_corral_name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{move.reason}</p>
                        {move.expectedBenefit && (
                          <p className="text-sm text-primary mt-1">
                            {t('corrals:optimizer.expectedBenefit')}: {move.expectedBenefit}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('corrals:optimizer.selectedMoves')}</span>
                    <span className="text-sm font-bold">{selectedMoves.size} / {suggestedMoves.length}</span>
                  </div>
                  <Progress value={(selectedMoves.size / suggestedMoves.length) * 100} />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('scope')}
                className="flex-1"
                disabled={applying}
              >
                {t('common:actions.back')}
              </Button>
              <Button
                onClick={handleContinueToPreview}
                disabled={selectedMoves.size === 0}
                className="flex-1"
              >
                {t('corrals:optimizer.continueButton')}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Preview & Apply */}
        {step === 'preview' && previewData && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-sm text-center">
                  {t('corrals:optimizer.preview.changesSummary', {
                    count: selectedMoves.size,
                    source: new Set(suggestedMoves.filter(m => selectedMoves.has(m.animal_id)).map(m => m.from_corral_id)).size,
                    dest: new Set(suggestedMoves.filter(m => selectedMoves.has(m.animal_id)).map(m => m.to_corral_id)).size,
                  })}
                </p>
              </CardContent>
            </Card>

            {/* Moves by Destination */}
            <Card>
              <CardHeader>
                <CardTitle>{t('corrals:optimizer.preview.byDestination')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(movesByDestination).map(([corralId, { corral_name, moves }]) => (
                    <div key={corralId} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Home className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">{corral_name}</h4>
                        <Badge variant="secondary">{moves.length} {moves.length === 1 ? 'animal' : 'animales'}</Badge>
                      </div>
                      <div className="space-y-2">
                        {moves.map(move => (
                          <div key={move.animal_id} className="text-sm flex items-center gap-2 text-muted-foreground">
                            <ChevronRight className="h-3 w-3" />
                            <span>{move.animal_name}</span>
                            <span className="text-xs">({move.from_corral_name || t('corrals:optimizer.unassigned')})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Before/After Visual Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('corrals:optimizer.preview.before')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {previewData.before.map(corral => (
                      <div key={corral.corral_id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{corral.corral_name}</span>
                          <span className="text-muted-foreground">
                            {corral.count} / {corral.capacity || '∞'}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${getOccupancyColor(corral.count, corral.capacity)}`}
                            style={{
                              width: corral.capacity ? `${Math.min((corral.count / corral.capacity) * 100, 100)}%` : '50%',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('corrals:optimizer.preview.after')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {previewData.after.map(corral => (
                      <div key={corral.corral_id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{corral.corral_name}</span>
                          <span className="text-muted-foreground">
                            {corral.count} / {corral.capacity || '∞'}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${getOccupancyColor(corral.count, corral.capacity)}`}
                            style={{
                              width: corral.capacity ? `${Math.min((corral.count / corral.capacity) * 100, 100)}%` : '50%',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('review')}
                className="flex-1"
                disabled={applying}
              >
                {t('common:actions.back')}
              </Button>
              <Button
                onClick={handleApply}
                disabled={applying || selectedMoves.size === 0}
                className="flex-1"
              >
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('corrals:optimizer.applying')}
                  </>
                ) : (
                  t('corrals:optimizer.applyButton', { count: selectedMoves.size })
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}