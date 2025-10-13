import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ManualAnimalFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function ManualAnimalForm({ onBack, onSuccess }: ManualAnimalFormProps) {
  const { t } = useTranslation(['animals', 'common', 'forms']);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id_tag: "",
    sex: "",
    breed: "",
    birth_date: "",
    peso_nacimiento: "",
    observaciones: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.id_tag || !formData.sex || !formData.breed) {
      toast.error("Campos requeridos: Identificación, Sexo y Raza");
      return;
    }

    setLoading(true);
    try {
      // Get current user's cabaña_id using RPC function
      const { data: cabanaData, error: cabanaError } = await supabase.rpc(
        'get_current_user_cabana_id'
      );

      if (cabanaError || !cabanaData) {
        throw new Error("No se pudo obtener la cabaña del usuario");
      }

      const { error } = await supabase
        .from("animals")
        .insert([{
          id_tag: formData.id_tag,
          sex: formData.sex,
          breed: formData.breed,
          birth_date: formData.birth_date || null,
          peso_nacimiento: formData.peso_nacimiento ? parseFloat(formData.peso_nacimiento) : null,
          observaciones: formData.observaciones || null,
          status: "activo"
        }]);

      if (error) throw error;

      toast.success("Animal creado exitosamente");
      onSuccess();
    } catch (error) {
      console.error("Error creating animal:", error);
      toast.error("Error al crear el animal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background lg:hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Nuevo Animal</h1>
        </div>
        <Button onClick={handleSubmit} disabled={loading} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20">
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="id_tag">Identificación *</Label>
              <Input
                id="id_tag"
                value={formData.id_tag}
                onChange={(e) => handleInputChange("id_tag", e.target.value)}
                placeholder="Ej: A001"
              />
            </div>

            <div>
              <Label htmlFor="sex">Sexo *</Label>
              <Select value={formData.sex} onValueChange={(value) => handleInputChange("sex", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Hembra">Hembra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="breed">Raza *</Label>
              <Select value={formData.breed} onValueChange={(value) => handleInputChange("breed", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar raza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aberdeen Angus">Aberdeen Angus</SelectItem>
                  <SelectItem value="Brangus">Brangus</SelectItem>
                  <SelectItem value="Braford">Braford</SelectItem>
                  <SelectItem value="Hereford">Hereford</SelectItem>
                  <SelectItem value="Shorthorn">Shorthorn</SelectItem>
                  <SelectItem value="Cruza">Cruza</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleInputChange("birth_date", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="peso_nacimiento">Peso al Nacer (kg)</Label>
              <Input
                id="peso_nacimiento"
                type="number"
                step="0.1"
                value={formData.peso_nacimiento}
                onChange={(e) => handleInputChange("peso_nacimiento", e.target.value)}
                placeholder="Ej: 35.5"
              />
            </div>

            <div>
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => handleInputChange("observaciones", e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}