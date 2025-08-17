import { Animal } from "@/types/animal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Heart, 
  Baby, 
  Plus, 
  CheckCircle, 
  XCircle,
  Calendar,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AnimalReproduccionProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

const mockPregnancies = [
  {
    id: '1',
    origen: 'IA',
    fechaInicio: '2024-01-05',
    estado: 'confirmada',
    fechaEstimadaParto: '2024-10-15',
    toro: 'Elite #123',
    observaciones: 'Tacto positivo confirmado'
  },
  {
    id: '2',
    origen: 'Monta Natural',
    fechaInicio: '2023-02-10',
    estado: 'paricion_viva',
    fechaEstimadaParto: '2023-11-01',
    fechaParto: '2023-10-28',
    toro: 'Braford #456',
    cria: 'Ternera #789'
  },
  {
    id: '3',
    origen: 'IA',
    fechaInicio: '2022-03-15',
    estado: 'perdida',
    fechaEstimadaParto: '2022-12-15',
    toro: 'Aberdeen #321',
    observaciones: 'Pérdida detectada en tacto del mes 6'
  }
];

const mockOffspring = [
  {
    id: '1',
    idTag: 'TER-001',
    nombre: 'Esperanza',
    sexo: 'Hembra',
    fechaNacimiento: '2023-10-28',
    estado: 'activo',
    pesoNacimiento: 35,
    padre: 'Braford #456'
  },
  {
    id: '2',
    idTag: 'TER-002',
    nombre: 'Valiente',
    sexo: 'Macho',
    fechaNacimiento: '2022-11-12',
    estado: 'vendido',
    pesoNacimiento: 38,
    padre: 'Elite #123'
  }
];

export function AnimalReproduccion({ animal }: AnimalReproduccionProps) {
  if (animal.sex !== 'Hembra') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Solo para Hembras</h3>
          <p className="text-muted-foreground">
            Los datos reproductivos solo están disponibles para animales hembra.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'confirmada': return 'bg-green-500';
      case 'pendiente': return 'bg-yellow-500';
      case 'paricion_viva': return 'bg-blue-500';
      case 'perdida': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'confirmada': return 'Confirmada';
      case 'pendiente': return 'Pendiente';
      case 'paricion_viva': return 'Parición Viva';
      case 'perdida': return 'Pérdida';
      default: return estado;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con métricas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preñeces Totales</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockPregnancies.length}</div>
            <p className="text-xs text-muted-foreground">
              {mockPregnancies.filter(p => p.estado === 'paricion_viva').length} exitosas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intervalo Parto</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">365d</div>
            <p className="text-xs text-muted-foreground">
              Promedio entre partos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Éxito</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67%</div>
            <p className="text-xs text-muted-foreground">
              Pariciones exitosas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historial de Preñeces */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Historial de Preñeces
              </CardTitle>
              <CardDescription>
                Registro completo de preñeces y servicios
              </CardDescription>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Registrar Servicio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origen</TableHead>
                <TableHead>Fecha Inicio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>FPP/Parto</TableHead>
                <TableHead>Toro</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPregnancies.map((pregnancy) => (
                <TableRow key={pregnancy.id}>
                  <TableCell>
                    <Badge variant="outline">{pregnancy.origen}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(pregnancy.fechaInicio), 'dd/MM/yyyy', { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-white ${getEstadoColor(pregnancy.estado)}`}>
                      {getEstadoLabel(pregnancy.estado)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {pregnancy.fechaParto ? 
                      format(new Date(pregnancy.fechaParto), 'dd/MM/yyyy', { locale: es }) :
                      format(new Date(pregnancy.fechaEstimadaParto), 'dd/MM/yyyy', { locale: es })
                    }
                  </TableCell>
                  <TableCell>{pregnancy.toro}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {pregnancy.estado === 'confirmada' && (
                        <>
                          <Button size="sm" variant="outline">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Parición
                          </Button>
                          <Button size="sm" variant="outline">
                            <XCircle className="h-3 w-3 mr-1" />
                            Pérdida
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Descendencia */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Baby className="h-4 w-4" />
                Descendencia ({mockOffspring.length})
              </CardTitle>
              <CardDescription>
                Crías registradas de esta hembra
              </CardDescription>
            </div>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Registrar Cría
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockOffspring.map((offspring) => (
              <Card key={offspring.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">
                        {offspring.nombre || offspring.idTag}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {offspring.idTag}
                      </p>
                    </div>
                    <Badge 
                      variant={offspring.estado === 'activo' ? 'default' : 'secondary'}
                    >
                      {offspring.estado}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sexo:</span>
                      <span>{offspring.sexo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nacimiento:</span>
                      <span>
                        {format(new Date(offspring.fechaNacimiento), 'dd/MM/yyyy', { locale: es })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Peso nac.:</span>
                      <span>{offspring.pesoNacimiento} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Padre:</span>
                      <span>{offspring.padre}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}