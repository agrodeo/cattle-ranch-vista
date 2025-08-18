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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Move, Search, MapPin } from "lucide-react";

interface Animal {
  id: string;
  name: string;
  id_tag: string;
  sex: string;
  breed: string;
  corral_id: string | null;
  corral?: { name: string };
}

interface Corral {
  id: string;
  name: string;
}

interface MoveAnimalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MoveAnimalDialog({ open, onOpenChange, onSuccess }: MoveAnimalDialogProps) {
  const { currentUser } = useHybridAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [corrals, setCorrals] = useState<Corral[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [targetCorralId, setTargetCorralId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceCorralFilter, setSourceCorralFilter] = useState<string>("all");

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      setLoading(true);
      
      // Fetch animals and corrals in parallel
      const [animalsResponse, corralsResponse] = await Promise.all([
        supabase
          .from("animals")
          .select(`
            id, name, id_tag, sex, breed, corral_id,
            corrales:corral_id(name)
          `)
          .eq("cabaña_id", currentUser.cabañaId)
          .neq("status", "Vendido")
          .neq("status", "Muerto"),
        
        supabase
          .from("corrales")
          .select("id, name")
          .eq("cabaña_id", currentUser.cabañaId)
          .order("name")
      ]);

      if (animalsResponse.error) throw animalsResponse.error;
      if (corralsResponse.error) throw corralsResponse.error;

      const processedAnimals = (animalsResponse.data || []).map(animal => ({
        ...animal,
        corral: animal.corrales
      }));

      setAnimals(processedAnimals);
      setCorrals(corralsResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAnimals = animals.filter(animal => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      (animal.name?.toLowerCase().includes(searchLower)) ||
      (animal.id_tag?.toLowerCase().includes(searchLower)) ||
      (animal.breed?.toLowerCase().includes(searchLower))
    );
    
    const matchesCorralFilter = 
      sourceCorralFilter === "all" ||
      (sourceCorralFilter === "unassigned" && !animal.corral_id) ||
      (sourceCorralFilter === animal.corral_id);
    
    return matchesSearch && matchesCorralFilter;
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

  const handleMove = async () => {
    if (!targetCorralId || selectedAnimals.length === 0) return;

    try {
      setLoading(true);

      const targetCorralName = corrals.find(c => c.id === targetCorralId)?.name || "corral seleccionado";
      
      const { error } = await supabase
        .from("animals")
        .update({ corral_id: targetCorralId === "none" ? null : targetCorralId })
        .in("id", selectedAnimals);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `${selectedAnimals.length} animal(es) movido(s) ${targetCorralId === "none" ? "fuera de corrales" : `al ${targetCorralName}`}`,
      });

      setSelectedAnimals([]);
      setTargetCorralId("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error moving animals:", error);
      toast({
        title: "Error",
        description: "No se pudieron mover los animales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectAllVisible = () => {
    const visibleIds = filteredAnimals.map(a => a.id);
    setSelectedAnimals(prev => [...new Set([...prev, ...visibleIds])]);
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" />
            Mover Animales entre Corrales
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar animales..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={sourceCorralFilter} onValueChange={setSourceCorralFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por corral actual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los corrales</SelectItem>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
                {corrals.map(corral => (
                  <SelectItem key={corral.id} value={corral.id}>
                    {corral.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Corral Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Destino:</label>
            <Select value={targetCorralId} onValueChange={setTargetCorralId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar corral destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Sin corral asignado
                  </div>
                </SelectItem>
                {corrals.map(corral => (
                  <SelectItem key={corral.id} value={corral.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {corral.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selection Actions */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedAnimals.length} animal(es) seleccionado(s) de {filteredAnimals.length} mostrados
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllVisible}>
                Seleccionar Visibles
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Limpiar
              </Button>
            </div>
          </div>

          {/* Selected Animals Summary */}
          {selectedAnimals.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Animales seleccionados:</label>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 border rounded">
                {selectedAnimals.slice(0, 20).map(animalId => {
                  const animal = animals.find(a => a.id === animalId);
                  if (!animal) return null;
                  
                  return (
                    <Badge 
                      key={animalId} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleAnimalToggle(animalId)}
                    >
                      {animal.name || animal.id_tag || 'Sin ID'} ×
                    </Badge>
                  );
                })}
                {selectedAnimals.length > 20 && (
                  <Badge variant="outline">
                    +{selectedAnimals.length - 20} más
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Animals List */}
          <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-4">
            {filteredAnimals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No se encontraron animales con los filtros aplicados
              </p>
            ) : (
              filteredAnimals.map((animal) => (
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
                        {animal.corral?.name ? (
                          <Badge variant="secondary">
                            {animal.corral.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Sin asignar
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
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
          <Button
            onClick={handleMove}
            disabled={loading || selectedAnimals.length === 0 || !targetCorralId}
          >
            {loading ? "Moviendo..." : `Mover ${selectedAnimals.length} Animal(es)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}