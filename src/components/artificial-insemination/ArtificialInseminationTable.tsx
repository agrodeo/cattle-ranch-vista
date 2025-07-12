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
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

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
  const [records, setRecords] = useState<ArtificialInsemination[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ArtificialInsemination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    result: "",
    bull: "",
    corral: "",
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchRecords();
  }, [refreshKey]);

  useEffect(() => {
    applyFilters();
  }, [records, filters]);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (!userData?.cabaña_id) return;

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
        .eq("cabaña_id", userData.cabaña_id)
        .order("insemination_date", { ascending: false });

      if (error) throw error;
      setRecords((data as any) || []);
    } catch (error) {
      console.error("Error fetching AI records:", error);
      toast({
        title: "Error",
        description: "Error al cargar los registros de inseminación",
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

    if (filters.result) {
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
    if (!confirm("¿Estás seguro de que quieres eliminar este registro?")) return;

    try {
      const { error } = await supabase
        .from("artificial_inseminations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Registro eliminado correctamente",
      });

      fetchRecords();
    } catch (error) {
      console.error("Error deleting record:", error);
      toast({
        title: "Error",
        description: "Error al eliminar el registro",
        variant: "destructive",
      });
    }
  };

  const getResultBadge = (isPregnant: boolean | null) => {
    if (isPregnant === null) {
      return <Badge variant="secondary">Pendiente</Badge>;
    }
    if (isPregnant) {
      return <Badge variant="default" className="bg-green-500">Preñada</Badge>;
    }
    return <Badge variant="destructive">No Preñada</Badge>;
  };

  const resetFilters = () => {
    setFilters({
      dateFrom: "",
      dateTo: "",
      result: "",
      bull: "",
      corral: "",
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Cargando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Registros de Inseminación Artificial
        </CardTitle>
        
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
          <Input
            type="date"
            placeholder="Fecha desde"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
          />
          <Input
            type="date"
            placeholder="Fecha hasta"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
          />
          <Select value={filters.result} onValueChange={(value) => setFilters(prev => ({ ...prev, result: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="pregnant">Preñada</SelectItem>
              <SelectItem value="not_pregnant">No Preñada</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Toro"
            value={filters.bull}
            onChange={(e) => setFilters(prev => ({ ...prev, bull: e.target.value }))}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Corral"
              value={filters.corral}
              onChange={(e) => setFilters(prev => ({ ...prev, corral: e.target.value }))}
              className="flex-1"
            />
            <Button variant="outline" onClick={resetFilters} size="sm">
              Limpiar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Toro</TableHead>
                <TableHead>Corral</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Observaciones</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron registros
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.animals?.name || record.animals?.id_tag || "Sin nombre"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.insemination_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{record.bull_name}</TableCell>
                    <TableCell>
                      {record.animals?.corrales?.name || "Sin corral"}
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
          Mostrando {filteredRecords.length} de {records.length} registros
        </div>
      </CardContent>
    </Card>
  );
}