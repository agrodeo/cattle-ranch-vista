import { Animal } from "@/types/animal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
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
import { useVaccinationLogic } from "@/hooks/useVaccinationLogic";
import { VaccinationStatusCard } from "@/components/vaccination/VaccinationStatusCard";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface AnimalVacunasProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

// Removed mock data - using real data only

export function AnimalVacunas({ animal }: AnimalVacunasProps) {
  const { alerts, loading: alertsLoading } = useVaccinationAlerts(animal.id);
  const { calculateAnimalCompliance } = useVaccinationLogic();
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [locationAlerts, setLocationAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [compliance, setCompliance] = useState<any>(null);
  const [complianceLoading, setComplianceLoading] = useState(true);

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

      // Get location-aware due vaccines using RPC
      const { data: dueVaccines } = await supabase.rpc('compute_due_vaccines_for_animal', {
        _animal_id: animal.id
      });
      setLocationAlerts((dueVaccines as any)?.due_vaccines || []);

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
    try {
      setComplianceLoading(true);
      const animalCompliance = await calculateAnimalCompliance(animal.id);
      setCompliance(animalCompliance);
    } catch (error) {
      console.error('Error loading compliance:', error);
    } finally {
      setComplianceLoading(false);
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

  // Only use the new requirements-based system
  const hasConfiguredRequirements = compliance && compliance.totalRequired > 0;

  return (
    <div className="space-y-6">
      {/* New Requirements-Based Vaccination Status */}
      <VaccinationStatusCard 
        compliance={compliance || {
          animalId: animal.id,
          totalRequired: 0,
          completed: 0,
          percentage: 0,
          missing: [],
          overdue: [],
          upcoming: []
        }} 
        loading={complianceLoading} 
      />

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
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Cargando alertas...
              </div>
            ) : !hasConfiguredRequirements ? (
              <div className="text-center py-4 text-muted-foreground">
                No hay alertas de vacunación. Configure sus requisitos en Configuración.
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No hay próximas vacunas según sus requisitos configurados.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
                  <div 
                    key={alert.vaccine_code || alert.scheme_id || index}
                    className={`p-3 rounded-lg border ${
                      alert.mandatory ? 'border-red-200 bg-red-50' :
                      'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {alert.vaccine_name || alert.scheme_id}
                          {alert.mandatory && (
                            <Badge variant="destructive" className="text-xs">
                              OBLIGATORIA
                            </Badge>
                          )}
                          {alert.campaign_active && (
                            <Badge variant="outline" className="text-xs">
                              CAMPAÑA ACTIVA
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {alert.rationale}
                        </div>
                        {alert.next_due_date && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Próxima: {format(new Date(alert.next_due_date), 'dd/MM/yyyy', { locale: es })}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={alert.mandatory ? 'destructive' : 'secondary'}
                          className="flex items-center gap-1"
                        >
                          {alert.mandatory ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {alert.mandatory ? 'Obligatoria' : 'Recomendada'}
                        </Badge>
                        {alert.last_dose_date && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Última: {format(new Date(alert.last_dose_date), 'dd/MM/yy')}
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