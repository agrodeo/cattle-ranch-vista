import { Animal } from "@/types/animal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  Syringe, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Shield,
  XCircle,
  ArrowLeft
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useVaccinationAlerts } from "@/hooks/useVaccinationAlerts";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AnimalVacunasProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

const mockVaccinations = [
  {
    id: '1',
    vacuna: 'Triple Viral',
    fecha: '2024-01-15',
    lote: 'TV2024-01',
    dosis: '2ml',
    via: 'Subcutánea',
    proximaDosis: '2024-07-15',
    responsable: 'Dr. García'
  },
  {
    id: '2',
    vacuna: 'Clostridiosis',
    fecha: '2024-01-10',
    lote: 'CL2024-05',
    dosis: '5ml',
    via: 'Intramuscular',
    proximaDosis: '2025-01-10',
    responsable: 'Dr. García'
  },
  {
    id: '3',
    vacuna: 'Brucelosis',
    fecha: '2023-12-01',
    lote: 'BR2023-12',
    dosis: '2ml',
    via: 'Subcutánea',
    proximaDosis: null, // Vacuna única
    responsable: 'Dr. Rodríguez'
  },
  {
    id: '4',
    vacuna: 'Carbunclo',
    fecha: '2023-11-20',
    lote: 'CB2023-08',
    dosis: '3ml',
    via: 'Subcutánea',
    proximaDosis: '2024-02-20', // Vencida
    responsable: 'Dr. García'
  }
];

const requiredVaccines = [
  { name: 'Triple Viral', frequency: 180, applied: true },
  { name: 'Clostridiosis', frequency: 365, applied: true },
  { name: 'Brucelosis', frequency: null, applied: true }, // Una sola vez
  { name: 'Carbunclo', frequency: 90, applied: false },
  { name: 'Aftosa', frequency: 180, applied: false }
];

export function AnimalVacunas({ animal }: AnimalVacunasProps) {
  const { alerts, loading: alertsLoading } = useVaccinationAlerts(animal.id);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVaccinations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vacunas_historial')
        .select('*')
        .eq('animal_id', animal.id)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setVaccinations(data || []);
    } catch (error) {
      console.error("Error fetching vaccinations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaccinations();
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

  // Use intelligent alerts instead of mock data
  const mandatoryAlerts = alerts.filter(alert => alert.is_mandatory);
  const overdue = alerts.filter(alert => alert.status === 'overdue').length;
  const dueSoon = alerts.filter(alert => alert.status === 'due_soon').length;
  const upToDate = alerts.filter(alert => alert.status === 'up_to_date').length;
  const missing = alerts.filter(alert => alert.status === 'missing').length;
  
  const totalRequired = alerts.length;
  const applied = upToDate + overdue + dueSoon; // Count any vaccine that has been applied
  const coveragePercentage = totalRequired > 0 ? (applied / totalRequired) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Cobertura de Vacunación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Cobertura de Vacunación
          </CardTitle>
          <CardDescription>
            Estado actual del plan sanitario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Esquema de vacunación: {applied}/{totalRequired}
              </span>
              <span className="text-sm text-muted-foreground">
                {coveragePercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={coveragePercentage} className="h-2" />
            
            {/* Status Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-green-50 border border-green-200 text-green-800 p-2 rounded text-center">
                <div className="font-medium">{upToDate}</div>
                <div>Al día</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded text-center">
                <div className="font-medium">{dueSoon}</div>
                <div>Próximas</div>
              </div>
              <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded text-center">
                <div className="font-medium">{overdue}</div>
                <div>Vencidas</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 text-gray-800 p-2 rounded text-center">
                <div className="font-medium">{missing}</div>
                <div>Faltantes</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {alerts.map((alert) => (
                <div 
                  key={alert.scheme_id}
                  className={`p-2 rounded-lg border text-sm ${
                    alert.status === 'up_to_date' 
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : alert.status === 'due_soon'
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                      : alert.status === 'overdue'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-gray-50 border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {alert.status === 'up_to_date' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : alert.status === 'overdue' ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : alert.status === 'due_soon' ? (
                      <Clock className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    <span className="font-medium">{alert.vaccine_name}</span>
                    {alert.is_mandatory && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        Obligatoria
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground">
                    {alert.status === 'missing' && 'Nunca aplicada'}
                    {alert.status === 'overdue' && `Vencida hace ${alert.days_until_due && Math.abs(alert.days_until_due)} días`}
                    {alert.status === 'due_soon' && `Vence en ${alert.days_until_due} días`}
                    {alert.status === 'up_to_date' && alert.last_vaccination_date && `Aplicada: ${format(new Date(alert.last_vaccination_date), 'dd/MM/yy')}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Próximas Vacunas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Próximas Vacunas
          </CardTitle>
          <CardDescription>
            Vacunas programadas y vencidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alertsLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Cargando alertas...
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No hay alertas de vacunación
              </div>
            ) : (
              alerts
                .filter(alert => alert.status !== 'up_to_date')
                .sort((a, b) => {
                  // Sort by priority: overdue > due_soon > missing
                  const priority = { overdue: 3, due_soon: 2, missing: 1 };
                  return (priority[b.status] || 0) - (priority[a.status] || 0);
                })
                .map((alert) => (
                  <div 
                    key={alert.scheme_id}
                    className={`p-3 rounded-lg border ${
                      alert.status === 'overdue' ? 'border-red-200 bg-red-50' :
                      alert.status === 'due_soon' ? 'border-yellow-200 bg-yellow-50' :
                      'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {alert.vaccine_name}
                          {alert.is_mandatory && (
                            <Badge variant="destructive" className="text-xs">
                              OBLIGATORIA
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {alert.description}
                        </div>
                        {alert.next_due_date && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Vence: {format(new Date(alert.next_due_date), 'dd/MM/yyyy', { locale: es })}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={
                            alert.status === 'overdue' ? 'destructive' :
                            alert.status === 'due_soon' ? 'secondary' :
                            'outline'
                          }
                          className="flex items-center gap-1"
                        >
                          {alert.status === 'overdue' && <AlertTriangle className="h-3 w-3" />}
                          {alert.status === 'due_soon' && <Clock className="h-3 w-3" />}
                          {alert.status === 'missing' && <XCircle className="h-3 w-3" />}
                          {alert.status === 'overdue' && `Vencida (${alert.days_until_due && Math.abs(alert.days_until_due)}d)`}
                          {alert.status === 'due_soon' && `Vence en ${alert.days_until_due}d`}
                          {alert.status === 'missing' && 'Faltante'}
                        </Badge>
                        {alert.last_vaccination_date && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Última: {format(new Date(alert.last_vaccination_date), 'dd/MM/yy')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}