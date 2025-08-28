import { ReactNode, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  count?: number;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  onFilter?: () => void;
  className?: string;
}

export function Section({ 
  title, 
  count = 0, 
  children, 
  collapsible = false, 
  defaultOpen = true,
  onFilter,
  className 
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn("card-shadow", className)}>
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0",
          collapsible && "cursor-pointer hover:bg-ink-50 transition-colors"
        )}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <CardTitle className="text-lg font-semibold text-ink-900 flex items-center gap-2">
          {title}
          {count > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium bg-brand-100 text-brand-800 rounded-full">
              {count}
            </span>
          )}
        </CardTitle>
        
        <div className="flex items-center gap-2">
          {onFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFilter();
              }}
              className="lg:hidden h-8 w-8 p-0"
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
          
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      {(!collapsible || isOpen) && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}