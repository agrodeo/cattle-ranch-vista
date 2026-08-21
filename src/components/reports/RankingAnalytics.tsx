import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Star, Trophy, Users } from "lucide-react";
import { useHerdRanking, type RankedAnimal } from "@/hooks/useHerdRanking";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { ReportFilters } from "@/pages/Reports";
import { AnimalScoreBadge } from "@/components/animals/profile/AnimalScoreBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ReportKpiCard } from "./shared/ReportKpiCard";

interface RankingAnalyticsProps {
  filters: ReportFilters;
}

type SortField = "overall" | "production" | "reproduction" | "health" | "genetics" | "longevity" | "ageMonths";
type SexFilter = "all" | "Hembra" | "Macho";
type CategoryFilter = "all" | "Vaca" | "Vaquillona" | "Ternera" | "Toro" | "Novillito" | "Ternero";

const sortFields: SortField[] = ["overall", "production", "reproduction", "health", "genetics", "longevity", "ageMonths"];
const categories: CategoryFilter[] = ["all", "Vaca", "Vaquillona", "Ternera", "Toro", "Novillito", "Ternero"];

function scoreValue(animal: RankedAnimal, field: SortField): number {
  if (field === "ageMonths") return animal.ageMonths;
  return animal.score[field];
}

function rowBorderClass(score: RankedAnimal["score"]): string {
  if (!score.hasEnoughData) return "border-l-muted";
  if (score.overall >= 8) return "border-l-primary";
  if (score.overall >= 6) return "border-l-secondary-foreground";
  if (score.overall >= 4) return "border-l-accent-foreground";
  return "border-l-destructive";
}

function rankClass(rank: number): string {
  if (rank === 1) return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  if (rank === 2) return "bg-muted text-muted-foreground border-border";
  if (rank === 3) return "bg-orange-500/10 text-orange-700 border-orange-500/30";
  return "bg-background text-muted-foreground border-border";
}

function dimensionText(value: number, enabled = true): string {
  return enabled ? value.toFixed(1) : "—";
}

function dimensionCell(animal: RankedAnimal, key: "production" | "reproduction" | "health" | "genetics" | "longevity"): string {
  return dimensionText(animal.score[key], animal.score.applicable[key]);
}

