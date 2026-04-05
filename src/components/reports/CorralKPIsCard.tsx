import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Users, Heart, TrendingUp, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportFilters } from "./ReportsFilters";

interface CorralKPI {
  corral_id: string;
  name: string;
  headcount: number;
  pregnancy_rate: number;
  calving_rate: number;
  avg_adg_season: number;
  avg_weight: number;
}

interface CorralKPIsCardProps {
  filters?: ReportFilters;
  onViewCorralAnimals?: (corralId: string, corralName: string) => void;
}

export function CorralKPIsCard({ filters, onViewCorralAnimals }: CorralKPIsCardProps) {
  const [corrals, setCorrals] = useState<CorralKPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCorralKPIs();
  }, [filters]);

  const fetchCorralKPIs = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase.rpc('rpc_report_corrals_last_season', {
        _user_id: userData.user.id
      });

      if (error) {
        console.error('Error fetching corral KPIs:', error);
        return;
      }

      setCorrals(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPregnancyBadgeColor = (rate: number) => {
    if (rate >= 80) return "default"; // Green
    if (rate >= 60) return "secondary"; // Yellow
    return "destructive"; // Red
  };

  const getAdgBadgeColor = (adg: number) => {
    if (adg >= 0.8) return "default"; // Green
    if (adg >= 0.6) return "secondary"; // Yellow
    return "destructive"; // Red
  };

  const formatWeight = (weight: number) => {
    return `${weight.toFixed(0)}kg`;
  };

  const formatAdg = (adg: number) => {
    return `${adg.toFixed(3)} kg/d`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            KPIs por Corral (Última Temporada)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Summary cards for mobile
  const totalAnimals = corrals.reduce((sum, corral) => sum + corral.headcount, 0);
  const avgPregnancyRate = corrals.length > 0 
    ? corrals.reduce((sum, corral) => sum + corral.pregnancy_rate, 0) / corrals.length 
    : 0;
  const avgAdg = corrals.length > 0 
    ? corrals.reduce((sum, corral) => sum + corral.avg_adg_season, 0) / corrals.length 
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary cards for overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Corrales</span>
            </div>
            <div className="text-2xl font-bold">{corrals.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Animales</span>
            </div>
            <div className="text-2xl font-bold">{totalAnimals}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">% Preñez Prom.</span>
            </div>
            <div className="text-2xl font-bold">{avgPregnancyRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">ADG Prom.</span>
            </div>
            <div className="text-2xl font-bold">{formatAdg(avgAdg)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            KPIs Detallados por Corral
          </CardTitle>
        </CardHeader>
        <CardContent>
          {corrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <div className="text-lg font-medium mb-2">Sin corrales con animales</div>
              <div className="text-sm">
                No se encontraron corrales con animales activos
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corral</TableHead>
                    <TableHead className="text-center">Animales</TableHead>
                    <TableHead className="text-center">% Preñez</TableHead>
                    <TableHead className="text-center">ADG Prom.</TableHead>
                    <TableHead className="text-center hidden lg:table-cell">Peso Prom.</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {corrals.map((corral) => (
                    <TableRow key={corral.corral_id}>
                      <TableCell>
                        <div className="font-medium">{corral.name}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {corral.headcount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={getPregnancyBadgeColor(corral.pregnancy_rate)}
                          className="text-xs"
                        >
                          {corral.pregnancy_rate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={getAdgBadgeColor(corral.avg_adg_season)}
                          className="text-xs"
                        >
                          {formatAdg(corral.avg_adg_season)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        <span className="text-sm">
                          {corral.avg_weight > 0 ? formatWeight(corral.avg_weight) : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {onViewCorralAnimals && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewCorralAnimals(corral.corral_id, corral.name)}
                            title={`Ver animales de ${corral.name}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}