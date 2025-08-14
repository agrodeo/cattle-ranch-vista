
import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategorySelect from "./CategorySelect";
import { toast } from "sonner";

type FinanceType = "ingreso" | "egreso";
type Frequency = "monthly" | "weekly" | "yearly" | "quarterly" | "custom";

interface RecurringRow {
  id: string;
  cabaña_id: string;
  name: string;
  type: FinanceType;
  amount: number;
  category_id: string | null;
  description: string | null;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  last_run_date: string | null;
  day_of_month: number | null;
  day_of_week: number | null;
  interval_days: number | null;
  is_active: boolean;
}

export default function FinancesRecurring() {
  const { currentUser } = useSimpleAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{
    name: string;
    type: FinanceType;
    amount: string;
    categoryId?: string;
    description?: string;
    frequency: Frequency;
  }>({
    name: "",
    type: "egreso",
    amount: "",
    categoryId: undefined,
    description: "",
    frequency: "monthly",
  });

  const supabaseAny = supabase as any;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["finances","recurring", currentUser?.id],
    queryFn: async (): Promise<RecurringRow[]> => {
      if (!currentUser?.id) return [];

      const { data, error } = await supabaseAny.rpc('list_finance_recurring', {
        _user_id: currentUser.id
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id) throw new Error("Usuario no autenticado");

      const { error } = await supabaseAny.rpc('create_finance_recurring', {
        _user_id: currentUser.id,
        _name: form.name.trim(),
        _type: form.type,
        _amount: Number(form.amount || 0),
        _frequency: form.frequency,
        _category_id: form.categoryId || null,
        _description: form.description || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recurrente creado");
      queryClient.invalidateQueries({ queryKey: ["finances","recurring"] });
      setForm({ name: "", type: "egreso", amount: "", categoryId: undefined, description: "", frequency: "monthly" });
    },
    onError: (e: any) => toast.error(e?.message || "Error al crear recurrente"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!currentUser?.id) throw new Error("Usuario no autenticado");

      const { error } = await supabaseAny.rpc('delete_finance_recurring', {
        _user_id: currentUser.id,
        _id: id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recurrente eliminado");
      queryClient.invalidateQueries({ queryKey: ["finances","recurring"] });
    },
    onError: (e: any) => toast.error(e?.message || "Error al eliminar"),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 grid gap-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input placeholder="Nombre (ej. Sueldo)" value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))} />
            <Select value={form.type} onValueChange={(v: FinanceType) => setForm(f => ({...f, type: v}))}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingreso">Ingreso</SelectItem>
                <SelectItem value="egreso">Egreso</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Monto" value={form.amount} onChange={(e) => setForm(f => ({...f, amount: e.target.value}))} />
            <CategorySelect type={form.type} value={form.categoryId} onChange={(id) => setForm(f => ({...f, categoryId: id === "__none__" ? undefined : id}))} />
            <Select value={form.frequency} onValueChange={(v: Frequency) => setForm(f => ({...f, frequency: v}))}>
              <SelectTrigger><SelectValue placeholder="Frecuencia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Descripción (opcional)" value={form.description} onChange={(e) => setForm(f => ({...f, description: e.target.value}))} />
            <Button onClick={() => createMutation.mutate()} disabled={!form.name.trim() || !form.amount || !currentUser?.id}>
              Agregar recurrente
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading && <div>Cargando...</div>}
          {!isLoading && items.length === 0 && <div className="text-sm text-muted-foreground">No hay recurrentes aún.</div>}
          {!isLoading && items.length > 0 && (
            <div className="space-y-2">
              {items.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded border px-3 py-2">
                  <div className="flex-1">
                    <div className="font-medium">{r.name} <span className="text-xs text-muted-foreground">({r.type})</span></div>
                    <div className="text-sm text-muted-foreground">
                      ${r.amount.toLocaleString()} • {r.frequency} • Próxima: {r.next_run_date ? format(new Date(r.next_run_date), "dd/MM/yyyy") : "-"}
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(r.id)}>Eliminar</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
