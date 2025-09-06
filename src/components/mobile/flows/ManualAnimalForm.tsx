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
    identificacion: "",
    sexo: "",
    raza: "",
    fecha_nacimiento: "",
    peso_nacimiento: "",
    observaciones: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.identificacion || !formData.sexo || !formData.raza) {
      toast.error("Campos requeridos: Identificación, Sexo y Raza");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("animals")
        .insert([{
          identificacion: formData.identificacion,
          sexo: formData.sexo,
          raza: formData.raza,
          fecha_nacimiento: formData.fecha_nacimiento || null,
          peso_nacimiento: formData.peso_nacimiento ? parseFloat(formData.peso_nacimiento) : null,
          observaciones: formData.observaciones || null,
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
              <Label htmlFor="identificacion">Identificación *</Label>
              <Input
                id="identificacion"
                value={formData.identificacion}
                onChange={(e) => handleInputChange("identificacion", e.target.value)}
                placeholder="Ej: A001"
              />
            </div>

            <div>
              <Label htmlFor="sexo">Sexo *</Label>
              <Select value={formData.sexo} onValueChange={(value) => handleInputChange("sexo", value)}>
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
              <Label htmlFor="raza">Raza *</Label>
              <Select value={formData.raza} onValueChange={(value) => handleInputChange("raza", value)}>
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
              <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
              <Input
                id="fecha_nacimiento"
                type="date"
                value={formData.fecha_nacimiento}
                onChange={(e) => handleInputChange("fecha_nacimiento", e.target.value)}
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