import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Animal {
  id: string;
  name: string;
  id_tag: string;
  corral_id?: string;
}

interface Bull {
  id: string;
  name: string;
  id_tag: string;
}

interface ArtificialInseminationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAnimals: Animal[];
  onSuccess: () => void;
}

export function ArtificialInseminationDialog({
  open,
  onOpenChange,
  selectedAnimals,
  onSuccess,
}: ArtificialInseminationDialogProps) {
  const [date, setDate] = useState<Date>();
  const [bullName, setBullName] = useState("");
  const [bullId, setBullId] = useState("");
  const [isPregnant, setIsPregnant] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bulls, setBulls] = useState<Bull[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchBulls();
    }
  }, [open]);

  const fetchBulls = async () => {
    try {
      const { data, error } = await supabase
        .from("animals")
        .select("id, name, id_tag")
        .eq("sex", "Macho")
        .not("name", "is", null);

      if (error) throw error;
      setBulls(data || []);
    } catch (error) {
      console.error("Error fetching bulls:", error);
    }
  };

  const handleSubmit = async () => {
    if (!date || !bullName || selectedAnimals.length === 0) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (!userData?.cabaña_id) {
        throw new Error("Usuario sin cabaña asignada");
      }

      const inseminations = selectedAnimals.map((animal) => ({
        female_id: animal.id,
        insemination_date: date.toISOString().split('T')[0],
        bull_name: bullName,
        bull_id: bullId || null,
        is_pregnant: isPregnant === "yes" ? true : isPregnant === "no" ? false : null,
        notes: notes || null,
        cabaña_id: userData.cabaña_id,
        created_by: user?.id,
      }));

      const { error } = await supabase
        .from("artificial_inseminations")
        .insert(inseminations);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Inseminación artificial registrada para ${selectedAnimals.length} animal(es)`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error saving insemination:", error);
      toast({
        title: "Error",
        description: "Error al registrar la inseminación artificial",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDate(undefined);
    setBullName("");
    setBullId("");
    setIsPregnant("");
    setNotes("");
  };

  const handleBullSelect = (value: string) => {
    if (value === "manual") {
      setBullId("");
      setBullName("");
    } else {
      const selectedBull = bulls.find(bull => bull.id === value);
      if (selectedBull) {
        setBullId(selectedBull.id);
        setBullName(selectedBull.name || selectedBull.id_tag || "");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Registrar Inseminación Artificial
            {selectedAnimals.length > 1 && ` (${selectedAnimals.length} animales)`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Fecha *
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bull" className="text-right">
              Toro *
            </Label>
            <div className="col-span-3">
              <Select onValueChange={handleBullSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar toro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Entrada manual</SelectItem>
                  {bulls.map((bull) => (
                    <SelectItem key={bull.id} value={bull.id}>
                      {bull.name || bull.id_tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(bullId === "" || bulls.find(b => b.id === bullId) === undefined) && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bull-name" className="text-right">
                Nombre del Toro *
              </Label>
              <Input
                id="bull-name"
                value={bullName}
                onChange={(e) => setBullName(e.target.value)}
                className="col-span-3"
                placeholder="Ej: Toro 925 - Brahman"
              />
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pregnant" className="text-right">
              ¿Quedó preñada?
            </Label>
            <div className="col-span-3">
              <Select value={isPregnant} onValueChange={setIsPregnant}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Pendiente</SelectItem>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Observaciones
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Comentarios adicionales..."
            />
          </div>

          {selectedAnimals.length > 0 && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right">Animales:</Label>
              <div className="col-span-3 max-h-32 overflow-y-auto">
                {selectedAnimals.map((animal) => (
                  <div key={animal.id} className="text-sm text-muted-foreground">
                    {animal.name || animal.id_tag}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}