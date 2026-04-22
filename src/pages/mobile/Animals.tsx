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
import { Search, Filter, Users, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Animal } from "@/types/animal";
import { getDisplayStatus, normalizeAnimalStatus } from "@/lib/statusUtils";
import { formatDate } from "@/lib/format";
import { categorizeAnimal } from "@/lib/animalCategories";
import GenealogyTree from "@/components/GenealogyTree";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function MobileAnimals() {
  const { t } = useTranslation(['animals', 'common']);
  const { currentUser } = useSupabaseAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [breedFilter, setBreedFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(null);
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
    const normalizedStatus = normalizeAnimalStatus(animal.status);
    const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;
    const matchesBreed = breedFilter === "all" || animal.breed === breedFilter;
    const animalCategory = getAgeCategory(animal.birth_date, animal.sex, animal.is_castrated || false);
    const matchesCategory = categoryFilter === "all" || animalCategory === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesBreed && matchesCategory;
  });
  
  // Debug: Log categories being generated
  console.log('📊 All Categories Generated:', {
    total: animals.length,
    sample: animals.slice(0, 5).map(a => ({
      id: a.id_tag,
      birthDate: a.birth_date,
      sex: a.sex,
      isCastrated: a.is_castrated,
      category: getAgeCategory(a.birth_date, a.sex, a.is_castrated || false)
    }))
  });
  
  console.log('🔍 Current Filter State:', {
    categoryFilter,
    statusFilter,
    breedFilter,
    searchTerm,
    totalAnimals: animals.length,
    filteredCount: filteredAnimals.length
  });

  const getAgeCategory = (birthDate: string | null, sex: string, isCastrated: boolean = false) => {
    if (!birthDate || !sex) return "Desconocido";
    
    return categorizeAnimal(
      { birth_date: birthDate, sex },
      isCastrated
    );
  };

  const uniqueBreeds = [...new Set(animals.map(a => a.breed).filter(Boolean))];
  const uniqueStatuses = [...new Set(animals.map(a => a.status).filter(Boolean))];
  const uniqueCategories = [...new Set(animals.map(a => getAgeCategory(a.birth_date, a.sex, a.is_castrated || false)))];
  
  console.log('📋 Unique Categories Found:', uniqueCategories);

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
    <div className="min-h-screen bg-background pt-4">

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

        <div className="flex gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="flex-1 min-w-[140px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('animals:filters.allCategories')}</SelectItem>
              {uniqueCategories.sort().map(category => (
                <SelectItem key={category} value={category}>
                  {category === 'Ternero' && `${t('animals:categories.maleCalf')} (${t('animals:categoryDescriptions.maleCalf')})`}
                  {category === 'Ternera' && `${t('animals:categories.femaleCalf')} (${t('animals:categoryDescriptions.femaleCalf')})`}
                  {category === 'Torito' && `${t('animals:categories.youngBull')} (${t('animals:categoryDescriptions.youngBull')})`}
                  {category === 'Vaquillona' && `${t('animals:categories.heifer')} (${t('animals:categoryDescriptions.heifer')})`}
                  {category === 'Novillo' && `${t('animals:categories.steer')} (${t('animals:categoryDescriptions.steer')})`}
                  {category === 'Toro' && `${t('animals:categories.bull')} (${t('animals:categoryDescriptions.bull')})`}
                  {category === 'Vaca' && `${t('animals:categories.cow')} (${t('animals:categoryDescriptions.cow')})`}
                  {!['Ternero', 'Ternera', 'Torito', 'Vaquillona', 'Novillo', 'Toro', 'Vaca'].includes(category) && category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 min-w-[120px]">
              <SelectValue placeholder={t('animals:filters.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('animals:filters.allStatuses')}</SelectItem>
              <SelectItem value="active">{t('animals:filters.active')}</SelectItem>
              <SelectItem value="sold">{t('animals:filters.sold')}</SelectItem>
              <SelectItem value="dead">{t('animals:filters.dead')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={breedFilter} onValueChange={setBreedFilter}>
            <SelectTrigger className="flex-1 min-w-[120px]">
              <SelectValue placeholder={t('animals:filters.breed')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('animals:filters.allBreeds')}</SelectItem>
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
              {t('animals:bulk.moveCorral')}
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              {t('animals:bulk.applyVaccine')}
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              {t('animals:bulk.registerWeight')}
            </Button>
          </div>
        </div>
      )}

      {/* Animal List */}
      <div className="p-4">
        {filteredAnimals.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={t('animals:empty.noAnimals')}
            description={t('animals:empty.noAnimalsFiltered')}
          />
        ) : (
          <div className="space-y-3">
            {filteredAnimals.map((animal) => {
              const isExpanded = expandedAnimal === animal.id;
              
              return (
                <Collapsible
                  key={animal.id}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedAnimal(open ? animal.id : null)}
                >
                  <Card className="overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base font-medium leading-tight flex-1 min-w-0">
                              {animal.name ? (
                                <div className="truncate">{animal.name}</div>
                              ) : null}
                              <div className="text-sm font-normal text-muted-foreground truncate">
                                {animal.id_tag}
                              </div>
                            </CardTitle>
                            <div className="flex items-center gap-2 shrink-0">
                              {(() => {
                                const normalized = normalizeAnimalStatus(animal.status);
                                const className =
                                  normalized === "active"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : normalized === "sold"
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : "bg-red-100 text-red-800 border-red-200";
                                return (
                                  <Badge variant="outline" className={`text-xs ${className}`}>
                                    {getDisplayStatus(normalized)}
                                  </Badge>
                                );
                              })()}
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={animal.sex === "Macho" ? "default" : "secondary"} className="text-xs">
                              {animal.sex}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {getAgeCategory(animal.birth_date, animal.sex, animal.is_castrated || false)}
                            </span>
                            {animal.esta_preñada && (
                              <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-700">
                                {t('animals:fields.pregnant')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CardContent className="pt-0 pb-3">
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        {animal.breed && (
                          <div className="truncate">
                            <span className="font-medium">{t('animals:fields.breed')}:</span> {animal.breed}
                          </div>
                        )}
                        {animal.birth_date && (
                          <div className="truncate">
                            <span className="font-medium">{t('animals:fields.birthDate')}:</span> {formatDate(animal.birth_date)}
                          </div>
                        )}
                      </div>
                    </CardContent>

                    <CollapsibleContent>
                        <div className="border-t border-border space-y-4 overflow-hidden">
                        {/* Información Básica */}
                        <div className="px-4 pt-3 space-y-2">
                          <h4 className="font-semibold text-sm">{t('animals:details.basicInfo')}</h4>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="min-w-0">
                              <span className="text-muted-foreground block">{t('animals:fields.id')}:</span>
                              <div className="font-medium truncate">{animal.id_tag}</div>
                            </div>
                            {animal.name && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground block">{t('animals:fields.name')}:</span>
                                <div className="font-medium truncate">{animal.name}</div>
                              </div>
                            )}
                            {animal.breed && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground block">{t('animals:fields.breed')}:</span>
                                <div className="font-medium truncate">{animal.breed}</div>
                              </div>
                            )}
                            {animal.birth_date && (
                              <div className="min-w-0">
                                <span className="text-muted-foreground block">{t('animals:details.birthDateShort')}</span>
                                <div className="font-medium truncate">{formatDate(animal.birth_date)}</div>
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="text-muted-foreground block">{t('animals:fields.sex')}:</span>
                              <div className="font-medium truncate">{animal.sex}</div>
                            </div>
                            <div className="min-w-0">
                              <span className="text-muted-foreground block">{t('animals:fields.status')}:</span>
                              <div className="font-medium truncate">{animal.status}</div>
                            </div>
                          </div>
                        </div>

                        {/* Árbol Genealógico */}
                        <div className="px-4 pb-4 space-y-2 overflow-hidden">
                          <GenealogyTree
                            animalId={animal.id}
                            animalName={animal.name}
                            animalIdTag={animal.id_tag}
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}