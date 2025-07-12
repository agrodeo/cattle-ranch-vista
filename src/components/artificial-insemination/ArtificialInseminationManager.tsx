import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArtificialInseminationDialog } from "./ArtificialInseminationDialog";
import { ArtificialInseminationTable } from "./ArtificialInseminationTable";
import { ArtificialInseminationStats } from "./ArtificialInseminationStats";
import { EditArtificialInseminationDialog } from "./EditArtificialInseminationDialog";

interface Animal {
  id: string;
  name: string;
  id_tag: string;
  birth_date: string;
  corral_id: string;
  corrales: {
    name: string;
  } | null;
}

interface ArtificialInsemination {
  id: string;
  insemination_date: string;
  bull_name: string;
  bull_id: string | null;
  is_pregnant: boolean | null;
  notes: string | null;
  animals: {
    name: string | null;
    id_tag: string | null;
    corrales: {
      name: string;
    } | null;
  } | null;
}

export function ArtificialInseminationManager() {
  const [eligibleFemales, setEligibleFemales] = useState<Animal[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<Animal[]>([]);
  const [selectedCorral, setSelectedCorral] = useState<string>("all");
  const [corrales, setCorrales] = useState<{ id: string; name: string }[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ArtificialInsemination | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchEligibleFemales();
    fetchCorrales();
  }, []);

  const fetchCorrales = async () => {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (!userData?.cabaña_id) return;

      const { data, error } = await supabase
        .from("corrales")
        .select("id, name")
        .eq("cabaña_id", userData.cabaña_id);

      if (error) throw error;
      setCorrales(data || []);
    } catch (error) {
      console.error("Error fetching corrales:", error);
    }
  };

  const fetchEligibleFemales = async () => {
    try {
      setIsLoading(true);
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (!userData?.cabaña_id) return;

      // Calculate date for 15 months ago
      const fifteenMonthsAgo = new Date();
      fifteenMonthsAgo.setMonth(fifteenMonthsAgo.getMonth() - 15);

      const { data, error } = await supabase
        .from("animals")
        .select(`
          id,
          name,
          id_tag,
          birth_date,
          corral_id,
          corrales:corral_id (
            name
          )
        `)
        .eq("cabaña_id", userData.cabaña_id)
        .eq("sex", "Hembra")
        .lte("birth_date", fifteenMonthsAgo.toISOString().split('T')[0])
        .not("birth_date", "is", null);

      if (error) throw error;
      setEligibleFemales((data as any) || []);
    } catch (error) {
      console.error("Error fetching eligible females:", error);
      toast({
        title: "Error",
        description: "Error al cargar las hembras elegibles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFemales = selectedCorral === "all" 
    ? eligibleFemales 
    : eligibleFemales.filter(animal => animal.corral_id === selectedCorral);

  const handleAnimalSelect = (animal: Animal, checked: boolean) => {
    if (checked) {
      setSelectedAnimals(prev => [...prev, animal]);
    } else {
      setSelectedAnimals(prev => prev.filter(a => a.id !== animal.id));
    }
  };

  const handleSelectAllInCorral = () => {
    if (selectedAnimals.length === filteredFemales.length) {
      setSelectedAnimals([]);
    } else {
      setSelectedAnimals(filteredFemales);
    }
  };

  const handleSuccess = () => {
    setSelectedAnimals([]);
    setRefreshKey(prev => prev + 1);
  };

  const handleEdit = (record: ArtificialInsemination) => {
    setEditingRecord(record);
    setShowEditDialog(true);
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const ageInMonths = (now.getFullYear() - birth.getFullYear()) * 12 + 
                       (now.getMonth() - birth.getMonth());
    return ageInMonths;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <ArtificialInseminationStats refreshKey={refreshKey} />

      {/* Selection Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Seleccionar Hembras para Inseminación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Corral Filter */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Filtrar por corral:</label>
            <Select value={selectedCorral} onValueChange={setSelectedCorral}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los corrales</SelectItem>
                {corrales.map(corral => (
                  <SelectItem key={corral.id} value={corral.id}>
                    {corral.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={filteredFemales.length > 0 && selectedAnimals.length === filteredFemales.length}
                onCheckedChange={handleSelectAllInCorral}
              />
              <span className="text-sm">
                Seleccionar todas ({filteredFemales.length} hembras elegibles)
              </span>
            </div>
            <Button
              onClick={() => setShowDialog(true)}
              disabled={selectedAnimals.length === 0}
              className="flex items-center gap-2"
            >
              <Heart className="h-4 w-4" />
              Inseminar Seleccionadas ({selectedAnimals.length})
            </Button>
          </div>

          {/* Animals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredFemales.map((animal) => {
              const isSelected = selectedAnimals.some(a => a.id === animal.id);
              const ageMonths = calculateAge(animal.birth_date);
              
              return (
                <div
                  key={animal.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleAnimalSelect(animal, !isSelected)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => {}} // Controlled by parent click
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {animal.name || animal.id_tag || "Sin nombre"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {animal.corrales?.name || "Sin corral"}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {ageMonths} meses
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredFemales.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No hay hembras elegibles (mayor a 15 meses) en este corral
            </div>
          )}
        </CardContent>
      </Card>

      {/* Records Table */}
      <ArtificialInseminationTable 
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />

      {/* Dialogs */}
      <ArtificialInseminationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        selectedAnimals={selectedAnimals}
        onSuccess={handleSuccess}
      />

      <EditArtificialInseminationDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        record={editingRecord}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
          setShowEditDialog(false);
        }}
      />
    </div>
  );
}