import { Animal } from "@/types/animal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { 
  Syringe, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Shield
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useVaccinationCompliance, AnimalVaccinationCompliance } from "@/hooks/useVaccinationCompliance";
import { VaccinationStatusCard } from "@/components/vaccination/VaccinationStatusCard";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface AnimalVacunasProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

// Removed mock data - using real data only

export function AnimalVacunas({ animal }: AnimalVacunasProps) {
  const { getAnimalCompliance, loading: complianceLoading } = useVaccinationCompliance();
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [compliance, setCompliance] = useState<AnimalVaccinationCompliance | null>(null);

  const fetchVaccinations = async () => {
    try {
      setLoading(true);
      
      // Fetch from new animal_vaccines table
      const { data: newVaccinations, error: newError } = await supabase
        .from('animal_vaccines')
        .select(`
          *,
          vaccines(name)
        `)
        .eq('animal_id', animal.id)
        .order('date', { ascending: false });

      // Also fetch from old table for compatibility
      const { data: oldVaccinations, error: oldError } = await supabase
        .from('vacunas_historial')
        .select('*')
        .eq('animal_id', animal.id)
        .order('fecha', { ascending: false });

      // Merge and normalize data
      const allVaccinations = [
        ...(newVaccinations || []).map(v => ({
          id: v.id,
          vacuna: v.vaccines?.name || v.vaccine_code,
          fecha: v.date,
          lote: v.lot,
          dosis: v.dose,
          via: v.route,
          proximaDosis: v.next_due,
          source: 'new'
        })),
        ...(oldVaccinations || []).map(v => ({
          id: v.id,
          vacuna: v.vacuna,
          fecha: v.fecha,
          lote: v.lote,
          dosis: v.dosis,
          via: v.via,
          proximaDosis: v.proxima_dosis,
          source: 'old'
        }))
      ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      setVaccinations(allVaccinations);


    } catch (error) {
      console.error("Error fetching vaccinations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaccinations();
    loadCompliance();
  }, [animal.id]);

  const loadCompliance = async () => {
    const result = await getAnimalCompliance(animal.id);
    if (result) {
      setCompliance(result);
    }
  };

  // Refresh data when component mounts or animal changes
  useEffect(() => {
    const refreshData = async () => {
      await Promise.all([fetchVaccinations(), loadCompliance()]);
    };
    refreshData();
  }, [animal.id]);

  const calculateStatus = (proximaDosis: string | null) => {
    if (!proximaDosis) return { status: 'unique', days: 0 };
    
    const today = new Date();
    const nextDate = new Date(proximaDosis);
    const days = differenceInDays(nextDate, today);
    
    if (days < 0) return { status: 'overdue', days: Math.abs(days) };
    if (days <= 7) return { status: 'due', days };
    if (days <= 30) return { status: 'upcoming', days };
    return { status: 'current', days };
  };

  const getStatusBadge = (proximaDosis: string | null) => {
    const { status, days } = calculateStatus(proximaDosis);
    
    switch (status) {
      case 'overdue':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Vencida ({days}d)
          </Badge>
        );
      case 'due':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Vence en {days}d
          </Badge>
        );
      case 'upcoming':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En {days} días
          </Badge>
        );
      case 'unique':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Única dosis
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Al día
          </Badge>
        );
    }
  };

  const hasConfiguredRequirements = compliance && compliance.vaccines && compliance.vaccines.length > 0;

  if (complianceLoading) {
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
      {hasConfiguredRequirements && compliance && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {compliance.vaccines.filter(v => v.status === 'complete').length}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1 mt-1">
                  <CheckCircle className="h-3 w-3" />
                  Completas
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {compliance.vaccines.filter(v => v.status === 'incomplete').length}
                </div>
                <div className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  Incompletas
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {compliance.vaccines.filter(v => v.status === 'overdue').length}
                </div>
                <div className="text-xs text-red-600 dark:text-red-500 flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  Vencidas
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-400">
                  {compliance.vaccines.filter(v => v.status === 'not_started').length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-500 flex items-center gap-1 mt-1">
                  <Syringe className="h-3 w-3" />
                  Sin Iniciar
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vaccines requiring attention */}
          {compliance.vaccines.filter(v => v.status === 'overdue' || v.status === 'not_started' || v.status === 'incomplete').length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="h-5 w-5" />
                  Vacunas Pendientes
                </CardTitle>
                <CardDescription>
                  Estas vacunas requieren atención
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {compliance.vaccines
                    .filter(v => v.status === 'overdue' || v.status === 'not_started' || v.status === 'incomplete')
                    .map((vaccine) => (
                      <div key={vaccine.requirement_id} className="flex items-start justify-between p-3 bg-background rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{vaccine.vaccine_name}</span>
                            {vaccine.is_mandatory && (
                              <Badge variant="destructive" className="text-xs">
                                Obligatoria
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {vaccine.vaccine_type}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Dosis: </span>
                              <span className="font-medium">{vaccine.doses_given} / {vaccine.doses_required}</span>
                            </div>
                            {vaccine.last_vaccination_date && (
                              <div>
                                <span className="text-muted-foreground">Última: </span>
                                <span>{format(new Date(vaccine.last_vaccination_date), 'dd/MM/yyyy', { locale: es })}</span>
                              </div>
                            )}
                            {vaccine.next_due_date && (
                              <div>
                                <span className="text-muted-foreground">Próxima: </span>
                                <span>{format(new Date(vaccine.next_due_date), 'dd/MM/yyyy', { locale: es })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          {vaccine.status === 'overdue' && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Vencida {vaccine.days_overdue}d
                            </Badge>
                          )}
                          {vaccine.status === 'incomplete' && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Incompleta
                            </Badge>
                          )}
                          {vaccine.status === 'not_started' && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Syringe className="h-3 w-3" />
                              Sin Iniciar
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
          {compliance.vaccines.filter(v => v.status === 'complete' || v.status === 'due_soon').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Vacunas al Día
                </CardTitle>
                <CardDescription>
                  Esquema de vacunación completo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {compliance.vaccines
                    .filter(v => v.status === 'complete' || v.status === 'due_soon')
                    .map((vaccine) => (
                      <div key={vaccine.requirement_id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{vaccine.vaccine_name}</span>
                            <span className="text-xs text-muted-foreground">({vaccine.vaccine_type})</span>
                          </div>
                          <div className="flex gap-3 text-sm mt-1">
                            <span className="text-muted-foreground">
                              {vaccine.doses_given} / {vaccine.doses_required} dosis
                            </span>
                            {vaccine.last_vaccination_date && (
                              <span className="text-muted-foreground">
                                • Última: {format(new Date(vaccine.last_vaccination_date), 'dd/MM/yyyy', { locale: es })}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completa
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
              Configurar Vacunación
            </CardTitle>
            <CardDescription>
              Configure los requisitos de vacunación específicos de su cabaña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No hay requisitos de vacunación configurados
              </h3>
              <p className="text-muted-foreground mb-4">
                Configure los requisitos de vacunación específicos de su cabaña para hacer 
                seguimiento automático del estado de vacunación de sus animales.
              </p>
              <Button asChild>
                <Link to="/settings">
                  Configurar Vacunas
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
            Historial de Vacunaciones
          </CardTitle>
          <CardDescription>
            Todas las vacunas aplicadas a este animal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : vaccinations.length === 0 ? (
            <div className="text-center py-8">
              <Syringe className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No hay registros de vacunación para este animal
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vacuna</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Dosis/Vía</TableHead>
                  <TableHead>Próxima Dosis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaccinations.map((vaccination) => (
                  <TableRow key={vaccination.id}>
                    <TableCell className="font-medium">
                      {vaccination.vacuna}
                    </TableCell>
                    <TableCell>
                      {format(new Date(vaccination.fecha), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {vaccination.lote || 'N/A'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{vaccination.dosis || 'N/A'}</div>
                        <div className="text-muted-foreground">{vaccination.via || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {vaccination.proximaDosis ? (
                        <div>
                          <div className="text-sm">
                            {format(new Date(vaccination.proximaDosis), 'dd/MM/yyyy', { locale: es })}
                          </div>
                          {getStatusBadge(vaccination.proximaDosis)}
                        </div>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          Única dosis
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