import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface VaccinationStatus {
  requirement_id: string;
  vaccine_code: string;
  vaccine_name: string;
  is_mandatory: boolean;
  status: 'completa' | 'pendiente' | 'vencida' | 'no_aplica';
  doses_given: number;
  doses_required: number;
  last_vaccination_date: string | null;
  next_due_date: string | null;
  days_overdue: number | null;
  compliance_percentage: number;
}

interface VaccinationStatusCardProps {
  status: VaccinationStatus[];
  loading?: boolean;
}

export function VaccinationStatusCard({ status, loading }: VaccinationStatusCardProps) {
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

  const totalRequired = status.length;
  const completed = status.filter(v => v.status === 'completa').length;
  const overdue = status.filter(v => v.status === 'vencida');
  const pending = status.filter(v => v.status === 'pendiente');
  const percentage = totalRequired > 0 ? (completed / totalRequired) * 100 : 0;

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
        {totalRequired === 0 ? (
          <div className="text-center py-6">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-muted-foreground mb-2">
              Sin requisitos de vacunación
            </h3>
            <p className="text-sm text-muted-foreground">
              No hay vacunas requeridas para este animal según su edad y sexo actual
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(percentage)}
                <span className={`font-medium ${getStatusColor(percentage)}`}>
                  {getStatusText(percentage)}
                </span>
              </div>
              <Badge variant={percentage >= 90 ? "default" : percentage >= 70 ? "secondary" : "destructive"}>
                {Math.round(percentage)}%
              </Badge>
            </div>

            <div className="space-y-2">
              <Progress value={percentage} className="h-2" />
              <div className="text-sm text-muted-foreground">
                {completed} de {totalRequired} vacunas requeridas
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-red-600">
                  {pending.length}
                </div>
                <div className="text-xs text-muted-foreground">Faltantes</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-yellow-600">
                  {overdue.length}
                </div>
                <div className="text-xs text-muted-foreground">Vencidas</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {completed}
                </div>
                <div className="text-xs text-muted-foreground">Completas</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
