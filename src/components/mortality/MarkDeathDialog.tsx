import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Skull } from "lucide-react";
import { format, differenceInDays, differenceInMonths, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useHybridAuth } from "@/hooks/useHybridAuth";

const formSchema = z.object({
  fecha_defuncion: z.date({
    required_error: "La fecha de defunción es requerida",
  }),
  causa_id: z.string().optional(),
  causa_texto: z.string().optional(),
  notas: z.string().optional(),
}).refine((data) => {
  if (!data.causa_id && !data.causa_texto?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Debe seleccionar una causa o escribir una causa personalizada",
  path: ["causa_id"],
});

interface DeathCause {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

interface Animal {
  id: string;
  name?: string;
  id_tag?: string;
  birth_date?: string;
}

interface MarkDeathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animal: Animal | null;
  onSuccess: () => void;
}

export function MarkDeathDialog({
  open,
  onOpenChange,
  animal,
  onSuccess,
}: MarkDeathDialogProps) {
  const [causes, setCauses] = useState<DeathCause[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustomCause, setShowCustomCause] = useState(false);
  const [showAddCause, setShowAddCause] = useState(false);
  const [newCauseName, setNewCauseName] = useState("");
  const [addingCause, setAddingCause] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useHybridAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha_defuncion: new Date(),
      causa_id: "",
      causa_texto: "",
      notas: "",
    },
  });

  useEffect(() => {
    if (open) {
      loadDeathCauses();
      form.reset({
        fecha_defuncion: new Date(),
        causa_id: "",
        causa_texto: "",
        notas: "",
      });
      setShowCustomCause(false);
    }
  }, [open, form]);

  const loadDeathCauses = async () => {
    try {
      const { data, error } = await supabase.rpc('manage_death_causes', {
        _user_id: currentUser?.id,
        _action: 'list'
      });

      if (error) throw error;
      
      // Ensure data is an array and handle successful response
      if (data && Array.isArray(data)) {
        // Remove duplicates and filter out control options
        const rawCauses = data as unknown as DeathCause[];
        const uniqueCauses = rawCauses.filter((cause, index, self) => {
          const isControlOption = cause.nombre?.toLowerCase().includes('otra causa') || 
                                cause.nombre?.toLowerCase().includes('agregar');
          if (isControlOption) return false;
          
          // Remove duplicates based on name
          return index === self.findIndex((c) => c.nombre === cause.nombre);
        }).sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        setCauses(uniqueCauses);
      } else {
        // Handle case where data is not an array (like error responses)
        setCauses([]);
        if (data && typeof data === 'object' && 'error' in data) {
          throw new Error((data as any).error);
        }
      }
    } catch (error) {
      console.error('Error loading death causes:', error);
      setCauses([]); // Ensure causes is always an array
      toast({
        title: "Error",
        description: "No se pudieron cargar las causas de muerte",
        variant: "destructive",
      });
    }
  };

  const addNewCause = async () => {
    if (!newCauseName.trim() || !currentUser?.id) return;

    setAddingCause(true);
    try {
      const { data, error } = await supabase.rpc('manage_death_causes', {
        _user_id: currentUser.id,
        _action: 'create',
        _nombre: newCauseName.trim(),
      });

      if (error) throw error;

      if ((data as any)?.success) {
        toast({
          title: "Éxito",
          description: "Causa de muerte agregada correctamente",
        });
        
        // Recargar las causas y seleccionar la nueva
        await loadDeathCauses();
        
        // Seleccionar la nueva causa
        const newCauseId = (data as any)?.id;
        if (newCauseId) {
          form.setValue('causa_id', newCauseId);
        }
        
        // Resetear el formulario de agregar
        setNewCauseName("");
        setShowAddCause(false);
        setShowCustomCause(false);
      } else {
        throw new Error((data as any)?.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error adding death cause:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar la causa",
        variant: "destructive",
      });
    } finally {
      setAddingCause(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!animal || !currentUser?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('marcar_defuncion', {
        _user_id: currentUser.id,
        _animal_id: animal.id,
        _fecha_defuncion: format(values.fecha_defuncion, 'yyyy-MM-dd'),
        _causa_id: values.causa_id || null,
        _causa_texto: values.causa_texto || null,
        _notas: values.notas || null,
      });

      if (error) throw error;

      if ((data as any)?.success) {
        toast({
          title: "Éxito",
          description: (data as any).message,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error((data as any)?.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error marking death:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo marcar la defunción",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = () => {
    if (!animal?.birth_date || !form.watch('fecha_defuncion')) return null;
    
    const birthDate = new Date(animal.birth_date);
    const deathDate = form.watch('fecha_defuncion');
    
    // Validar que la fecha de muerte no sea anterior al nacimiento
    if (deathDate < birthDate) return "Fecha inválida";
    
    const totalDays = differenceInDays(deathDate, birthDate);
    const years = differenceInYears(deathDate, birthDate);
    const months = differenceInMonths(deathDate, birthDate) % 12;
    
    if (years > 0) {
      return `${years} año${years > 1 ? 's' : ''} ${months} mes${months !== 1 ? 'es' : ''} (${totalDays} días)`;
    } else if (months > 0) {
      return `${months} mes${months !== 1 ? 'es' : ''} (${totalDays} días)`;
    } else {
      return `${totalDays} día${totalDays !== 1 ? 's' : ''}`;
    }
  };

  const handleCauseChange = (value: string) => {
    if (value === 'otra') {
      setShowCustomCause(true);
      setShowAddCause(false);
      form.setValue('causa_id', '');
      form.setValue('causa_texto', '');
    } else if (value === 'agregar_nueva') {
      setShowAddCause(true);
      setShowCustomCause(false);
      form.setValue('causa_id', '');
      form.setValue('causa_texto', '');
    } else {
      setShowCustomCause(false);
      setShowAddCause(false);
      form.setValue('causa_id', value);
      form.setValue('causa_texto', '');
    }
  };

  const ageDisplay = calculateAge();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5 text-destructive" />
            Marcar como Fallecido
          </DialogTitle>
        </DialogHeader>

        {animal && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="font-medium">
              {animal.name || animal.id_tag || 'Animal sin nombre'}
            </p>
            {animal.birth_date && (
              <p className="text-sm text-muted-foreground">
                Fecha de nacimiento: {format(new Date(animal.birth_date), 'dd/MM/yyyy')}
              </p>
            )}
            {ageDisplay && (
              <p className="text-sm font-medium text-primary mt-1">
                Edad al morir: {ageDisplay}
              </p>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fecha_defuncion"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de defunción *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || 
                          (animal?.birth_date && date < new Date(animal.birth_date))
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="causa_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Causa de muerte *</FormLabel>
                  <Select onValueChange={handleCauseChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar causa" />
                      </SelectTrigger>
                    </FormControl>
                     <SelectContent>
                       {causes.map((cause) => (
                         <SelectItem key={cause.id} value={cause.id}>
                           {cause.nombre}
                         </SelectItem>
                       ))}
                       <SelectItem value="agregar_nueva">+ Agregar nueva causa</SelectItem>
                       <SelectItem value="otra">Otra causa...</SelectItem>
                     </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showCustomCause && (
              <FormField
                control={form.control}
                name="causa_texto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especificar causa *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Escribir causa de muerte"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showAddCause && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <FormLabel>Agregar nueva causa de muerte</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre de la nueva causa"
                    value={newCauseName}
                    onChange={(e) => setNewCauseName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addNewCause();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addNewCause}
                    disabled={!newCauseName.trim() || addingCause}
                    size="sm"
                  >
                    {addingCause ? "Agregando..." : "Agregar"}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddCause(false);
                    setNewCauseName("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}

            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas adicionales</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones sobre la defunción..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} variant="destructive">
                {loading ? "Guardando..." : "Marcar como Fallecido"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}