import { ReactNode } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
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
  title: string;
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
  inlineAction?: {
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
  inlineAction,
  collapsible = false,
  defaultOpen = true,
  className 
}: SectionCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card shadow-sm",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          {count !== undefined && (
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
              {count}
            </Badge>
          )}
          {inlineAction && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs text-primary hover:text-primary"
              onClick={inlineAction.onClick}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {inlineAction.label}
            </Button>
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
      
      {/* Content */}
      <div className="p-5">
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
