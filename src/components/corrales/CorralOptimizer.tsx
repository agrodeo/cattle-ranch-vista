import { useState } from "react";
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
import { AlertTriangle, Users, CheckCircle2, Loader2, ArrowRight, Baby, Dna, Heart, Scale } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CorralOptimizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type ObjectiveType = 'consanguinity' | 'fertility' | 'weight';

interface Issue {
  consanguinity: any[];
  capacity: any[];
  separation: any[];
}

interface SuggestedMove {
  animal_id: string;
  animal_name: string;
  from_corral_id: string | null;
  from_corral_name: string | null;
  to_corral_id: string;
  to_corral_name: string;
  reason: string;
  issue_type: 'consanguinity' | 'capacity' | 'separation' | 'fertility' | 'weight';
  paired_with?: string;
  expectedBenefit?: string;
}

export function CorralOptimizer({ open, onOpenChange, onSuccess }: CorralOptimizerProps) {
  const { t } = useTranslation(['corrals', 'common']);
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'objective' | 'analyzing' | 'review'>("objective");
  const [selectedObjective, setSelectedObjective] = useState<ObjectiveType | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [issues, setIssues] = useState<Issue | null>(null);
  const [suggestedMoves, setSuggestedMoves] = useState<SuggestedMove[]>([]);
  const [selectedMoves, setSelectedMoves] = useState<Set<string>>(new Set());
  const [totalIssues, setTotalIssues] = useState(0);
  const [expectedImprovement, setExpectedImprovement] = useState<string>('');

  const objectives: { id: ObjectiveType; icon: any; color: string }[] = [
    { id: 'consanguinity', icon: Dna, color: 'text-purple-600' },
    { id: 'fertility', icon: Heart, color: 'text-pink-600' },
    { id: 'weight', icon: Scale, color: 'text-blue-600' },
  ];

  const handleObjectiveSelect = (objective: ObjectiveType) => {
    setSelectedObjective(objective);
  };

  const handleContinue = async () => {
    if (!selectedObjective) return;
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
        }
      });

      if (error) throw error;

      setIssues(data.issues);
      setSuggestedMoves(data.suggestedMoves || []);
      setTotalIssues(data.totalIssues || 0);
      setExpectedImprovement(data.summary?.expectedImprovement || '');
      
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
    setIssues(null);
    setSuggestedMoves([]);
    setSelectedMoves(new Set());
    setTotalIssues(0);
    setExpectedImprovement('');
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

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'consanguinity': return <AlertTriangle className="h-5 w-5" />;
      case 'capacity': return <Users className="h-5 w-5" />;
      case 'separation': return <Baby className="h-5 w-5" />;
      case 'fertility': return <Heart className="h-5 w-5" />;
      case 'weight': return <Scale className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'objective' && t('corrals:optimizer.selectObjectiveTitle')}
            {step === 'analyzing' && t('corrals:optimizer.title')}
            {step === 'review' && t('corrals:optimizer.reviewTitle')}
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
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg bg-muted ${color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">
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

            <div className="flex justify-end">
              <Button
                onClick={handleContinue}
                disabled={!selectedObjective}
                size="lg"
              >
                {t('corrals:optimizer.continueButton')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Analyzing */}
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

        {/* Step 3: Review Movements */}
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
                <CardContent>
                  <p className="text-sm">{expectedImprovement}</p>
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
                onClick={() => setStep('objective')}
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