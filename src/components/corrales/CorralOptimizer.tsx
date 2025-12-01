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
import { AlertTriangle, Users, CheckCircle2, Loader2, ArrowRight, Baby } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CorralOptimizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

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
  issue_type: 'consanguinity' | 'capacity' | 'separation';
  paired_with?: string;
}

export function CorralOptimizer({ open, onOpenChange, onSuccess }: CorralOptimizerProps) {
  const { t } = useTranslation(['corrals', 'common']);
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'issues' | 'review'>("issues");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [issues, setIssues] = useState<Issue | null>(null);
  const [suggestedMoves, setSuggestedMoves] = useState<SuggestedMove[]>([]);
  const [selectedMoves, setSelectedMoves] = useState<Set<string>>(new Set());
  const [totalIssues, setTotalIssues] = useState(0);

  const handleAnalyze = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('optimize-corrals', {
        body: {
          cabanaId: currentUser.cabañaId,
          language: localStorage.getItem('language') || 'es',
        }
      });

      if (error) throw error;

      setIssues(data.issues);
      setSuggestedMoves(data.suggestedMoves || []);
      setTotalIssues(data.totalIssues || 0);
      
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
      }
    } catch (error: any) {
      console.error('Error analyzing corrals:', error);
      toast({
        title: t('common:error.title'),
        description: error.message || t('corrals:optimizer.analyzeError'),
        variant: "destructive",
      });
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
    setStep('issues');
    setIssues(null);
    setSuggestedMoves([]);
    setSelectedMoves(new Set());
    setTotalIssues(0);
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'consanguinity': return <AlertTriangle className="h-5 w-5" />;
      case 'capacity': return <Users className="h-5 w-5" />;
      case 'separation': return <Baby className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'issues' ? t('corrals:optimizer.title') : t('corrals:optimizer.reviewTitle')}
          </DialogTitle>
        </DialogHeader>

        {step === 'issues' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('corrals:optimizer.description')}</h3>
              <p className="text-muted-foreground mb-6">{t('corrals:optimizer.subtitle')}</p>
              
              <Button
                onClick={handleAnalyze}
                disabled={loading}
                size="lg"
                className="min-w-[200px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('corrals:optimizer.analyzing')}
                  </>
                ) : (
                  t('corrals:optimizer.analyzeButton')
                )}
              </Button>
            </div>

            {issues && totalIssues > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('corrals:optimizer.issuesFound')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {issues.consanguinity.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <span className="font-medium">{t('corrals:optimizer.consanguinityRisks')}</span>
                      </div>
                      <Badge variant="destructive">{issues.consanguinity.length}</Badge>
                    </div>
                  )}
                  
                  {issues.capacity.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-amber-600" />
                        <span className="font-medium">{t('corrals:optimizer.capacityIssues')}</span>
                      </div>
                      <Badge variant="secondary" className="bg-amber-600 text-white">{issues.capacity.length}</Badge>
                    </div>
                  )}
                  
                  {issues.separation.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Baby className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">{t('corrals:optimizer.separationIssues')}</span>
                      </div>
                      <Badge className="bg-blue-600">{issues.separation.length}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-6">
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
                onClick={() => setStep('issues')}
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
