import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
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

interface MortalityReportsProps {
  filters?: {
    date_from?: Date;
    date_to?: Date;
    breed?: string;
    category?: string;
    corral_ids?: string[];
    include_sold_dead?: boolean;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function MortalityReports({ filters: globalFilters }: MortalityReportsProps) {
  const { t } = useTranslation(['mortality', 'common']);
  const [deaths, setDeaths] = useState<DeathRecord[]>([]);
  const [deathsByAge, setDeathsByAge] = useState<DeathsByAge[]>([]);
  const [deathsByCause, setDeathsByCause] = useState<DeathsByCause[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useSupabaseAuth();

  useEffect(() => {
    if (currentUser) {
      loadMortalityData();
    }
  }, [currentUser, globalFilters]);

  const loadMortalityData = async () => {
    if (!currentUser) {
      console.log('No current user available for mortality data loading');
      return;
    }

    setLoading(true);
    try {
      // Convert global filters to the format expected by the RPC function
      const dateFrom = globalFilters?.date_from ? globalFilters.date_from.toISOString().split('T')[0] : null;
      const dateTo = globalFilters?.date_to ? globalFilters.date_to.toISOString().split('T')[0] : null;
      
      // Use the new database function to get mortality data with proper joins
      const { data: deathsData, error } = await supabase.rpc('get_mortality_reports', {
        _user_id: currentUser.id,
        _date_from: dateFrom,
        _date_to: dateTo
      });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('🔍 MortalityReports fetched data:', deathsData);

      // Apply global filters for breed
      let processedDeaths = deathsData || [];
      
      if (globalFilters?.breed) {
        processedDeaths = processedDeaths.filter(death => 
          death.animal_breed?.toLowerCase().includes(globalFilters.breed.toLowerCase())
        );
      }

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
        title: t('common:error'),
        description: t('mortality:reports.errorLoading'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processDeathsByAge = (deaths: any[]): DeathsByAge[] => {
    const ageGroups = {
      '0-30days': 0,
      '1-6months': 0,
      '6-12months': 0,
      '12-24months': 0,
      'over24months': 0,
      'unknown': 0,
    };

    deaths.forEach(death => {
      // Only mark as unknown if edad_dias is null or undefined, not if it's 0
      if (death.edad_dias === null || death.edad_dias === undefined) {
        ageGroups['unknown']++;
        return;
      }

      const days = death.edad_dias;
      if (days <= 30) {
        ageGroups['0-30days']++;
      } else if (days <= 180) {
        ageGroups['1-6months']++;
      } else if (days <= 365) {
        ageGroups['6-12months']++;
      } else if (days <= 730) {
        ageGroups['12-24months']++;
      } else {
        ageGroups['over24months']++;
      }
    });

    return Object.entries(ageGroups).map(([age_group, count]) => ({
      age_group: t(`mortality:reports.ageGroups.${age_group}`),
      count,
    }));
  };

  const processDeathsByCause = (deaths: any[]): DeathsByCause[] => {
    const causes: Record<string, number> = {};

    deaths.forEach(death => {
      const causa = death.causa_nombre || death.causa_texto || t('mortality:reports.notSpecified');
      causes[causa] = (causes[causa] || 0) + 1;
    });

    return Object.entries(causes)
      .map(([causa, count]) => ({ causa, count }))
      .sort((a, b) => b.count - a.count);
  };

  const exportToCSV = () => {
    const headers = [
      t('mortality:reports.csvHeaders.deathDate'),
      t('mortality:reports.csvHeaders.mainIdentifier'),
      t('mortality:reports.csvHeaders.name'),
      t('mortality:reports.csvHeaders.sex'),
      t('mortality:reports.csvHeaders.breed'),
      t('mortality:reports.csvHeaders.ageDays'),
      t('mortality:reports.csvHeaders.ageMonths'),
      t('mortality:reports.csvHeaders.cause'),
      t('mortality:reports.csvHeaders.notes'),
    ];

      const csvData = deaths.map(death => [
        format(new Date(death.fecha_defuncion), 'dd/MM/yyyy'),
        death.animal_id_tag ? `RP: ${death.animal_id_tag}` : (death.animal_name || t('mortality:reports.noIdentifier')),
        death.animal_name || '',
        death.animal_sex || t('mortality:reports.notSpecified'),
        death.animal_breed || t('mortality:reports.notSpecified'),
        death.edad_dias ?? '',
        death.edad_meses ?? '',
        death.causa_nombre || death.causa_texto || t('mortality:reports.notSpecified'),
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
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{totalDeaths}</div>
            <p className="text-muted-foreground">{t('mortality:reports.totalDeaths')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {averageAgeAtDeath ? Math.round(averageAgeAtDeath) : 0} {t('mortality:reports.days')}
            </div>
            <p className="text-muted-foreground">{t('mortality:reports.avgAgeAtDeath')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {deathsByCause[0]?.causa || 'N/A'}
            </div>
            <p className="text-muted-foreground">{t('mortality:reports.mainCause')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('mortality:reports.mortalityByAge')}</CardTitle>
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
            <CardTitle>{t('mortality:reports.mortalityByCause')}</CardTitle>
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
            <CardTitle>{t('mortality:reports.deathRegistry')}</CardTitle>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <FileDown className="h-4 w-4" />
              {t('mortality:reports.exportCSV')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('mortality:reports.loading')}</p>
            </div>
          ) : deaths.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('mortality:reports.noRecords')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('mortality:reports.table.date')}</TableHead>
                  <TableHead>{t('mortality:reports.table.animal')}</TableHead>
                  <TableHead>{t('mortality:reports.table.ageAtDeath')}</TableHead>
                  <TableHead>{t('mortality:reports.table.cause')}</TableHead>
                  <TableHead>{t('mortality:reports.table.sex')}</TableHead>
                  <TableHead>{t('mortality:reports.table.breed')}</TableHead>
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
                          {death.animal_id_tag ? `RP: ${death.animal_id_tag}` : (death.animal_name || t('mortality:reports.noIdentifier'))}
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
                          <div>{death.edad_dias} {t('mortality:reports.days')}</div>
                          <div className="text-sm text-muted-foreground">
                            {death.edad_meses || 0} {t('mortality:reports.months')}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="secondary">{t('mortality:reports.unknown')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {death.causa_nombre || death.causa_texto || t('mortality:reports.notSpecified')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {death.animal_sex || t('mortality:reports.notSpecified')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {death.animal_breed || t('mortality:reports.notSpecified')}
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