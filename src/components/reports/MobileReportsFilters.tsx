import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ReportFilters } from "@/components/reports/ReportsFilters";

interface MobileReportsFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onApplyFilters: () => void;
  children?: React.ReactNode;
}

export function MobileReportsFilters({ 
  filters, 
  onFiltersChange, 
  onApplyFilters,
  children 
}: MobileReportsFiltersProps) {
  const { t } = useTranslation(['reports']);
  const [open, setOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<ReportFilters>(filters);

  const getActiveFiltersCount = (filters: ReportFilters) => {
    let count = 0;
    if (filters.corral_ids?.length) count++;
    if (filters.category) count++;
    if (filters.breed) count++;
    if (filters.include_sold_dead) count++;
    if (filters.date_from || filters.date_to) count++;
    return count;
  };

  const updateTempFilter = (key: keyof ReportFilters, value: any) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApply = () => {
    onFiltersChange(tempFilters);
    onApplyFilters();
    setOpen(false);
  };

  const handleClear = () => {
    const defaultFilters: ReportFilters = {
      date_from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      date_to: new Date().toISOString().split('T')[0],
      include_sold_dead: false
    };
    setTempFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    onApplyFilters();
    setOpen(false);
  };

  const activeCount = getActiveFiltersCount(filters);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="relative">
            <Filter className="h-4 w-4" />
            <span className="ml-2">{t('reports:filters.filters')}</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                {activeCount}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{t('reports:filters.reportFilters')}</span>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4 mr-1" />
                {t('reports:filters.clear')}
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6 pb-20">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('reports:filters.period')}</label>
            <div className="grid grid-cols-2 gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !tempFilters.date_from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tempFilters.date_from ? format(new Date(tempFilters.date_from), "dd/MM/yyyy") : t('reports:filters.from')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={tempFilters.date_from ? new Date(tempFilters.date_from) : undefined}
                    onSelect={(date) => updateTempFilter('date_from', date?.toISOString().split('T')[0])}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !tempFilters.date_to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tempFilters.date_to ? format(new Date(tempFilters.date_to), "dd/MM/yyyy") : t('reports:filters.until')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={tempFilters.date_to ? new Date(tempFilters.date_to) : undefined}
                    onSelect={(date) => updateTempFilter('date_to', date?.toISOString().split('T')[0])}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('reports:filters.category')}</label>
            <Select value={tempFilters.category || "all"} onValueChange={(value) => updateTempFilter('category', value === "all" ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('reports:filters.allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('reports:filters.allCategories')}</SelectItem>
                <SelectItem value="ternero">Ternero</SelectItem>
                <SelectItem value="novillo">Novillo</SelectItem>
                <SelectItem value="toro">Toro</SelectItem>
                <SelectItem value="ternera">Ternera</SelectItem>
                <SelectItem value="vaquillona">Vaquillona</SelectItem>
                <SelectItem value="vaca">Vaca</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Breed */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('reports:filters.breed')}</label>
            <Select value={tempFilters.breed || "all"} onValueChange={(value) => updateTempFilter('breed', value === "all" ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('reports:filters.allBreeds')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('reports:filters.allBreeds')}</SelectItem>
                <SelectItem value="braford">Braford</SelectItem>
                <SelectItem value="angus">Angus</SelectItem>
                <SelectItem value="hereford">Hereford</SelectItem>
                <SelectItem value="brahman">Brahman</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Sold/Dead */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-sold-dead"
              checked={tempFilters.include_sold_dead}
              onCheckedChange={(checked) => updateTempFilter('include_sold_dead', checked)}
            />
            <label
              htmlFor="include-sold-dead"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t('reports:filters.includeSoldDead')}
            </label>
          </div>
        </div>

        {/* Fixed Apply Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button onClick={handleApply} className="w-full">
            {t('reports:filters.applyFilters')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}