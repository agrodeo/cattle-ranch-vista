import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function FinancesSummary() {
  
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();

  const { data } = useQuery({
    queryKey: ["finances","summary", from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      let q = supabase.from("finances").select("amount,type,date");
      if (from) q = q.gte("date", format(from, "yyyy-MM-dd"));
      if (to) q = q.lte("date", format(to, "yyyy-MM-dd"));
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { ingresos, egresos, balance } = useMemo(() => {
    const rows = data || [];
    const ing = rows.filter(r => r.type === "ingreso").reduce((s, r) => s + (r.amount || 0), 0);
    const egr = rows.filter(r => r.type === "egreso").reduce((s, r) => s + (r.amount || 0), 0);
    return { ingresos: ing, egresos: egr, balance: ing - egr };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[220px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {from ? format(from, "PPP") : "Desde"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={from}
              onSelect={setFrom}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[220px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {to ? format(to, "PPP") : "Hasta"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={to}
              onSelect={setTo}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ingresos</p>
            <p className="text-2xl font-semibold">${ingresos.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Egresos</p>
            <p className="text-2xl font-semibold">${egresos.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-2xl font-semibold">${balance.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
