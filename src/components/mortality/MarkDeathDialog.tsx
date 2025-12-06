import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Animal } from "@/types/animal";

const formSchema = z.object({
  fecha_defuncion: z.date({
    required_error: "Date required",
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
  message: "Cause required",
  path: ["causa_id"],
});

interface DeathCause {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

interface MarkDeathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animalId: string | null;
  onSuccess: () => void;
}

export function MarkDeathDialog({
  open,
  onOpenChange,
  animalId,
  onSuccess,
}: MarkDeathDialogProps) {
  const { t } = useTranslation(['mortality', 'common']);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [causes, setCauses] = useState<DeathCause[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAnimal, setLoadingAnimal] = useState(false);
  const [showCustomCause, setShowCustomCause] = useState(false);
  const [showAddCause, setShowAddCause] = useState(false);
  const [newCauseName, setNewCauseName] = useState("");
  const [addingCause, setAddingCause] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useSupabaseAuth();

  // Fetch animal data when dialog opens and animalId is provided
  const fetchAnimalData = async (id: string) => {
    setLoadingAnimal(true);
    try {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      console.log("🔍 MarkDeathDialog fetched fresh animal data:", {
        id: data.id,
        name: data.name,
        id_tag: data.id_tag,
        sex: data.sex,
        breed: data.breed,
        birth_date: data.birth_date,
        status: data.status,
        rawAnimal: data
      });
      
      setAnimal(data);
    } catch (error) {
      console.error('Error fetching animal data:', error);
      toast({
        title: t('common:status.error'),
        description: t('mortality:errors.loadAnimal'),
        variant: "destructive",
      });
    } finally {
      setLoadingAnimal(false);
    }
  };

  useEffect(() => {
    if (open && animalId) {
      fetchAnimalData(animalId);
    } else {
      setAnimal(null);
    }
  }, [open, animalId]);

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
        title: t('common:status.error'),
        description: t('mortality:errors.loadCauses'),
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
          title: t('mortality:success.title'),
          description: t('mortality:success.causeAdded'),
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
        throw new Error((data as any)?.error || t('common:errors.unexpectedError'));
      }
    } catch (error: any) {
      console.error('Error adding death cause:', error);
      toast({
        title: t('common:status.error'),
        description: error.message || t('mortality:errors.addCause'),
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
          title: t('mortality:success.title'),
          description: t('mortality:success.deathRegistered'),
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error((data as any)?.error || t('common:errors.unexpectedError'));
      }
    } catch (error: any) {
      console.error('Error marking death:', error);
      toast({
        title: t('common:status.error'),
        description: error.message || t('mortality:errors.registerDeath'),
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
    if (deathDate < birthDate) return t('mortality:validation.invalidDate');
    
    const totalDays = differenceInDays(deathDate, birthDate);
    const years = differenceInYears(deathDate, birthDate);
    const months = differenceInMonths(deathDate, birthDate) % 12;
    
    if (years > 0) {
      return `${years} ${years > 1 ? t('common:time.years') : t('common:time.year')} ${months} ${months !== 1 ? t('common:time.months') : t('common:time.month')} (${totalDays} ${t('mortality:reports.days')})`;
    } else if (months > 0) {
      return `${months} ${months !== 1 ? t('common:time.months') : t('common:time.month')} (${totalDays} ${t('mortality:reports.days')})`;
    } else {
      return `${totalDays} ${totalDays !== 1 ? t('mortality:reports.days') : t('common:time.day')}`;
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
            {t('mortality:markDeath.title')}
          </DialogTitle>
        </DialogHeader>

        {loadingAnimal ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">{t('mortality:markDeath.loadingAnimal')}</p>
            </div>
          </div>
        ) : !animal ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">{t('mortality:markDeath.animalNotFound')}</p>
          </div>
        ) : (
          <>
        {animal && (
          <div className="mb-4 p-3 bg-muted rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">{t('mortality:markDeath.name')}:</span>
                <p className="font-medium">{animal.name || t('mortality:markDeath.noName')}</p>
              </div>
                  <div>
                    <span className="font-medium text-muted-foreground">{t('mortality:markDeath.identifier')}:</span>
                    <p className="font-medium">{animal.id_tag}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">{t('mortality:markDeath.sex')}:</span>
                    <p className="font-medium">{animal.sex}</p>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">{t('mortality:markDeath.breed')}:</span>
                    <p className="font-medium">{animal.breed}</p>
                  </div>
            </div>
            {animal.birth_date && (
              <div>
                <span className="font-medium text-muted-foreground text-sm">{t('mortality:markDeath.birthDate')}:</span>
                <p className="text-sm">{format(new Date(animal.birth_date), 'dd/MM/yyyy')}</p>
              </div>
            )}
            {ageDisplay && (
              <div>
                <span className="font-medium text-muted-foreground text-sm">{t('mortality:markDeath.ageAtDeath')}:</span>
                <p className="text-sm font-medium text-primary">{ageDisplay}</p>
              </div>
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
                  <FormLabel>{t('mortality:markDeath.deathDate')} *</FormLabel>
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
                            <span>{t('mortality:markDeath.selectDate')}</span>
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
                  <FormLabel>{t('mortality:markDeath.causeOfDeath')} *</FormLabel>
                  <Select onValueChange={handleCauseChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('mortality:markDeath.selectCause')} />
                      </SelectTrigger>
                    </FormControl>
                     <SelectContent>
                       {causes.map((cause) => (
                         <SelectItem key={cause.id} value={cause.id}>
                           {cause.nombre}
                         </SelectItem>
                       ))}
                       <SelectItem value="agregar_nueva">{t('mortality:markDeath.addNewCause')}</SelectItem>
                       <SelectItem value="otra">{t('mortality:markDeath.otherCause')}</SelectItem>
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
                    <FormLabel>{t('mortality:markDeath.specifyCause')} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('mortality:markDeath.writeCause')}
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
                <FormLabel>{t('mortality:markDeath.addNewCauseTitle')}</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('mortality:markDeath.newCauseName')}
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
                    {addingCause ? t('mortality:markDeath.adding') : t('mortality:markDeath.addButton')}
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
                  {t('mortality:markDeath.cancel')}
                </Button>
              </div>
            )}

            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('mortality:markDeath.additionalNotes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('mortality:markDeath.observations')}
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
                {t('mortality:markDeath.cancel')}
              </Button>
              <Button type="submit" disabled={loading} variant="destructive">
                {loading ? t('mortality:markDeath.saving') : t('mortality:markDeath.confirmDeath')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}