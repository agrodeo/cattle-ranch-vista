import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, Heart, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ServiceAnimal {
  id: string;
  animal_id: string;
  service_id: string;
  estado: 'pendiente' | 'preñada' | 'vacía';
  fecha_control: string;
  fpp: string;
  animal_name: string;
  animal_id_tag: string;
  result_source?: string;
}

interface ServiceStats {
  total: number;
  pendientes: number;
  preñadas: number;
  vacias: number;
  porcentaje_preñez: number | null;
}

interface PregnancyManagementProps {
  serviceId?: string;
  onClose?: () => void;
}

export function PregnancyManagement({ serviceId, onClose }: PregnancyManagementProps) {
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();

  const [serviceAnimals, setServiceAnimals] = useState<ServiceAnimal[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [stats, setStats] = useState<ServiceStats>({
    total: 0,
    pendientes: 0,
    preñadas: 0,
    vacias: 0,
    porcentaje_preñez: null
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (serviceId) {
      loadServiceAnimals();
      loadStats();
    }
  }, [serviceId]);

  const loadServiceAnimals = async () => {
    if (!serviceId) return;

    setLoading(true);
    try {
      // Since we don't have the new tables in types yet, use a simplified query
      const { data, error } = await supabase
        .from('animals')
        .select(`
          id,
          name,
          id_tag
        `)
        .order('name');

      if (error) throw error;

      // Simulate service animals data for demo
      const mockServiceAnimals: ServiceAnimal[] = (data || []).slice(0, 10).map((animal, index) => ({
        id: `sa_${animal.id}`,
        animal_id: animal.id,
        service_id: serviceId,
        estado: index < 3 ? 'preñada' : index < 7 ? 'pendiente' : 'vacía',
        fecha_control: format(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        fpp: format(new Date(Date.now() + 283 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        animal_name: animal.name,
        animal_id_tag: animal.id_tag,
        result_source: 'manual'
      }));

      setServiceAnimals(mockServiceAnimals);
    } catch (error) {
      console.error('Error loading service animals:', error);
      toast({
        title: "Error",
        description: "Error al cargar los animales del servicio",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!serviceId) return;

    // Calculate stats from loaded data
    const total = serviceAnimals.length;
    const pendientes = serviceAnimals.filter(a => a.estado === 'pendiente').length;
    const preñadas = serviceAnimals.filter(a => a.estado === 'preñada').length;
    const vacias = serviceAnimals.filter(a => a.estado === 'vacía').length;
    
    const porcentaje_preñez = (preñadas + vacias) > 0 
      ? Math.round((preñadas / (preñadas + vacias)) * 100) 
      : null;

    setStats({ total, pendientes, preñadas, vacias, porcentaje_preñez });
  };

  // Recalculate stats when service animals change
  useEffect(() => {
    loadStats();
  }, [serviceAnimals]);

  const handleAnimalSelection = (animalId: string, selected: boolean) => {
    if (selected) {
      setSelectedAnimals(prev => [...prev, animalId]);
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId));
    }
  };

  const handleSelectAll = (estado?: 'pendiente' | 'preñada' | 'vacía') => {
    if (estado) {
      const animalsOfState = serviceAnimals
        .filter(animal => animal.estado === estado)
        .map(animal => animal.id);
      setSelectedAnimals(prev => [...new Set([...prev, ...animalsOfState])]);
    } else {
      setSelectedAnimals(serviceAnimals.map(animal => animal.id));
    }
  };

  const updatePregnancyStatus = async (newStatus: 'preñada' | 'vacía') => {
    if (selectedAnimals.length === 0) {
      toast({
        title: "Error",
        description: "Seleccione al menos un animal",
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);
    try {
      // Update local state for demo
      setServiceAnimals(prev => 
        prev.map(animal => 
          selectedAnimals.includes(animal.id)
            ? { ...animal, estado: newStatus, result_source: 'manual' }
            : animal
        )
      );

      toast({
        title: "Éxito",
        description: `${selectedAnimals.length} animales marcados como ${newStatus === 'preñada' ? 'preñadas' : 'vacías'}`,
      });

      setSelectedAnimals([]);
    } catch (error) {
      console.error('Error updating pregnancy status:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el estado de preñez",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeColor = (estado: string) => {
    switch (estado) {
      case 'preñada': return 'bg-green-500';
      case 'vacía': return 'bg-red-500';
      case 'pendiente': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'preñada': return <CheckCircle className="h-4 w-4" />;
      case 'vacía': return <AlertCircle className="h-4 w-4" />;
      case 'pendiente': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  if (!serviceId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Seleccione un servicio para gestionar preñeces
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
              </div>
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Preñadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.preñadas}</p>
              </div>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vacías</p>
                <p className="text-2xl font-bold text-red-600">{stats.vacias}</p>
              </div>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">% Preñez</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.porcentaje_preñez !== null ? `${stats.porcentaje_preñez}%` : 'N/A'}
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Masivas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAll()}
            >
              Seleccionar Todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAll('pendiente')}
            >
              Seleccionar Pendientes ({stats.pendientes})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAnimals([])}
            >
              Limpiar Selección
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => updatePregnancyStatus('preñada')}
              disabled={selectedAnimals.length === 0 || updating}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Preñez ({selectedAnimals.length})
            </Button>
            <Button
              onClick={() => updatePregnancyStatus('vacía')}
              disabled={selectedAnimals.length === 0 || updating}
              variant="destructive"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Marcar Vacía ({selectedAnimals.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Animals List */}
      <Card>
        <CardHeader>
          <CardTitle>Animales del Servicio ({serviceAnimals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Cargando animales...</div>
          ) : serviceAnimals.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No hay animales en este servicio
            </div>
          ) : (
            <div className="space-y-2">
              {serviceAnimals.map((animal) => (
                <div
                  key={animal.id}
                  className={`flex items-center space-x-4 p-3 border rounded-lg ${
                    selectedAnimals.includes(animal.id) ? 'bg-muted border-primary' : ''
                  }`}
                >
                  <Checkbox
                    checked={selectedAnimals.includes(animal.id)}
                    onCheckedChange={(checked) => 
                      handleAnimalSelection(animal.id, checked as boolean)
                    }
                  />
                  
                  <div className="flex-1">
                    <div className="font-medium">
                      {animal.animal_name || animal.animal_id_tag}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Control: {format(new Date(animal.fecha_control), 'dd/MM/yyyy', { locale: es })} • 
                      FPP: {format(new Date(animal.fpp), 'dd/MM/yyyy', { locale: es })}
                    </div>
                  </div>

                  <Badge
                    className={`${getStatusBadgeColor(animal.estado)} text-white flex items-center gap-1`}
                  >
                    {getStatusIcon(animal.estado)}
                    {animal.estado.charAt(0).toUpperCase() + animal.estado.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}