import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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

interface ArtificialInsemination {
  id: string;
  insemination_date: string;
  bull_name: string;
  bull_id: string | null;
  is_pregnant: boolean | null;
  notes: string | null;
  animals: {
    name: string | null;
    id_tag: string | null;
    corrales: {
      name: string;
    } | null;
  } | null;
}

interface EditArtificialInseminationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ArtificialInsemination | null;
  onSuccess: () => void;
}

export function EditArtificialInseminationDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
}: EditArtificialInseminationDialogProps) {
  const { t } = useTranslation(['activities', 'common']);
  const [date, setDate] = useState<Date>();
  const [bullName, setBullName] = useState("");
  const [isPregnant, setIsPregnant] = useState<string>("pending");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (record && open) {
      setDate(new Date(record.insemination_date));
      setBullName(record.bull_name);
      setIsPregnant(
        record.is_pregnant === null ? "pending" :
        record.is_pregnant ? "yes" : "no"
      );
      setNotes(record.notes || "");
    }
  }, [record, open]);

  const handleSubmit = async () => {
    if (!record || !date || !bullName) {
      toast({
        title: t('activities:artificialInsemination.errorTitle'),
        description: t('activities:artificialInsemination.completeRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("artificial_inseminations")
        .update({
          insemination_date: date.toISOString().split('T')[0],
          bull_name: bullName,
          is_pregnant: isPregnant === "yes" ? true : isPregnant === "no" ? false : null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);

      if (error) throw error;

      toast({
        title: t('activities:artificialInsemination.successTitle'),
        description: t('activities:artificialInsemination.recordUpdated'),
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating insemination:", error);
      toast({
        title: t('activities:artificialInsemination.errorTitle'),
        description: t('activities:artificialInsemination.errorUpdating'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {t('activities:artificialInsemination.editTitle')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('activities:artificialInsemination.animal')}: {record.animals?.name || record.animals?.id_tag || t('activities:artificialInsemination.noName')}
          </p>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              {t('activities:artificialInsemination.date')}
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
                    {date ? format(date, "dd/MM/yyyy") : t('activities:artificialInsemination.selectDate')}
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
            <Label htmlFor="bull-name" className="text-right">
              {t('activities:artificialInsemination.bull')}
            </Label>
            <Input
              id="bull-name"
              value={bullName}
              onChange={(e) => setBullName(e.target.value)}
              className="col-span-3"
              placeholder={t('activities:artificialInsemination.bullName')}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pregnant" className="text-right">
              {t('activities:artificialInsemination.pregnantLabel')}
            </Label>
            <div className="col-span-3">
              <Select value={isPregnant} onValueChange={setIsPregnant}>
                <SelectTrigger>
                  <SelectValue placeholder={t('activities:artificialInsemination.selectResult')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('activities:artificialInsemination.pending')}</SelectItem>
                  <SelectItem value="yes">{t('activities:artificialInsemination.yes')}</SelectItem>
                  <SelectItem value="no">{t('activities:artificialInsemination.no')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              {t('activities:artificialInsemination.notesLabel')}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder={t('activities:artificialInsemination.notesPlaceholder')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? t('activities:artificialInsemination.saving') : t('activities:artificialInsemination.saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}