export function RankingAnalytics({ filters }: RankingAnalyticsProps) {
  const { t } = useTranslation(["reports", "animals"]);
  const { data, isLoading, error } = useHerdRanking(filters);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [sexFilter, setSexFilter] = useState<SexFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sortField, setSortField] = useState<SortField>("overall");
  const [sortAsc, setSortAsc] = useState(false);
  const [showUnscored, setShowUnscored] = useState(false);

  const filteredAnimals = useMemo(() => {
    const list = [...(data?.animals || [])].filter((animal) => {
      const sexMatches = sexFilter === "all" || animal.sex === sexFilter;
      const categoryMatches = categoryFilter === "all" || animal.category === categoryFilter;
      return sexMatches && categoryMatches;
    });

    const scored = list.filter((animal) => animal.score.hasEnoughData);
    const unscored = list.filter((animal) => !animal.score.hasEnoughData).sort((a, b) => a.idTag.localeCompare(b.idTag));

    scored.sort((a, b) => {
      const aVal = scoreValue(a, sortField);
      const bVal = scoreValue(b, sortField);
      return sortAsc ? aVal - bVal : bVal - aVal;
    });

    return {
      scored: scored.map((animal, index) => ({ ...animal, rank: index + 1 })),
      unscored,
    };
  }, [data, sexFilter, categoryFilter, sortField, sortAsc]);

  const sortLabel = (field: SortField) => t(`reports:ranking.sort${field === "ageMonths" ? "Age" : field.charAt(0).toUpperCase() + field.slice(1)}`);

  const handleHeaderSort = (field: SortField) => {
    if (sortField === field) setSortAsc((value) => !value);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleHeaderSort(field)}>
      <div className="flex items-center gap-1 whitespace-nowrap">
        {children}
        {sortField === field && (sortAsc ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />)}
      </div>
    </TableHead>
  );

  const ScoreBadges = ({ animal }: { animal: RankedAnimal }) => (
    <div className="flex flex-wrap gap-1">
      {animal.score.badges.slice(0, 2).map((badge) => (
        <Badge
          key={badge.id}
          variant="outline"
          className={cn(
            "max-w-full truncate rounded-md px-1.5 py-0 text-[10px]",
            badge.variant === "success" && "border-primary/20 bg-primary/10 text-primary",
            badge.variant === "warning" && "border-destructive/20 bg-destructive/10 text-destructive",
          )}
        >
          {t(`animals:score.${badge.labelKey}`, badge.labelParams)}
        </Badge>
      ))}
    </div>
  );

  const SexBadge = ({ sex }: { sex: string }) => {
    const isFemale = sex === "Hembra";
    return (
      <Badge variant="outline" className={cn("rounded-md px-2", isFemale ? "border-primary/20 bg-primary/10 text-primary" : "border-muted-foreground/20 bg-muted text-foreground")}>
        {isFemale ? "H" : "M"}
      </Badge>
    );
  };

  const Filters = () => (
    <Card>
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <ToggleGroup type="single" value={sexFilter} onValueChange={(value) => value && setSexFilter(value as SexFilter)} className="justify-start rounded-lg border border-border bg-background p-1">
          <ToggleGroupItem value="all" size="sm" className="px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{t("reports:ranking.filterAll")}</ToggleGroupItem>
          <ToggleGroupItem value="Hembra" size="sm" className="px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{t("reports:ranking.filterFemales")}</ToggleGroupItem>
          <ToggleGroupItem value="Macho" size="sm" className="px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{t("reports:ranking.filterMales")}</ToggleGroupItem>
        </ToggleGroup>
        <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:items-center">
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
            <SelectTrigger className="h-9 min-w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((category) => <SelectItem key={category} value={category}>{category === "all" ? t("reports:filters.allCategories") : category}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
            <SelectTrigger className="h-9 min-w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {sortFields.filter((field) => (field !== "longevity" || categoryFilter === "all" || categoryFilter === "Vaca")).map((field) => <SelectItem key={field} value={field}>{sortLabel(field)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setSortAsc((value) => !value)} aria-label={sortAsc ? "Ascending" : "Descending"}>
            {sortAsc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const MobileCard = ({ animal }: { animal: RankedAnimal }) => (
    <Link to={`/animales/${animal.animalId}`} className={cn("block rounded-lg border border-l-4 bg-card p-3 shadow-sm", rowBorderClass(animal.score))}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1 text-xs font-bold", rankClass(animal.rank))}>#{animal.rank}</span>
            <span className="truncate font-mono text-sm font-semibold text-foreground">{animal.idTag}</span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{animal.breed || "—"} · {animal.sex || "—"} · {animal.ageMonths}{t("reports:ranking.months")} · {animal.corralName || "—"}</p>
        </div>
        <AnimalScoreBadge score={animal.score.overall} hasEnoughData={animal.score.hasEnoughData} size="md" />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-semibold">
        <span>{t("reports:ranking.production")} {dimensionCell(animal, "production")}</span>
        <span>{t("reports:ranking.reproduction")} {dimensionCell(animal, "reproduction")}</span>
        <span>{t("reports:ranking.health")} {dimensionCell(animal, "health")}</span>
        <span>{t("reports:ranking.genetics")} {dimensionCell(animal, "genetics")}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {animal.category} · {t("reports:ranking.confidence")} {animal.score.confidence}%
        {animal.categoryPercentile != null ? ` · ${t("reports:ranking.categoryPercentile", { pct: animal.categoryPercentile })}` : ""}
      </p>
      <div className="mt-2"><ScoreBadges animal={animal} /></div>
    </Link>
  );

  if (isLoading) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">{t("reports:reproductive.loading")}</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="p-6 text-sm text-destructive">{t("reports:reproductive.error")}</CardContent></Card>;
  }

  if (!data?.animals.length) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">{t("reports:ranking.emptyState")}</CardContent></Card>;
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpiCard label={t("reports:ranking.scoredAnimals")} value={data.stats.totalScored} subtitle={t("reports:ranking.insufficientData", { count: data.stats.totalInsufficient })} icon={Users} variant="neutral" />
        <ReportKpiCard label={t("reports:ranking.avgScore")} value={data.stats.avgOverall.toFixed(1)} subtitle="/10" icon={Star} variant="default" />
        <ReportKpiCard label={t("reports:ranking.topPerformers")} value={data.stats.topPerformers} subtitle={t("reports:ranking.animals")} icon={Trophy} variant="success" />
        <ReportKpiCard label={t("reports:ranking.needsAttention")} value={data.stats.needsAttention} subtitle={t("reports:ranking.animals")} icon={AlertTriangle} variant={data.stats.needsAttention > 0 ? "danger" : "neutral"} />
      </div>

      <Filters />

      {isMobile ? (
        <div className="space-y-3">
          {filteredAnimals.scored.map((animal) => <MobileCard key={animal.animalId} animal={animal} />)}
          {filteredAnimals.unscored.length > 0 && (
            <Collapsible open={showUnscored} onOpenChange={setShowUnscored}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {t("reports:ranking.unscoredSection", { count: filteredAnimals.unscored.length })}
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showUnscored && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {filteredAnimals.unscored.map((animal) => <MobileCard key={animal.animalId} animal={animal} />)}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle>{t("reports:ranking.title")}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reports:ranking.rank")}</TableHead>
                  <TableHead>{t("reports:ranking.tag")}</TableHead>
                  <TableHead>{t("reports:ranking.name")}</TableHead>
                  <TableHead>{t("reports:ranking.sex")}</TableHead>
                  <TableHead>{t("reports:ranking.breed")}</TableHead>
                  <SortHeader field="ageMonths">{t("reports:ranking.age")}</SortHeader>
                  <TableHead>{t("reports:ranking.corral")}</TableHead>
                  <SortHeader field="overall">{t("reports:ranking.score")}</SortHeader>
                  <SortHeader field="production">{t("reports:ranking.production")}</SortHeader>
                  <SortHeader field="reproduction">{t("reports:ranking.reproduction")}</SortHeader>
                  <SortHeader field="health">{t("reports:ranking.health")}</SortHeader>
                  <SortHeader field="genetics">{t("reports:ranking.genetics")}</SortHeader>
                  <SortHeader field="longevity">{t("reports:ranking.longevity")}</SortHeader>
                  <TableHead>{t("reports:ranking.data")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnimals.scored.map((animal) => (
                  <TableRow key={animal.animalId} className={cn("cursor-pointer border-l-4", rowBorderClass(animal.score))} onClick={() => navigate(`/animales/${animal.animalId}`)}>
                    <TableCell><span className={cn("inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-xs font-bold", rankClass(animal.rank))}>#{animal.rank}</span></TableCell>
                    <TableCell><Link to={`/animales/${animal.animalId}`} onClick={(event) => event.stopPropagation()} className="font-mono text-sm font-semibold text-primary hover:underline">{animal.idTag}</Link></TableCell>
                    <TableCell className="max-w-36 truncate">{animal.name || "—"}</TableCell>
                    <TableCell><SexBadge sex={animal.sex} /></TableCell>
                    <TableCell>{animal.breed || "—"}</TableCell>
                    <TableCell>{animal.ageMonths}{t("reports:ranking.months")} · {animal.category}</TableCell>
                    <TableCell>{animal.corralName || "—"}</TableCell>
                    <TableCell><div className="flex flex-col gap-1"><AnimalScoreBadge score={animal.score.overall} hasEnoughData={animal.score.hasEnoughData} size="md" /><ScoreBadges animal={animal} /></div></TableCell>
                    <TableCell className="font-semibold tabular-nums">{dimensionCell(animal, "production")}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{dimensionCell(animal, "reproduction")}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{dimensionCell(animal, "health")}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{dimensionCell(animal, "genetics")}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{dimensionCell(animal, "longevity")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex flex-col leading-tight">
                        <span>{animal.score.dataCompleteness}%</span>
                        <span className="text-[10px]">{t("reports:ranking.confidence")} {animal.score.confidence}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredAnimals.unscored.length > 0 && (
              <Collapsible open={showUnscored} onOpenChange={setShowUnscored} className="mt-4">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {t("reports:ranking.unscoredSection", { count: filteredAnimals.unscored.length })}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showUnscored && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 rounded-lg border">
                  {filteredAnimals.unscored.map((animal) => (
                    <Link key={animal.animalId} to={`/animales/${animal.animalId}`} className="flex items-center justify-between gap-3 border-b p-3 text-sm last:border-b-0 hover:bg-muted/40">
                      <span className="font-mono font-semibold text-primary">{animal.idTag}</span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{animal.name || animal.breed || "—"}</span>
                      <AnimalScoreBadge score={0} hasEnoughData={false} />
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
