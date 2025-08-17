import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";

interface NewGeneralActivityDialogProps {
  children: React.ReactNode;
}

const activityTypes = [
  { value: "destete", label: "Destete", icon: "🐄" },
  { value: "marcacion", label: "Marcación", icon: "🔥" },
  { value: "castracion", label: "Castración", icon: "✂️" },
  { value: "descorne", label: "Descorne", icon: "🦏" },
  { value: "traslado", label: "Traslado", icon: "📦" },
  { value: "tratamiento", label: "Tratamiento", icon: "💊" },
  { value: "revision", label: "Revisión", icon: "🔍" },
  { value: "apareamiento", label: "Apareamiento", icon: "💕" },
  { value: "parto", label: "Parto", icon: "👶" },
];

export function NewGeneralActivityDialog({ children }: NewGeneralActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedType, setSelectedType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  
  const { toast } = useToast();
  const { createEvent } = useActivities();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedType) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await createEvent("GENERAL", selectedDate, notes, {
        tipo_actividad: selectedType,
        responsable: responsiblePerson,
      });
      
      toast({
        title: "Actividad registrada",
        description: "La actividad general ha sido registrada exitosamente",
      });
      
      // Reset form
      setSelectedDate(undefined);
      setSelectedType("");
      setNotes("");
      setResponsiblePerson("");
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la actividad",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedActivityType = activityTypes.find(type => type.value === selectedType);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nueva Actividad General
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity-type">Tipo de Actividad *</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsible">Responsable</Label>
            <Input
              id="responsible"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              placeholder="Nombre del responsable"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas y Observaciones</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Describe los detalles de ${selectedActivityType?.label || 'la actividad'}...`}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Registrar Actividad"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}