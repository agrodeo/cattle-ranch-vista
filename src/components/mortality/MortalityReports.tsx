import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileDown, Calendar, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DeathRecord {
  id: string;
  animal_id: string;
  fecha_defuncion: string;
  edad_dias: number | null;
  edad_meses: number | null;
  causa_nombre?: string;
  causa_texto?: string;
  notas?: string;
  animal_name?: string;
  animal_id_tag?: string;
  animal_sex?: string;
  animal_breed?: string;
}

interface DeathsByAge {
  age_group: string;
  count: number;
}

interface DeathsByCause {
  causa: string;
  count: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function MortalityReports() {
  const [deaths, setDeaths] = useState<DeathRecord[]>([]);
  const [deathsByAge, setDeathsByAge] = useState<DeathsByAge[]>([]);
  const [deathsByCause, setDeathsByCause] = useState<DeathsByCause[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    breed: "",
    sex: "all",
    cause: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMortalityData();
  }, []);

  const loadMortalityData = async () => {
    setLoading(true);
    try {
      // Query deaths with animal data using proper Supabase syntax
      let query = supabase
        .from('defunciones')
        .select(`
          *,
          catalogo_causas(nombre),
          animals(name, id_tag, sex, breed)
        `)
        .order('fecha_defuncion', { ascending: false });

      // Apply filters
      if (filters.dateFrom) {
        query = query.gte('fecha_defuncion', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('fecha_defuncion', filters.dateTo);
      }
      if (filters.sex && filters.sex !== 'all') {
        query = query.eq('animals.sex', filters.sex);
      }
      if (filters.breed) {
        query = query.ilike('animals.breed', `%${filters.breed}%`);
      }

      const { data: deathsData, error } = await query;

      if (error) throw error;

      // Process deaths data - handle the nested structure properly
      const processedDeaths = (deathsData || []).map(death => ({
        ...death,
        causa_nombre: (death as any).catalogo_causas?.nombre,
        animal_name: (death as any).animals?.name,
        animal_id_tag: (death as any).animals?.id_tag,
        animal_sex: (death as any).animals?.sex,
        animal_breed: (death as any).animals?.breed,
      }));

      setDeaths(processedDeaths);

      // Process age groups
      const ageGroups = processDeathsByAge(processedDeaths);
      setDeathsByAge(ageGroups);

      // Process causes
      const causes = processDeathsByCause(processedDeaths);
      setDeathsByCause(causes);

    } catch (error) {
      console.error('Error loading mortality data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de mortalidad",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processDeathsByAge = (deaths: any[]): DeathsByAge[] => {
    const ageGroups = {
      '0-30 días': 0,
      '1-6 meses': 0,
      '6-12 meses': 0,
      '12-24 meses': 0,
      '> 24 meses': 0,
      'Desconocido': 0,
    };

    deaths.forEach(death => {
      // Only mark as unknown if edad_dias is null or undefined, not if it's 0
      if (death.edad_dias === null || death.edad_dias === undefined) {
        ageGroups['Desconocido']++;
        return;
      }

      const days = death.edad_dias;
      if (days <= 30) {
        ageGroups['0-30 días']++;
      } else if (days <= 180) {
        ageGroups['1-6 meses']++;
      } else if (days <= 365) {
        ageGroups['6-12 meses']++;
      } else if (days <= 730) {
        ageGroups['12-24 meses']++;
      } else {
        ageGroups['> 24 meses']++;
      }
    });

    return Object.entries(ageGroups).map(([age_group, count]) => ({
      age_group,
      count,
    }));
  };

  const processDeathsByCause = (deaths: any[]): DeathsByCause[] => {
    const causes: Record<string, number> = {};

    deaths.forEach(death => {
      const causa = death.causa_nombre || death.causa_texto || 'Sin especificar';
      causes[causa] = (causes[causa] || 0) + 1;
    });

    return Object.entries(causes)
      .map(([causa, count]) => ({ causa, count }))
      .sort((a, b) => b.count - a.count);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadMortalityData();
  };

  const exportToCSV = () => {
    const headers = [
      'Fecha Defunción',
      'Identificador Principal',
      'Nombre',
      'Sexo',
      'Raza',
      'Edad al Morir (días)',
      'Edad al Morir (meses)',
      'Causa',
      'Notas',
    ];

      const csvData = deaths.map(death => [
        format(new Date(death.fecha_defuncion), 'dd/MM/yyyy'),
        death.animal_id_tag ? `RP: ${death.animal_id_tag}` : (death.animal_name || 'Sin identificador'),
        death.animal_name || '',
        death.animal_sex || 'Sin especificar',
        death.animal_breed || 'Sin especificar',
        death.edad_dias ?? '',
        death.edad_meses ?? '',
        death.causa_nombre || death.causa_texto || 'Sin especificar',
        death.notas || '',
      ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mortalidad_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalDeaths = deaths.length;
  const averageAgeAtDeath = deaths
    .filter(d => d.edad_dias !== null && d.edad_dias !== undefined)
    .reduce((sum, d) => sum + (d.edad_dias || 0), 0) / deaths.filter(d => d.edad_dias !== null && d.edad_dias !== undefined).length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Mortalidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <Label>Fecha desde</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <Label>Fecha hasta</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
            <div>
              <Label>Raza</Label>
              <Input
                placeholder="Filtrar por raza"
                value={filters.breed}
                onChange={(e) => handleFilterChange('breed', e.target.value)}
              />
            </div>
            <div>
              <Label>Sexo</Label>
              <Select value={filters.sex} onValueChange={(value) => handleFilterChange('sex', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Hembra">Hembra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={applyFilters} disabled={loading} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{totalDeaths}</div>
            <p className="text-muted-foreground">Total de muertes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {averageAgeAtDeath ? Math.round(averageAgeAtDeath) : 0} días
            </div>
            <p className="text-muted-foreground">Edad promedio al morir</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {deathsByCause[0]?.causa || 'N/A'}
            </div>
            <p className="text-muted-foreground">Causa principal</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mortalidad por Edad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deathsByAge}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age_group" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mortalidad por Causa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deathsByCause.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ causa, percent }) => `${causa} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {deathsByCause.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Deaths Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Registro de Defunciones</CardTitle>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando datos...</p>
            </div>
          ) : deaths.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay registros de mortalidad</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Animal</TableHead>
                  <TableHead>Edad al Morir</TableHead>
                  <TableHead>Causa</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Raza</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deaths.map((death) => (
                  <TableRow key={death.id}>
                    <TableCell>
                      {format(new Date(death.fecha_defuncion), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {death.animal_id_tag ? `RP: ${death.animal_id_tag}` : (death.animal_name || 'Sin identificador')}
                        </div>
                        {death.animal_name && death.animal_id_tag && (
                          <div className="text-sm text-muted-foreground">
                            {death.animal_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {death.edad_dias !== null && death.edad_dias !== undefined ? (
                        <div>
                          <div>{death.edad_dias} días</div>
                          <div className="text-sm text-muted-foreground">
                            {death.edad_meses || 0} meses
                          </div>
                        </div>
                      ) : (
                        <Badge variant="secondary">Desconocida</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {death.causa_nombre || death.causa_texto || 'Sin especificar'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {death.animal_sex || 'Sin especificar'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {death.animal_breed || 'Sin especificar'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}