import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

export default function MultiAnimalSelect({ selectedIds, onChange, className }: Props) {
  const { t } = useTranslation(['finance', 'common']);
  const { currentUser } = useSupabaseAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: animals = [], isLoading, error } = useQuery({
    queryKey: ["animals-available", currentUser?.cabañaId],
    queryFn: async (): Promise<any[]> => {
      const cabId = currentUser?.cabañaId || "";
      
      if (!cabId) {
        return [];
      }
      
      // Fetch animals that are not sold or dead
      const { data, error } = await supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", cabId)
        .not("status", "in", "(vendido,muerto,Vendido,Muerto)");
        
      if (error) {
        console.error("MultiAnimalSelect - Query error:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!currentUser?.cabañaId,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return animals;
    const q = search.toLowerCase();
    return animals.filter((a: any) => {
      const label = getLabel(a).toLowerCase();
      return label.includes(q);
    });
  }, [animals, search]);

  const toggleId = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          {t('finance:movements.selectAnimals')} ({selectedIds.length})
        </Button>
        {selectedIds.length > 0 && (
          <Button type="button" variant="ghost" onClick={() => onChange([])}>
            {t('finance:mobile.clear')}
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('finance:movements.selectAnimals')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input 
              placeholder={t('finance:mobile.search')} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
            <ScrollArea className="h-64 rounded border">
              <div className="p-2 space-y-1">
                {isLoading && (
                  <div className="text-sm text-muted-foreground px-2 py-1">
                    {t('finance:mobile.loadingAnimals')}
                  </div>
                )}
                {error && (
                  <div className="text-sm text-destructive px-2 py-1">
                    {t('finance:mobile.animalSaleError')}: {error.message}
                  </div>
                )}
                {!isLoading && !error && filtered.map((a: any) => (
                  <label key={a.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedIds.includes(a.id)}
                      onCheckedChange={() => toggleId(a.id)}
                    />
                    <span className="text-sm">{getLabel(a)}</span>
                  </label>
                ))}
                {!isLoading && !error && filtered.length === 0 && animals.length === 0 && (
                  <div className="text-sm text-muted-foreground px-2 py-1">
                    {t('finance:mobile.noAnimalsAvailable')}
                  </div>
                )}
                {!isLoading && !error && filtered.length === 0 && animals.length > 0 && (
                  <div className="text-sm text-muted-foreground px-2 py-1">
                    {t('finance:mobile.noResults')} "{search}"
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('finance:mobile.close')}
            </Button>
            <Button onClick={() => setOpen(false)}>
              {t('finance:mobile.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getLabel(a: any) {
  return a.id_tag || a.name || a.registration_number || a.id;
}
