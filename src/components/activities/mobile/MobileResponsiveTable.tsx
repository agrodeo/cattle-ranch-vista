import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface TableColumn {
  key: string;
  label: string;
  primary?: boolean;
  render?: (value: any, row: any) => ReactNode;
}

interface MobileResponsiveTableProps {
  data: any[];
  columns: TableColumn[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
}

export function MobileResponsiveTable({ 
  data, 
  columns, 
  loading, 
  emptyMessage = "No data available",
  onRowClick 
}: MobileResponsiveTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const primaryColumns = columns.filter(col => col.primary);
  const secondaryColumns = columns.filter(col => !col.primary);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((row, index) => {
        const isExpanded = expandedRows.has(index);
        const hasSecondaryData = secondaryColumns.some(col => row[col.key]);

        return (
          <Card key={index} className="overflow-hidden">
            <Collapsible
              open={isExpanded}
              onOpenChange={() => hasSecondaryData && toggleRow(index)}
            >
              <CollapsibleTrigger asChild>
                <CardContent 
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onRowClick?.(row)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 space-y-1">
                      {primaryColumns.map((column) => {
                        const value = row[column.key];
                        const displayValue = column.render ? column.render(value, row) : value;
                        
                        return (
                          <div key={column.key} className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {displayValue}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {hasSecondaryData && (
                      <Button variant="ghost" size="sm" className="shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </CollapsibleTrigger>
              
              {hasSecondaryData && (
                <CollapsibleContent>
                  <div className="px-4 pb-4 border-t border-border bg-muted/20">
                    <div className="grid grid-cols-1 gap-2 pt-3">
                      {secondaryColumns.map((column) => {
                        const value = row[column.key];
                        if (!value) return null;
                        
                        const displayValue = column.render ? column.render(value, row) : value;
                        
                        return (
                          <div key={column.key} className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{column.label}:</span>
                            <span className="text-sm font-medium">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              )}
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}