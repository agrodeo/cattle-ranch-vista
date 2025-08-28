import { ReactNode } from "react";
import { Calendar, MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CompactListItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string | Date;
  location?: string;
  user?: string;
  status?: "pending" | "completed" | "overdue";
  priority?: "low" | "medium" | "high";
  animalCount?: number;
  badge?: ReactNode;
}

interface CompactListProps {
  items: CompactListItem[];
  onItemClick?: (item: CompactListItem) => void;
  className?: string;
}

export function CompactList({ items, onItemClick, className }: CompactListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500">
        <p className="text-sm">No hay elementos para mostrar</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className={cn(
            "flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors",
            onItemClick && "cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600",
            item.priority === "high" && "border-l-4 border-l-red-500",
            item.priority === "medium" && "border-l-4 border-l-amber-500"
          )}
          tabIndex={onItemClick ? 0 : undefined}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-medium text-slate-900 truncate">
                {item.title}
              </h4>
              {item.badge}
            </div>
            
            {item.subtitle && (
              <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                {item.subtitle}
              </p>
            )}
            
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {item.date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {typeof item.date === 'string' ? item.date : item.date.toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {item.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{item.location}</span>
                </div>
              )}
              
              {item.user && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate">{item.user}</span>
                </div>
              )}
              
              {item.animalCount && (
                <Badge variant="outline" className="text-xs">
                  {item.animalCount} animales
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}