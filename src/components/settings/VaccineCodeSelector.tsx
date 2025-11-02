import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface VaccineCodeSelectorProps {
  value: string;
  onChange: (code: string, name: string) => void;
}

interface Vaccine {
  code: string;
  name: string;
  description: string | null;
}

export function VaccineCodeSelector({ value, onChange }: VaccineCodeSelectorProps) {
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVaccines();
  }, []);

  const loadVaccines = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vaccines')
        .select('code, name, description')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Error loading vaccines:', error);
        return;
      }

      setVaccines(data || []);
    } catch (error) {
      console.error('Error in loadVaccines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (code: string) => {
    const vaccine = vaccines.find(v => v.code === code);
    if (vaccine) {
      onChange(code, vaccine.name);
    }
  };

  return (
    <Select value={value} onValueChange={handleChange} disabled={loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Cargando..." : "Seleccionar vacuna del catálogo"} />
      </SelectTrigger>
      <SelectContent>
        {vaccines.map((vaccine) => (
          <SelectItem key={vaccine.code} value={vaccine.code}>
            <div className="flex flex-col">
              <span className="font-medium">{vaccine.name}</span>
              {vaccine.description && (
                <span className="text-xs text-muted-foreground">{vaccine.description}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
