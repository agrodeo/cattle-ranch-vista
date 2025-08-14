
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
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
  const { currentUser } = useSimpleAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: animals = [] } = useQuery({
    queryKey: ["animals-available", currentUser?.cabañaId],
    queryFn: async (): Promise<any[]> => {
      const cabId = currentUser?.cabañaId || "";
      // Traer animales de la cabaña que no estén vendidos ni muertos
      // Seleccionamos * para evitar errores por columnas desconocidas
      const { data, error } = await supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", cabId)
        .not("status", "in", ["vendido", "muerto", "Vendido", "Muerto"]);
      if (error) throw error;
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
          Seleccionar animales ({selectedIds.length})
        </Button>
        {selectedIds.length > 0 && (
          <Button type="button" variant="ghost" onClick={() => onChange([])}>
            Limpiar
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Seleccionar animales</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <ScrollArea className="h-64 rounded border">
              <div className="p-2 space-y-1">
                {filtered.map((a: any) => (
                  <label key={a.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedIds.includes(a.id)}
                      onCheckedChange={() => toggleId(a.id)}
                    />
                    <span className="text-sm">{getLabel(a)}</span>
                  </label>
                ))}
                {filtered.length === 0 && (
                  <div className="text-sm text-muted-foreground px-2 py-1">Sin resultados</div>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cerrar</Button>
            <Button onClick={() => setOpen(false)}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getLabel(a: any) {
  // Tratamos de armar una etiqueta legible con posibles campos
  return a.id_tag || a.name || a.registration_number || a.id;
}
