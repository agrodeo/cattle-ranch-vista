import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Minus, Calendar, Target, 
  Award, Zap, Info, BarChart3, LineChart as LineChartIcon 
} from 'lucide-react';
import { useTemporalProductionData, type GroupByPeriod, type WeightType } from '@/hooks/useTemporalProductionData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatPercentage, formatWeight } from '@/lib/format';
import { useLanguage } from '@/hooks/useLanguage';
import { TrendIndicator } from './temporal/TrendIndicator';
import { PerformanceBadge, getPerformanceLevel } from './temporal/PerformanceBadge';
import { ExportButton } from './temporal/ExportButton';
import { useTranslation } from 'react-i18next';

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
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
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
        <AlertDescription>
          {t('reports:temporal.noData')}
        </AlertDescription>
      </Alert>
    );
  }

  const TrendIcon = metrics.trend.direction === 'ascending' ? TrendingUp : 
                     metrics.trend.direction === 'descending' ? TrendingDown : Minus;

  const trendColor = metrics.trend.direction === 'ascending' ? 'text-green-600' : 
                      metrics.trend.direction === 'descending' ? 'text-red-600' : 'text-gray-600';

  // Prepare chart data - use null for missing values (better for Recharts)
  const chartData = data.map(d => ({
    periodo: d.periodo,
    nacimiento: d.peso_nacimiento_promedio != null ? Number(d.peso_nacimiento_promedio) : null,
    destete: d.peso_destete_promedio != null ? Number(d.peso_destete_promedio) : null,
    final: d.peso_final_promedio != null ? Number(d.peso_final_promedio) : null,
    animales: d.cantidad_animales
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('reports:temporal.title')}
              </CardTitle>
              <CardDescription>
                {t('reports:temporal.subtitle')}
              </CardDescription>
            </div>
            <ExportButton data={data} filename="analisis-temporal" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('reports:temporal.groupBy')}</label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByPeriod)}>
                <SelectTrigger>
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
              <label className="text-sm font-medium mb-2 block">{t('reports:temporal.weightType')}</label>
              <Select value={weightType} onValueChange={(v) => setWeightType(v as WeightType)}>
                <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>{t('reports:temporal.avgImprovement')}</CardDescription>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <TrendIndicator value={averageAnnualImprovement} showIcon={false} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('reports:temporal.perPeriod')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>{t('reports:temporal.trend')}</CardDescription>
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${trendColor}`}>
              {metrics.trend.direction === 'ascending' ? t('reports:temporal.ascending') : 
               metrics.trend.direction === 'descending' ? t('reports:temporal.descending') : t('reports:temporal.stable')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              R² = {metrics.trend.r2.toFixed(3)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>{t('reports:temporal.bestPeriod')}</CardDescription>
              <Award className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.bestPeriod?.periodo || '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.bestPeriod && formatWeight(
                (weightType === 'final' ? metrics.bestPeriod.peso_final_promedio : metrics.bestPeriod.peso_destete_promedio) || 0,
                lang
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>{t('reports:temporal.acceleration')}</CardDescription>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendIndicator value={metrics.acceleration} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('reports:temporal.vsHistorical')}</p>
          </CardContent>
        </Card>
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

      {/* Bar Chart - Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports:temporal.comparison')}</CardTitle>
          <CardDescription>
            {t('reports:temporal.avgWeights')} {groupBy === 'year' ? t('reports:temporal.year').toLowerCase() : groupBy === 'semester' ? t('reports:temporal.semester').toLowerCase() : groupBy === 'quarter' ? t('reports:temporal.quarter').toLowerCase() : t('reports:temporal.month').toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="periodo" 
                className="text-sm"
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <YAxis 
                label={{ 
                  value: t('reports:temporal.weight'), 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'hsl(var(--foreground))' }
                }}
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              {weightType === 'all' ? (
                <>
                  <Bar dataKey="nacimiento" fill="hsl(142 76% 36%)" name={t('reports:temporal.birth')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="destete" fill="hsl(221 83% 53%)" name={t('reports:temporal.weaning')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="final" fill="hsl(280 87% 65%)" name={t('reports:temporal.final')} radius={[4, 4, 0, 0]} />
                </>
              ) : weightType === 'destete' ? (
                <Bar dataKey="destete" fill="hsl(221 83% 53%)" name={t('reports:temporal.weaning')} radius={[4, 4, 0, 0]} />
              ) : (
                <Bar dataKey="final" fill="hsl(280 87% 65%)" name={t('reports:temporal.final')} radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports:temporal.detailedData')}</CardTitle>
          <CardDescription>{totalAnimals} {t('reports:temporal.animalsAnalyzed')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports:temporal.period')}</TableHead>
                  <TableHead className="text-right">{t('reports:temporal.birth')}</TableHead>
                  <TableHead className="text-right">{t('reports:temporal.weaning')}</TableHead>
                  <TableHead className="text-right">{t('reports:temporal.final')}</TableHead>
                  <TableHead className="text-right">{t('reports:temporal.animals')}</TableHead>
                  <TableHead className="text-right">{t('reports:temporal.improvement')}</TableHead>
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
                        <PerformanceBadge 
                          level={getPerformanceLevel(row.mejora_vs_anterior)} 
                          value={row.mejora_vs_anterior}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {data.map((row, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{row.periodo}</CardTitle>
                  <CardDescription>{row.cantidad_animales} {t('reports:temporal.animals').toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {row.peso_nacimiento_promedio && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('reports:temporal.birth')}:</span>
                      <span className="font-medium">{formatWeight(row.peso_nacimiento_promedio, lang)}</span>
                    </div>
                  )}
                  {row.peso_destete_promedio && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('reports:temporal.weaning')}:</span>
                      <span className="font-medium">{formatWeight(row.peso_destete_promedio, lang)}</span>
                    </div>
                  )}
                  {row.peso_final_promedio && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('reports:temporal.final')}:</span>
                      <span className="font-medium">{formatWeight(row.peso_final_promedio, lang)}</span>
                    </div>
                  )}
                  {row.mejora_vs_anterior !== null && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-muted-foreground">{t('reports:temporal.improvement')}:</span>
                      <PerformanceBadge 
                        level={getPerformanceLevel(row.mejora_vs_anterior)} 
                        value={row.mejora_vs_anterior}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
