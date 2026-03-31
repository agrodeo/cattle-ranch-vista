import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, TrendingDown, Minus, Target, 
  Award, Zap, Info, BarChart3 
} from 'lucide-react';
import { useTemporalProductionData, type GroupByPeriod, type WeightType } from '@/hooks/useTemporalProductionData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatWeight } from '@/lib/format';
import { useLanguage } from '@/hooks/useLanguage';
import { TrendIndicator } from './temporal/TrendIndicator';
import { PerformanceBadge, getPerformanceLevel } from './temporal/PerformanceBadge';
import { ExportButton } from './temporal/ExportButton';
import { useTranslation } from 'react-i18next';
import { ReportKpiCard } from './shared/ReportKpiCard';
import { ReportChartCard } from './shared/ReportChartCard';
import { CHART_GRID_PROPS, CHART_X_AXIS_PROPS, CHART_Y_AXIS_PROPS, CHART_TOOLTIP_STYLE, CHART_CURSOR, CHART_BAR_RADIUS, BAR_COLORS } from './shared/chartStyles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TemporalEvolutionAnalyticsProps {
  cabanaId: string | null;
  filters?: {
    corral_ids?: string[];
    category?: string;
    breed?: string;
    date_from?: string | null;
    date_to?: string | null;
  };
}

