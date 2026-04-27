import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, BarChart3, Info, LayoutGrid, Scale, TrendingUp, Trophy } from "lucide-react";
import type { ReportFilters } from "@/pages/Reports";
import { ReportKpiCard } from "@/components/reports/shared/ReportKpiCard";
import { ReportChartCard } from "@/components/reports/shared/ReportChartCard";
import { CHART_CURSOR, CHART_GRID_PROPS, CHART_TOOLTIP_STYLE, CHART_X_AXIS_PROPS, CHART_Y_AXIS_PROPS, CHART_COLORS } from "@/components/reports/shared/chartStyles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GroupBy, RankingMetric, useCorralComparison } from "@/hooks/useCorralComparison";

interface CorralComparisonAnalyticsProps {
  filters: ReportFilters;
}

const MIN_DAYS_IN_CORRAL = 60;
const metricKey: Record<RankingMetric, "avg_adg" | "avg_peso_destete" | "avg_peso_final"> = {
  adg: "avg_adg",
  peso_destete: "avg_peso_destete",
  peso_final: "avg_peso_final",
};
const seasonMetricKey: Record<RankingMetric, "avg_adg" | "avg_peso_destete" | "avg_peso_final"> = metricKey;
const colors = CHART_COLORS.mixed;

function formatMetric(value: number | null | undefined, metric: RankingMetric) {
  if (value == null) return "—";
  return metric === "adg" ? value.toFixed(3) : value.toFixed(1);
}

function metricUnit(metric: RankingMetric) {
  return metric === "adg" ? "kg/día" : "kg";
}

function performanceColor(benchmarkPct: number | null | undefined) {
  if (benchmarkPct == null) return "hsl(var(--primary))";
  if (benchmarkPct >= 100) return "hsl(var(--primary))";
  if (benchmarkPct >= 85) return "hsl(38, 92%, 50%)";
  return "hsl(var(--destructive))";
}

function heatmapClass(benchmarkPct: number | null | undefined) {
  if (benchmarkPct == null) return "bg-muted text-muted-foreground";
  if (benchmarkPct >= 100) return "bg-primary/15 text-primary border-primary/20";
  if (benchmarkPct >= 85) return "bg-amber-500/15 text-amber-700 border-amber-500/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
}

