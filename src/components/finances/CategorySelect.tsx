
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHybridAuth } from "@/hooks/useHybridAuth";
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
  isAnimalSale?: boolean;
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
  isAnimalSale = false,
}: Props) {
  const { currentUser } = useHybridAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Usar cliente sin tipos para evitar errores por tablas/columnas no presentes en Database
  const supabaseAny = supabase as any;

  const { data: categories = [] } = useQuery({
    queryKey: ["finance-categories", type, currentUser?.id],
    queryFn: async (): Promise<CategoryRow[]> => {
      if (!currentUser?.id) return [];

      const { data, error } = await supabaseAny.rpc('list_finance_categories', {
        _user_id: currentUser.id,
        _type: type
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id) throw new Error("Usuario no autenticado");
      
      const { error } = await supabaseAny.rpc('create_finance_category', {
        _user_id: currentUser.id,
        _name: newName.trim(),
        _type: type
      });
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
          {isAnimalSale ? (
            // For animal sales, only show "Venta de Animales" and option to create custom
            categories
              .filter(c => c.name === 'Venta de Animales')
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))
          ) : (
            categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))
          )}
          {!isAnimalSale && (
            <SelectItem value="__none__" onClick={() => onChange(undefined)}>
              Sin categoría
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {allowCreate && currentUser?.id && (
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
