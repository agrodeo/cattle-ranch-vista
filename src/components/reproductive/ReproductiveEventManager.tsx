import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Heart, 
  AlertTriangle, 
  Search, 
  Filter,
  TrendingDown,
  Calendar,
  Users
} from 'lucide-react';
import { PregnancyLossDialog } from './PregnancyLossDialog';

interface PregnantAnimal {
  id: string;
  animal_id: string;
  animal_name: string;
  animal_tag: string;
  animal_breed: string;
  corral_name: string;
  fecha_inicio: string;
  fecha_estimada_parto: string;
  dias_gestacion: number;
  origen: string;
  estado_final: string;
}

interface ReproductiveLoss {
  id: string;
  animal_name: string;
  animal_tag: string;
  fecha_perdida: string;
  tipo_perdida: string;
  causa_perdida: string;
  dias_gestacion_perdida: number;
  observaciones_perdida: string;
}

interface LossStats {
  total_losses: number;
  aborto_temprano: number;
  aborto_tardio: number;
  stillbirth: number;
  neonatal: number;
  loss_rate: number;
}

export function ReproductiveEventManager() {
  const [pregnantAnimals, setPregnantAnimals] = useState<PregnantAnimal[]>([]);
  const [recentLosses, setRecentLosses] = useState<ReproductiveLoss[]>([]);
  const [lossStats, setLossStats] = useState<LossStats | null>(null);
  const [selectedPregnancy, setSelectedPregnancy] = useState<PregnantAnimal | null>(null);
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser?.cabañaId) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadPregnantAnimals(),
        loadRecentLosses(),
        loadLossStats()
      ]);
    } catch (error) {
      console.error('Error loading reproductive data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPregnantAnimals = async () => {
    try {
      const { data, error } = await supabase
        .from('preñeces')
        .select(`
          id,
          animal_id,
          fecha_inicio,
          fecha_estimada_parto,
          origen,
          estado_final,
          animals (
            name,
            id_tag,
            breed,
            corrales (name)
          )
        `)
        .eq('cabaña_id', currentUser?.cabañaId)
        .eq('estado_final', 'activa')
        .order('fecha_estimada_parto');

      if (error) throw error;

      const formattedData = data?.map(pregnancy => ({
        id: pregnancy.id,
        animal_id: pregnancy.animal_id,
        animal_name: pregnancy.animals?.name || '',
        animal_tag: pregnancy.animals?.id_tag || '',
        animal_breed: pregnancy.animals?.breed || '',
        corral_name: pregnancy.animals?.corrales?.name || 'Sin corral',
        fecha_inicio: pregnancy.fecha_inicio,
        fecha_estimada_parto: pregnancy.fecha_estimada_parto,
        dias_gestacion: Math.floor((new Date().getTime() - new Date(pregnancy.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24)),
        origen: pregnancy.origen,
        estado_final: pregnancy.estado_final
      })) || [];

      setPregnantAnimals(formattedData);
    } catch (error) {
      console.error('Error loading pregnant animals:', error);
    }
  };

  const loadRecentLosses = async () => {
    try {
      const { data, error } = await supabase
        .from('preñeces')
        .select(`
          id,
          fecha_perdida,
          tipo_perdida,
          causa_perdida,
          dias_gestacion_perdida,
          observaciones_perdida,
          animals (
            name,
            id_tag
          )
        `)
        .eq('cabaña_id', currentUser?.cabañaId)
        .eq('estado_final', 'fallida')
        .not('fecha_perdida', 'is', null)
        .order('fecha_perdida', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedLosses = data?.map(loss => ({
        id: loss.id,
        animal_name: loss.animals?.name || '',
        animal_tag: loss.animals?.id_tag || '',
        fecha_perdida: loss.fecha_perdida,
        tipo_perdida: loss.tipo_perdida,
        causa_perdida: loss.causa_perdida,
        dias_gestacion_perdida: loss.dias_gestacion_perdida,
        observaciones_perdida: loss.observaciones_perdida
      })) || [];

      setRecentLosses(formattedLosses);
    } catch (error) {
      console.error('Error loading recent losses:', error);
    }
  };

  const loadLossStats = async () => {
    try {
      const { data, error } = await supabase
        .from('preñeces')
        .select('tipo_perdida, estado_final')
        .eq('cabaña_id', currentUser?.cabañaId);

      if (error) throw error;

      const totalPregnancies = data?.length || 0;
      const losses = data?.filter(p => p.estado_final === 'fallida') || [];
      
      const stats: LossStats = {
        total_losses: losses.length,
        aborto_temprano: losses.filter(l => l.tipo_perdida === 'aborto_temprano').length,
        aborto_tardio: losses.filter(l => l.tipo_perdida === 'aborto_tardio').length,
        stillbirth: losses.filter(l => l.tipo_perdida === 'stillbirth').length,
        neonatal: losses.filter(l => l.tipo_perdida === 'neonatal').length,
        loss_rate: totalPregnancies > 0 ? Math.round((losses.length / totalPregnancies) * 100) : 0
      };

      setLossStats(stats);
    } catch (error) {
      console.error('Error loading loss stats:', error);
    }
  };

  const handleRegisterLoss = (pregnancy: PregnantAnimal) => {
    setSelectedPregnancy(pregnancy);
    setLossDialogOpen(true);
  };

  const handleLossSuccess = () => {
    loadData();
    toast({
      title: "Pérdida registrada",
      description: "La pérdida reproductiva ha sido registrada exitosamente",
    });
  };

  const getStatusBadge = (diasGestacion: number) => {
    if (diasGestacion < 100) {
      return <Badge variant="secondary">Temprana</Badge>;
    } else if (diasGestacion < 200) {
      return <Badge className="bg-yellow-500">Media</Badge>;
    } else if (diasGestacion < 283) {
      return <Badge className="bg-orange-500">Avanzada</Badge>;
    } else {
      return <Badge className="bg-red-500">Vencida</Badge>;
    }
  };

  const getLossTypeBadge = (tipo: string) => {
    const types = {
      'aborto_temprano': { label: 'Aborto Temprano', color: 'bg-yellow-500' },
      'aborto_tardio': { label: 'Aborto Tardío', color: 'bg-orange-500' },
      'stillbirth': { label: 'Mortinato', color: 'bg-red-500' },
      'neonatal': { label: 'Neonatal', color: 'bg-purple-500' },
      'no_detectada': { label: 'No Detectada', color: 'bg-gray-500' }
    };
    
    const typeInfo = types[tipo] || { label: tipo, color: 'bg-gray-500' };
    return <Badge className={typeInfo.color}>{typeInfo.label}</Badge>;
  };

  const filteredAnimals = pregnantAnimals.filter(animal => {
    const matchesSearch = 
      animal.animal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.animal_tag.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {lossStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Preñadas Activas</p>
                  <p className="text-2xl font-bold text-green-600">{pregnantAnimals.length}</p>
                </div>
                <Heart className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pérdidas Totales</p>
                  <p className="text-2xl font-bold text-red-600">{lossStats.total_losses}</p>
                </div>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Abortos Tempranos</p>
                  <p className="text-2xl font-bold text-yellow-600">{lossStats.aborto_temprano}</p>
                </div>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mortinatos</p>
                  <p className="text-2xl font-bold text-red-600">{lossStats.stillbirth}</p>
                </div>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tasa de Pérdida</p>
                  <p className="text-2xl font-bold text-orange-600">{lossStats.loss_rate}%</p>
                </div>
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Pregnancies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Preñeces Activas ({pregnantAnimals.length})</span>
            <div className="flex gap-2">
              <Input
                placeholder="Buscar animal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Cargando preñeces...</div>
          ) : filteredAnimals.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No hay preñeces activas registradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Animal</TableHead>
                  <TableHead>Corral</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Días Gestación</TableHead>
                  <TableHead>Fecha Est. Parto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnimals.map((pregnancy) => (
                  <TableRow key={pregnancy.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{pregnancy.animal_name || pregnancy.animal_tag}</div>
                        <div className="text-sm text-muted-foreground">{pregnancy.animal_tag}</div>
                      </div>
                    </TableCell>
                    <TableCell>{pregnancy.corral_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{pregnancy.origen}</Badge>
                    </TableCell>
                    <TableCell>{pregnancy.dias_gestacion} días</TableCell>
                    <TableCell>
                      {format(new Date(pregnancy.fecha_estimada_parto), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>{getStatusBadge(pregnancy.dias_gestacion)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegisterLoss(pregnancy)}
                        className="flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Registrar Pérdida
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Losses */}
      <Card>
        <CardHeader>
          <CardTitle>Pérdidas Reproductivas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLosses.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No hay pérdidas reproductivas registradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Animal</TableHead>
                  <TableHead>Fecha Pérdida</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Causa</TableHead>
                  <TableHead>Días Gestación</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLosses.map((loss) => (
                  <TableRow key={loss.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{loss.animal_name || loss.animal_tag}</div>
                        <div className="text-sm text-muted-foreground">{loss.animal_tag}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(loss.fecha_perdida), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>{getLossTypeBadge(loss.tipo_perdida)}</TableCell>
                    <TableCell>{loss.causa_perdida}</TableCell>
                    <TableCell>{loss.dias_gestacion_perdida} días</TableCell>
                    <TableCell>
                      <div className="max-w-40 truncate" title={loss.observaciones_perdida}>
                        {loss.observaciones_perdida || '-'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pregnancy Loss Dialog */}
      {selectedPregnancy && (
        <PregnancyLossDialog
          open={lossDialogOpen}
          onOpenChange={setLossDialogOpen}
          pregnancyId={selectedPregnancy.id}
          animalName={selectedPregnancy.animal_name}
          animalTag={selectedPregnancy.animal_tag}
          pregnancyStartDate={selectedPregnancy.fecha_inicio}
          onSuccess={handleLossSuccess}
        />
      )}
    </div>
  );
}