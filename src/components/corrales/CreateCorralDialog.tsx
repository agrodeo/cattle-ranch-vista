import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface CreateCorralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCorralDialog({ open, onOpenChange, onSuccess }: CreateCorralDialogProps) {
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    hectareas: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);

      console.log("Debug - currentUser:", currentUser);
      console.log("Debug - currentUser.cabañaId:", currentUser.cabañaId);
      console.log("Debug - currentUser.cabañaId:", currentUser.cabañaId);

      // Use the cabañaId directly from currentUser since hybrid auth already provides it
      const cabanaId = currentUser.cabañaId;
      
      if (!cabanaId) {
        throw new Error("No se encontró la cabaña del usuario");
      }

      // Prepare insert data - only include user_id for Supabase auth users
      const insertData: any = {
        name: formData.name,
        hectareas: formData.hectareas ? parseFloat(formData.hectareas) : null,
        cabaña_id: cabanaId,
      };

      // Always add user_id since we're using Supabase auth
      insertData.user_id = currentUser.id;

      const { error } = await supabase
        .from("corrales")
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Corral creado correctamente",
      });

      setFormData({ name: "", hectareas: "" });
      onSuccess();
    } catch (error) {
      console.error("Error creating corral:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el corral",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Crear Nuevo Corral</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Nombre del Corral</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Corral 1"
                className="h-10 mt-1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="hectareas" className="text-sm font-medium">Hectáreas</Label>
              <Input
                id="hectareas"
                type="number"
                step="0.1"
                value={formData.hectareas}
                onChange={(e) => setFormData({ ...formData, hectareas: e.target.value })}
                placeholder="Ej: 5.5"
                className="h-10 mt-1"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? "Creando..." : "Crear Corral"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}