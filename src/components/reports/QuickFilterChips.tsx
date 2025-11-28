import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface QuickFilter {
  id: string;
  label: string;
  type: 'corral' | 'status' | 'category' | 'breed';
  value: string;
}

interface QuickFilterChipsProps {
  availableFilters: QuickFilter[];
  activeFilters: string[];
  onToggleFilter: (filterId: string) => void;
  className?: string;
}

export const QuickFilterChips = ({
  availableFilters,
  activeFilters,
  onToggleFilter,
  className
}: QuickFilterChipsProps) => {
  const { t } = useTranslation(['reports']);

  if (availableFilters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <span className="text-sm text-muted-foreground self-center">
        {t('reports:quickFilters')}:
      </span>
      {availableFilters.map((filter) => {
        const isActive = activeFilters.includes(filter.id);
        return (
          <Badge
            key={filter.id}
            variant={isActive ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              isActive && "pr-1"
            )}
            onClick={() => onToggleFilter(filter.id)}
          >
            {filter.label}
            {isActive && (
              <X className="ml-1 h-3 w-3" />
            )}
          </Badge>
        );
      })}
    </div>
  );
};
