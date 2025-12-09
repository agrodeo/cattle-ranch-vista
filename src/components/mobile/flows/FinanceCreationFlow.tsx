import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

interface FinanceCreationFlowProps {
  onClose: () => void;
}

type MovementType = "income" | "expense";

export function FinanceCreationFlow({ onClose }: FinanceCreationFlowProps) {
  const { t } = useTranslation('finance');
  const { currentUser } = useSupabaseAuth();
  const queryClient = useQueryClient();
  
  const [selectedType, setSelectedType] = useState<MovementType | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAnimalSale, setIsAnimalSale] = useState(false);
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
  const [animalDialogOpen, setAnimalDialogOpen] = useState(false);
  const [animalSearch, setAnimalSearch] = useState("");
  
  const [formData, setFormData] = useState({
    descripcion: "",
    monto: "",
    fecha: new Date().toISOString().split('T')[0],
    categoria: "",
    observaciones: "",
    buyerName: "",
    buyerDocument: "",
    buyerDestination: "",
  });

  // Fetch available animals for sale
  const { data: animals = [], isLoading: animalsLoading } = useQuery({
    queryKey: ["animals-for-sale", currentUser?.cabañaId],
    queryFn: async () => {
      if (!currentUser?.cabañaId) return [];
      
      const { data, error } = await supabase
        .from("animals")
        .select("id, id_tag, name, sex, breed")
        .eq("cabaña_id", currentUser.cabañaId)
        .not("status", "in", "(vendido,muerto,Vendido,Muerto)");
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.cabañaId && isAnimalSale,
  });

  const filteredAnimals = useMemo(() => {
    if (!animalSearch.trim()) return animals;
    const q = animalSearch.toLowerCase();
    return animals.filter((a) => {
      const label = (a.id_tag || a.name || a.id).toLowerCase();
      return label.includes(q);
    });
  }, [animals, animalSearch]);

  const movementTypes = [
    {
      id: "income" as MovementType,
      title: t('mobile.incomeTitle'),
      description: t('mobile.incomeDesc'),
      icon: TrendingUp,
      color: "bg-primary",
    },
    {
      id: "expense" as MovementType,
      title: t('mobile.expenseTitle'),
      description: t('mobile.expenseDesc'),
      icon: TrendingDown,
      color: "bg-destructive",
    },
  ];

  const incomeCategories = [
    t('mobile.incomeCategories.animalSales'),
    t('mobile.incomeCategories.milkSales'),
    t('mobile.incomeCategories.meatSales'),
    t('mobile.incomeCategories.services'),
    t('mobile.incomeCategories.subsidies'),
    t('mobile.incomeCategories.other'),
  ];

  const expenseCategories = [
    t('mobile.expenseCategories.feed'),
    t('mobile.expenseCategories.health'),
    t('mobile.expenseCategories.reproduction'),
    t('mobile.expenseCategories.maintenance'),
    t('mobile.expenseCategories.services'),
    t('mobile.expenseCategories.taxes'),
    t('mobile.expenseCategories.other'),
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Check if animal sale category is selected
    if (field === "categoria") {
      const animalSalesLabel = t('mobile.incomeCategories.animalSales');
      if (value === animalSalesLabel && selectedType === "income") {
        setIsAnimalSale(true);
      } else {
        setIsAnimalSale(false);
        setSelectedAnimalIds([]);
      }
    }
  };

  const handleBack = () => {
    if (selectedType) {
      setSelectedType(null);
      setIsAnimalSale(false);
      setSelectedAnimalIds([]);
    } else {
      onClose();
    }
  };

  const toggleAnimalSelection = (id: string) => {
    setSelectedAnimalIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!formData.descripcion || !formData.monto || !formData.categoria) {
      toast.error(t('mobile.requiredFields'));
      return;
    }

    // Validate animal selection for animal sales
    if (isAnimalSale && selectedAnimalIds.length === 0) {
      toast.error(t('mobile.noAnimalsSelected'));
      return;
    }

    setLoading(true);
    try {
      if (isAnimalSale && selectedAnimalIds.length > 0) {
        // Use the create_animal_sale RPC for animal sales
        const { error } = await supabase.rpc('create_animal_sale', {
          _cabana_id: currentUser?.cabañaId,
          _animal_ids: selectedAnimalIds,
          _amount: parseFloat(formData.monto),
          _description: formData.descripcion,
          _date: formData.fecha,
          _buyer_name: formData.buyerName || null,
          _buyer_document: formData.buyerDocument || null,
          _buyer_destination: formData.buyerDestination || null,
          _category_id: null,
          _unit_prices: selectedAnimalIds.map(() => parseFloat(formData.monto) / selectedAnimalIds.length),
        });

        if (error) throw error;
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["animals"] });
        queryClient.invalidateQueries({ queryKey: ["finances"] });
        
        toast.success(t('mobile.animalSaleSuccess'));
      } else {
        // Regular finance movement
        const { error } = await supabase
          .from("finances")
          .insert([{
            cabaña_id: currentUser?.cabañaId,
            description: formData.descripcion,
            amount: selectedType === "expense" ? -Math.abs(parseFloat(formData.monto)) : Math.abs(parseFloat(formData.monto)),
            type: selectedType,
            date: formData.fecha,
          }]);

        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ["finances"] });
        toast.success(t('mobile.success'));
      }
      
      onClose();
    } catch (error) {
      console.error("Error creating movement:", error);
      toast.error(isAnimalSale ? t('mobile.animalSaleError') : t('mobile.error'));
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
              {isIncome ? t('mobile.newIncome') : t('mobile.newExpense')}
            </h1>
          </div>
          <Button onClick={handleSubmit} disabled={loading} size="sm">
            <DollarSign className="h-4 w-4 mr-2" />
            {loading ? t('mobile.saving') : t('mobile.save')}
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto pb-20">
          <Card>
            <CardHeader>
              <CardTitle>{t('mobile.movementInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="descripcion">{t('mobile.description')} *</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange("descripcion", e.target.value)}
                  placeholder={t('mobile.descriptionPlaceholder')}
                />
              </div>

              <div>
                <Label htmlFor="monto">{t('mobile.amount')} *</Label>
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
                <Label htmlFor="fecha">{t('mobile.date')}</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleInputChange("fecha", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="categoria">{t('mobile.category')} *</Label>
                <Select value={formData.categoria} onValueChange={(value) => handleInputChange("categoria", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('mobile.selectCategory')} />
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
                <Label htmlFor="observaciones">{t('mobile.observations')}</Label>
                <Textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => handleInputChange("observaciones", e.target.value)}
                  placeholder={t('mobile.observationsPlaceholder')}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Animal Sale Section - only shown when animal sale category is selected */}
          {isAnimalSale && isIncome && (
            <Card>
              <CardHeader>
                <CardTitle>{t('mobile.animalSaleSection')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Animal Selection */}
                <div>
                  <Label>{t('mobile.selectAnimalsToSell')}</Label>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setAnimalDialogOpen(true)}
                      className="flex-1"
                    >
                      {t('mobile.selectAnimals')} ({selectedAnimalIds.length})
                    </Button>
                    {selectedAnimalIds.length > 0 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setSelectedAnimalIds([])}
                      >
                        {t('mobile.clear')}
                      </Button>
                    )}
                  </div>
                  {selectedAnimalIds.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedAnimalIds.length} {t('mobile.animalsSelected')}
                    </p>
                  )}
                </div>

                {/* Buyer Information */}
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium">{t('mobile.buyerInfo')}</Label>
                  <div className="space-y-3 mt-2">
                    <Input
                      placeholder={t('mobile.buyerName')}
                      value={formData.buyerName}
                      onChange={(e) => handleInputChange("buyerName", e.target.value)}
                    />
                    <Input
                      placeholder={t('mobile.buyerDocument')}
                      value={formData.buyerDocument}
                      onChange={(e) => handleInputChange("buyerDocument", e.target.value)}
                    />
                    <Input
                      placeholder={t('mobile.buyerDestination')}
                      value={formData.buyerDestination}
                      onChange={(e) => handleInputChange("buyerDestination", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Animal Selection Dialog */}
        <Dialog open={animalDialogOpen} onOpenChange={setAnimalDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{t('mobile.selectAnimals')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input 
                placeholder={t('mobile.search')} 
                value={animalSearch} 
                onChange={(e) => setAnimalSearch(e.target.value)} 
              />
              <ScrollArea className="h-64 rounded border">
                <div className="p-2 space-y-1">
                  {animalsLoading && (
                    <div className="text-sm text-muted-foreground px-2 py-1">
                      {t('mobile.loadingAnimals')}
                    </div>
                  )}
                  {!animalsLoading && filteredAnimals.map((animal) => (
                    <label 
                      key={animal.id} 
                      className="flex items-center gap-2 px-2 py-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedAnimalIds.includes(animal.id)}
                        onCheckedChange={() => toggleAnimalSelection(animal.id)}
                      />
                      <span className="text-sm flex-1">
                        {animal.id_tag || animal.name || animal.id}
                      </span>
                      {animal.sex && (
                        <span className="text-xs text-muted-foreground">{animal.sex}</span>
                      )}
                    </label>
                  ))}
                  {!animalsLoading && filteredAnimals.length === 0 && animals.length === 0 && (
                    <div className="text-sm text-muted-foreground px-2 py-1">
                      {t('mobile.noAnimalsAvailable')}
                    </div>
                  )}
                  {!animalsLoading && filteredAnimals.length === 0 && animals.length > 0 && (
                    <div className="text-sm text-muted-foreground px-2 py-1">
                      {t('mobile.noResults')} "{animalSearch}"
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAnimalDialogOpen(false)}>
                {t('mobile.close')}
              </Button>
              <Button onClick={() => setAnimalDialogOpen(false)}>
                {t('mobile.done')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        <h1 className="text-xl font-semibold">{t('mobile.loadMovements')}</h1>
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
