import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActivityAccordionProps {
  value: string;
  title: string;
  summary: string;
  count: number;
  children: ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  defaultOpen?: boolean;
}

export function ActivityAccordion({ 
  value, 
  title, 
  summary, 
  count, 
  children, 
  primaryAction,
  defaultOpen = false 
}: ActivityAccordionProps) {
  return (
    <AccordionItem value={value} className="border-0">
      <AccordionTrigger className={cn(
        "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:no-underline hover:bg-slate-50",
        "focus:outline-none focus:ring-2 focus:ring-emerald-600",
        "[&[data-state=open]]:rounded-b-none [&[data-state=open]]:border-b-0"
      )}>
        <div className="flex items-center justify-between w-full gap-3">
          <div className="min-w-0 flex-1 text-left">
            <h3 className="text-sm font-medium text-slate-900 truncate">{title}</h3>
            <p className="text-xs text-slate-500 truncate">{summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-slate-50">
              {count}
            </Badge>
            <ChevronDown className="h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="rounded-b-2xl border-x border-b border-slate-200 bg-white px-4 pb-4 pt-0 shadow-sm">
        <div className="space-y-3">
          {children}
          {primaryAction && (
            <Button 
              onClick={primaryAction.onClick}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}