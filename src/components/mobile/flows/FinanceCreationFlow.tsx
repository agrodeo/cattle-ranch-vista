import { useState } from "react";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FinanceCreationFlowProps {
  onClose: () => void;
}

type MovementType = "income" | "expense";

export function FinanceCreationFlow({ onClose }: FinanceCreationFlowProps) {
  const [selectedType, setSelectedType] = useState<MovementType | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    descripcion: "",
    monto: "",
    fecha: new Date().toISOString().split('T')[0],
    categoria: "",
    observaciones: "",
  });

  const movementTypes = [
    {
      id: "income" as MovementType,
      title: "Ingreso",
      description: "Registrar entrada de dinero",
      icon: TrendingUp,
      color: "bg-green-500",
    },
    {
      id: "expense" as MovementType,
      title: "Egreso",
      description: "Registrar salida de dinero",
      icon: TrendingDown,
      color: "bg-red-500",
    },
  ];

  const incomeCategories = [
    "Venta de animales",
    "Venta de leche",
    "Venta de carne",
    "Servicios",
    "Subsidios",
    "Otros ingresos",
  ];

  const expenseCategories = [
    "Alimentación",
    "Sanidad",
    "Reproducción",
    "Mantenimiento",
    "Servicios",
    "Impuestos",
    "Otros gastos",
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBack = () => {
    if (selectedType) {
      setSelectedType(null);
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!formData.descripcion || !formData.monto || !formData.categoria) {
      toast.error("Campos requeridos: Descripción, Monto y Categoría");
      return;
    }

    setLoading(true);
    try {
      // Note: Using activities table as a placeholder since finance_movements doesn't exist
      const { error } = await supabase
        .from("activities")
        .insert([{
          description: `${selectedType === "income" ? "Ingreso" : "Egreso"}: ${formData.descripcion}`,
          type: "finance",
          date: formData.fecha,
          animal_id: "", // Placeholder
        }]);

      if (error) throw error;

      toast.success("Movimiento registrado exitosamente");
      onClose();
    } catch (error) {
      console.error("Error creating movement:", error);
      toast.error("Error al registrar el movimiento");
    } finally {
      setLoading(false);
    }
  };

  if (selectedType) {
    const isIncome = selectedType === "income";
    const categories = isIncome ? incomeCategories : expenseCategories;

    return (
      <div className="fixed inset-0 z-50 bg-background lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">
              Nuevo {isIncome ? "Ingreso" : "Egreso"}
            </h1>
          </div>
          <Button onClick={handleSubmit} disabled={loading} size="sm">
            <DollarSign className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20">
          <Card>
            <CardHeader>
              <CardTitle>Información del Movimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="descripcion">Descripción *</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange("descripcion", e.target.value)}
                  placeholder="Ej: Venta de novillo"
                />
              </div>

              <div>
                <Label htmlFor="monto">Monto *</Label>
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) => handleInputChange("monto", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleInputChange("fecha", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="categoria">Categoría *</Label>
                <Select value={formData.categoria} onValueChange={(value) => handleInputChange("categoria", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

  return (
    <div className="fixed inset-0 z-50 bg-background lg:hidden">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onClose} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Cargar Movimientos</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {movementTypes.map((type) => (
          <Card
            key={type.id}
            className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
            onClick={() => setSelectedType(type.id)}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg text-white ${type.color}`}>
                  <type.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>{type.title}</CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}