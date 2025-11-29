import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, TrendingUp, Plus, Target } from "lucide-react";
import { useActivities } from "@/hooks/useActivities";
import { useHerdWeightSummary } from "@/hooks/useHerdWeightSummary";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { NewWeighingDialog } from "./NewWeighingDialog";
import { BulkWeighingUpload } from "./BulkWeighingUpload";
import { WeighingMethodSelector } from "./WeighingMethodSelector";
import { useTranslation } from 'react-i18next';

export function WeighingManager() {
  const { stats } = useActivities();
  const { user } = useSupabaseAuth();
  const { t } = useTranslation('activities');
  const [cabanaId, setCabanaId] = useState<string | null>(null);
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [showWeighingDialog, setShowWeighingDialog] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Fetch cabana ID
  useEffect(() => {
    const fetchCabana = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('cabana_id: "cabaña_id"')
        .eq('user_id', user.id)
        .single();
      
      if (data?.cabana_id) {
        setCabanaId(data.cabana_id as string);
      }
    };
    
    fetchCabana();
  }, [user]);

  const { summary, isLoading: summaryLoading } = useHerdWeightSummary(
    cabanaId || '',
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
    new Date()
  );

  const handleSelectManual = () => {
    setShowMethodSelector(false);
    setShowWeighingDialog(true);
  };

  const handleSelectBulk = () => {
    setShowMethodSelector(false);
    setShowBulkUpload(true);
  };
  
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('managers.weighing.averageWeight')}</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : `${summary?.peso_promedio?.toFixed(1) || 0} kg`}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('managers.weighing.currentHerd')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('managers.weighing.averageDailyGain')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryLoading ? '...' : `${summary?.ganancia_diaria_promedio?.toFixed(3) || 0} kg/día`}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('managers.weighing.last90Days')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('managers.weighing.animalsWeighed')}</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : summary?.animales_pesados || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('managers.weighing.last90Days')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('managers.weighing.totalWeighings')}</CardTitle>
            <div className="h-4 w-4 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : summary?.total_weighings || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('managers.weighing.last90Days')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h4 className="text-lg font-medium mb-2">{t('managers.weighing.systemTitle')}</h4>
            <p className="mb-4">
              {t('managers.weighing.systemDescription')}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setShowMethodSelector(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('managers.weighing.registerWeighing')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <WeighingMethodSelector
        open={showMethodSelector}
        onOpenChange={setShowMethodSelector}
        onSelectManual={handleSelectManual}
        onSelectBulk={handleSelectBulk}
      />

      <NewWeighingDialog
        open={showWeighingDialog}
        onOpenChange={setShowWeighingDialog}
        onSuccess={() => setShowWeighingDialog(false)}
      />

      <BulkWeighingUpload
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onSuccess={() => setShowBulkUpload(false)}
      />
    </div>
  );
}