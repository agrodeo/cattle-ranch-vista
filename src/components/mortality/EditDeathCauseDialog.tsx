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
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  orden: z.number().min(0, "El orden debe ser mayor o igual a 0"),
});

interface DeathCause {
  id: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

interface EditDeathCauseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cause: DeathCause | null;
  onSuccess: () => void;
}

export function EditDeathCauseDialog({
  open,
  onOpenChange,
  cause,
  onSuccess,
}: EditDeathCauseDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      orden: 0,
    },
  });

  useEffect(() => {
    if (cause && open) {
      form.reset({
        nombre: cause.nombre,
        orden: cause.orden,
      });
    }
  }, [cause, open, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!cause) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('manage_death_causes', {
        _action: 'update',
        _id: cause.id,
        _nombre: values.nombre,
        _orden: values.orden,
        _activo: true,
      });

      if (error) throw error;

      if ((data as any)?.success) {
        toast({
          title: "Éxito",
          description: (data as any).message,
        });
        onSuccess();
      } else {
        throw new Error((data as any)?.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error updating death cause:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la causa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Causa de Muerte</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la causa *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Neumonía, Accidente, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orden"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orden de visualización</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
              <Button type="submit" disabled={loading}>
                {loading ? "Actualizando..." : "Actualizar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}