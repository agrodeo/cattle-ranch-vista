import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Eye, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface BulkMoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cabanaId: string;
}

interface MovePreview {
  animals_to_move: number;
  animals_found: Array<{
    id: string;
    tag: string;
    name: string;
    sex: string;
    current_corral: string;
  }>;
  target_corral: {
    id: string;
    name: string;
    current_count: number;
    new_count: number;
    capacity: number;
    capacity_ok: boolean;
    utilization_pct: number;
  };
  conflicts: string[];
}

export function BulkMoveDialog({ isOpen, onClose, cabanaId }: BulkMoveDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: filters, 2: preview, 3: result
  const [corrals, setCorrales] = useState<any[]>([]);
  const [preview, setPreview] = useState<MovePreview | null>(null);

  const [filters, setFilters] = useState({
    sex: '',
    category: '',
    age_from: '',
    age_to: '',
    current_corral_ids: [] as string[]
  });

  const [targetCorralId, setTargetCorralId] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCorrals();
    }
  }, [isOpen]);

  const fetchCorrals = async () => {
    try {
      const { data, error } = await supabase
        .from('corrales')
        .select('*')
        .eq('cabaña_id', cabanaId)
        .order('name');

      if (error) throw error;
      setCorrales(data || []);
    } catch (error) {
      console.error('Error fetching corrals:', error);
      toast.error("Error al cargar corrales");
    }
  };

  const generatePreview = async () => {
    if (!targetCorralId) {
      toast.error("Selecciona un corral destino");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-move-animals', {
        body: {
          cabanaId,
          to_corral_id: targetCorralId,
          filters: {
            ...filters,
            age_from: filters.age_from ? Number(filters.age_from) : undefined,
            age_to: filters.age_to ? Number(filters.age_to) : undefined,
            current_corral_ids: filters.current_corral_ids.length > 0 ? filters.current_corral_ids : undefined
          },
          dryRun: true
        }
      });

      if (error) throw error;
      
      setPreview(data.preview);
      setStep(2);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error("Error al generar vista previa");
    } finally {
      setLoading(false);
    }
  };

  const executeMove = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-move-animals', {
        body: {
          cabanaId,
          to_corral_id: targetCorralId,
          filters: {
            ...filters,
            age_from: filters.age_from ? Number(filters.age_from) : undefined,
            age_to: filters.age_to ? Number(filters.age_to) : undefined,
            current_corral_ids: filters.current_corral_ids.length > 0 ? filters.current_corral_ids : undefined
          },
          dryRun: false
        }
      });

      if (error) throw error;
      
      toast.success(data.message);
      setStep(3);
    } catch (error) {
      console.error('Error executing move:', error);
      toast.error("Error al ejecutar movimiento");
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setStep(1);
    setPreview(null);
    setFilters({
      sex: '',
      category: '',
      age_from: '',
      age_to: '',
      current_corral_ids: []
    });
    setTargetCorralId('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Movimiento Masivo - Paso {step} de 3
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Filtros de Selección</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Sexo</Label>
                    <Select value={filters.sex} onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, sex: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="Macho">Machos</SelectItem>
                        <SelectItem value="Hembra">Hembras</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Categoría</Label>
                    <Select value={filters.category} onValueChange={(value) => 
                      setFilters(prev => ({ ...prev, category: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas</SelectItem>
                        <SelectItem value="Ternero">Ternero</SelectItem>
                        <SelectItem value="Ternera">Ternera</SelectItem>
                        <SelectItem value="Torete">Torete</SelectItem>
                        <SelectItem value="Vaquillona">Vaquillona</SelectItem>
                        <SelectItem value="Toro">Toro</SelectItem>
                        <SelectItem value="Vaca">Vaca</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Corral Destino</Label>
                    <Select value={targetCorralId} onValueChange={setTargetCorralId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {corrals.map(corral => (
                          <SelectItem key={corral.id} value={corral.id}>
                            {corral.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Edad Mínima (meses)</Label>
                    <Input
                      type="number"
                      value={filters.age_from}
                      onChange={(e) => setFilters(prev => ({ ...prev, age_from: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Edad Máxima (meses)</Label>
                    <Input
                      type="number"
                      value={filters.age_to}
                      onChange={(e) => setFilters(prev => ({ ...prev, age_to: e.target.value }))}
                      placeholder="Sin límite"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={onClose} variant="outline">
                Cancelar
              </Button>
              <Button onClick={generatePreview} disabled={loading || !targetCorralId}>
                {loading ? "Generando..." : "Vista Previa"}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && preview && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vista Previa del Movimiento</h3>
              <Badge variant="outline">
                {preview.animals_to_move} animales seleccionados
              </Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Impacto en Corral Destino</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Corral:</span>
                    <span className="font-medium">{preview.target_corral.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Animales actuales:</span>
                    <span>{preview.target_corral.current_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Después del movimiento:</span>
                    <span className="font-medium">{preview.target_corral.new_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capacidad:</span>
                    <span>{preview.target_corral.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Utilización:</span>
                    <div className="flex items-center gap-2">
                      <span>{preview.target_corral.utilization_pct}%</span>
                      {preview.target_corral.capacity_ok ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">OK</Badge>
                      ) : (
                        <Badge variant="destructive">Excede</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {preview.conflicts.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Conflictos:</span>
                    </div>
                    <ul className="mt-1 list-disc list-inside text-sm text-red-700">
                      {preview.conflicts.map((conflict, i) => (
                        <li key={i}>{conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Animales a Mover</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {preview.animals_found.slice(0, 20).map((animal, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{animal.tag || animal.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">({animal.sex})</span>
                      </div>
                    </div>
                  ))}
                  {preview.animals_found.length > 20 && (
                    <p className="text-sm text-muted-foreground text-center">
                      ... y {preview.animals_found.length - 20} animales más
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={resetDialog} variant="outline">
                Volver
              </Button>
              <Button 
                onClick={executeMove} 
                disabled={loading || preview.conflicts.length > 0}
                className="flex-1"
              >
                {loading ? "Ejecutando..." : "Confirmar Movimiento"}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h3 className="text-xl font-semibold">Movimiento Completado</h3>
            <p className="text-muted-foreground">
              Los animales han sido movidos exitosamente al corral destino.
            </p>
            <Button onClick={onClose}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}