import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Plus, Trash2 } from "lucide-react";
import { ReproductiveEventDialog } from "./ReproductiveEventDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReproductiveEvent {
  id: string;
  year: number;
  pregnancy_status: string;
  pregnancy_outcome?: string;
  calving_date?: string;
  linked_calf_id?: string;
  notes?: string;
}

interface ReproductiveEventsTableProps {
  animalId: string;
  animalSex?: string;
  cabaña_id: string;
}

export function ReproductiveEventsTable({ animalId, animalSex, cabaña_id }: ReproductiveEventsTableProps) {
  const { toast } = useToast();
  const [events, setEvents] = useState<ReproductiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ReproductiveEvent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (animalSex !== "Hembra") {
      setLoading(false);
      return;
    }

    try {
      // Fetch from preñeces table (source of truth) instead of empty reproductive_events
      const { data: pregnancyData, error } = await supabase
        .from("preñeces")
        .select("*")
        .eq("animal_id", animalId)
        .order("fecha_inicio", { ascending: false });

      if (error) throw error;

      // Transform preñeces data to ReproductiveEvent format
      const transformedEvents: ReproductiveEvent[] = (pregnancyData || []).map((p: any) => ({
        id: p.id,
        year: new Date(p.fecha_inicio).getFullYear(),
        pregnancy_status: p.estado === 'confirmada' || p.estado_final === 'exitosa' || p.estado_final === 'activa' ? 'pregnant' : 'not_pregnant',
        pregnancy_outcome: p.estado_final === 'exitosa' ? 'live_calf' : 
                          p.estado_final === 'fallida' ? 'lost_pregnancy' : undefined,
        calving_date: p.fecha_parto_real || p.fecha_finalizacion,
        linked_calf_id: p.cria_id,
        notes: p.notas
      }));

      setEvents(transformedEvents);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los eventos reproductivos",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [animalId, animalSex]);

  const handleEdit = (event: ReproductiveEvent) => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;

    try {
      const { error } = await supabase
        .from("reproductive_events")
        .delete()
        .eq("id", eventToDelete);

      if (error) throw error;

      toast({ title: "Evento eliminado exitosamente" });
      fetchEvents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pregnant":
        return <Badge className="bg-primary">✅ Preñada</Badge>;
      case "not_pregnant":
        return <Badge variant="destructive">❌ No Preñada</Badge>;
      case "unknown":
        return <Badge variant="secondary">❓ Desconocido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOutcomeBadge = (outcome?: string) => {
    if (!outcome) return null;
    
    switch (outcome) {
      case "live_calf":
        return <Badge className="bg-primary">🟢 Ternero vivo</Badge>;
      case "stillborn":
        return <Badge variant="destructive">🔴 Mortinato</Badge>;
      case "calf_died_shortly":
        return <Badge className="bg-orange-500">⚠️ Murió poco después</Badge>;
      case "lost_pregnancy":
        return <Badge className="bg-yellow-500">🟡 Perdió embarazo</Badge>;
      default:
        return <Badge variant="outline">{outcome}</Badge>;
    }
  };

  if (animalSex !== "Hembra") {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historial Reproductivo</CardTitle>
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Evento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando...</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay eventos reproductivos registrados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Año</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Fecha de Parto</TableHead>
                  <TableHead>ID Ternero</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.year}</TableCell>
                    <TableCell>{getStatusBadge(event.pregnancy_status)}</TableCell>
                    <TableCell>{getOutcomeBadge(event.pregnancy_outcome)}</TableCell>
                    <TableCell>
                      {event.calving_date
                        ? new Date(event.calving_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>{event.linked_calf_id || "-"}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(event)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEventToDelete(event.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <ReproductiveEventDialog
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingEvent(null);
        }}
        animalId={animalId}
        cabaña_id={cabaña_id}
        existingEvent={editingEvent}
        onSuccess={fetchEvents}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el evento reproductivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}