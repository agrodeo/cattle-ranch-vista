import { Animal } from "@/types/animal";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { 
  Syringe, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAnimalVaccinationStatus } from "@/hooks/useVaccinationRequirements";
import { useAnimalVaccinations } from "@/hooks/useAnimalVaccinations";
import { Skeleton } from "@/components/ui/skeleton";

interface AnimalVacunasProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

// Removed mock data - using real data only

export function AnimalVacunas({ animal }: AnimalVacunasProps) {
  const { t } = useTranslation(['animals', 'common']);
  const { status: vaccinationStatus, loading: statusLoading } = useAnimalVaccinationStatus(animal.id);
  const { history, loading } = useAnimalVaccinations(animal.id);

  const calculateStatus = (nextDue: string | null) => {
    if (!nextDue) return { status: 'unique', days: 0 };
    
    const today = new Date();
    const nextDate = new Date(nextDue);
    const daysDiff = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) return { status: 'overdue', days: Math.abs(daysDiff) };
    if (daysDiff <= 7) return { status: 'due', days: daysDiff };
    if (daysDiff <= 30) return { status: 'upcoming', days: daysDiff };
    return { status: 'current', days: daysDiff };
  };

  const getStatusBadge = (nextDue: string | null) => {
    const { status, days } = calculateStatus(nextDue);
    
    switch (status) {
      case 'overdue':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t('animals:profile.vaccines.overdue')} ({days}d)
          </Badge>
        );
      case 'due':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t('animals:profile.vaccines.dueInXdays')} {days}{t('animals:profile.vaccines.inXdays')}
          </Badge>
        );
      case 'upcoming':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t('animals:profile.vaccines.dueInXdays')} {days} {t('animals:profile.vaccines.inXdays')}
          </Badge>
        );
      case 'unique':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {t('animals:profile.vaccines.uniqueDose')}
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {t('animals:profile.vaccines.upToDate')}
          </Badge>
        );
    }
  };

  const hasConfiguredRequirements = vaccinationStatus && vaccinationStatus.length > 0;

  if (statusLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Requirements-Based Vaccination Status */}
      {hasConfiguredRequirements && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {vaccinationStatus.filter(v => v.status === 'completa').length}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1 mt-1">
                  <CheckCircle className="h-3 w-3" />
                  {t('animals:profile.vaccines.complete')}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {vaccinationStatus.filter(v => v.status === 'pendiente').length}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {t('animals:profile.vaccines.pending')}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {vaccinationStatus.filter(v => v.status === 'vencida').length}
                </div>
                <div className="text-xs text-red-600 dark:text-red-500 flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t('animals:profile.vaccines.overdue')}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-400">
                  {vaccinationStatus.filter(v => v.status === 'no_aplicada').length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-500 flex items-center gap-1 mt-1">
                  <Syringe className="h-3 w-3" />
                  {t('animals:profile.vaccines.notApplied')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vaccines requiring attention */}
          {vaccinationStatus.filter(v => v.status === 'vencida' || v.status === 'no_aplicada' || v.status === 'pendiente').length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="h-5 w-5" />
                  {t('animals:profile.vaccines.pendingVaccines')}
                </CardTitle>
                <CardDescription>
                  {t('animals:profile.vaccines.requiresAttention')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vaccinationStatus
                    .filter(v => v.status === 'vencida' || v.status === 'no_aplicada' || v.status === 'pendiente')
                    .map((vaccine) => (
                      <div key={vaccine.requirement_id} className="flex items-start justify-between p-3 bg-background rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{vaccine.vaccine_name}</span>
                            {vaccine.is_mandatory && (
                              <Badge variant="destructive" className="text-xs">
                                {t('animals:profile.vaccines.mandatory')}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {vaccine.vaccine_type}
                          </div>
                           <div className="flex flex-wrap gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">{t('animals:profile.vaccines.doses')}: </span>
                              <span className="font-medium">{vaccine.doses_given} / {vaccine.doses_required}</span>
                            </div>
                            {vaccine.last_vaccination_date && (
                              <div>
                                <span className="text-muted-foreground">{t('animals:profile.vaccines.lastApplied')}: </span>
                                <span>{format(new Date(vaccine.last_vaccination_date), 'dd/MM/yyyy', { locale: es })}</span>
                              </div>
                            )}
                            {vaccine.next_due_date && (
                              <div>
                                <span className="text-muted-foreground">{t('animals:profile.vaccines.nextDue')}: </span>
                                <span>{format(new Date(vaccine.next_due_date), 'dd/MM/yyyy', { locale: es })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          {vaccine.status === 'vencida' && vaccine.days_overdue && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {t('animals:profile.vaccines.overdueXdays', { days: vaccine.days_overdue })}
                            </Badge>
                          )}
                          {vaccine.status === 'pendiente' && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t('animals:profile.vaccines.pending')}
                            </Badge>
                          )}
                          {vaccine.status === 'no_aplicada' && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Syringe className="h-3 w-3" />
                              {t('animals:profile.vaccines.notApplied')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete vaccines */}
          {vaccinationStatus.filter(v => v.status === 'completa').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  {t('animals:profile.vaccines.vaccinesUpToDate')}
                </CardTitle>
                <CardDescription>
                  {t('animals:profile.vaccines.completeSchedule')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {vaccinationStatus
                    .filter(v => v.status === 'completa')
                    .map((vaccine) => (
                      <div key={vaccine.requirement_id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{vaccine.vaccine_name}</span>
                            <span className="text-xs text-muted-foreground">({vaccine.vaccine_type})</span>
                          </div>
                           <div className="flex gap-3 text-sm mt-1">
                            <span className="text-muted-foreground">
                              {vaccine.doses_given} / {vaccine.doses_required} {t('animals:profile.vaccines.doses')} ({vaccine.compliance_percentage}%)
                            </span>
                            {vaccine.last_vaccination_date && (
                              <span className="text-muted-foreground">
                                • {t('animals:profile.vaccines.lastApplied')}: {format(new Date(vaccine.last_vaccination_date), 'dd/MM/yyyy', { locale: es })}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="default">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('animals:profile.vaccines.completeVaccine')}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Encourage users to configure their own vaccination requirements */}
      {!hasConfiguredRequirements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('animals:profile.vaccines.configureVaccination')}
            </CardTitle>
            <CardDescription>
              {t('animals:profile.vaccines.configureVaccinationDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('animals:profile.vaccines.noRequirementsConfigured')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t('animals:profile.vaccines.configureVaccinationFull')}
              </p>
              <Button asChild>
                <Link to="/settings">
                  {t('animals:profile.vaccines.configureVaccines')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Vacunaciones Aplicadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="h-4 w-4" />
            {t('animals:profile.vaccines.vaccinationHistory')}
          </CardTitle>
          <CardDescription>
            {t('animals:profile.vaccines.allVaccinesApplied')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Syringe className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {t('animals:profile.vaccines.noVaccinationRecords')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('animals:profile.vaccines.vaccine')}</TableHead>
                  <TableHead>{t('animals:profile.vaccines.date')}</TableHead>
                  <TableHead>{t('animals:profile.vaccines.lot')}</TableHead>
                  <TableHead>{t('animals:profile.vaccines.doseRoute')}</TableHead>
                  <TableHead>{t('animals:profile.vaccines.nextDose')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((vaccination) => (
                  <TableRow key={vaccination.id}>
                    <TableCell className="font-medium">
                      {vaccination.vaccine_name}
                    </TableCell>
                    <TableCell>
                      {format(new Date(vaccination.date), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {vaccination.lot || 'N/A'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{vaccination.dose || 'N/A'}</div>
                        <div className="text-muted-foreground">{vaccination.route || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {vaccination.next_due ? (
                        <div>
                          <div className="text-sm">
                            {format(new Date(vaccination.next_due), 'dd/MM/yyyy', { locale: es })}
                          </div>
                          {getStatusBadge(vaccination.next_due)}
                        </div>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          {t('animals:profile.vaccines.uniqueDose')}
                        </Badge>
                      )}
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