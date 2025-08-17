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
  XCircle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

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

  const appliedCount = requiredVaccines.filter(v => v.applied).length;
  const coveragePercentage = (appliedCount / requiredVaccines.length) * 100;

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
                Vacunas aplicadas: {appliedCount}/{requiredVaccines.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {coveragePercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={coveragePercentage} className="h-2" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {requiredVaccines.map((vaccine) => (
                <div 
                  key={vaccine.name}
                  className={`p-2 rounded-lg border text-sm ${
                    vaccine.applied 
                      ? 'bg-green-50 border-green-200 text-green-800' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {vaccine.applied ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    <span className="font-medium">{vaccine.name}</span>
                  </div>
                  {vaccine.frequency && (
                    <div className="text-xs mt-1">
                      Cada {vaccine.frequency} días
                    </div>
                  )}
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
              {mockVaccinations.map((vaccination) => (
                <TableRow key={vaccination.id}>
                  <TableCell className="font-medium">
                    {vaccination.vacuna}
                  </TableCell>
                  <TableCell>
                    {format(new Date(vaccination.fecha), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {vaccination.lote}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{vaccination.dosis}</div>
                      <div className="text-muted-foreground">{vaccination.via}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(vaccination.proximaDosis)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {vaccination.responsable}
                  </TableCell>
                </TableRow>
              ))}
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
            {mockVaccinations
              .filter(v => v.proximaDosis)
              .sort((a, b) => new Date(a.proximaDosis!).getTime() - new Date(b.proximaDosis!).getTime())
              .map((vaccination) => {
                const { status, days } = calculateStatus(vaccination.proximaDosis);
                return (
                  <div 
                    key={vaccination.id}
                    className={`p-3 rounded-lg border ${
                      status === 'overdue' ? 'border-red-200 bg-red-50' :
                      status === 'due' ? 'border-yellow-200 bg-yellow-50' :
                      'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{vaccination.vacuna}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(vaccination.proximaDosis!), 'dd/MM/yyyy', { locale: es })}
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(vaccination.proximaDosis)}
                        <div className="text-xs text-muted-foreground mt-1">
                          Lote: {vaccination.lote}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}