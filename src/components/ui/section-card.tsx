import { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  count?: number;
  children: ReactNode;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export function SectionCard({ 
  title, 
  subtitle, 
  count, 
  children, 
  actions,
  primaryAction,
  collapsible = false,
  defaultOpen = true,
  className 
}: SectionCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-slate-200 bg-white shadow-sm",
      className
    )}>
      {/* Header */}
      {(title || actions || count !== undefined) && (
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="min-w-0 flex-1">
          {title && <h3 className="text-sm font-medium text-slate-900 truncate">{title}</h3>}
          {subtitle && (
            <p className="text-xs text-slate-500 truncate mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {count !== undefined && (
            <Badge variant="outline" className="bg-slate-50">
              {count}
            </Badge>
          )}
          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, index) => (
                  <DropdownMenuItem key={index} onClick={action.onClick}>
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      )}
      
      {/* Content */}
      <div className="p-4">
        <div className="space-y-3">
          {children}
          {primaryAction && (
            <Button 
              onClick={primaryAction.onClick}
              className="w-full"
              size="sm"
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}