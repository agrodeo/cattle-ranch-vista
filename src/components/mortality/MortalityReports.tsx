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
import { FileDown, Calendar, Skull, Activity } from "lucide-react";
import { ReportKpiCard } from "@/components/reports/shared/ReportKpiCard";
import { ReportChartCard } from "@/components/reports/shared/ReportChartCard";
import { CHART_GRID_PROPS, CHART_X_AXIS_PROPS, CHART_Y_AXIS_PROPS, CHART_BAR_RADIUS, CHART_TOOLTIP_STYLE, CHART_CURSOR, CHART_COLORS, DONUT_PROPS, BAR_COLORS } from "@/components/reports/shared/chartStyles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { isOnline } from "@/services/connectivity";
import { db } from "@/services/db";
import { StaleDataBanner } from "@/components/reports/StaleDataBanner";

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

const COLORS_PALETTE = CHART_COLORS.mixed;

export function MortalityReports({ filters: globalFilters }: MortalityReportsProps) {
  const { t } = useTranslation(['mortality', 'common']);
  const [deaths, setDeaths] = useState<DeathRecord[]>([]);
  const [deathsByAge, setDeathsByAge] = useState<DeathsByAge[]>([]);
  const [deathsByCause, setDeathsByCause] = useState<DeathsByCause[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useSupabaseAuth();
  const isMobile = useIsMobile();
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const CACHE_KEY = `mortality:${currentUser?.cabañaId}:${JSON.stringify(globalFilters)}`;

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

    if (!isOnline()) {
      try {
        const cached = await db.reports_cache.get(CACHE_KEY);
        if (cached) {
          const { deaths: d, deathsByAge: da, deathsByCause: dc } = cached.data;
          setDeaths(d);
          setDeathsByAge(da);
          setDeathsByCause(dc);
          setIsStale(true);
          setLastUpdated(cached.updated_at);
        }
      } catch (e) { console.warn('Failed to load cached mortality report:', e); }
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsStale(false);
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

      // Cache for offline
      try {
        await db.reports_cache.put({ key: CACHE_KEY, data: { deaths: processedDeaths, deathsByAge: ageGroups, deathsByCause: causes }, updated_at: new Date().toISOString() });
      } catch (e) { console.warn('Failed to cache mortality report:', e); }

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
      {isStale && <StaleDataBanner lastUpdated={lastUpdated} />}
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportKpiCard
          label={t('mortality:reports.totalDeaths')}
          value={totalDeaths}
          icon={Skull}
          variant="danger"
        />
        <ReportKpiCard
          label={t('mortality:reports.avgAgeAtDeath')}
          value={`${averageAgeAtDeath ? Math.round(averageAgeAtDeath) : 0} ${t('mortality:reports.days')}`}
          icon={Calendar}
          variant="neutral"
        />
        <ReportKpiCard
          label={t('mortality:reports.mainCause')}
          value={deathsByCause[0]?.causa || 'N/A'}
          icon={Activity}
          variant="warning"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportChartCard title={t('mortality:reports.mortalityByAge')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={deathsByAge}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="age_group" {...CHART_X_AXIS_PROPS} />
              <YAxis {...CHART_Y_AXIS_PROPS} />
              <Tooltip {...CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR} />
              <Bar dataKey="count" fill={BAR_COLORS.tertiary} radius={CHART_BAR_RADIUS} />
            </BarChart>
          </ResponsiveContainer>
        </ReportChartCard>

        <ReportChartCard title={t('mortality:reports.mortalityByCause')}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={deathsByCause.slice(0, 5)}
                cx="50%"
                cy="50%"
                dataKey="count"
                labelLine={false}
                label={({ causa, percent }: any) => percent >= 0.05 ? `${causa} ${(percent * 100).toFixed(0)}%` : ''}
                {...DONUT_PROPS}
              >
                {deathsByCause.slice(0, 5).map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_PALETTE[index % COLORS_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </ReportChartCard>
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
          ) : isMobile ? (
            // Mobile card layout
            <div className="space-y-3">
              {deaths.map((death) => (
                <Card key={death.id} className="border">
                  <CardContent className="p-4 space-y-3">
                    {/* Header: Animal identifier + Date */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm whitespace-normal">
                          {death.animal_id_tag ? `RP: ${death.animal_id_tag}` : (death.animal_name || t('mortality:reports.noIdentifier'))}
                        </div>
                        {death.animal_name && death.animal_id_tag && (
                          <div className="text-xs text-muted-foreground">
                            {death.animal_name}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(death.fecha_defuncion), 'dd/MM/yyyy')}
                      </div>
                    </div>
                    
                    {/* Age and Cause */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">{t('mortality:reports.table.ageAtDeath')}</div>
                        {death.edad_dias !== null && death.edad_dias !== undefined ? (
                          <div className="whitespace-normal">
                            <span>{death.edad_dias} {t('mortality:reports.days')}</span>
                            <span className="text-muted-foreground text-xs ml-1">
                              ({death.edad_meses || 0} {t('mortality:reports.months')})
                            </span>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">{t('mortality:reports.unknown')}</Badge>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Skull className="h-3 w-3" />
                          {t('mortality:reports.table.cause')}
                        </div>
                        <div className="whitespace-normal">
                          {death.causa_nombre || death.causa_texto || t('mortality:reports.notSpecified')}
                        </div>
                      </div>
                    </div>
                    
                    {/* Badges: Sex and Breed */}
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {death.animal_sex || t('mortality:reports.notSpecified')}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {death.animal_breed || t('mortality:reports.notSpecified')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop table layout
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