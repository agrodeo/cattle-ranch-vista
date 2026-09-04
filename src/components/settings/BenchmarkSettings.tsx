import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAll";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";

interface BenchmarkFormData {
  breed: string | null;
  birth_weight_excellent: number;
  birth_weight_good: number;
  birth_weight_poor: number;
  weaning_weight_excellent: number;
  weaning_weight_good: number;
  weaning_weight_poor: number;
  daily_gain_excellent: number;
  daily_gain_good: number;
  daily_gain_poor: number;
  final_weight_excellent: number;
  final_weight_good: number;
  final_weight_poor: number;
  scrotal_circumference_excellent: number;
  scrotal_circumference_good: number;
  scrotal_circumference_poor: number;
  horn_preference: string;
}

interface CustomBenchmark extends BenchmarkFormData {
  id: string;
  cabaña_id: string;
}

const DEFAULT_FORM_DATA: BenchmarkFormData = {
  breed: null,
  birth_weight_excellent: 35,
  birth_weight_good: 30,
  birth_weight_poor: 28,
  weaning_weight_excellent: 200,
  weaning_weight_good: 180,
  weaning_weight_poor: 160,
  daily_gain_excellent: 0.8,
  daily_gain_good: 0.7,
  daily_gain_poor: 0.6,
  final_weight_excellent: 450,
  final_weight_good: 420,
  final_weight_poor: 380,
  scrotal_circumference_excellent: 38,
  scrotal_circumference_good: 35,
  scrotal_circumference_poor: 32,
  horn_preference: 'any',
};