export function TemporalEvolutionAnalytics({ cabanaId, filters = {} }: TemporalEvolutionAnalyticsProps) {
  const { lang } = useLanguage();
  const { t } = useTranslation(['reports']);
  const [groupBy, setGroupBy] = useState<GroupByPeriod>('year');
  const [weightType, setWeightType] = useState<WeightType>('destete');

  const { data, loading, error, metrics, averageAnnualImprovement, totalAnimals } = useTemporalProductionData({
    cabanaId,
    groupBy,
    weightType,
    dateFrom: filters.date_from || null,
    dateTo: filters.date_to || null,
    filters: {
      corral_ids: filters.corral_ids,
      category: filters.category,
      breed: filters.breed
    }
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Info className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (data.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t('reports:temporal.noData')}</AlertDescription>
      </Alert>
    );
  }

  const trendDirection = metrics.trend.direction;
  const trendLabel = trendDirection === 'ascending' ? t('reports:temporal.ascending') : 
                     trendDirection === 'descending' ? t('reports:temporal.descending') : t('reports:temporal.stable');
  const trendVariant = trendDirection === 'ascending' ? 'success' as const : 
                       trendDirection === 'descending' ? 'danger' as const : 'neutral' as const;

  const chartData = data.map(d => ({
    periodo: d.periodo,
    nacimiento: d.peso_nacimiento_promedio != null ? Number(d.peso_nacimiento_promedio) : null,
    destete: d.peso_destete_promedio != null ? Number(d.peso_destete_promedio) : null,
    final: d.peso_final_promedio != null ? Number(d.peso_final_promedio) : null,
    animales: d.cantidad_animales
  }));

  const groupByLabel = groupBy === 'year' ? t('reports:temporal.year').toLowerCase() : 
                       groupBy === 'semester' ? t('reports:temporal.semester').toLowerCase() : 
                       groupBy === 'quarter' ? t('reports:temporal.quarter').toLowerCase() : 
                       t('reports:temporal.month').toLowerCase();

  const chartLegend = weightType === 'all' ? [
    { label: t('reports:temporal.birth'), color: BAR_COLORS.primary },
    { label: t('reports:temporal.weaning'), color: BAR_COLORS.secondary },
    { label: t('reports:temporal.final'), color: BAR_COLORS.tertiary },
  ] : weightType === 'destete' ? [
    { label: t('reports:temporal.weaning'), color: BAR_COLORS.secondary },
  ] : [
    { label: t('reports:temporal.final'), color: BAR_COLORS.tertiary },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <ReportChartCard
        title={t('reports:temporal.title')}
        subtitle={t('reports:temporal.subtitle')}
        icon={BarChart3}
        iconVariant="info"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="grid gap-4 grid-cols-2 flex-1 max-w-md">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {t('reports:temporal.groupBy')}
              </label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByPeriod)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">{t('reports:temporal.year')}</SelectItem>
                  <SelectItem value="semester">{t('reports:temporal.semester')}</SelectItem>
                  <SelectItem value="quarter">{t('reports:temporal.quarter')}</SelectItem>
                  <SelectItem value="month">{t('reports:temporal.month')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5 block">
                {t('reports:temporal.weightType')}
              </label>
              <Select value={weightType} onValueChange={(v) => setWeightType(v as WeightType)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="destete">{t('reports:temporal.weaning')}</SelectItem>
                  <SelectItem value="final">{t('reports:temporal.final')}</SelectItem>
                  <SelectItem value="all">{t('reports:temporal.all')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <ExportButton data={data} filename="analisis-temporal" />
        </div>
      </ReportChartCard>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ReportKpiCard
          label={t('reports:temporal.avgImprovement')}
          value=""
          subtitle={t('reports:temporal.perPeriod')}
          icon={Target}
          variant="default"
        >
          <div className="text-2xl font-bold tracking-tight">
            <TrendIndicator value={averageAnnualImprovement} showIcon={false} />
          </div>
        </ReportKpiCard>

        <ReportKpiCard
          label={t('reports:temporal.trend')}
          value={trendLabel}
          subtitle={`R² = ${metrics.trend.r2.toFixed(3)}`}
          icon={trendDirection === 'ascending' ? TrendingUp : trendDirection === 'descending' ? TrendingDown : Minus}
          variant={trendVariant}
        />

        <ReportKpiCard
          label={t('reports:temporal.bestPeriod')}
          value={metrics.bestPeriod?.periodo || '-'}
          subtitle={metrics.bestPeriod ? formatWeight(
            (weightType === 'final' ? metrics.bestPeriod.peso_final_promedio : metrics.bestPeriod.peso_destete_promedio) || 0,
            lang
          ) : undefined}
          icon={Award}
          variant="warning"
        />

        <ReportKpiCard
          label={t('reports:temporal.acceleration')}
          value=""
          subtitle={t('reports:temporal.vsHistorical')}
          icon={Zap}
          variant="info"
        >
          <div className="flex items-center gap-2">
            <TrendIndicator value={metrics.acceleration} />
          </div>
        </ReportKpiCard>
      </div>

      {/* Insights */}
      {metrics.insights.length > 0 && (
        <div className="space-y-2">
          {metrics.insights.map((insight, i) => (
            <Alert key={i} variant={insight.type === 'warning' ? 'destructive' : 'default'}>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{insight.title}:</strong> {insight.description}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Bar Chart */}
      <ReportChartCard
        title={t('reports:temporal.comparison')}
        subtitle={`${t('reports:temporal.avgWeights')} ${groupByLabel}`}
        icon={BarChart3}
        iconVariant="info"
        legend={chartLegend}
      >
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis dataKey="periodo" {...CHART_X_AXIS_PROPS} />
            <YAxis 
              {...CHART_Y_AXIS_PROPS}
              label={{ 
                value: t('reports:temporal.weight'), 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 }
              }}
            />
            <Tooltip {...CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR} />
            {weightType === 'all' ? (
              <>
                <Bar dataKey="nacimiento" fill={BAR_COLORS.primary} name={t('reports:temporal.birth')} radius={CHART_BAR_RADIUS} />
                <Bar dataKey="destete" fill={BAR_COLORS.secondary} name={t('reports:temporal.weaning')} radius={CHART_BAR_RADIUS} />
                <Bar dataKey="final" fill={BAR_COLORS.tertiary} name={t('reports:temporal.final')} radius={CHART_BAR_RADIUS} />
              </>
            ) : weightType === 'destete' ? (
              <Bar dataKey="destete" fill={BAR_COLORS.secondary} name={t('reports:temporal.weaning')} radius={CHART_BAR_RADIUS} />
            ) : (
              <Bar dataKey="final" fill={BAR_COLORS.tertiary} name={t('reports:temporal.final')} radius={CHART_BAR_RADIUS} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </ReportChartCard>

      {/* Detailed Table */}
      <ReportChartCard
        title={t('reports:temporal.detailedData')}
        subtitle={`${totalAnimals} ${t('reports:temporal.animalsAnalyzed')}`}
        iconVariant="neutral"
      >
        {/* Desktop Table */}
        <div className="hidden md:block rounded-lg border border-border/50 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">{t('reports:temporal.period')}</TableHead>
                <TableHead className="text-right font-semibold">{t('reports:temporal.birth')}</TableHead>
                <TableHead className="text-right font-semibold">{t('reports:temporal.weaning')}</TableHead>
                <TableHead className="text-right font-semibold">{t('reports:temporal.final')}</TableHead>
                <TableHead className="text-right font-semibold">{t('reports:temporal.animals')}</TableHead>
                <TableHead className="text-right font-semibold">{t('reports:temporal.improvement')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{row.periodo}</TableCell>
                  <TableCell className="text-right">
                    {row.peso_nacimiento_promedio ? formatWeight(row.peso_nacimiento_promedio, lang) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.peso_destete_promedio ? formatWeight(row.peso_destete_promedio, lang) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.peso_final_promedio ? formatWeight(row.peso_final_promedio, lang) : '-'}
                  </TableCell>
                  <TableCell className="text-right">{row.cantidad_animales}</TableCell>
                  <TableCell className="text-right">
                    {row.mejora_vs_anterior !== null ? (
                      <PerformanceBadge level={getPerformanceLevel(row.mejora_vs_anterior)} value={row.mejora_vs_anterior} />
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {data.map((row, i) => (
            <Card key={i} className="border-0 shadow-sm bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm">{row.periodo}</span>
                  <span className="text-xs text-muted-foreground">{row.cantidad_animales} {t('reports:temporal.animals').toLowerCase()}</span>
                </div>
                <div className="space-y-1.5">
                  {row.peso_nacimiento_promedio && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{t('reports:temporal.birth')}</span>
                      <span className="text-sm font-medium">{formatWeight(row.peso_nacimiento_promedio, lang)}</span>
                    </div>
                  )}
                  {row.peso_destete_promedio && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{t('reports:temporal.weaning')}</span>
                      <span className="text-sm font-medium">{formatWeight(row.peso_destete_promedio, lang)}</span>
                    </div>
                  )}
                  {row.peso_final_promedio && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{t('reports:temporal.final')}</span>
                      <span className="text-sm font-medium">{formatWeight(row.peso_final_promedio, lang)}</span>
                    </div>
                  )}
                  {row.mejora_vs_anterior !== null && (
                    <div className="flex justify-between items-center pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">{t('reports:temporal.improvement')}</span>
                      <PerformanceBadge level={getPerformanceLevel(row.mejora_vs_anterior)} value={row.mejora_vs_anterior} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ReportChartCard>
    </div>
  );
}
