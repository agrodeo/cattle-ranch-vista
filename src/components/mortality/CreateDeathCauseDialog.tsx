import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateDeathCauseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateDeathCauseDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDeathCauseDialogProps) {
  const { t } = useTranslation(['mortality', 'common']);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formSchema = z.object({
    nombre: z.string().min(1, t('common:validation.required')),
    orden: z.number().min(0),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      orden: 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('manage_death_causes', {
        _action: 'create',
        _nombre: values.nombre,
        _orden: values.orden,
        _activo: true,
      });

      if (error) throw error;

      if ((data as any)?.success) {
        toast({
          title: t('common:toast.success'),
          description: (data as any).message,
        });
        form.reset();
        onSuccess();
      } else {
        throw new Error((data as any)?.error || t('common:toast.error'));
      }
    } catch (error: any) {
      console.error('Error creating death cause:', error);
      toast({
        title: t('common:toast.error'),
        description: error.message || t('mortality:causeDialog.errorCreate'),
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
          <DialogTitle>{t('mortality:causeDialog.createTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('mortality:causeDialog.causeName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('mortality:causeDialog.causeNamePlaceholder')}
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
                  <FormLabel>{t('mortality:causeDialog.displayOrder')}</FormLabel>
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
                {t('mortality:causeDialog.cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('mortality:causeDialog.creating') : t('mortality:causeDialog.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
