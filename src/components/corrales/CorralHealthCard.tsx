import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Syringe, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import type { CorralKPI } from "@/hooks/useCorralKPIs";

interface CorralHealthCardProps {
  corral: CorralKPI;
}

export function CorralHealthCard({ corral }: CorralHealthCardProps) {
  const getStatusIcon = () => {
    switch (corral.vaccination_status) {
      case 'excellent':
        return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case 'good':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'warning':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Syringe className="h-5 w-5 text-slate-600" />;
    }
  };

  const getStatusColor = () => {
    switch (corral.vaccination_status) {
      case 'excellent': return 'bg-emerald-500';
      case 'good': return 'bg-blue-500';
      case 'warning': return 'bg-amber-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getStatusBadgeVariant = () => {
    switch (corral.vaccination_status) {
      case 'excellent': return 'default' as const;
      case 'good': return 'secondary' as const;
      case 'warning': return 'secondary' as const;
      case 'critical': return 'destructive' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Syringe className="h-4 w-4" />
          Estado Sanitario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vaccination Coverage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Cobertura de Vacunación</span>
            <span className="font-medium">{corral.vaccination_percentage}%</span>
          </div>
          <Progress 
            value={corral.vaccination_percentage} 
            className="h-2"
          />
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Estado General</span>
          <Badge variant={getStatusBadgeVariant()} className="flex items-center gap-1">
            {getStatusIcon()}
            {corral.vaccination_status === 'excellent' && 'Excelente'}
            {corral.vaccination_status === 'good' && 'Bueno'}
            {corral.vaccination_status === 'warning' && 'Atención'}
            {corral.vaccination_status === 'critical' && 'Crítico'}
            {corral.vaccination_status === 'unknown' && 'Desconocido'}
          </Badge>
        </div>

        {/* Vaccination Alerts */}
        {corral.vaccination_alerts > 0 && (
          <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">Vacunas Vencidas</span>
            </div>
            <Badge variant="destructive">
              {corral.vaccination_alerts}
            </Badge>
          </div>
        )}

        {/* Summary */}
        <div className="text-xs text-slate-500 pt-2 border-t">
          {corral.animal_count} animales monitoreados
        </div>
      </CardContent>
    </Card>
  );
}