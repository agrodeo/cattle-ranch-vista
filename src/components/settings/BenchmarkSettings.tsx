import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHybridAuth } from "@/hooks/useHybridAuth";
import { useToast } from "@/hooks/use-toast";
import { type CustomBenchmark } from "@/lib/breedBenchmarks";

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
};

export const BenchmarkSettings = () => {
  const { currentUser } = useHybridAuth();
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
        title: "Error",
        description: "No se pudieron cargar los benchmarks personalizados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBreeds = async () => {
    try {
      const { data, error } = await supabase
        .from("animals")
        .select("breed")
        .eq("cabaña_id", profile?.cabaña_id)
        .not("breed", "is", null);

      if (error) throw error;
      
      const breeds = [...new Set(data?.map(a => a.breed).filter(Boolean))] as string[];
      setAvailableBreeds(breeds);
    } catch (error) {
      console.error("Error fetching breeds:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.cabaña_id) return;

    setSaving(true);
    try {
      const benchmarkData = {
        cabaña_id: profile.cabaña_id,
        ...formData,
      };

      if (editingId) {
        const { error } = await supabase
          .from("custom_benchmarks")
          .update(benchmarkData)
          .eq("id", editingId);

        if (error) throw error;
        toast({
          title: "Éxito",
          description: "Benchmark actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from("custom_benchmarks")
          .insert(benchmarkData);

        if (error) throw error;
        toast({
          title: "Éxito",
          description: "Benchmark creado correctamente",
        });
      }

      resetForm();
      fetchCustomBenchmarks();
    } catch (error: any) {
      console.error("Error saving benchmark:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el benchmark",
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
        title: "Éxito",
        description: "Benchmark eliminado correctamente",
      });
      fetchCustomBenchmarks();
    } catch (error: any) {
      console.error("Error deleting benchmark:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el benchmark",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingId(null);
  };

  if (loading) {
    return <div className="text-center p-8">Cargando configuración de benchmarks...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Current Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle>Benchmarks Personalizados</CardTitle>
        </CardHeader>
        <CardContent>
          {customBenchmarks.length > 0 ? (
            <div className="space-y-4">
              {customBenchmarks.map((benchmark) => (
                <div key={benchmark.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {benchmark.breed || "Benchmarks Generales"}
                      </h4>
                      {!benchmark.breed && (
                        <Badge variant="secondary">Por defecto</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Nacer: {benchmark.birth_weight_excellent}kg (exc) / {benchmark.birth_weight_good}kg (bueno) |
                      Destete: {benchmark.weaning_weight_excellent}kg (exc) / {benchmark.weaning_weight_good}kg (bueno) |
                      Ganancia: {benchmark.daily_gain_excellent}kg/día (exc)
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(benchmark)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(benchmark.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No hay benchmarks personalizados configurados. Se utilizarán los benchmarks por defecto del sistema.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>
            {editingId ? "Editar Benchmark" : "Agregar Benchmark Personalizado"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="breed">Raza</Label>
              <Select
                value={formData.breed || "default"}
                onValueChange={(value) => 
                  setFormData({ ...formData, breed: value === "default" ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar raza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Benchmarks Generales (Todas las razas)</SelectItem>
                  {availableBreeds.map((breed) => (
                    <SelectItem key={breed} value={breed}>
                      {breed}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Birth Weight */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="birth_weight_excellent">Peso Nacer - Excelente (kg)</Label>
                <Input
                  id="birth_weight_excellent"
                  type="number"
                  step="0.1"
                  value={formData.birth_weight_excellent}
                  onChange={(e) => 
                    setFormData({ ...formData, birth_weight_excellent: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="birth_weight_good">Peso Nacer - Bueno (kg)</Label>
                <Input
                  id="birth_weight_good"
                  type="number"
                  step="0.1"
                  value={formData.birth_weight_good}
                  onChange={(e) => 
                    setFormData({ ...formData, birth_weight_good: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="birth_weight_poor">Peso Nacer - Mínimo (kg)</Label>
                <Input
                  id="birth_weight_poor"
                  type="number"
                  step="0.1"
                  value={formData.birth_weight_poor}
                  onChange={(e) => 
                    setFormData({ ...formData, birth_weight_poor: Number(e.target.value) })
                  }
                  required
                />
              </div>
            </div>

            {/* Weaning Weight */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="weaning_weight_excellent">Peso Destete - Excelente (kg)</Label>
                <Input
                  id="weaning_weight_excellent"
                  type="number"
                  step="0.1"
                  value={formData.weaning_weight_excellent}
                  onChange={(e) => 
                    setFormData({ ...formData, weaning_weight_excellent: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="weaning_weight_good">Peso Destete - Bueno (kg)</Label>
                <Input
                  id="weaning_weight_good"
                  type="number"
                  step="0.1"
                  value={formData.weaning_weight_good}
                  onChange={(e) => 
                    setFormData({ ...formData, weaning_weight_good: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="weaning_weight_poor">Peso Destete - Mínimo (kg)</Label>
                <Input
                  id="weaning_weight_poor"
                  type="number"
                  step="0.1"
                  value={formData.weaning_weight_poor}
                  onChange={(e) => 
                    setFormData({ ...formData, weaning_weight_poor: Number(e.target.value) })
                  }
                  required
                />
              </div>
            </div>

            {/* Daily Gain */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="daily_gain_excellent">Ganancia Diaria - Excelente (kg/día)</Label>
                <Input
                  id="daily_gain_excellent"
                  type="number"
                  step="0.01"
                  value={formData.daily_gain_excellent}
                  onChange={(e) => 
                    setFormData({ ...formData, daily_gain_excellent: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="daily_gain_good">Ganancia Diaria - Buena (kg/día)</Label>
                <Input
                  id="daily_gain_good"
                  type="number"
                  step="0.01"
                  value={formData.daily_gain_good}
                  onChange={(e) => 
                    setFormData({ ...formData, daily_gain_good: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="daily_gain_poor">Ganancia Diaria - Mínima (kg/día)</Label>
                <Input
                  id="daily_gain_poor"
                  type="number"
                  step="0.01"
                  value={formData.daily_gain_poor}
                  onChange={(e) => 
                    setFormData({ ...formData, daily_gain_poor: Number(e.target.value) })
                  }
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};