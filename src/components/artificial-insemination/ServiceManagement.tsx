import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Heart, Plus, BarChart3, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';
import { ImprovedArtificialInseminationDialog } from './ImprovedArtificialInseminationDialog';

interface Service {
  id: string;
  fecha: string;
  tipo: string;
  notas: string;
  animal_count: number;
  veterinario: string;
  stats?: {
    total: number;
    pendientes: number;
    preñadas: number;
    vacias: number;
    porcentaje_preñez: number | null;
  };
}

interface ServiceManagementProps {
  onServiceSelect?: (serviceId: string) => void;
  selectedServiceId?: string;
}

export function ServiceManagement({ onServiceSelect, selectedServiceId }: ServiceManagementProps) {
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadServices();
    }
  }, [currentUser]);

  const loadServices = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // Load IA events and join with service data
      const { data: eventos, error } = await supabase
        .from('eventos')
        .select(`
          id,
          fecha,
          tipo,
          notas,
          payload,
          ia!inner(
            id,
            toro_nombre,
            raza_toro,
            animales_ids
          )
        `)
        .eq('tipo', 'inseminacion_artificial')
        .order('fecha', { ascending: false });

      if (error) throw error;

      // Transform events into services with stats
      const servicesWithStats = await Promise.all((eventos || []).map(async (evento: any) => {
        const iaData = evento.ia[0]; // Get the first IA record
        
        // Get stats for this service
        let stats = null;
        try {
          const { data: statsData } = await supabase
            .rpc('get_service_pregnancy_stats', { 
              _service_id: evento.id 
            });
          stats = statsData;
        } catch (error) {
          console.log('No stats function available, using basic count');
        }

        return {
          id: evento.id,
          fecha: evento.fecha,
          tipo: 'IA',
          notas: evento.notas || `Servicio con ${iaData?.toro_nombre} (${iaData?.raza_toro})`,
          animal_count: iaData?.animales_ids?.length || 0,
          veterinario: evento.payload?.veterinario || 'No especificado',
          stats: stats || {
            total: iaData?.animales_ids?.length || 0,
            pendientes: iaData?.animales_ids?.length || 0,
            preñadas: 0,
            vacias: 0,
            porcentaje_preñez: null
          }
        };
      }));

      setServices(servicesWithStats);
    } catch (error) {
      console.error('Error loading services:', error);
      toast({
        title: "Error",
        description: "Error al cargar los servicios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(service => {
    switch (filter) {
      case 'pending':
        return service.stats && service.stats.pendientes > 0;
      case 'completed':
        return service.stats && service.stats.pendientes === 0;
      case 'recent':
        const serviceDate = new Date(service.fecha);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return serviceDate >= weekAgo;
      default:
        return true;
    }
  });

  const getStatusBadge = (stats: Service['stats']) => {
    if (!stats) return <Badge variant="secondary">Sin datos</Badge>;
    
    if (stats.pendientes === 0) {
      return <Badge variant="default">Completado</Badge>;
    } else {
      return <Badge variant="secondary">{stats.pendientes} pendientes</Badge>;
    }
  };

  const getPregnancyBadge = (percentage: number | null) => {
    if (percentage === null) return <Badge variant="outline">N/A</Badge>;
    
    let variant: "default" | "secondary" | "destructive" = "default";
    if (percentage < 50) variant = "destructive";
    else if (percentage < 70) variant = "secondary";
    
    return <Badge variant={variant}>{percentage}%</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Servicios Naturales
          </h3>
          <p className="text-muted-foreground">
            Gestiona y monitorea todos los servicios naturales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Con pendientes</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="recent">Recientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Servicios ({filteredServices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando servicios...</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay servicios</h3>
              <p className="text-muted-foreground mb-4">
                {services.length === 0 
                  ? "Aún no hay servicios naturales registrados" 
                  : "No se encontraron servicios naturales con el filtro aplicado"
                }
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Servicio
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Veterinario</TableHead>
                  <TableHead>Animales</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>% Preñez</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow 
                    key={service.id}
                    className={selectedServiceId === service.id ? 'bg-muted' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(service.fecha), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>{service.veterinario}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{service.animal_count}</Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(service.stats)}
                    </TableCell>
                    <TableCell>
                      {getPregnancyBadge(service.stats?.porcentaje_preñez || null)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {service.notas}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={selectedServiceId === service.id ? "default" : "outline"}
                          onClick={() => onServiceSelect?.(service.id)}
                        >
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Gestionar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ImprovedArtificialInseminationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          loadServices();
        }}
      />
    </div>
  );
}