export function CorralComparisonAnalytics({ filters }: CorralComparisonAnalyticsProps) {
  const { t } = useTranslation(["reports", "common"]);
  const [groupBy, setGroupBy] = useState<GroupBy>("year");
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>("adg");
  const [seasonMetric, setSeasonMetric] = useState<RankingMetric>("adg");

  const {
    seasonData,
    rankingData,
    bestCorral,
    worstCorral,
    adgSpread,
    heatmapMatrix,
    corralNames,
    seasonLabels,
    isLoading,
    error,
  } = useCorralComparison({
    date_from: filters.date_from as string | undefined,
    date_to: filters.date_to as string | undefined,
    corral_ids: filters.corral_ids,
    group_by: groupBy,
    min_days_in_corral: MIN_DAYS_IN_CORRAL,
    ranking_metric: rankingMetric,
  });

  const rankingChartData = useMemo(() => rankingData.map((row) => ({
    ...row,
    value: row[metricKey[rankingMetric]],
  })), [rankingData, rankingMetric]);

  const seasonChartData = useMemo(() => seasonLabels.map((season) => {
    const item: Record<string, string | number | null> = { season };
    seasonData.forEach((row) => {
      if (row.season_label === season) {
        item[row.corral_name] = row[seasonMetricKey[seasonMetric]];
        item[`${row.corral_name}__n`] = row.animal_count;
        item[`${row.corral_name}__delta`] = row.mejora_vs_anterior;
      }
    });
    return item;
  }), [seasonData, seasonLabels, seasonMetric]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{t("reports:corrales.error")}</div>;
  }

  if (!seasonData.length && !rankingData.length) {
    return <div className="rounded-lg border border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">{t("reports:corrales.emptyState")}</div>;
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <ReportKpiCard
          label={t("reports:corrales.bestCorral")}
          value={bestCorral?.corral_name || "—"}
          subtitle={bestCorral?.avg_adg ? `${bestCorral.avg_adg.toFixed(3)} kg/día` : t("reports:corrales.noData")}
          icon={Trophy}
          variant="success"
        />
        <ReportKpiCard
          label={t("reports:corrales.worstCorral")}
          value={worstCorral?.corral_name || "—"}
          subtitle={worstCorral?.avg_adg ? `${worstCorral.avg_adg.toFixed(3)} kg/día` : t("reports:corrales.noData")}
          icon={Scale}
          variant="danger"
        />
        <ReportKpiCard
          label={t("reports:corrales.adgSpread")}
          value={adgSpread != null ? adgSpread.toFixed(3) : "—"}
          subtitle="kg/día"
          icon={TrendingUp}
          variant="warning"
        />
        <ReportKpiCard
          label={t("reports:corrales.totalCorrales")}
          value={corralNames.length}
          subtitle={t("reports:corrales.animals", { count: rankingData.reduce((sum, row) => sum + row.animal_count, 0) })}
          icon={LayoutGrid}
          variant="neutral"
        />
      </div>

      <ReportChartCard title={t("reports:corrales.ranking")} icon={BarChart3} iconVariant="success">
        <div className="mb-4 flex justify-end">
          <Select value={rankingMetric} onValueChange={(value) => setRankingMetric(value as RankingMetric)}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="adg">{t("reports:corrales.metricAdg")}</SelectItem>
              <SelectItem value="peso_destete">{t("reports:corrales.metricDestete")}</SelectItem>
              <SelectItem value="peso_final">{t("reports:corrales.metricFinal")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankingChartData} layout="vertical" margin={{ left: 8, right: 30, top: 8, bottom: 8 }}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis type="number" {...CHART_X_AXIS_PROPS} />
              <YAxis dataKey="corral_name" type="category" width={86} {...CHART_Y_AXIS_PROPS} />
              <Tooltip {...CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR} formatter={(value: number) => [`${formatMetric(value, rankingMetric)} ${metricUnit(rankingMetric)}`, t("reports:corrales.ranking")]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} label={({ x, y, width, index }) => {
                const item = rankingChartData[index];
                const value = formatMetric(item.value, rankingMetric);
                const benchmark = item.benchmark_pct ? ` (${item.benchmark_pct}% ${t("reports:corrales.ofBenchmark")})` : "";
                return <text x={Number(x) + Number(width) + 8} y={Number(y) + 14} fill="hsl(var(--muted-foreground))" fontSize={11}>{`${value}${benchmark} · n=${item.animal_count}`}</text>;
              }}>
                {rankingChartData.map((entry) => <Cell key={entry.corral_id} fill={performanceColor(entry.benchmark_pct)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>

      <ReportChartCard title={t("reports:corrales.seasonComparison")} icon={TrendingUp} iconVariant="info">
        <div className="mb-4 flex flex-col sm:flex-row justify-end gap-2">
          <Select value={seasonMetric} onValueChange={(value) => setSeasonMetric(value as RankingMetric)}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="adg">{t("reports:corrales.metricAdg")}</SelectItem>
              <SelectItem value="peso_destete">{t("reports:corrales.metricDestete")}</SelectItem>
              <SelectItem value="peso_final">{t("reports:corrales.metricFinal")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="year">{t("reports:corrales.periodYear")}</SelectItem>
              <SelectItem value="semester">{t("reports:corrales.periodSemester")}</SelectItem>
              <SelectItem value="quarter">{t("reports:corrales.periodQuarter")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <div className="h-[340px] min-w-[680px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonChartData} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="season" {...CHART_X_AXIS_PROPS} />
                <YAxis {...CHART_Y_AXIS_PROPS} />
                <Tooltip {...CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR} formatter={(value: number, name: string, item: any) => {
                  const count = item.payload[`${name}__n`];
                  const delta = item.payload[`${name}__delta`];
                  const suffix = delta ? ` · ${delta > 0 ? "+" : ""}${delta}%` : "";
                  return [`${formatMetric(value, seasonMetric)} ${metricUnit(seasonMetric)} · n=${count || 0}${suffix}`, name];
                }} />
                {corralNames.slice(0, 8).map((corral, index) => (
                  <Bar key={corral} dataKey={corral} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ReportChartCard>

      <ReportChartCard title={t("reports:corrales.heatmap")} subtitle={t("reports:corrales.heatmapSubtitle")} icon={LayoutGrid} iconVariant="neutral">
        <div className="overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="grid" style={{ gridTemplateColumns: `minmax(120px, 1.2fr) repeat(${seasonLabels.length}, minmax(96px, 1fr))` }}>
              <div className="sticky left-0 z-10 bg-background p-2 text-xs font-semibold text-muted-foreground">Corral</div>
              {seasonLabels.map((season) => <div key={season} className="p-2 text-center text-xs font-semibold text-muted-foreground">{season}</div>)}
              {heatmapMatrix.map((row) => (
                <div key={row.corral} className="contents">
                  <div className="sticky left-0 z-10 bg-background border-t border-border p-2 text-sm font-medium text-foreground">{row.corral}</div>
                  {row.seasons.map((cell) => (
                    <div key={`${row.corral}-${cell.season}`} className="border-t border-border p-1.5">
                      <div className={cn("min-h-16 rounded-md border px-2 py-2 text-center", heatmapClass(cell.benchmarkPct))}>
                        <div className="text-sm font-bold">{cell.adg != null ? cell.adg.toFixed(3) : "—"}</div>
                        <div className="mt-1 flex items-center justify-center gap-1 text-[11px] opacity-80">
                          <span>{t("reports:corrales.nAnimals", { count: cell.animalCount })}</span>
                          {cell.mejora != null && (cell.mejora >= 0 ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-destructive" />)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ReportChartCard>

      <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-xs sm:text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <p>{t("reports:corrales.accuracyNote", { days: MIN_DAYS_IN_CORRAL })}</p>
      </div>
    </div>
  );
}