export const BenchmarkSettings = () => {
  const { t } = useTranslation(['common', 'settings']);
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  const [customBenchmarks, setCustomBenchmarks] = useState<CustomBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<BenchmarkFormData>(DEFAULT_FORM_DATA);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availableBreeds, setAvailableBreeds] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchCustomBenchmarks();
      fetchAvailableBreeds();
    }
  }, [currentUser]);

  const fetchCustomBenchmarks = async () => {
    try {
      const { data, error } = await supabase
        .from("custom_benchmarks")
        .select("*")
        .eq("cabaña_id", currentUser?.cabañaId)
        .order("breed", { nullsFirst: false });

      if (error) throw error;
      setCustomBenchmarks(data || []);
    } catch (error) {
      console.error("Error fetching custom benchmarks:", error);
      toast({
        title: t('common:error.title'),
        description: t('common:error.loadFailed'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBreeds = async () => {
    try {
      const data = await fetchAllRows<{ breed: string | null }>((from, to) =>
        supabase
          .from("animals")
          .select("breed")
          .eq("cabaña_id", currentUser?.cabañaId)
          .not("breed", "is", null)
          .range(from, to)
      );

      const breeds = [...new Set(data.map(a => a.breed).filter(Boolean))] as string[];
      setAvailableBreeds(breeds);
    } catch (error) {
      console.error("Error fetching breeds:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.cabañaId) return;

    setSaving(true);
    try {
      const benchmarkData = {
        cabaña_id: currentUser.cabañaId,
        ...formData,
      };

      if (editingId) {
        const { error } = await supabase
          .from("custom_benchmarks")
          .update(benchmarkData)
          .eq("id", editingId);

        if (error) throw error;
        toast({
          title: t('common:success'),
          description: t('settings:benchmarks.benchmarkUpdated'),
        });
      } else {
        const { error } = await supabase
          .from("custom_benchmarks")
          .insert(benchmarkData);

        if (error) throw error;
        toast({
          title: t('common:success'),
          description: t('settings:benchmarks.benchmarkSaved'),
        });
      }

      resetForm();
      fetchCustomBenchmarks();
    } catch (error: any) {
      console.error("Error saving benchmark:", error);
      toast({
        title: t('common:error.title'),
        description: error.message || t('settings:benchmarks.errorSaving'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (benchmark: CustomBenchmark) => {
    setFormData({
      breed: benchmark.breed,
      birth_weight_excellent: benchmark.birth_weight_excellent,
      birth_weight_good: benchmark.birth_weight_good,
      birth_weight_poor: benchmark.birth_weight_poor,
      weaning_weight_excellent: benchmark.weaning_weight_excellent,
      weaning_weight_good: benchmark.weaning_weight_good,
      weaning_weight_poor: benchmark.weaning_weight_poor,
      daily_gain_excellent: benchmark.daily_gain_excellent,
      daily_gain_good: benchmark.daily_gain_good,
      daily_gain_poor: benchmark.daily_gain_poor,
      final_weight_excellent: benchmark.final_weight_excellent ?? 450,
      final_weight_good: benchmark.final_weight_good ?? 420,
      final_weight_poor: benchmark.final_weight_poor ?? 380,
      scrotal_circumference_excellent: benchmark.scrotal_circumference_excellent ?? 38,
      scrotal_circumference_good: benchmark.scrotal_circumference_good ?? 35,
      scrotal_circumference_poor: benchmark.scrotal_circumference_poor ?? 32,
      horn_preference: benchmark.horn_preference ?? 'any',
    });
    setEditingId(benchmark.id);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("custom_benchmarks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: t('common:success'),
        description: t('settings:benchmarks.benchmarkDeleted'),
      });
      fetchCustomBenchmarks();
    } catch (error: any) {
      console.error("Error deleting benchmark:", error);
      toast({
        title: t('common:error.title'),
        description: t('settings:benchmarks.errorDeleting'),
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingId(null);
  };

  if (loading) {
    return <div className="text-center p-8">{t('settings:benchmarks.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:benchmarks.customBenchmarks')}</CardTitle>
        </CardHeader>
        <CardContent>
          {customBenchmarks.length > 0 ? (
            <div className="space-y-4">
              {customBenchmarks.map((benchmark) => (
                <div key={benchmark.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">
                        {benchmark.breed || t('settings:benchmarks.noBenchmarks')}
                      </h4>
                      {!benchmark.breed && (
                        <Badge variant="secondary">{t('common:default')}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2 space-y-1">
                      <div>
                        {t('settings:benchmarks.birthWeight')}: {benchmark.birth_weight_excellent}kg ({t('settings:benchmarks.excellent').toLowerCase()}) / {benchmark.birth_weight_good}kg ({t('settings:benchmarks.good').toLowerCase()})
                      </div>
                      <div>
                        {t('settings:benchmarks.weaningWeight')}: {benchmark.weaning_weight_excellent}kg ({t('settings:benchmarks.excellent').toLowerCase()}) / {benchmark.weaning_weight_good}kg ({t('settings:benchmarks.good').toLowerCase()})
                      </div>
                      <div>
                        {t('settings:benchmarks.finalWeight')}: {benchmark.final_weight_excellent ?? 450}kg ({t('settings:benchmarks.excellent').toLowerCase()}) / {benchmark.final_weight_good ?? 420}kg ({t('settings:benchmarks.good').toLowerCase()})
                      </div>
                      <div>
                        {t('settings:benchmarks.dailyGain')}: {benchmark.daily_gain_excellent}kg/día ({t('settings:benchmarks.excellent').toLowerCase()})
                      </div>
                      <div>
                        {t('settings:benchmarks.scrotalCircumference')}: {benchmark.scrotal_circumference_excellent ?? 38}cm ({t('settings:benchmarks.excellent').toLowerCase()})
                      </div>
                      <div>
                        {t('settings:benchmarks.hornPreference')}: {t(`settings:benchmarks.horn_${benchmark.horn_preference ?? 'any'}`)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:flex-col lg:flex-row">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(benchmark)}
                      className="flex-1 sm:flex-none"
                    >
                      {t('settings:benchmarks.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(benchmark.id)}
                      className="flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              {t('settings:benchmarks.noBenchmarks')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? t('settings:benchmarks.editBenchmark') : t('settings:benchmarks.addBenchmark')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Breed Selection */}
            <div>
              <Label htmlFor="breed">{t('settings:benchmarks.breed')}</Label>
              <Select
                value={formData.breed || "default"}
                onValueChange={(value) => 
                  setFormData({ ...formData, breed: value === "default" ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('settings:benchmarks.selectBreed')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t('settings:benchmarks.noBenchmarks')}</SelectItem>
                  {availableBreeds.map((breed) => (
                    <SelectItem key={breed} value={breed}>
                      {breed}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Birth Weight */}
            <div>
              <Label className="text-base font-semibold">{t('settings:benchmarks.birthWeight')} (kg)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="birth_weight_excellent" className="text-sm text-muted-foreground">{t('settings:benchmarks.excellent')}</Label>
                  <Input
                    id="birth_weight_excellent"
                    type="number"
                    step="0.1"
                    value={formData.birth_weight_excellent}
                    onChange={(e) => setFormData({ ...formData, birth_weight_excellent: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="birth_weight_good" className="text-sm text-muted-foreground">{t('settings:benchmarks.good')}</Label>
                  <Input
                    id="birth_weight_good"
                    type="number"
                    step="0.1"
                    value={formData.birth_weight_good}
                    onChange={(e) => setFormData({ ...formData, birth_weight_good: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="birth_weight_poor" className="text-sm text-muted-foreground">{t('settings:benchmarks.poor')}</Label>
                  <Input
                    id="birth_weight_poor"
                    type="number"
                    step="0.1"
                    value={formData.birth_weight_poor}
                    onChange={(e) => setFormData({ ...formData, birth_weight_poor: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Weaning Weight */}
            <div>
              <Label className="text-base font-semibold">{t('settings:benchmarks.weaningWeight')} (kg)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="weaning_weight_excellent" className="text-sm text-muted-foreground">{t('settings:benchmarks.excellent')}</Label>
                  <Input
                    id="weaning_weight_excellent"
                    type="number"
                    step="0.1"
                    value={formData.weaning_weight_excellent}
                    onChange={(e) => setFormData({ ...formData, weaning_weight_excellent: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="weaning_weight_good" className="text-sm text-muted-foreground">{t('settings:benchmarks.good')}</Label>
                  <Input
                    id="weaning_weight_good"
                    type="number"
                    step="0.1"
                    value={formData.weaning_weight_good}
                    onChange={(e) => setFormData({ ...formData, weaning_weight_good: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="weaning_weight_poor" className="text-sm text-muted-foreground">{t('settings:benchmarks.poor')}</Label>
                  <Input
                    id="weaning_weight_poor"
                    type="number"
                    step="0.1"
                    value={formData.weaning_weight_poor}
                    onChange={(e) => setFormData({ ...formData, weaning_weight_poor: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Final Weight */}
            <div>
              <Label className="text-base font-semibold">{t('settings:benchmarks.finalWeight')} (kg)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="final_weight_excellent" className="text-sm text-muted-foreground">{t('settings:benchmarks.excellent')}</Label>
                  <Input
                    id="final_weight_excellent"
                    type="number"
                    step="0.1"
                    value={formData.final_weight_excellent}
                    onChange={(e) => setFormData({ ...formData, final_weight_excellent: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="final_weight_good" className="text-sm text-muted-foreground">{t('settings:benchmarks.good')}</Label>
                  <Input
                    id="final_weight_good"
                    type="number"
                    step="0.1"
                    value={formData.final_weight_good}
                    onChange={(e) => setFormData({ ...formData, final_weight_good: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="final_weight_poor" className="text-sm text-muted-foreground">{t('settings:benchmarks.poor')}</Label>
                  <Input
                    id="final_weight_poor"
                    type="number"
                    step="0.1"
                    value={formData.final_weight_poor}
                    onChange={(e) => setFormData({ ...formData, final_weight_poor: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Daily Gain */}
            <div>
              <Label className="text-base font-semibold">{t('settings:benchmarks.dailyGain')} (kg/día)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="daily_gain_excellent" className="text-sm text-muted-foreground">{t('settings:benchmarks.excellent')}</Label>
                  <Input
                    id="daily_gain_excellent"
                    type="number"
                    step="0.01"
                    value={formData.daily_gain_excellent}
                    onChange={(e) => setFormData({ ...formData, daily_gain_excellent: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="daily_gain_good" className="text-sm text-muted-foreground">{t('settings:benchmarks.good')}</Label>
                  <Input
                    id="daily_gain_good"
                    type="number"
                    step="0.01"
                    value={formData.daily_gain_good}
                    onChange={(e) => setFormData({ ...formData, daily_gain_good: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="daily_gain_poor" className="text-sm text-muted-foreground">{t('settings:benchmarks.poor')}</Label>
                  <Input
                    id="daily_gain_poor"
                    type="number"
                    step="0.01"
                    value={formData.daily_gain_poor}
                    onChange={(e) => setFormData({ ...formData, daily_gain_poor: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Scrotal Circumference */}
            <div>
              <Label className="text-base font-semibold">{t('settings:benchmarks.scrotalCircumference')} (cm)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="scrotal_circumference_excellent" className="text-sm text-muted-foreground">{t('settings:benchmarks.excellent')}</Label>
                  <Input
                    id="scrotal_circumference_excellent"
                    type="number"
                    step="0.1"
                    value={formData.scrotal_circumference_excellent}
                    onChange={(e) => setFormData({ ...formData, scrotal_circumference_excellent: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="scrotal_circumference_good" className="text-sm text-muted-foreground">{t('settings:benchmarks.good')}</Label>
                  <Input
                    id="scrotal_circumference_good"
                    type="number"
                    step="0.1"
                    value={formData.scrotal_circumference_good}
                    onChange={(e) => setFormData({ ...formData, scrotal_circumference_good: Number(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="scrotal_circumference_poor" className="text-sm text-muted-foreground">{t('settings:benchmarks.poor')}</Label>
                  <Input
                    id="scrotal_circumference_poor"
                    type="number"
                    step="0.1"
                    value={formData.scrotal_circumference_poor}
                    onChange={(e) => setFormData({ ...formData, scrotal_circumference_poor: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Horn Preference */}
            <div>
              <Label htmlFor="horn_preference" className="text-base font-semibold">{t('settings:benchmarks.hornPreference')}</Label>
              <Select
                value={formData.horn_preference}
                onValueChange={(value) => setFormData({ ...formData, horn_preference: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('settings:benchmarks.horn_any')}</SelectItem>
                  <SelectItem value="polled">{t('settings:benchmarks.horn_polled')}</SelectItem>
                  <SelectItem value="horned">{t('settings:benchmarks.horn_horned')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                <Save className="h-4 w-4 mr-2" />
                {saving ? t('common:saving') : editingId ? t('settings:benchmarks.update') : t('settings:benchmarks.save')}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">
                  {t('settings:benchmarks.cancel')}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};