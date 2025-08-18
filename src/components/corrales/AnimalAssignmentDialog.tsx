import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHybridAuth } from "@/hooks/useHybridAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Animal {
  id: string;
  name: string;
  id_tag: string;
  sex: string;
  breed: string;
  corral_id: string | null;
}

interface AnimalAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  corralId: string | null;
  onSuccess: () => void;
}

export function AnimalAssignmentDialog({ open, onOpenChange, corralId, onSuccess }: AnimalAssignmentDialogProps) {
  const { currentUser } = useHybridAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open) {
      fetchAnimals();
    }
  }, [open]);

  const fetchAnimals = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      // Fetch animals from the same cabaña
      const { data: animalsData, error } = await supabase
        .from("animals")
        .select("id, name, id_tag, sex, breed, corral_id")
        .eq("cabaña_id", currentUser.cabañaId)
        .neq("status", "vendido")
        .neq("status", "muerto")
        .neq("status", "Vendido")
        .neq("status", "Muerto");

      if (error) throw error;

      setAnimals(animalsData || []);
    } catch (error) {
      console.error("Error fetching animals:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los animales",
        variant: "destructive",
      });
    }
  };

  const filteredAnimals = animals.filter(animal => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (animal.name?.toLowerCase().includes(searchLower)) ||
      (animal.id_tag?.toLowerCase().includes(searchLower)) ||
      (animal.breed?.toLowerCase().includes(searchLower))
    );
  });

  const handleAnimalToggle = (animalId: string) => {
    setSelectedAnimals(prev => {
      if (prev.includes(animalId)) {
        return prev.filter(id => id !== animalId);
      } else {
        return [...prev, animalId];
      }
    });
  };

  const handleAssign = async () => {
    if (!corralId || selectedAnimals.length === 0) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("animals")
        .update({ corral_id: corralId })
        .in("id", selectedAnimals);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `${selectedAnimals.length} animal(es) asignado(s) al corral`,
      });

      setSelectedAnimals([]);
      onSuccess();
    } catch (error) {
      console.error("Error assigning animals:", error);
      toast({
        title: "Error",
        description: "No se pudieron asignar los animales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromCorral = async () => {
    if (selectedAnimals.length === 0) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("animals")
        .update({ corral_id: null })
        .in("id", selectedAnimals);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `${selectedAnimals.length} animal(es) removido(s) del corral`,
      });

      setSelectedAnimals([]);
      onSuccess();
    } catch (error) {
      console.error("Error removing animals:", error);
      toast({
        title: "Error",
        description: "No se pudieron remover los animales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Asignar Animales al Corral</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Buscar por nombre, tag o raza..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredAnimals.map((animal) => (
              <div
                key={animal.id}
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedAnimals.includes(animal.id)}
                  onCheckedChange={() => handleAnimalToggle(animal.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {animal.name || animal.id_tag || animal.id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {animal.breed} • {animal.sex}
                      </p>
                    </div>
                    <div className="text-right">
                      {animal.corral_id ? (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          En Corral
                        </span>
                      ) : (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                          Sin Asignar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredAnimals.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No se encontraron animales
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          {selectedAnimals.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleRemoveFromCorral}
              disabled={loading}
            >
              Remover del Corral ({selectedAnimals.length})
            </Button>
          )}
          <Button
            onClick={handleAssign}
            disabled={loading || selectedAnimals.length === 0}
          >
            {loading ? "Asignando..." : `Asignar al Corral (${selectedAnimals.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}