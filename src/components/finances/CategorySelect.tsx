
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type FinanceType = "ingreso" | "egreso";

interface Props {
  type: FinanceType;
  value?: string;
  onChange: (id?: string) => void;
  className?: string;
  allowCreate?: boolean;
  placeholder?: string;
}

interface CategoryRow {
  id: string;
  name: string;
  type: FinanceType | null;
  cabaña_id: string | null;
  is_system: boolean | null;
}

export default function CategorySelect({
  type,
  value,
  onChange,
  className,
  allowCreate = true,
  placeholder = "Categoría",
}: Props) {
  const { currentUser } = useSimpleAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Usar cliente sin tipos para evitar errores por tablas/columnas no presentes en Database
  const supabaseAny = supabase as any;

  const { data: categories = [] } = useQuery({
    queryKey: ["finance-categories", type, currentUser?.cabañaId],
    queryFn: async (): Promise<CategoryRow[]> => {
      const cabId = currentUser?.cabañaId as string | undefined;

      let q = supabaseAny
        .from("finance_categories")
        .select("*")
        .eq("type", type);

      // Evitar usar eq con UUID vacío: si no hay cabaña, filtramos solo por categorías del sistema (cabaña_id IS NULL)
      if (cabId) {
        q = q.or(`cabaña_id.is.null,cabaña_id.eq.${cabId}`);
      } else {
        q = q.is("cabaña_id", null);
      }

      const { data, error } = await q
        .order("is_system", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return (data as unknown as CategoryRow[]) || [];
    },
    enabled: !!currentUser?.id, // Ejecutar solo si hay sesión
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: newName.trim(),
        type,
        cabaña_id: currentUser?.cabañaId || null,
        is_system: false,
      };
      const { error } = await supabaseAny.from("finance_categories").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoría creada");
      queryClient.invalidateQueries({ queryKey: ["finance-categories"] });
      setOpen(false);
      setNewName("");
    },
    onError: (e: any) => {
      console.error("Error creando categoría:", e);
      toast.error(e?.message || "Error al crear la categoría");
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={(v) => onChange(v)} >
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
          <SelectItem value="__none__" onClick={() => onChange(undefined)}>
            Sin categoría
          </SelectItem>
        </SelectContent>
      </Select>
      {allowCreate && (
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            + Nueva
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva categoría ({type})</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Nombre</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. Veterinaria" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!newName.trim()}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
