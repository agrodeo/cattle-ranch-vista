import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { PageLoading } from "@/components/ui/page-loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Search, Edit, Trash2, Users, ChevronDown, ChevronRight, Skull, Eye, Activity, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Animal } from "@/types/animal";
import { normalizeAnimalStatus } from "@/lib/statusUtils";
import { categorizeAnimal } from "@/lib/animalCategories";
import { getTranslatedCategory, getTranslatedSex, getTranslatedStatus } from "@/lib/translations";
import { ReadOnlyProtectedAction } from "@/components/subscription/ReadOnlyProtectedAction";
import AnimalExcelUploadAdvanced from "@/components/excel-upload/AnimalExcelUploadAdvanced";
import { MarkDeathDialog } from "@/components/mortality/MarkDeathDialog";
import GenealogyTree from "@/components/GenealogyTree";
import { AnimalActivitiesHistory } from "@/components/animals/AnimalActivitiesHistory";
import { BrafordRegistrationDisplay } from "@/components/braford/BrafordRegistrationDisplay";
import { ReproductivePerformance } from "@/components/reproductive/ReproductivePerformance";
import { ReproductiveEventsTable } from "@/components/reproductive/ReproductiveEventsTable";
import { AnimalFormDialog } from "@/components/animals/AnimalFormDialog";
import { AnimalListCard } from "@/components/animals/AnimalListCard";
import { useAnimalsData } from "@/hooks/useAnimalsData";
import type { RegistrationLevel } from "@/lib/brafordRegistration";

