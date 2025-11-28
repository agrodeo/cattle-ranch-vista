import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, Users, CheckCircle2, X, Eye, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { getCategoryOptions } from "@/lib/translations";

interface Animal {
  id: string;
  name?: string;
  id_tag?: string;
  sex: string;
  birth_date?: string;
  breed?: string;
  corral_id?: string;
  status?: string;
  esta_preñada?: boolean;
  peso_actual_kg?: number;
  category?: string;
  ageInMonths?: number;
  corral?: { name: string };
}

interface AnimalSelectorProps {
  eligibilityFilter?: (animal: Animal) => boolean;
  selectedAnimals: string[];
  onSelectionChange: (animalIds: string[]) => void;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  maxSelection?: number;
}

interface Filters {
  corrals: string[];
  sex: string[];
  ageRange: [number, number];
  categories: string[];
  search: string;
}

const DEFAULT_FILTERS: Filters = {
  corrals: [],
  sex: [],
  ageRange: [0, 120],
  categories: [],
  search: ""
};


const AGE_CHIPS = [
  { label: "0-12m", range: [0, 12] as [number, number] },
  { label: "12-24m", range: [12, 24] as [number, number] },
  { label: "24m+", range: [24, 120] as [number, number] }
];

export function AnimalSelector({
  eligibilityFilter,
  selectedAnimals,
  onSelectionChange,
  trigger,
  title,
  description,
  maxSelection
}: AnimalSelectorProps) {
  const { t } = useTranslation('activities');
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [corrals, setCorrals] = useState<any[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  
  const ITEMS_PER_PAGE = 25;
  const CATEGORIES = getCategoryOptions(t);

  useEffect(() => {
    if (open && currentUser?.cabañaId) {
      loadData();
    }
  }, [open, currentUser?.cabañaId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load animals and corrals in parallel
      const [animalsResponse, corralsResponse] = await Promise.all([
        supabase
          .from('animals')
          .select(`
            *,
            corrales:corral_id(name)
          `)
          .eq('cabaña_id', currentUser?.cabañaId)
          .order('name'),
        
        supabase
          .from('corrales')
          .select('*')
          .eq('cabaña_id', currentUser?.cabañaId)
          .order('name')
      ]);

      if (animalsResponse.error) throw animalsResponse.error;
      if (corralsResponse.error) throw corralsResponse.error;

      // Process animals with calculated fields
      const processedAnimals = (animalsResponse.data || []).map(animal => {
        const ageInMonths = animal.birth_date 
          ? Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
          : 0;
        
        const category = categorizeAnimal(animal, ageInMonths);
        
        return {
          ...animal,
          ageInMonths,
          category,
          corral: animal.corrales
        };
      });

      // Apply eligibility filter if provided
      const eligibleAnimals = eligibilityFilter 
        ? processedAnimals.filter(eligibilityFilter)
        : processedAnimals;

      setAnimals(eligibleAnimals);
      setCorrals(corralsResponse.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        variant: "destructive",
        title: t('animalSelector.errorLoading'),
        description: t('animalSelector.errorLoading')
      });
    } finally {
      setLoading(false);
    }
  };

  const categorizeAnimal = (animal: any, ageInMonths: number): string => {
    if (ageInMonths < 12) {
      return animal.sex === 'Hembra' ? 'ternera' : 'ternero';
    }
    if (animal.sex === 'Hembra') {
      return ageInMonths < 24 ? 'vaquillona' : 'vaca';
    }
    if (animal.sex === 'Macho') {
      return ageInMonths < 24 ? 'novillo' : 'toro';
    }
    return 'desconocido';
  };

  // Filter animals based on current filters
  const filteredAnimals = useMemo(() => {
    return animals.filter(animal => {
      // Corral filter
      if (filters.corrals.length > 0 && !filters.corrals.includes(animal.corral_id || '')) {
        return false;
      }
      
      // Sex filter
      if (filters.sex.length > 0 && !filters.sex.includes(animal.sex)) {
        return false;
      }
      
      // Age filter
      const age = animal.ageInMonths || 0;
      if (age < filters.ageRange[0] || age > filters.ageRange[1]) {
        return false;
      }
      
      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(animal.category || '')) {
        return false;
      }
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matches = [
          animal.name?.toLowerCase(),
          animal.id_tag?.toLowerCase(),
          animal.breed?.toLowerCase()
        ].some(field => field?.includes(searchLower));
        
        if (!matches) return false;
      }
      
      return true;
    });
  }, [animals, filters]);

  // Paginated animals for display
  const paginatedAnimals = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAnimals.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAnimals, currentPage]);

  const totalPages = Math.ceil(filteredAnimals.length / ITEMS_PER_PAGE);

  const handleAnimalToggle = (animalId: string) => {
    const isSelected = selectedAnimals.includes(animalId);
    let newSelection: string[];
    
    if (isSelected) {
      newSelection = selectedAnimals.filter(id => id !== animalId);
    } else {
      if (maxSelection && selectedAnimals.length >= maxSelection) {
        toast({
          variant: "destructive",
          title: t('animalSelector.limitReached'),
          description: t('animalSelector.limitDescription') + ` ${maxSelection} ` + t('animalSelector.animalsMax')
        });
        return;
      }
      newSelection = [...selectedAnimals, animalId];
    }
    
    onSelectionChange(newSelection);
  };

  const handleSelectAllMatching = () => {
    if (selectAllMatching) {
      // Deselect all matching
      const matchingIds = filteredAnimals.map(a => a.id);
      const newSelection = selectedAnimals.filter(id => !matchingIds.includes(id));
      onSelectionChange(newSelection);
      setSelectAllMatching(false);
    } else {
      // Select all matching
      if (maxSelection && filteredAnimals.length > maxSelection) {
        toast({
          variant: "destructive",
          title: t('animalSelector.limitExceeded'),
          description: t('animalSelector.limitExceededDescription') + ` ${maxSelection} ${t('animalSelector.animalsMax')}. ${t('animalSelector.matchingFilters')}`
        });
        return;
      }
      
      const matchingIds = filteredAnimals.map(a => a.id);
      const newSelection = [...new Set([...selectedAnimals, ...matchingIds])];
      onSelectionChange(newSelection);
      setSelectAllMatching(true);
    }
  };

  const handleSelectAllPage = () => {
    const pageIds = paginatedAnimals.map(a => a.id);
    const newSelection = [...new Set([...selectedAnimals, ...pageIds])];
    onSelectionChange(newSelection);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
    setSelectAllMatching(false);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  };

  const removeSelectedAnimal = (animalId: string) => {
    const newSelection = selectedAnimals.filter(id => id !== animalId);
    onSelectionChange(newSelection);
  };

  const selectedCount = selectedAnimals.length;
  const filteredCount = filteredAnimals.length;
  const totalCount = animals.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('animalSelector.title')} ({selectedCount})
          </Button>
        )}
      </SheetTrigger>
      
      <SheetContent side="right" className="w-[800px] sm:max-w-[800px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title || t('animalSelector.title')}
          </SheetTitle>
          <p className="text-muted-foreground">{description || t('animalSelector.description')}</p>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Selection Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="font-medium">{selectedCount}</span> {t('animalSelector.selected')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {filteredCount} {t('animalSelector.of')} {totalCount} {t('animalSelector.shown')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleSelectAllPage}>
                    {t('animalSelector.selectPage')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDeselectAll}>
                    <X className="h-4 w-4 mr-1" />
                    {t('animalSelector.clear')}
                  </Button>
                </div>
              </div>
              
              {/* Selected Animals Chips */}
              {selectedCount > 0 && (
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {selectedAnimals.slice(0, 10).map(animalId => {
                    const animal = animals.find(a => a.id === animalId);
                    if (!animal) return null;
                    
                    return (
                      <Badge 
                        key={animalId} 
                        variant="secondary" 
                        className="flex items-center gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeSelectedAnimal(animalId)}
                      >
                        {animal.name || animal.id_tag || t('animalSelector.noId')}
                        <X className="h-3 w-3" />
                      </Badge>
                    );
                  })}
                  {selectedCount > 10 && (
                    <Badge variant="outline">
                      +{selectedCount - 10} {t('animalSelector.more')}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {t('animalSelector.filters')}
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t('animalSelector.clearFilters')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('animalSelector.searchPlaceholder')}
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Corral */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('animalSelector.corral')}</label>
                  <Select 
                    value={filters.corrals[0] || "all"}
                    onValueChange={(value) => setFilters(prev => ({ 
                      ...prev, 
                      corrals: value === "all" ? [] : [value] 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('animalSelector.allCorrals')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('animalSelector.allCorrals')}</SelectItem>
                      {corrals.map(corral => (
                        <SelectItem key={corral.id} value={corral.id}>
                          {corral.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sex */}
                <div>
                  <label className="text-sm font-medium mb-2 block">{t('animalSelector.sex')}</label>
                  <Select 
                    value={filters.sex[0] || "all"}
                    onValueChange={(value) => setFilters(prev => ({ 
                      ...prev, 
                      sex: value === "all" ? [] : [value] 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('animalSelector.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('animalSelector.all')}</SelectItem>
                      <SelectItem value="Macho">{t('animalSelector.male')}</SelectItem>
                      <SelectItem value="Hembra">{t('animalSelector.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Age Range */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t('animalSelector.age')}: {filters.ageRange[0]}-{filters.ageRange[1]} {t('animalSelector.ageMonths')}
                </label>
                <Slider
                  value={filters.ageRange}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    ageRange: value as [number, number] 
                  }))}
                  max={120}
                  step={1}
                  className="w-full"
                />
                <div className="flex gap-2 mt-2">
                  {AGE_CHIPS.map(chip => (
                    <Button
                      key={chip.label}
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters(prev => ({ 
                        ...prev, 
                        ageRange: chip.range 
                      }))}
                    >
                      {chip.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t('animalSelector.category')}</label>
                <Select 
                  value={filters.categories[0] || "all"}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    categories: value === "all" ? [] : [value] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('animalSelector.allCategories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('animalSelector.allCategories')}</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Select All Matching */}
          {filteredCount > ITEMS_PER_PAGE && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {filteredCount} {t('animalSelector.matchingAnimals')}
                  </span>
                  <Button
                    variant={selectAllMatching ? "destructive" : "default"}
                    size="sm"
                    onClick={handleSelectAllMatching}
                    disabled={maxSelection && filteredCount > maxSelection}
                  >
                    {selectAllMatching ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        {t('animalSelector.deselectAllMatching')}
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {t('animalSelector.selectAllMatching')} ({filteredCount})
                      </>
                    )}
                  </Button>
                </div>
                {maxSelection && filteredCount > maxSelection && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('animalSelector.limitReached')}: {maxSelection} {t('animalSelector.animalsMax')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Animals Grid */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-8">{t('animalSelector.loading')}</div>
              ) : paginatedAnimals.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('animalSelector.noAnimals')}</h3>
                  <p className="text-muted-foreground">
                    {t('animalSelector.noAnimalsDescription')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <ScrollArea className="h-[400px]">
                    <div className="grid gap-3">
                      {paginatedAnimals.map(animal => {
                        const isSelected = selectedAnimals.includes(animal.id);
                        
                        return (
                          <Card 
                            key={animal.id}
                            className={`cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-primary bg-primary/5' 
                                : 'hover:border-primary/50'
                            }`}
                            onClick={() => handleAnimalToggle(animal.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <Checkbox 
                                  checked={isSelected}
                                  onChange={() => {}} // Controlled by card click
                                />
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium truncate">
                                      {animal.name || t('animalSelector.noId')}
                                    </span>
                                    {animal.id_tag && (
                                      <Badge variant="outline" className="text-xs">
                                        {animal.id_tag}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Badge 
                                      variant={animal.sex === 'Macho' ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {animal.sex}
                                    </Badge>
                                    
                                    <span>{animal.ageInMonths}m</span>
                                    
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {animal.category}
                                    </Badge>
                                    
                                    {animal.corral?.name && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {animal.corral.name}
                                      </span>
                                    )}
                                    
                                    {animal.esta_preñada && (
                                      <Badge variant="destructive" className="text-xs">
                                        {t('tacto.pregnant')}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {animal.breed && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {animal.breed}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        {t('animalSelector.page')} {currentPage} {t('animalSelector.of')} {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          {t('common.previous')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          {t('common.next')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={selectedCount === 0}
            >
              {t('common.confirm')} ({selectedCount})
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}