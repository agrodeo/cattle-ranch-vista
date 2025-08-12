import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Pencil, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FinanceRow {
  id: string;
  date: string | null;
  type: string | null;
  amount: number | null;
  description: string | null;
}

export function FinancesMovements() {
  const { currentUser } = useSimpleAuth();
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'employee';

  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["finances","list", from?.toISOString(), to?.toISOString(), type, search],
    queryFn: async (): Promise<FinanceRow[]> => {
      let q = supabase.from("finances").select("id,date,type,amount,description").order("date", { ascending: false });
      if (from) q = q.gte("date", format(from, "yyyy-MM-dd"));
      if (to) q = q.lte("date", format(to, "yyyy-MM-dd"));
      if (type) q = q.eq("type", type);
      if (search) q = q.ilike("description", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data as FinanceRow[]) || [];
    },
  });

  // Create / Update dialog state
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<FinanceRow | null>(null);
  const [form, setForm] = useState<{ date: Date | undefined; type: string; amount: string; description: string }>({
    date: undefined,
    type: "ingreso",
    amount: "",
    description: "",
  });

  const resetForm = () => setForm({ date: undefined, type: "ingreso", amount: "", description: "" });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.cabañaId) throw new Error("Falta cabaña");
      const payload = {
        cabaña_id: currentUser.cabañaId,
        date: form.date ? format(form.date, "yyyy-MM-dd") : null,
        type: form.type,
        amount: form.amount ? Number(form.amount) : null,
        description: form.description || null,
      };
      if (editRow) {
        const { error } = await supabase.from("finances").update(payload).eq("id", editRow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("finances").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editRow ? "Movimiento actualizado" : "Movimiento agregado");
      setOpen(false);
      setEditRow(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["finances","list"] });
      queryClient.invalidateQueries({ queryKey: ["finances","summary"] });
    },
    onError: (e: any) => {
      toast.error(e?.message || "Error al guardar");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (row: FinanceRow) => {
      const { error } = await supabase.from("finances").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimiento eliminado");
      queryClient.invalidateQueries({ queryKey: ["finances","list"] });
      queryClient.invalidateQueries({ queryKey: ["finances","summary"] });
    },
    onError: (e: any) => toast.error(e?.message || "Error al eliminar"),
  });

  const onEdit = (row: FinanceRow) => {
    setEditRow(row);
    setForm({
      date: row.date ? new Date(row.date) : undefined,
      type: row.type || "ingreso",
      amount: row.amount?.toString() || "",
      description: row.description || "",
    });
    setOpen(true);
  };

  const onCreate = () => {
    setEditRow(null);
    resetForm();
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[160px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" /> {from ? format(from, "P") : "Desde"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={from} onSelect={setFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[160px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" /> {to ? format(to, "P") : "Hasta"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={to} onSelect={setTo} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ingreso">Ingreso</SelectItem>
            <SelectItem value="egreso">Egreso</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="Buscar descripción" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[220px]" />
        <div className="ml-auto">
          <Button onClick={onCreate} disabled={!canEdit}>
            <Plus className="mr-2 h-4 w-4" /> Agregar
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[110px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5}>Cargando...</TableCell></TableRow>
            )}
            {!isLoading && (data || []).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.date ? format(new Date(row.date), "dd/MM/yyyy") : "-"}</TableCell>
                <TableCell className={row.type === 'ingreso' ? 'text-primary' : 'text-destructive'}>{row.type}</TableCell>
                <TableCell className="text-right">${(row.amount || 0).toLocaleString()}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(row)} disabled={!canEdit}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(row)} disabled={!canEdit}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editRow ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" /> {form.date ? format(form.date, "PPP") : "Fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={form.date} onSelect={(d) => setForm(f => ({...f, date: d}))} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            <Select value={form.type} onValueChange={(v) => setForm(f => ({...f, type: v}))}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingreso">Ingreso</SelectItem>
                <SelectItem value="egreso">Egreso</SelectItem>
              </SelectContent>
            </Select>

            <Input type="number" placeholder="Monto" value={form.amount} onChange={(e) => setForm(f => ({...f, amount: e.target.value}))} />
            <Textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm(f => ({...f, description: e.target.value}))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => upsertMutation.mutate()} disabled={!canEdit}>{editRow ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
