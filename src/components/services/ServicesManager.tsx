import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Heart, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useToast } from "@/hooks/use-toast";

interface Animal {
  id: string;
  name: string;
  id_tag: string;
  sex: string;
}

interface ServicesManagerProps {
  onServiceAdded: () => void;
}

export function ServicesManager({ onServiceAdded }: ServicesManagerProps) {
  const [selectedFemale, setSelectedFemale] = useState<string>("");
  const [selectedBull, setSelectedBull] = useState<string>("");
  const [serviceDate, setServiceDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [females, setFemales] = useState<Animal[]>([]);
  const [bulls, setBulls] = useState<Animal[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(true);

  const { currentUser } = useSimpleAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchAnimals();
    }
  }, [currentUser?.cabañaId]);

  const fetchAnimals = async () => {
    if (!currentUser?.cabañaId) return;

    setLoadingAnimals(true);
    try {
      // Fetch females (Hembra)
      const { data: femalesData, error: femalesError } = await supabase
        .from("animals")
        .select("id, name, id_tag, sex")
        .eq("cabaña_id", currentUser.cabañaId)
        .eq("sex", "Hembra")
        .is("status", null)
        .order("name");

      if (femalesError) throw femalesError;

      // Fetch bulls (Macho)
      const { data: bullsData, error: bullsError } = await supabase
        .from("animals")
        .select("id, name, id_tag, sex")
        .eq("cabaña_id", currentUser.cabañaId)
        .eq("sex", "Macho")
        .is("status", null)
        .order("name");

      if (bullsError) throw bullsError;

      setFemales(femalesData || []);
      setBulls(bullsData || []);
    } catch (error) {
      console.error("Error fetching animals:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los animales",
        variant: "destructive",
      });
    } finally {
      setLoadingAnimals(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFemale || !selectedBull || !serviceDate || !currentUser?.cabañaId) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("services")
        .insert({
          female_id: selectedFemale,
          bull_id: selectedBull,
          service_date: format(serviceDate, "yyyy-MM-dd"),
          notes: notes.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Servicio registrado correctamente",
      });

      // Reset form
      setSelectedFemale("");
      setSelectedBull("");
      setServiceDate(undefined);
      setNotes("");
      onServiceAdded();
    } catch (error) {
      console.error("Error creating service:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el servicio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingAnimals) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Cargando animales...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="female">Hembra *</Label>
          <Select value={selectedFemale} onValueChange={setSelectedFemale}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar hembra" />
            </SelectTrigger>
            <SelectContent>
              {females.map((female) => (
                <SelectItem key={female.id} value={female.id}>
                  {female.name || female.id_tag || "Sin nombre"} 
                  {female.id_tag && ` (${female.id_tag})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bull">Toro *</Label>
          <Select value={selectedBull} onValueChange={setSelectedBull}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar toro" />
            </SelectTrigger>
            <SelectContent>
              {bulls.map((bull) => (
                <SelectItem key={bull.id} value={bull.id}>
                  {bull.name || bull.id_tag || "Sin nombre"}
                  {bull.id_tag && ` (${bull.id_tag})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Fecha de Servicio *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {serviceDate ? (
                  format(serviceDate, "PPP", { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={serviceDate}
                onSelect={setServiceDate}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observaciones</Label>
        <Textarea
          id="notes"
          placeholder="Observaciones adicionales sobre el servicio..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <Button
        type="submit"
        disabled={isLoading || !selectedFemale || !selectedBull || !serviceDate}
        className="w-full"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Registrando...
          </div>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Servicio
          </>
        )}
      </Button>
    </form>
  );
}