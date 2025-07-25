import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
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
  const { currentUser } = useSimpleAuth();
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

      // Get user's cabaña_id
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (!userData?.cabaña_id) {
        throw new Error("No se encontró la cabaña del usuario");
      }

      const { error } = await supabase
        .from("corrales")
        .insert({
          name: formData.name,
          hectareas: formData.hectareas ? parseFloat(formData.hectareas) : null,
          user_id: currentUser.id,
          cabaña_id: userData.cabaña_id,
        });

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nuevo Corral</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Corral</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Corral 1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="hectareas">Hectáreas</Label>
              <Input
                id="hectareas"
                type="number"
                step="0.1"
                value={formData.hectareas}
                onChange={(e) => setFormData({ ...formData, hectareas: e.target.value })}
                placeholder="Ej: 5.5"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear Corral"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}