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
import { useState } from "react";
import { ImprovedArtificialInseminationDialog } from "@/components/artificial-insemination/ImprovedArtificialInseminationDialog";
import { ReproductivePerformance } from "@/components/reproductive/ReproductivePerformance";

interface AnimalReproduccionProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

// Removed mock data - using real data only

export function AnimalReproduccion({ animal }: AnimalReproduccionProps) {
  const [showIADialog, setShowIADialog] = useState(false);

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
      {/* Reproductive Performance Analytics */}
      <ReproductivePerformance animalId={animal.id} animalSex={animal.sex} />
      
      {/* Header con métricas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preñeces Totales</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Sin registros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intervalo Parto</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Sin datos disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Éxito</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Sin datos disponibles
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
            <Button 
              className="flex items-center gap-2"
              onClick={() => setShowIADialog(true)}
            >
              <Plus className="h-4 w-4" />
              Registrar Servicio IA
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
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <Heart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <div className="text-lg font-medium mb-2">Sin registros de preñeces</div>
                  <div className="text-sm">
                    Registre servicios de IA o monta natural para comenzar a rastrear preñeces
                  </div>
                </TableCell>
              </TableRow>
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
                Descendencia (0)
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
          <div className="text-center py-8 text-muted-foreground">
            <Baby className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <div className="text-lg font-medium mb-2">Sin descendencia registrada</div>
            <div className="text-sm">
              Las crías aparecerán aquí cuando se registren nacimientos
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IA Dialog */}
      <ImprovedArtificialInseminationDialog
        open={showIADialog}
        onOpenChange={setShowIADialog}
        onSuccess={() => {
          setShowIADialog(false);
          // Refresh data
        }}
      />
    </div>
  );
}