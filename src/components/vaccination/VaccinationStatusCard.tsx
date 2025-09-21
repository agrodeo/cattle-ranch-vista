import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { VaccinationCompliance } from "@/hooks/useVaccinationLogic";

interface VaccinationStatusCardProps {
  compliance: VaccinationCompliance;
  loading?: boolean;
}

export function VaccinationStatusCard({ compliance, loading }: VaccinationStatusCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Estado de Vacunación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (percentage >= 70) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 90) return "Completo";
    if (percentage >= 70) return "Parcial";
    return "Incompleto";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Estado de Vacunación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(compliance.percentage)}
            <span className={`font-medium ${getStatusColor(compliance.percentage)}`}>
              {getStatusText(compliance.percentage)}
            </span>
          </div>
          <Badge variant={compliance.percentage >= 90 ? "default" : compliance.percentage >= 70 ? "secondary" : "destructive"}>
            {compliance.percentage}%
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={compliance.percentage} className="h-2" />
          <div className="text-sm text-muted-foreground">
            {compliance.completed} de {compliance.totalRequired} vacunas requeridas
          </div>
        </div>

        {/* Status Details */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-red-600">
              {compliance.missing.length}
            </div>
            <div className="text-xs text-muted-foreground">Faltantes</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-yellow-600">
              {compliance.overdue.length}
            </div>
            <div className="text-xs text-muted-foreground">Vencidas</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600">
              {compliance.upcoming.length}
            </div>
            <div className="text-xs text-muted-foreground">Próximas</div>
          </div>
        </div>

        {/* Critical Issues */}
        {(compliance.missing.length > 0 || compliance.overdue.length > 0) && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-destructive">
              Atención Requerida:
            </div>
            {compliance.missing.slice(0, 2).map((vaccine) => (
              <div key={vaccine.id} className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-muted-foreground">
                  {vaccine.vaccine_name} {vaccine.is_mandatory && "(Obligatoria)"}
                </span>
              </div>
            ))}
            {compliance.overdue.slice(0, 2).map((vaccine) => (
              <div key={vaccine.id} className="flex items-center gap-2 text-sm">
                <Clock className="h-3 w-3 text-yellow-500" />
                <span className="text-muted-foreground">
                  {vaccine.vaccine_name} (Vencida)
                </span>
              </div>
            ))}
            {(compliance.missing.length + compliance.overdue.length) > 4 && (
              <div className="text-xs text-muted-foreground">
                +{(compliance.missing.length + compliance.overdue.length) - 4} más...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}