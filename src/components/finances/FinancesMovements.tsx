
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
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
import { db } from "@/services/db";
import { useConnectivity } from "@/services/connectivity";
import type { CachedFinance } from "@/services/offlineTypes";

interface FinanceRow {
  id: string;
  date: string | null;
  type: string | null;
  amount: number | null;
  description: string | null;
  category_name?: string;
  category_id?: string;
  buyer_name?: string;
  buyer_document?: string;
  buyer_destination?: string;
}

export function FinancesMovements() {
  const { t } = useTranslation(['finance', 'common']);
  const { currentUser } = useSupabaseAuth();
  const { isOnline } = useConnectivity();
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'employee';

  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

  const queryClient = useQueryClient();

  const supabaseAny = supabase as any;

  // Load cached finances for offline display
  const loadCachedFinances = useCallback(async (): Promise<FinanceRow[]> => {
    if (!currentUser?.cabañaId) return [];
    try {
      const cached = await db.finances_cache
        .where('cabaña_id')
        .equals(currentUser.cabañaId)
        .toArray();
      
      // Apply filters client-side
      let filtered = cached;
      if (from) {
        const fromStr = format(from, "yyyy-MM-dd");
        filtered = filtered.filter(f => f.date && f.date >= fromStr);
      }
      if (to) {
        const toStr = format(to, "yyyy-MM-dd");
        filtered = filtered.filter(f => f.date && f.date <= toStr);
      }
      if (type) {
        filtered = filtered.filter(f => f.type === type);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(f => 
          f.description?.toLowerCase().includes(searchLower)
        );
      }
      if (categoryFilter) {
        filtered = filtered.filter(f => f.category_id === categoryFilter);
      }
      
      // Sort by date descending
      filtered.sort((a, b) => 
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      );
      
      return filtered.map(f => ({
        id: f.id,
        date: f.date || null,
        type: f.type || null,
        amount: f.amount || null,
        description: f.description || null,
        category_id: f.category_id,
        buyer_name: f.buyer_name,
        buyer_document: f.buyer_document,
        buyer_destination: f.buyer_destination
      }));
    } catch (err) {
      console.error('Error loading cached finances:', err);
      return [];
    }
  }, [currentUser?.cabañaId, from, to, type, search, categoryFilter]);

  // Query to get animal sale category ID
  const { data: animalSaleCategory } = useQuery({
    queryKey: ["finance-categories", "animal-sale", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const { data, error } = await supabaseAny.rpc('list_finance_categories', {
        _user_id: currentUser.id,
        _type: 'ingreso'
      });
      if (error) throw error;
      return data?.find((c: any) => c.name === 'Venta de Animales') || null;
    },
    enabled: !!currentUser?.id && isOnline,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["finances","list", from?.toISOString(), to?.toISOString(), type, search, categoryFilter, isOnline],
    queryFn: async (): Promise<FinanceRow[]> => {
      // Try to load from cache first for instant display
      const cached = await loadCachedFinances();
      
      // If offline, return cached data
      if (!isOnline) {
        return cached;
      }
      
      if (!currentUser?.id) throw new Error("User not authenticated");
      
      try {
        const { data, error } = await supabaseAny.rpc("list_finance_movements", {
          _user_id: currentUser.id,
          _from_date: from ? format(from, "yyyy-MM-dd") : null,
          _to_date: to ? format(to, "yyyy-MM-dd") : null,
          _type: type || null,
          _search: search || null,
          _category_id: categoryFilter || null
        });
        
        if (error) throw error;
        
        // Cache the results
        if (data && currentUser?.cabañaId) {
          for (const row of data) {
            await db.finances_cache.put({
              id: row.id,
              cabaña_id: currentUser.cabañaId,
              type: row.type,
              amount: row.amount,
              date: row.date,
              description: row.description,
              category_id: row.category_id,
              buyer_name: row.buyer_name,
              buyer_document: row.buyer_document,
              buyer_destination: row.buyer_destination,
              updated_at: new Date().toISOString(),
              sync_status: 'synced'
            } as CachedFinance);
          }
        }
        
        return (data as unknown as FinanceRow[]) || [];
      } catch (err) {
        console.error('Error fetching finances from server:', err);
        // Return cached data on error
        return cached;
      }
    },
    enabled: !!currentUser?.id,
    staleTime: 30000, // Consider data fresh for 30 seconds
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
      if (!currentUser?.id) throw new Error("User not authenticated");
      const baseDate = form.date ? format(form.date, "yyyy-MM-dd") : null;
      
      if (!baseDate) throw new Error("Date is required");
      if (!form.amount || Number(form.amount) <= 0) throw new Error("Amount must be greater than 0");

      if (!editRow && form.type === "ingreso" && form.isAnimalSale && form.animalIds.length > 0) {
        const { error } = await supabaseAny.rpc("create_animal_sale", {
          _cabana_id: currentUser?.cabañaId,
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

      if (editRow) {
        const { error } = await supabaseAny.rpc("update_finance_movement", {
          _user_id: currentUser.id,
          _movement_id: editRow.id,
          _date: baseDate,
          _type: form.type,
          _amount: Number(form.amount),
          _description: form.description || null,
          _category_id: form.categoryId || null,
          _buyer_name: form.buyerName || null,
          _buyer_document: form.buyerDocument || null,
          _buyer_destination: form.buyerDestination || null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabaseAny.rpc("create_finance_movement", {
          _user_id: currentUser.id,
          _date: baseDate,
          _type: form.type,
          _amount: Number(form.amount),
          _description: form.description || null,
          _category_id: form.categoryId || null,
          _buyer_name: form.buyerName || null,
          _buyer_document: form.buyerDocument || null,
          _buyer_destination: form.buyerDestination || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editRow ? t('finance:movements.movementUpdated') : t('finance:movements.movementAdded'));
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
      if (!currentUser?.id) throw new Error("User not authenticated");
      
      const { error } = await supabaseAny.rpc("delete_finance_movement", {
        _user_id: currentUser.id,
        _movement_id: row.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('finance:movements.movementDeleted'));
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
              <CalendarIcon className="mr-2 h-4 w-4" /> {from ? format(from, "P") : t('finance:filters.from')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={from} onSelect={setFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[160px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" /> {to ? format(to, "P") : t('finance:filters.to')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={to} onSelect={setTo} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder={t('finance:movements.typePlaceholder')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ingreso">{t('finance:types.income')}</SelectItem>
            <SelectItem value="egreso">{t('finance:types.expense')}</SelectItem>
          </SelectContent>
        </Select>
        <CategorySelect
          type={(type as "ingreso"|"egreso") || "egreso"}
          value={categoryFilter}
          onChange={(id) => setCategoryFilter(id === "__none__" ? undefined : id)}
          className="w-[220px]"
          allowCreate={false}
          placeholder={t('finance:movements.filterByCategory')}
        />
        <Input placeholder={t('finance:movements.searchDescription')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-[220px]" />
        <div className="ml-auto">
          <Button onClick={onCreate} disabled={!canEdit}>
            <Plus className="mr-2 h-4 w-4" /> {t('common:actions.add')}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('finance:movements.tableHeaders.date')}</TableHead>
              <TableHead>{t('finance:movements.tableHeaders.type')}</TableHead>
              <TableHead>{t('finance:movements.tableHeaders.category')}</TableHead>
              <TableHead className="text-right">{t('finance:movements.tableHeaders.amount')}</TableHead>
              <TableHead>{t('finance:movements.tableHeaders.description')}</TableHead>
              <TableHead className="w-[110px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6}>{t('finance:movements.loading')}</TableCell></TableRow>
            )}
            {!isLoading && (data || []).map((row: any) => (
              <TableRow key={row.id}>
                <TableCell>{row.date ? format(new Date(row.date), "dd/MM/yyyy") : "-"}</TableCell>
                <TableCell className={row.type === 'ingreso' ? 'text-primary' : 'text-destructive'}>{row.type === 'ingreso' ? t('finance:types.income') : t('finance:types.expense')}</TableCell>
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
            <DialogTitle>{editRow ? t('finance:movements.editMovement') : t('finance:movements.newMovement')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" /> {form.date ? format(form.date, "PPP") : t('finance:movements.datePlaceholder')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={form.date} onSelect={(d) => setForm(f => ({...f, date: d}))} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            <Select value={form.type} onValueChange={(v) => setForm(f => ({...f, type: v}))}>
              <SelectTrigger><SelectValue placeholder={t('finance:movements.typePlaceholder')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingreso">{t('finance:types.income')}</SelectItem>
                <SelectItem value="egreso">{t('finance:types.expense')}</SelectItem>
              </SelectContent>
            </Select>

            <CategorySelect
              type={form.type as "ingreso"|"egreso"}
              value={form.categoryId}
              onChange={(id) => setForm(f => ({...f, categoryId: id === "__none__" ? undefined : id}))}
              isAnimalSale={form.type === "ingreso" && form.isAnimalSale}
            />

            {form.type === "ingreso" && (
              <div className="flex items-center gap-2">
                <Switch
                  id="animal-sale"
                  checked={form.isAnimalSale}
                  onCheckedChange={(v) => {
                    const isAnimalSale = !!v;
                    setForm(f => ({
                      ...f, 
                      isAnimalSale,
                      // Auto-select animal sale category when enabled
                      categoryId: isAnimalSale ? animalSaleCategory?.id || f.categoryId : f.categoryId
                    }));
                  }}
                />
                <Label htmlFor="animal-sale">{t('finance:movements.animalSale')}</Label>
              </div>
            )}

            {form.type === "ingreso" && form.isAnimalSale && (
              <div className="grid gap-3">
                <MultiAnimalSelect
                  selectedIds={form.animalIds}
                  onChange={(ids) => setForm(f => ({...f, animalIds: ids}))}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input placeholder={t('finance:movements.buyerName')} value={form.buyerName} onChange={(e) => setForm(f => ({...f, buyerName: e.target.value}))} />
                  <Input placeholder={t('finance:movements.buyerDocument')} value={form.buyerDocument} onChange={(e) => setForm(f => ({...f, buyerDocument: e.target.value}))} />
                  <Input placeholder={t('finance:movements.buyerDestination')} value={form.buyerDestination} onChange={(e) => setForm(f => ({...f, buyerDestination: e.target.value}))} />
                </div>
              </div>
            )}

            <Input type="number" placeholder={t('finance:movements.amountPlaceholder')} value={form.amount} onChange={(e) => setForm(f => ({...f, amount: e.target.value}))} />
            <Textarea placeholder={t('finance:movements.descriptionPlaceholder')} value={form.description} onChange={(e) => setForm(f => ({...f, description: e.target.value}))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common:actions.cancel')}</Button>
            <Button onClick={() => upsertMutation.mutate()} disabled={!canEdit}>{editRow ? t('common:actions.save') : t('common:actions.create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
