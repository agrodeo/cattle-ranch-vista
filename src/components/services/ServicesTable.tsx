import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreHorizontal, Edit, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useToast } from "@/hooks/use-toast";
import { EditServiceDialog } from "./EditServiceDialog";

interface Service {
  id: string;
  service_date: string;
  outcome: string | null;
  notes: string | null;
  female: {
    name: string;
    id_tag: string;
  } | null;
  bull: {
    name: string;
    id_tag: string;
  } | null;
}

export function ServicesTable() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const { currentUser } = useSimpleAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchServices();
    }
  }, [currentUser?.cabañaId]);

  const fetchServices = async () => {
    if (!currentUser?.cabañaId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("services")
        .select(`
          id,
          service_date,
          outcome,
          notes,
          female:animals!services_female_id_fkey(name, id_tag),
          bull:animals!services_bull_id_fkey(name, id_tag)
        `)
        .order("service_date", { ascending: false });

      if (error) throw error;

      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los servicios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteServiceId) return;

    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", deleteServiceId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Servicio eliminado correctamente",
      });

      setDeleteServiceId(null);
      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el servicio",
        variant: "destructive",
      });
    }
  };

  const getOutcomeBadge = (outcome: string | null) => {
    if (!outcome) {
      return <Badge variant="outline">Pendiente</Badge>;
    }

    switch (outcome.toLowerCase()) {
      case "pregnant":
      case "preñada":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Preñada</Badge>;
      case "empty":
      case "vacía":
        return <Badge variant="destructive">Vacía</Badge>;
      case "repeated":
      case "repetido":
        return <Badge variant="secondary">Repetido</Badge>;
      default:
        return <Badge variant="outline">{outcome}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Cargando servicios...</p>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center p-8">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium">No hay servicios registrados</h3>
        <p className="text-muted-foreground">
          Comience registrando servicios en la pestaña "Registrar Servicio"
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Hembra</TableHead>
              <TableHead>Toro</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Observaciones</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>
                  {format(new Date(service.service_date), "dd/MM/yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  {service.female ? (
                    <div>
                      <div className="font-medium">
                        {service.female.name || "Sin nombre"}
                      </div>
                      {service.female.id_tag && (
                        <div className="text-sm text-muted-foreground">
                          {service.female.id_tag}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Animal eliminado</span>
                  )}
                </TableCell>
                <TableCell>
                  {service.bull ? (
                    <div>
                      <div className="font-medium">
                        {service.bull.name || "Sin nombre"}
                      </div>
                      {service.bull.id_tag && (
                        <div className="text-sm text-muted-foreground">
                          {service.bull.id_tag}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Animal eliminado</span>
                  )}
                </TableCell>
                <TableCell>
                  {getOutcomeBadge(service.outcome)}
                </TableCell>
                <TableCell>
                  {service.notes ? (
                    <span className="text-sm">{service.notes}</span>
                  ) : (
                    <span className="text-muted-foreground italic">Sin observaciones</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingService(service)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteServiceId(service.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <EditServiceDialog
        service={editingService}
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        onSuccess={() => {
          setEditingService(null);
          fetchServices();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteServiceId}
        onOpenChange={() => setDeleteServiceId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro del servicio será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}