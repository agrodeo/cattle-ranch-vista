import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DeleteCorralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  corralId: string | null;
  corralName: string;
  animalCount: number;
  onSuccess: () => void;
}

export function DeleteCorralDialog({ 
  open, 
  onOpenChange, 
  corralId, 
  corralName, 
  animalCount,
  onSuccess 
}: DeleteCorralDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!corralId) return;

    // Verificar que el corral esté vacío
    if (animalCount > 0) {
      toast({
        title: "Error",
        description: `No se puede eliminar el corral "${corralName}" porque tiene ${animalCount} animales asignados. Mueve los animales a otro corral primero.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from("corrales")
        .delete()
        .eq("id", corralId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Corral "${corralName}" eliminado correctamente`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting corral:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el corral",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canDelete = animalCount === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Eliminar Corral
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!canDelete ? (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">No se puede eliminar</p>
                <p className="text-sm text-yellow-700 mt-1">
                  El corral <strong>"{corralName}"</strong> tiene <strong>{animalCount} animales</strong> asignados.
                  Debes mover todos los animales a otro corral antes de poder eliminarlo.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">¿Estás seguro?</p>
                <p className="text-sm text-red-700 mt-1">
                  Esta acción eliminará permanentemente el corral <strong>"{corralName}"</strong>. 
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !canDelete}
          >
            {loading ? "Eliminando..." : "Eliminar Corral"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}