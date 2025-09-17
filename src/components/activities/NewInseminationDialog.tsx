import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calendar as CalendarIcon, Heart, Info } from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { es } from "date-fns/locale";

interface InseminationDialogProps {
  onSuccess?: () => void;
}

export function NewInseminationDialog({ onSuccess }: InseminationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  
  // Form data
  const [fecha, setFecha] = useState<Date>(new Date());
  const [toroNombre, setToroNombre] = useState("");
  const [razaToro, setRazaToro] = useState("");
  const [extrasToro, setExtrasToro] = useState({
    cuernos: "",
    pelaje: "",
    peso_nacimiento: "",
    peso_destete: "",
    peso_final: "",
    ce: "",
    registro: "",
    adn: false,
    origen: "",
  });
  const [notas, setNotas] = useState("");

  const { toast } = useToast();
  const { getEligibleAnimals, createEvent } = useActivities();

  useEffect(() => {
    if (open) {
      loadAnimals();
    }
  }, [open]);

  const loadAnimals = async () => {
    try {
      setLoading(true);
      const eligibleAnimals = await getEligibleAnimals('IA');
      setAnimals(eligibleAnimals);
    } catch (error) {
      console.error("Error loading animals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimalSelection = (animalId: string, checked: boolean) => {
    if (checked) {
      setSelectedAnimals(prev => [...prev, animalId]);
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId));
    }
  };

  const selectAllAnimals = () => {
    setSelectedAnimals(animals.map(a => a.id));
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
  };

  const handleSubmit = async () => {
    try {
      if (!toroNombre.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El nombre del toro es requerido",
        });
        return;
      }

      if (selectedAnimals.length === 0) {
        toast({
          variant: "destructive",
          title: "Error", 
          description: "Debe seleccionar al menos una hembra",
        });
        return;
      }

      setLoading(true);

      // Get user's cabaña
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuario no autenticado");

      const { data: userData } = await supabase
        .from('users')
        .select('cabaña_id')
        .eq('id', user.data.user.id)
        .single();

      if (!userData?.['cabaña_id']) throw new Error("Usuario sin cabaña asignada");

      // Create the event
      const event = await createEvent('IA', fecha, notas);

      // Create the AI record
      const { error } = await supabase
        .from("ia")
        .insert({
          evento_id: event.id,
          toro_nombre: toroNombre.trim(),
          raza_toro: razaToro || null,
          extras_toro: extrasToro,
          animales_ids: selectedAnimals,
        });

      if (error) throw error;

      // Update reproductive states for each animal using new function
      for (const animalId of selectedAnimals) {
        const { error: stateError } = await supabase.rpc('register_reproductive_activity', {
          _animal_id: animalId,
          _tipo_actividad: 'inseminacion_artificial',
          _fecha_actividad: format(fecha, 'yyyy-MM-dd'),
          _cabana_id: userData['cabaña_id'],
          _detalle: extrasToro
        });

        if (stateError) {
          console.error('Error updating reproductive state:', stateError);
          // Don't fail the whole operation, just log the error
        }
      }

      toast({
        title: "Inseminación registrada",
        description: `Se inseminaron ${selectedAnimals.length} hembras con ${toroNombre}`,
      });

      // Reset form
      setToroNombre("");
      setRazaToro("");
      setExtrasToro({
        cuernos: "",
        pelaje: "",
        peso_nacimiento: "",
        peso_destete: "",
        peso_final: "",
        ce: "",
        registro: "",
        adn: false,
        origen: "",
      });
      setNotas("");
      setSelectedAnimals([]);
      setOpen(false);
      
      onSuccess?.();
    } catch (error) {
      console.error("Error saving insemination:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la inseminación",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderBreedSpecificFields = () => {
    if (razaToro === "Braford") {
      return (
        <div className="space-y-2">
          <Label>Cuernos</Label>
          <Select 
            value={extrasToro.cuernos} 
            onValueChange={(value) => setExtrasToro(prev => ({ ...prev, cuernos: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo de cuernos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="astado">Astado</SelectItem>
              <SelectItem value="mocho">Mocho</SelectItem>
              <SelectItem value="mocho_homocigota">Mocho Homocigota</SelectItem>
            </SelectContent>
          </Select>
          {extrasToro.cuernos === "mocho_homocigota" && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Info className="h-4 w-4" />
              <span>La cría será 100% mocha si hay preñez</span>
            </div>
          )}
        </div>
      );
    }

    if (["Brangus", "Angus"].includes(razaToro)) {
      return (
        <div className="space-y-2">
          <Label>Pelaje</Label>
          <Select 
            value={extrasToro.pelaje} 
            onValueChange={(value) => setExtrasToro(prev => ({ ...prev, pelaje: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar color de pelaje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="negro">Negro</SelectItem>
              <SelectItem value="colorado">Colorado</SelectItem>
              <SelectItem value="negro_homocigota">Negro Homocigota</SelectItem>
              <SelectItem value="colorado_homocigota">Colorado Homocigota</SelectItem>
            </SelectContent>
          </Select>
          {(extrasToro.pelaje === "negro_homocigota" || extrasToro.pelaje === "colorado_homocigota") && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Info className="h-4 w-4" />
              <span>La cría será 100% del color del padre si hay preñez</span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Inseminación
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Inseminación Artificial</DialogTitle>
          <DialogDescription>
            Registre el servicio de inseminación artificial
          </DialogDescription>
        </DialogHeader>
        
        {animals.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              No hay hembras elegibles para inseminación artificial.
            </p>
            <p className="text-sm text-muted-foreground">
              Se requieren hembras ≥15 meses que no estén preñadas.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Service Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha de Servicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(fecha, "PPP", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fecha}
                    onSelect={(date) => date && setFecha(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toro_nombre">Nombre del Toro *</Label>
              <Input
                id="toro_nombre"
                value={toroNombre}
                onChange={(e) => setToroNombre(e.target.value)}
                placeholder="Nombre o código del toro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="raza_toro">Raza del Toro</Label>
              <Select value={razaToro} onValueChange={setRazaToro}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar raza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Braford">Braford</SelectItem>
                  <SelectItem value="Brangus">Brangus</SelectItem>
                  <SelectItem value="Angus">Angus</SelectItem>
                  <SelectItem value="Hereford">Hereford</SelectItem>
                  <SelectItem value="Limousin">Limousin</SelectItem>
                  <SelectItem value="Charolais">Charolais</SelectItem>
                  <SelectItem value="Otra">Otra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderBreedSpecificFields()}
          </div>

          {/* Bull Additional Details */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Datos Adicionales del Toro</Label>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs">Peso Nacimiento (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={extrasToro.peso_nacimiento}
                  onChange={(e) => setExtrasToro(prev => ({ ...prev, peso_nacimiento: e.target.value }))}
                  placeholder="35.0"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Peso Destete (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={extrasToro.peso_destete}
                  onChange={(e) => setExtrasToro(prev => ({ ...prev, peso_destete: e.target.value }))}
                  placeholder="200.0"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Peso Final (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={extrasToro.peso_final}
                  onChange={(e) => setExtrasToro(prev => ({ ...prev, peso_final: e.target.value }))}
                  placeholder="450.0"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">CE (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={extrasToro.ce}
                  onChange={(e) => setExtrasToro(prev => ({ ...prev, ce: e.target.value }))}
                  placeholder="34.0"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Registro Racial</Label>
                <Input
                  value={extrasToro.registro}
                  onChange={(e) => setExtrasToro(prev => ({ ...prev, registro: e.target.value }))}
                  placeholder="Número de registro"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Origen</Label>
                <Input
                  value={extrasToro.origen}
                  onChange={(e) => setExtrasToro(prev => ({ ...prev, origen: e.target.value }))}
                  placeholder="País/región de origen"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Observaciones</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones del servicio..."
              rows={3}
            />
          </div>

          {/* Animal Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Hembras Elegibles ({animals.length} disponibles)
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllAnimals}>
                  Seleccionar Todas
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Animal</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Raza</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {animals.map((animal) => (
                    <TableRow key={animal.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAnimals.includes(animal.id)}
                          onCheckedChange={(checked) => 
                            handleAnimalSelection(animal.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{animal.name || "Sin nombre"}</div>
                          <div className="text-sm text-muted-foreground">{animal.id_tag}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {animal.birth_date ? 
                          `${differenceInMonths(new Date(), new Date(animal.birth_date))} meses`
                          : "No registrada"
                        }
                      </TableCell>
                      <TableCell>{animal.breed || "No especificada"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Heart className={`h-3 w-3 ${animal.esta_preñada ? 'text-red-500' : 'text-gray-400'}`} />
                          <span className="text-sm">
                            {animal.esta_preñada ? 'Preñada' : 'Disponible'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedAnimals.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedAnimals.length} hembra(s) seleccionada(s)
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || selectedAnimals.length === 0 || !toroNombre.trim()}
            >
              {loading ? "Guardando..." : "Registrar Inseminación"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}