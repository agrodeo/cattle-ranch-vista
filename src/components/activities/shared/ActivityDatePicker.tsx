import { cn } from "@/lib/utils";
import { LucideIcon, Calendar as CalendarIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es, enUS, ptBR } from "date-fns/locale";
import { getCurrentLanguage } from "@/i18n";

interface ActivityDatePickerProps {
  label: string;
  date: Date;
  onDateChange: (date: Date) => void;
}

export function ActivityDatePicker({ label, date, onDateChange }: ActivityDatePickerProps) {
  const locale = getCurrentLanguage() === 'en' ? enUS : getCurrentLanguage() === 'pt' ? ptBR : es;
  
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal h-11"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {format(date, "PPP", { locale })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onDateChange(d)}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
