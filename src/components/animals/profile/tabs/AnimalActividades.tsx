import { Animal } from "@/types/animal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Filter, 
  Calendar, 
  Activity, 
  Scale, 
  Heart, 
  Syringe, 
  MapPin, 
  User 
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";

interface AnimalActividadesProps {
  animal: Animal;
  onAnimalUpdate: (animal: Animal) => void;
}

const mockActividades = [
  {
    id: '1',
    tipo: 'pesaje',
    fecha: '2024-01-15T10:30:00Z',
    descripcion: 'Pesaje rutinario',
    detalles: { peso: '450 kg', ganancia: '+1.2 kg/día' },
    responsable: 'Juan Pérez',
    icon: Scale,
    color: 'bg-blue-500'
  },
  {
    id: '2',
    tipo: 'vacunacion',
    fecha: '2024-01-10T09:00:00Z',
    descripcion: 'Vacuna triple viral',
    detalles: { vacuna: 'Triple Viral', lote: 'TV2024-01', dosis: '2ml' },
    responsable: 'María García',
    icon: Syringe,
    color: 'bg-green-500'
  },
  {
    id: '3',
    tipo: 'tacto',
    fecha: '2024-01-05T14:15:00Z',
    descripcion: 'Detección de preñez',
    detalles: { resultado: 'Preñada', fpp: '2024-10-15' },
    responsable: 'Dr. Rodriguez',
    icon: Heart,
    color: 'bg-pink-500'
  },
  {
    id: '4',
    tipo: 'movimiento',
    fecha: '2024-01-01T08:00:00Z',
    descripcion: 'Cambio de corral',
    detalles: { origen: 'Corral A', destino: 'Corral B' },
    responsable: 'Juan Pérez',
    icon: MapPin,
    color: 'bg-yellow-500'
  },
  {
    id: '5',
    tipo: 'inseminacion',
    fecha: '2023-12-20T11:00:00Z',
    descripcion: 'Inseminación artificial',
    detalles: { toro: 'Toro Elite #123', tecnico: 'Dr. Martinez' },
    responsable: 'Dr. Martinez',
    icon: Heart,
    color: 'bg-purple-500'
  }
];

export function AnimalActividades({ animal }: AnimalActividadesProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroFecha, setFiltroFecha] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');

  const actividadesFiltradas = mockActividades.filter(actividad => {
    const cumpleTipo = filtroTipo === 'todos' || actividad.tipo === filtroTipo;
    const cumpleFecha = !filtroFecha || actividad.fecha.includes(filtroFecha);
    const cumpleBusqueda = !busqueda || 
      actividad.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      actividad.responsable.toLowerCase().includes(busqueda.toLowerCase());
    
    return cumpleTipo && cumpleFecha && cumpleBusqueda;
  });

  const getTypeLabel = (tipo: string) => {
    const types: { [key: string]: string } = {
      'pesaje': 'Pesaje',
      'vacunacion': 'Vacunación',
      'tacto': 'Tacto',
      'movimiento': 'Movimiento',
      'inseminacion': 'Inseminación'
    };
    return types[tipo] || tipo;
  };

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Historial de Actividades</h2>
          <p className="text-muted-foreground">
            Registro completo de todas las actividades del animal
          </p>
        </div>
        
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Agregar Actividad
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Actividad</label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="pesaje">Pesajes</SelectItem>
                  <SelectItem value="vacunacion">Vacunaciones</SelectItem>
                  <SelectItem value="tacto">Tactos</SelectItem>
                  <SelectItem value="movimiento">Movimientos</SelectItem>
                  <SelectItem value="inseminacion">Inseminaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Buscar en actividades..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline de Actividades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Timeline ({actividadesFiltradas.length} actividades)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actividadesFiltradas.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay actividades</h3>
              <p className="text-muted-foreground mb-4">
                No se encontraron actividades con los filtros aplicados
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Primera Actividad
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {actividadesFiltradas.map((actividad, index) => {
                const Icon = actividad.icon;
                const isLast = index === actividadesFiltradas.length - 1;

                return (
                  <div key={actividad.id} className="relative">
                    {/* Línea conectora */}
                    {!isLast && (
                      <div className="absolute left-5 top-12 w-0.5 h-16 bg-border" />
                    )}
                    
                    <div className="flex items-start gap-4">
                      {/* Icono */}
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${actividad.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{actividad.descripcion}</h4>
                            <Badge variant="outline">
                              {getTypeLabel(actividad.tipo)}
                            </Badge>
                          </div>
                          <time className="text-sm text-muted-foreground">
                            {format(new Date(actividad.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </time>
                        </div>
                        
                        {/* Detalles */}
                        <div className="space-y-1 mb-2">
                          {Object.entries(actividad.detalles).map(([key, value]) => (
                            <p key={key} className="text-sm text-muted-foreground">
                              <span className="capitalize">{key}:</span> {value}
                            </p>
                          ))}
                        </div>
                        
                        {/* Responsable */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {actividad.responsable}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}