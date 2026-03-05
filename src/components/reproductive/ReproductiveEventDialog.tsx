import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const reproductiveEventSchema = z.object({
  year: z.number().min(2000).max(new Date().getFullYear() + 1),
  pregnancy_status: z.enum(["pregnant", "not_pregnant", "unknown"]),
  pregnancy_outcome: z.enum(["live_calf", "stillborn", "calf_died_shortly", "lost_pregnancy"]).optional(),
  calving_date: z.date().optional(),
  linked_calf_id: z.string().optional(),
  notes: z.string().optional(),
});

type ReproductiveEventForm = z.infer<typeof reproductiveEventSchema>;

interface ReproductiveEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  animalId: string;
  cabaña_id: string;
  existingEvent?: any;
  onSuccess: () => void;
}

export function ReproductiveEventDialog({
  isOpen,
  onClose,
  animalId,
  cabaña_id,
  existingEvent,
  onSuccess,
}: ReproductiveEventDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation(['reproductive', 'common']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReproductiveEventForm>({
    resolver: zodResolver(reproductiveEventSchema),
    defaultValues: {
      year: existingEvent?.year || new Date().getFullYear(),
      pregnancy_status: existingEvent?.pregnancy_status || "unknown",
      pregnancy_outcome: existingEvent?.pregnancy_outcome || undefined,
      calving_date: existingEvent?.calving_date ? new Date(existingEvent.calving_date) : undefined,
      linked_calf_id: existingEvent?.linked_calf_id || "",
      notes: existingEvent?.notes || "",
    },
  });

  const pregnancyStatus = form.watch("pregnancy_status");

  const onSubmit = async (data: ReproductiveEventForm) => {
    setIsSubmitting(true);
    try {
      const payload = {
        animal_id: animalId,
        cabaña_id,
        year: data.year,
        pregnancy_status: data.pregnancy_status,
        pregnancy_outcome: data.pregnancy_status === "pregnant" ? data.pregnancy_outcome : null,
        calving_date: data.calving_date?.toISOString().split('T')[0] || null,
        linked_calf_id: data.linked_calf_id || null,
        notes: data.notes || null,
      };

      if (existingEvent) {
        const { error } = await supabase
          .from("reproductive_events")
          .update(payload)
          .eq("id", existingEvent.id);

        if (error) throw error;
        toast({ title: t('common:toast.reproductiveEventUpdated') });
      } else {
        const { error } = await supabase
          .from("reproductive_events")
          .insert(payload);

        if (error) throw error;
        toast({ title: t('common:toast.reproductiveEventCreated') });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('common:error'),
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {existingEvent ? t('reproductive:eventDialog.editEvent') : t('reproductive:eventDialog.addEvent')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('reproductive:eventDialog.year')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pregnancy_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('reproductive:eventDialog.pregnancyStatus')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('reproductive:eventDialog.selectStatus')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pregnant">✅ {t('reproductive:eventDialog.statusPregnant')}</SelectItem>
                        <SelectItem value="not_pregnant">❌ {t('reproductive:eventDialog.statusNotPregnant')}</SelectItem>
                        <SelectItem value="unknown">❓ {t('reproductive:eventDialog.statusUnknown')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {pregnancyStatus === "pregnant" && (
              <>
                <FormField
                  control={form.control}
                  name="pregnancy_outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('reproductive:eventDialog.pregnancyOutcome')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('reproductive:eventDialog.selectOutcome')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="live_calf">🟢 {t('reproductive:eventDialog.outcomeLiveCalf')}</SelectItem>
                          <SelectItem value="stillborn">🔴 {t('reproductive:eventDialog.outcomeStillborn')}</SelectItem>
                          <SelectItem value="calf_died_shortly">⚠️ {t('reproductive:eventDialog.outcomeCalfDied')}</SelectItem>
                          <SelectItem value="lost_pregnancy">🟡 {t('reproductive:eventDialog.outcomeLostPregnancy')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="calving_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('reproductive:eventDialog.calvingDate')}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>{t('reproductive:eventDialog.selectDate')}</span>
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
                    name="linked_calf_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('reproductive:eventDialog.calfId')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('reproductive:eventDialog.calfIdPlaceholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('reproductive:eventDialog.notes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('reproductive:eventDialog.notesPlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('common:forms.saving') : t('common:actions.save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}