import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, Filter, Users, Plus } from "lucide-react";
import { Animal } from "@/types/animal";
import { getDisplayStatus } from "@/lib/statusUtils";
import { formatDate } from "@/lib/format";

export function MobileAnimals() {
  const { t } = useTranslation(['animals', 'common']);
  const { currentUser } = useSupabaseAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [breedFilter, setBreedFilter] = useState("all");
  const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
  const [userCabaña, setUserCabaña] = useState<string>("");

  useEffect(() => {
    fetchUserCabaña();
  }, [currentUser]);

  useEffect(() => {
    if (userCabaña) {
      fetchAnimals();
    }
  }, [userCabaña]);

  const fetchUserCabaña = async () => {
    if (!currentUser?.id) return;
    
    try {
      const { data, error } = await supabase.rpc("get_user_cabana_info", {
        user_uuid: currentUser.id,
      });
      
      if (error) throw error;
      if (data?.[0]?.cabana_id) {
        setUserCabaña(data[0].cabana_id);
      }
    } catch (error) {
      console.error("Error fetching user cabaña:", error);
    }
  };

  const fetchAnimals = async () => {
    if (!userCabaña) return;

    try {
      const { data, error } = await supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", userCabaña)
        .order("birth_date", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setAnimals(data || []);
    } catch (error) {
      console.error("Error fetching animals:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = animal.id_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (animal.name && animal.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || animal.status === statusFilter;
    const matchesBreed = breedFilter === "all" || animal.breed === breedFilter;
    
    return matchesSearch && matchesStatus && matchesBreed;
  });

  const getAgeCategory = (birthDate: string | null, sex: string) => {
    if (!birthDate) return "Sin clasificar";
    
    const today = new Date();
    const birth = new Date(birthDate);
    const monthsDiff = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    
    if (monthsDiff < 12) {
      return sex === "Macho" ? "Ternero" : "Ternera";
    } else if (monthsDiff < 24) {
      return sex === "Macho" ? "Novillo" : "Vaquillona";
    } else {
      return sex === "Macho" ? "Toro" : "Vaca adulta";
    }
  };

  const uniqueBreeds = [...new Set(animals.map(a => a.breed).filter(Boolean))];
  const uniqueStatuses = [...new Set(animals.map(a => a.status).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MobilePageHeader title={t('animals:title', 'Animales')} />
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobilePageHeader 
        title={t('animals:title', 'Animales')}
        subtitle={`${filteredAnimals.length} ${filteredAnimals.length === 1 ? 'animal' : 'animales'}`}
        action={
          selectedAnimals.size > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {selectedAnimals.size} seleccionados
            </Badge>
          ) : undefined
        }
      />

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('forms:placeholders.searchAnimals', 'Buscar animales...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={breedFilter} onValueChange={setBreedFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Raza" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las razas</SelectItem>
              {uniqueBreeds.map(breed => (
                <SelectItem key={breed} value={breed}>
                  {breed}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedAnimals.size > 0 && (
        <div className="p-4 bg-muted/50 border-b border-border">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              Mover de Corral
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              Aplicar Vacuna
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              Registrar Peso
            </Button>
          </div>
        </div>
      )}

      {/* Animal List */}
      <div className="p-4">
        {filteredAnimals.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No hay animales"
            description="No se encontraron animales con los filtros seleccionados"
          />
        ) : (
          <div className="space-y-3">
            {filteredAnimals.map((animal) => (
              <Card 
                key={animal.id} 
                className={`cursor-pointer transition-colors ${
                  selectedAnimals.has(animal.id) ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => {
                  const newSelected = new Set(selectedAnimals);
                  if (newSelected.has(animal.id)) {
                    newSelected.delete(animal.id);
                  } else {
                    newSelected.add(animal.id);
                  }
                  setSelectedAnimals(newSelected);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-medium truncate">
                        {animal.name ? `${animal.name} – ${animal.id_tag}` : animal.id_tag}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={animal.sex === "Macho" ? "default" : "secondary"} className="text-xs">
                          {animal.sex}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {getAgeCategory(animal.birth_date, animal.sex)}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {animal.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      {animal.breed && <span className="mr-4">{animal.breed}</span>}
                      {animal.birth_date && (
                        <span>Nac: {formatDate(animal.birth_date)}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {animal.esta_preñada && (
                        <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700">
                          Preñada
                        </Badge>
                      )}
                      {/* Add vaccination status pill here */}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}