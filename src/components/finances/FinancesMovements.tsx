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
import CategorySelect from "./CategorySelect";
import MultiAnimalSelect from "./MultiAnimalSelect";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["finances","list", from?.toISOString(), to?.toISOString(), type, search, categoryFilter],
    queryFn: async (): Promise<FinanceRow[]> => {
      let q = supabase.from("finances").select("id,date,type,amount,description,category_id,buyer_name").order("date", { ascending: false });
      if (from) q = q.gte("date", format(from, "yyyy-MM-dd"));
      if (to) q = q.lte("date", format(to, "yyyy-MM-dd"));
      if (type) q = q.eq("type", type);
      if (categoryFilter) q = q.eq("category_id", categoryFilter);
      if (search) q = q.ilike("description", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) || [];
    },
  });

  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<FinanceRow | null>(null);
  const [form, setForm] = useState<{
    date: Date | undefined;
    type: string;
    amount: string;
    description: string;
    categoryId?: string;
    isAnimalSale: boolean;
    animalIds: string[];
    buyerName?: string;
    buyerDocument?: string;
    buyerDestination?: string;
  }>({
    date: undefined,
    type: "ingreso",
    amount: "",
    description: "",
    categoryId: undefined,
    isAnimalSale: false,
    animalIds: [],
    buyerName: "",
    buyerDocument: "",
    buyerDestination: "",
  });

  const resetForm = () => setForm({
    date: undefined,
    type: "ingreso",
    amount: "",
    description: "",
    categoryId: undefined,
    isAnimalSale: false,
    animalIds: [],
    buyerName: "",
    buyerDocument: "",
    buyerDestination: "",
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.cabañaId) throw new Error("Falta cabaña");
      const baseDate = form.date ? format(form.date, "yyyy-MM-dd") : null;

      if (!editRow && form.type === "ingreso" && form.isAnimalSale && form.animalIds.length > 0) {
        const { error } = await supabase.rpc("create_animal_sale", {
          _cabana_id: currentUser.cabañaId,
          _date: baseDate,
          _amount: form.amount ? Number(form.amount) : 0,
          _description: form.description || null,
          _buyer_name: form.buyerName || null,
          _buyer_document: form.buyerDocument || null,
          _buyer_destination: form.buyerDestination || null,
          _animal_ids: form.animalIds,
          _unit_prices: null,
          _category_id: form.categoryId || null
        });
        if (error) throw error;
        return;
      }

      const payload: any = {
        cabaña_id: currentUser.cabañaId,
        date: baseDate,
        type: form.type,
        amount: form.amount ? Number(form.amount) : null,
        description: form.description || null,
        category_id: form.categoryId || null,
        buyer_name: form.buyerName || null,
        buyer_document: form.buyerDocument || null,
        buyer_destination: form.buyerDestination || null,
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
      queryClient.invalidateQueries({ queryKey: ["finances","reports"] });
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
      queryClient.invalidateQueries({ queryKey: ["finances","reports"] });
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
      categoryId: (row as any).category_id || undefined,
      isAnimalSale: false,
      animalIds: [],
      buyerName: (row as any).buyer_name || "",
      buyerDocument: (row as any).buyer_document || "",
      buyerDestination: (row as any).buyer_destination || "",
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
        <CategorySelect
          type={(type as "ingreso"|"egreso") || "egreso"}
          value={categoryFilter}
          onChange={(id) => setCategoryFilter(id === "__none__" ? undefined : id)}
          className="w-[220px]"
          allowCreate={false}
          placeholder="Filtrar por categoría"
        />
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
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[110px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6}>Cargando...</TableCell></TableRow>
            )}
            {!isLoading && (data || []).map((row: any) => (
              <TableRow key={row.id}>
                <TableCell>{row.date ? format(new Date(row.date), "dd/MM/yyyy") : "-"}</TableCell>
                <TableCell className={row.type === 'ingreso' ? 'text-primary' : 'text-destructive'}>{row.type}</TableCell>
                <TableCell>
                  {row.category_name || row.category?.name || "-"}
                </TableCell>
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

            <CategorySelect
              type={form.type as "ingreso"|"egreso"}
              value={form.categoryId}
              onChange={(id) => setForm(f => ({...f, categoryId: id === "__none__" ? undefined : id}))}
            />

            {form.type === "ingreso" && (
              <div className="flex items-center gap-2">
                <Switch
                  id="animal-sale"
                  checked={form.isAnimalSale}
                  onCheckedChange={(v) => setForm(f => ({...f, isAnimalSale: !!v}))}
                />
                <Label htmlFor="animal-sale">Venta de animales</Label>
              </div>
            )}

            {form.type === "ingreso" && form.isAnimalSale && (
              <div className="grid gap-3">
                <MultiAnimalSelect
                  selectedIds={form.animalIds}
                  onChange={(ids) => setForm(f => ({...f, animalIds: ids}))}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input placeholder="Comprador (opcional)" value={form.buyerName} onChange={(e) => setForm(f => ({...f, buyerName: e.target.value}))} />
                  <Input placeholder="Documento (opcional)" value={form.buyerDocument} onChange={(e) => setForm(f => ({...f, buyerDocument: e.target.value}))} />
                  <Input placeholder="Destino (opcional)" value={form.buyerDestination} onChange={(e) => setForm(f => ({...f, buyerDestination: e.target.value}))} />
                </div>
              </div>
            )}

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
