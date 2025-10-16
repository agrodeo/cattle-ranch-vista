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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Estado de Vacunación
            </CardTitle>
            <CardDescription>
              Resumen del cumplimiento de requisitos configurados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {compliance.vaccines.filter(v => v.status === 'complete').length}
                </div>
                <div className="text-xs text-muted-foreground">Completas</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-yellow-600">
                  {compliance.vaccines.filter(v => v.status === 'incomplete').length}
                </div>
                <div className="text-xs text-muted-foreground">Incompletas</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-red-600">
                  {compliance.vaccines.filter(v => v.status === 'overdue').length}
                </div>
                <div className="text-xs text-muted-foreground">Vencidas</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-600">
                  {compliance.vaccines.filter(v => v.status === 'not_started').length}
                </div>
                <div className="text-xs text-muted-foreground">Sin Iniciar</div>
              </div>
            </div>

            {/* Vaccines Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vacuna</TableHead>
                    <TableHead className="text-center">Dosis</TableHead>
                    <TableHead>Última Aplicación</TableHead>
                    <TableHead>Próxima Dosis</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compliance.vaccines.map((vaccine) => (
                    <TableRow key={vaccine.requirement_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {vaccine.vaccine_name}
                          {vaccine.is_mandatory && (
                            <Badge variant="secondary" className="text-xs">
                              Obligatoria
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {vaccine.vaccine_type}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-sm">
                          {vaccine.doses_given} / {vaccine.doses_required}
                        </div>
                      </TableCell>
                      <TableCell>
                        {vaccine.last_vaccination_date ? (
                          <div className="text-sm">
                            {format(new Date(vaccine.last_vaccination_date), 'dd/MM/yyyy', { locale: es })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vaccine.next_due_date ? (
                          <div className="text-sm">
                            {format(new Date(vaccine.next_due_date), 'dd/MM/yyyy', { locale: es })}
                            {vaccine.is_overdue && (
                              <div className="text-xs text-red-600">
                                ({vaccine.days_overdue} días de atraso)
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vaccine.status === 'complete' && (
                          <Badge variant="default" className="flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Completa
                          </Badge>
                        )}
                        {vaccine.status === 'incomplete' && (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3" />
                            Incompleta
                          </Badge>
                        )}
                        {vaccine.status === 'overdue' && (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            Vencida
                          </Badge>
                        )}
                        {vaccine.status === 'due_soon' && (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <Clock className="h-3 w-3" />
                            Próxima
                          </Badge>
                        )}
                        {vaccine.status === 'not_started' && (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            Sin Iniciar
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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

      {/* Historial de Vacunaciones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Syringe className="h-4 w-4" />
                Historial de Vacunaciones
              </CardTitle>
              <CardDescription>
                Registro completo de vacunas aplicadas
              </CardDescription>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Agregar Vacuna
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vacuna</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Dosis/Vía</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Responsable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Cargando historial...
                  </TableCell>
                </TableRow>
              ) : vaccinations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No hay registros de vacunación
                  </TableCell>
                </TableRow>
              ) : (
                vaccinations.map((vaccination) => (
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
                      {getStatusBadge(vaccination.proxima_dosis)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      Sistema
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}