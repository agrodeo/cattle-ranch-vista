import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface ArtificialInsemination {
  id: string;
  insemination_date: string;
  bull_name: string;
  bull_id: string | null;
  is_pregnant: boolean | null;
  notes: string | null;
  animals: {
    name: string | null;
    id_tag: string | null;
    corrales: {
      name: string;
    } | null;
  } | null;
}

interface ArtificialInseminationTableProps {
  onEdit: (record: ArtificialInsemination) => void;
  refreshKey: number;
}

export function ArtificialInseminationTable({ onEdit, refreshKey }: ArtificialInseminationTableProps) {
  const { t } = useTranslation(['activities', 'common']);
  const [records, setRecords] = useState<ArtificialInsemination[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ArtificialInsemination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    result: "all",
    bull: "",
    corral: "",
  });
  const { toast } = useToast();
  const { currentUser } = useSupabaseAuth();

  useEffect(() => {
    fetchRecords();
  }, [refreshKey]);

  useEffect(() => {
    applyFilters();
  }, [records, filters]);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      if (!currentUser?.cabañaId) return;

      const { data, error } = await supabase
        .from("artificial_inseminations")
        .select(`
          *,
          animals:female_id (
            name,
            id_tag,
            corrales:corral_id (
              name
            )
          )
        `)
        .eq("cabaña_id", currentUser.cabañaId)
        .order("insemination_date", { ascending: false });

      if (error) throw error;
      setRecords((data as any) || []);
    } catch (error) {
      console.error("Error fetching AI records:", error);
      toast({
        title: t('common:status.error'),
        description: t('artificialInsemination.errorLoadingRecords'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...records];

    if (filters.dateFrom) {
      filtered = filtered.filter(record => 
        new Date(record.insemination_date) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(record => 
        new Date(record.insemination_date) <= new Date(filters.dateTo)
      );
    }

    if (filters.result && filters.result !== "all") {
      filtered = filtered.filter(record => {
        if (filters.result === "pending") return record.is_pregnant === null;
        if (filters.result === "pregnant") return record.is_pregnant === true;
        if (filters.result === "not_pregnant") return record.is_pregnant === false;
        return true;
      });
    }

    if (filters.bull) {
      filtered = filtered.filter(record => 
        record.bull_name.toLowerCase().includes(filters.bull.toLowerCase())
      );
    }

    if (filters.corral) {
      filtered = filtered.filter(record => 
        record.animals?.corrales?.name?.toLowerCase().includes(filters.corral.toLowerCase())
      );
    }

    setFilteredRecords(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('artificialInsemination.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from("artificial_inseminations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: t('common:status.success'),
        description: t('artificialInsemination.recordDeletedSuccess'),
      });

      fetchRecords();
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({
        title: t('common:status.error'),
        description: t('artificialInsemination.errorDeletingRecord'),
        variant: "destructive",
      });
    }
  };

  const getResultBadge = (isPregnant: boolean | null) => {
    if (isPregnant === null) {
      return <Badge variant="secondary">{t('artificialInsemination.pending')}</Badge>;
    }
    if (isPregnant) {
      return <Badge variant="default" className="bg-primary">{t('artificialInsemination.pregnant')}</Badge>;
    }
    return <Badge variant="destructive">{t('artificialInsemination.notPregnant')}</Badge>;
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      result: "all",
      bull: "",
      corral: "",
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">{t('common:loading')}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          {t('artificialInsemination.recordsTitle')}
        </CardTitle>
        
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <Input
            type="date"
            placeholder={t('artificialInsemination.dateFrom')}
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
          />
          <Input
            type="date"
            placeholder={t('artificialInsemination.dateTo')}
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
          />
          <Select value={filters.result} onValueChange={(value) => setFilters(prev => ({ ...prev, result: value }))}>
            <SelectTrigger>
              <SelectValue placeholder={t('artificialInsemination.result')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('artificialInsemination.all')}</SelectItem>
              <SelectItem value="pending">{t('artificialInsemination.pending')}</SelectItem>
              <SelectItem value="pregnant">{t('artificialInsemination.pregnant')}</SelectItem>
              <SelectItem value="not_pregnant">{t('artificialInsemination.notPregnant')}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder={t('artificialInsemination.bull')}
            value={filters.bull}
            onChange={(e) => setFilters(prev => ({ ...prev, bull: e.target.value }))}
          />
          <div className="flex gap-2">
            <Input
              placeholder={t('artificialInsemination.corral')}
              value={filters.corral}
              onChange={(e) => setFilters(prev => ({ ...prev, corral: e.target.value }))}
              className="flex-1"
            />
            <Button variant="outline" onClick={resetFilters} size="sm">
              {t('artificialInsemination.clear')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common:animal')}</TableHead>
                <TableHead>{t('artificialInsemination.date')}</TableHead>
                <TableHead>{t('artificialInsemination.bull')}</TableHead>
                <TableHead>{t('artificialInsemination.corral')}</TableHead>
                <TableHead>{t('artificialInsemination.result')}</TableHead>
                <TableHead>{t('artificialInsemination.observations')}</TableHead>
                <TableHead>{t('common:actions.title')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t('artificialInsemination.noRecordsFound')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.animals?.name || record.animals?.id_tag || t('artificialInsemination.noName')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.insemination_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{record.bull_name}</TableCell>
                    <TableCell>
                      {record.animals?.corrales?.name || t('artificialInsemination.noCorral')}
                    </TableCell>
                    <TableCell>
                      {getResultBadge(record.is_pregnant)}
                    </TableCell>
                    <TableCell>
                      {record.notes ? (
                        <span className="text-sm text-muted-foreground">
                          {record.notes.length > 50 
                            ? `${record.notes.substring(0, 50)}...` 
                            : record.notes}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(record)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          {t('artificialInsemination.showingRecords', { filtered: filteredRecords.length, total: records.length })}
        </div>
      </CardContent>
    </Card>
  );
}