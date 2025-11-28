import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm",
      className
    )}>
      {icon && (
        <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-slate-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-600 mb-3 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <Button 
          onClick={action.onClick}
          className=""
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}