const Animals = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['animals', 'common', 'forms']);
  const isMobile = useIsMobile();

  const {
    animals, loading, userCabaña, parentAnimals,
    metrics, availableBreeds, fetchAnimals, deleteAnimal,
  } = useAnimalsData();

  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [breedFilter, setBreedFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDeathDialog, setShowDeathDialog] = useState(false);
  const [animalToMarkDead, setAnimalToMarkDead] = useState<string | null>(null);

  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh: fetchAnimals,
    disabled: !isMobile,
  });

  const toggleExpandedRow = (animalId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(animalId)) newExpanded.delete(animalId);
    else newExpanded.add(animalId);
    setExpandedRows(newExpanded);
  };

  // Filtering
  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = !searchTerm ||
      animal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.id_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.breed?.toLowerCase().includes(searchTerm.toLowerCase());
    const animalCategory = categorizeAnimal(animal, animal.is_castrated || false);
    const matchesCategory = categoryFilter === "all" || animalCategory === categoryFilter;
    const matchesBreed = breedFilter === "all" || animal.breed === breedFilter;
    const normalizedStatus = normalizeAnimalStatus(animal.status);
    const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;
    return matchesSearch && matchesCategory && matchesBreed && matchesStatus;
  }).sort((a, b) => {
    const statusOrder: Record<string, number> = { active: 0, sold: 1, dead: 2 };
    return (statusOrder[normalizeAnimalStatus(a.status)] ?? 3) - (statusOrder[normalizeAnimalStatus(b.status)] ?? 3);
  });

  const getAnimalDisplayName = (animal: Animal) =>
    animal.name?.trim() ? `${animal.name} – ${animal.id_tag}` : animal.id_tag;

  const getStatusBadge = (status: string) => {
    const normalized = normalizeAnimalStatus(status);
    const display = getTranslatedStatus(normalized, t);
    const className =
      normalized === "active"
        ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
        : normalized === "sold"
        ? "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
        : "bg-red-100 text-red-800 border-red-200 hover:bg-red-100";
    return <Badge variant="outline" className={className}>{display}</Badge>;
  };

  const handleEdit = (animal: Animal) => {
    setEditingAnimal(animal);
    setShowAddDialog(true);
  };

  const handleMarkDeath = (animal: Animal) => {
    setAnimalToMarkDead(animal.id);
    setShowDeathDialog(true);
  };

  const handleDeathSuccess = () => {
    setShowDeathDialog(false);
    setAnimalToMarkDead(null);
    fetchAnimals();
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0">
        <PageLoading cards={3} message={t('common:loading')} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-6 relative">
        {/* Pull to refresh */}
        {isMobile && isPulling && (
          <div
            className="absolute top-0 left-0 right-0 bg-primary/10 flex items-center justify-center transition-all duration-200 ease-out z-10 rounded-lg"
            style={{ height: `${Math.min(pullDistance, 80)}px` }}
          >
            <RefreshCw
              className={cn("h-5 w-5 text-primary transition-transform duration-200", isRefreshing && "animate-spin")}
              style={{ transform: `rotate(${Math.min(pullDistance * 4, 360)}deg)` }}
            />
          </div>
        )}

        {/* Header + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader title={t('animals:title')} subtitle={t('animals:subtitle')} className="hidden sm:block" />
          <div className="hidden lg:flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
            <ReadOnlyProtectedAction>
              <Button onClick={() => { setEditingAnimal(null); setShowAddDialog(true); }} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />{t('animals:addAnimal')}
              </Button>
            </ReadOnlyProtectedAction>
            <AnimalExcelUploadAdvanced userCabañaId={userCabaña} onUploadComplete={fetchAnimals} />
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricCard title={t('animals:activeAnimals')} value={metrics.activeAnimals} icon={Activity} />
          <MetricCard title={t('animals:sex.female')} value={metrics.activeFemales} icon={Users}
            subtitle={metrics.activeAnimals > 0 ? `${Math.round((metrics.activeFemales / metrics.activeAnimals) * 100)}%` : undefined} />
          <MetricCard title={t('animals:sex.male')} value={metrics.activeMales} icon={Users}
            subtitle={metrics.activeAnimals > 0 ? `${Math.round((metrics.activeMales / metrics.activeAnimals) * 100)}%` : undefined} />
          <MetricCard title={t('animals:status.sold')} value={metrics.soldAnimals} icon={ShoppingCart} />
          <MetricCard title={t('animals:status.dead')} value={metrics.deadAnimals} icon={Skull} />
        </div>

        {/* Filters + List */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <CardTitle className="text-xl font-display">{t('animals:animalsList')}</CardTitle>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder={t('animals:searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-80 bg-background/50 backdrop-blur-sm" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-auto"><SelectValue placeholder={t('animals:filters.allCategories')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('animals:filters.allCategories')}</SelectItem>
                      <SelectItem value="Ternero">{t('animals:categories.maleCalf')} ({t('animals:categoryDescriptions.maleCalf')})</SelectItem>
                      <SelectItem value="Ternera">{t('animals:categories.femaleCalf')} ({t('animals:categoryDescriptions.femaleCalf')})</SelectItem>
                      <SelectItem value="Torito">{t('animals:categories.youngBull')} ({t('animals:categoryDescriptions.youngBull')})</SelectItem>
                      <SelectItem value="Vaquillona">{t('animals:categories.heifer')} ({t('animals:categoryDescriptions.heifer')})</SelectItem>
                      <SelectItem value="Novillo">{t('animals:categories.steer')} ({t('animals:categoryDescriptions.steer')})</SelectItem>
                      <SelectItem value="Toro">{t('animals:categories.bull')} ({t('animals:categoryDescriptions.bull')})</SelectItem>
                      <SelectItem value="Vaca">{t('animals:categories.cow')} ({t('animals:categoryDescriptions.cow')})</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={breedFilter} onValueChange={setBreedFilter}>
                    <SelectTrigger className="w-full sm:w-auto"><SelectValue placeholder={t('animals:filters.allBreeds')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('animals:filters.allBreeds')}</SelectItem>
                      {availableBreeds.map(breed => <SelectItem key={breed} value={breed!}>{breed}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-auto"><SelectValue placeholder={t('animals:filters.allStatuses')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('animals:filters.allStatuses')}</SelectItem>
                      <SelectItem value="active">{t('animals:status.active')}</SelectItem>
                      <SelectItem value="sold">{t('animals:status.sold')}</SelectItem>
                      <SelectItem value="dead">{t('animals:status.dead')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAnimals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? t('animals:messages.noAnimalsFound') : t('animals:messages.noAnimalsRegistered')}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead>{t('animals:fields.name')}</TableHead>
                        <TableHead>{t('animals:fields.id')}</TableHead>
                        <TableHead>{t('common:category')}</TableHead>
                        <TableHead>{t('animals:fields.breed')}</TableHead>
                        <TableHead>{t('animals:fields.birthDate')}</TableHead>
                        <TableHead>{t('animals:fields.status')}</TableHead>
                        <TableHead>{t('common:actions.title')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAnimals.map((animal, index) => (
                        <>
                          <TableRow
                            key={animal.id}
                            className="hover:bg-muted/50 transition-all duration-200 animate-fade-in"
                            style={{ animationDelay: `${index * 0.03}s` }}
                          >
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => toggleExpandedRow(animal.id)} className="p-1 hover:bg-primary/10">
                                {expandedRows.has(animal.id) ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium cursor-pointer hover:text-primary" onClick={() => navigate(`/animales/${animal.id}`)}>
                              {getAnimalDisplayName(animal)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{animal.id_tag}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium">
                                {getTranslatedCategory(categorizeAnimal(animal, animal.is_castrated || false), t)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{animal.breed}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : "N/A"}
                            </TableCell>
                            <TableCell>{getStatusBadge(animal.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => navigate(`/animales/${animal.id}`)} className="flex items-center gap-1">
                                  <Eye className="h-4 w-4" />{t('animals:actions.view')}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleEdit(animal)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="outline" size="sm" onClick={() => deleteAnimal(animal.id)}><Trash2 className="h-4 w-4" /></Button>
                                {animal.status !== 'muerto' && animal.status !== 'vendido' && (
                                  <Button variant="outline" size="sm" onClick={() => handleMarkDeath(animal)} className="text-destructive hover:text-destructive">
                                    <Skull className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {expandedRows.has(animal.id) && (
                            <TableRow>
                              <TableCell colSpan={8} className="p-0 bg-muted/20">
                                <div className="p-4 md:p-6 space-y-6">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <Card>
                                      <CardHeader className="pb-3"><CardTitle className="text-base">{t('common:basicInfo')}</CardTitle></CardHeader>
                                      <CardContent>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                          {[
                                            [t('animals:fields.sex'), getTranslatedSex(animal.sex, t)],
                                            [t('animals:fields.breed'), animal.breed],
                                            [t('animals:fields.birthDate'), animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : "N/A"],
                                            [t('animals:form.hornCondition'), animal.mocho || "N/A"],
                                            [t('animals:form.birthWeight'), animal.peso_nacimiento ? `${animal.peso_nacimiento} kg` : "N/A"],
                                            [t('animals:fields.status'), getTranslatedStatus(animal.status, t)],
                                            [t('animals:fields.color'), animal.color || "N/A"],
                                            [t('animals:form.bodyCondition'), animal.condicion_corporal || "N/A"],
                                            [t('animals:form.registration'), animal.registration_level || "N/A"],
                                          ].map(([label, value]) => (
                                            <div key={label as string} className="flex flex-col">
                                              <span className="text-muted-foreground text-xs">{label}</span>
                                              <span className="font-medium">{value}</span>
                                            </div>
                                          ))}
                                        </div>
                                        {animal.observaciones && (
                                          <div className="mt-4 pt-4 border-t">
                                            <span className="text-xs text-muted-foreground">{t('animals:fields.observations')}</span>
                                            <p className="text-sm mt-1">{animal.observaciones}</p>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                    <div className="min-w-0">
                                      <GenealogyTree animalId={animal.id} animalName={animal.name} animalIdTag={animal.id_tag} />
                                    </div>
                                  </div>
                                  {(animal.breed === 'Braford' || animal.breed === 'Brangus') && (
                                    <BrafordRegistrationDisplay breed={animal.breed} currentLevel={animal.registration_level as RegistrationLevel}
                                      overrideLevel={animal.registration_level_override as RegistrationLevel} overrideReason={animal.registration_override_reason} readonly />
                                  )}
                                  <AnimalActivitiesHistory animalId={animal.id} animalName={animal.name || animal.id_tag} />
                                  {animal.sex === "Hembra" && (
                                    <div className="space-y-6">
                                      <ReproductivePerformance animalId={animal.id} animalSex={animal.sex} />
                                      <ReproductiveEventsTable animalId={animal.id} animalSex={animal.sex} cabaña_id={animal.cabaña_id} />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {filteredAnimals.map(animal => (
                    <AnimalListCard
                      key={animal.id}
                      animal={animal}
                      isExpanded={expandedRows.has(animal.id)}
                      onToggleExpand={() => toggleExpandedRow(animal.id)}
                      onEdit={handleEdit}
                      onDelete={deleteAnimal}
                      onMarkDeath={handleMarkDeath}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <AnimalFormDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          editingAnimal={editingAnimal}
          userCabaña={userCabaña}
          parentAnimals={parentAnimals}
          onSuccess={fetchAnimals}
        />

        <MarkDeathDialog
          open={showDeathDialog}
          onOpenChange={setShowDeathDialog}
          animalId={animalToMarkDead}
          onSuccess={handleDeathSuccess}
        />
      </div>
    </div>
  );
};

export default Animals;
