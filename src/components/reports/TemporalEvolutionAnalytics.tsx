import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Minus, Calendar, Target, 
  Award, Zap, Info, BarChart3, LineChart 
} from 'lucide-react';
import { useTemporalProductionData, type GroupByPeriod, type WeightType } from '@/hooks/useTemporalProductionData';
import { LineChart as RechartsLine, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber, formatPercentage, formatWeight } from '@/lib/format';
import { useLanguage } from '@/hooks/useLanguage';

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
          No hay datos suficientes para mostrar el análisis temporal. Asegúrate de tener pesajes registrados en diferentes períodos.
        </AlertDescription>
      </Alert>
    );
  }

  const TrendIcon = metrics.trend.direction === 'ascending' ? TrendingUp : 
                     metrics.trend.direction === 'descending' ? TrendingDown : Minus;

  const trendColor = metrics.trend.direction === 'ascending' ? 'text-green-600' : 
                      metrics.trend.direction === 'descending' ? 'text-red-600' : 'text-gray-600';

  // Prepare chart data
  const chartData = data.map(d => ({
    periodo: d.periodo,
    nacimiento: d.peso_nacimiento_promedio || 0,
    destete: d.peso_destete_promedio || 0,
    final: d.peso_final_promedio || 0,
    animales: d.cantidad_animales
  }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análisis de Evolución Temporal
          </CardTitle>
          <CardDescription>
            Analiza la mejora de tu cabaña a lo largo del tiempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Agrupar por</label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByPeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Año</SelectItem>
                  <SelectItem value="semester">Semestre</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de peso</label>
              <Select value={weightType} onValueChange={(v) => setWeightType(v as WeightType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="destete">Destete</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
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
              <CardDescription>Mejora Promedio</CardDescription>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(averageAnnualImprovement, lang)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">por período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Tendencia</CardDescription>
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${trendColor}`}>
              {metrics.trend.direction === 'ascending' ? 'Subiendo' : 
               metrics.trend.direction === 'descending' ? 'Bajando' : 'Estable'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              R² = {metrics.trend.r2.toFixed(3)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Mejor Período</CardDescription>
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
              <CardDescription>Aceleración</CardDescription>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.acceleration > 0 ? 'text-green-600' : metrics.acceleration < 0 ? 'text-red-600' : ''}`}>
              {metrics.acceleration > 0 ? '+' : ''}{formatPercentage(metrics.acceleration, lang)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs histórico</p>
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

      {/* Line Chart - Evolution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Evolución de Pesos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLine data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periodo" />
              <YAxis label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {weightType === 'all' && (
                <>
                  <Line type="monotone" dataKey="nacimiento" stroke="hsl(var(--chart-1))" name="Nacimiento" strokeWidth={2} />
                  <Line type="monotone" dataKey="destete" stroke="hsl(var(--chart-2))" name="Destete" strokeWidth={2} />
                  <Line type="monotone" dataKey="final" stroke="hsl(var(--chart-3))" name="Final" strokeWidth={2} />
                </>
              )}
              {weightType === 'destete' && (
                <Line type="monotone" dataKey="destete" stroke="hsl(var(--chart-2))" name="Destete" strokeWidth={2} />
              )}
              {weightType === 'final' && (
                <Line type="monotone" dataKey="final" stroke="hsl(var(--chart-3))" name="Final" strokeWidth={2} />
              )}
            </RechartsLine>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar Chart - Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparación por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periodo" />
              <YAxis label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {weightType === 'all' ? (
                <>
                  <Bar dataKey="nacimiento" fill="hsl(var(--chart-1))" name="Nacimiento" />
                  <Bar dataKey="destete" fill="hsl(var(--chart-2))" name="Destete" />
                  <Bar dataKey="final" fill="hsl(var(--chart-3))" name="Final" />
                </>
              ) : weightType === 'destete' ? (
                <Bar dataKey="destete" fill="hsl(var(--chart-2))" name="Destete" />
              ) : (
                <Bar dataKey="final" fill="hsl(var(--chart-3))" name="Final" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Datos Detallados</CardTitle>
          <CardDescription>{totalAnimals} animales analizados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Nacimiento</TableHead>
                  <TableHead className="text-right">Destete</TableHead>
                  <TableHead className="text-right">Final</TableHead>
                  <TableHead className="text-right">Animales</TableHead>
                  <TableHead className="text-right">Mejora</TableHead>
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
                        <Badge variant={row.mejora_vs_anterior > 0 ? 'default' : 'secondary'}>
                          {row.mejora_vs_anterior > 0 ? '+' : ''}{formatPercentage(row.mejora_vs_anterior, lang)}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
