import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface EditServiceDialogProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditServiceDialog({ service, isOpen, onClose, onSuccess }: EditServiceDialogProps) {
  const [outcome, setOutcome] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (service) {
      setOutcome(service.outcome || "");
      setNotes(service.notes || "");
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("services")
        .update({
          outcome: outcome.trim() || null,
          notes: notes.trim() || null,
        })
        .eq("id", service.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Servicio actualizado correctamente",
      });

      onSuccess();
    } catch (error) {
      console.error("Error updating service:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el servicio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Servicio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <Label className="text-sm font-medium">Hembra</Label>
              <p className="text-sm text-muted-foreground">
                {service.female?.name || "Sin nombre"}
                {service.female?.id_tag && ` (${service.female.id_tag})`}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Toro</Label>
              <p className="text-sm text-muted-foreground">
                {service.bull?.name || "Sin nombre"}
                {service.bull?.id_tag && ` (${service.bull.id_tag})`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome">Resultado del Servicio</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Pendiente</SelectItem>
                <SelectItem value="preñada">Preñada</SelectItem>
                <SelectItem value="vacía">Vacía</SelectItem>
                <SelectItem value="repetido">Repetido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea
              id="notes"
              placeholder="Observaciones adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Actualizando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}