import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { BadgePill } from "@/components/ui/badge-pill";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Edit, Trash2, Users, Calendar, MapPin, ChevronDown, ChevronRight, Skull, Eye, Activity, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import GenealogyTree from "@/components/GenealogyTree";
import AnimalExcelUploadAdvanced from "@/components/excel-upload/AnimalExcelUploadAdvanced";
import { ReproductivePerformance } from "@/components/reproductive/ReproductivePerformance";
import { ReproductiveEventsTable } from "@/components/reproductive/ReproductiveEventsTable";
import { AnimalActivitiesHistory } from "@/components/animals/AnimalActivitiesHistory";
import { BrafordRegistrationDisplay } from "@/components/braford/BrafordRegistrationDisplay";
import { calculateBrafordRegistration, type RegistrationLevel, type ParentInfo } from "@/lib/brafordRegistration";
import { MarkDeathDialog } from "@/components/mortality/MarkDeathDialog";
import { Animal } from "@/types/animal";
import { cleanupInactiveAnimalsFromCorrals } from "@/lib/animalCleanup";
import { normalizeAnimalStatus, getDisplayStatus } from "@/lib/statusUtils";
import { categorizeAnimal } from "@/lib/animalCategories";
import { useTranslation } from "react-i18next";
import { getTranslatedCategory, getTranslatedSex, getTranslatedStatus, getCategoryOptions, getSexOptions, getStatusOptions } from "@/lib/translations";
import { formatNumber, formatDate } from "@/lib/format";
import { ReadOnlyProtectedAction } from "@/components/subscription/ReadOnlyProtectedAction";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/services/db";
import { useConnectivity } from "@/services/connectivity";
import type { CachedAnimal } from "@/services/offlineTypes";

interface Cabaña {
  id: string;
  name: string;
  location: string;
}

interface ParentAnimal {
  id: string;
  name?: string;
  id_tag: string;
  sex: string;
}

// Argentine cattle breeds
const ARGENTINE_BREEDS = [
  "Angus",
  "Hereford", 
  "Shorthorn",
  "Charolais",
  "Limousin",
  "Simmental",
  "Brahman",
  "Nelore",
  "Braford",
  "Brangus",
  "Santa Gertrudis",
  "Senepol",
  "Bonsmara",
  "Holando Argentino",
  "Jersey",
  "Criollo",
  "Wagyu",
  "Corriente",
  "Otro"
];

// Breeds that can have horns
const HORNED_BREEDS = ["Hereford", "Braford", "Charolais", "Limousin", "Simmental", "Brahman", "Nelore", "Santa Gertrudis", "Criollo", "Corriente"];

// Mocho options - will be translated at render time
const getMochoOptions = (t: any) => [
  { value: "Mocho", label: t('animals:hornOptions.polled') },
  { value: "Con Cuernos", label: t('animals:hornOptions.horned') },
  { value: "Desconocido", label: t('animals:hornOptions.unknown') }
];

const BODY_CONDITION_SCORES = ["1", "2", "3", "4", "5"];

// Registration levels by breed
const REGISTRATION_OPTIONS = {
  "Braford": [
    "Avanzado",
    "Avanzado Definitivo", 
    "Controlado",
    "Puro de Pedigree",
    "Puro Registrado",
    "Sin Registro"
  ],
  "Brangus": [
    "Puro por Cruza",
    "Puro Registrado", 
    "Puro de Pedigree",
    "Terneros Registrados",
    "Sin Registro"
  ],
  "Angus": [
    "PC (Puro Controlado)",
    "PR (Puro Registrado)",
    "PP (Puro de Pedigree)",
    "Sin Registro"
  ]
};

// Get registration options for a specific breed
const getRegistrationOptions = (breed: string): string[] => {
  return REGISTRATION_OPTIONS[breed as keyof typeof REGISTRATION_OPTIONS] || ["Sin Registro"];
};

// Check if breed requires registration field
const breedRequiresRegistration = (breed: string): boolean => {
  return Object.keys(REGISTRATION_OPTIONS).includes(breed);
};

// Age classification function (now using categorizeAnimal from lib)
const getAgeCategory = (animal: Animal) => {
  return categorizeAnimal(animal, animal.is_castrated || false);
};

const Animals = () => {
  const navigate = useNavigate();
  const { currentUser } = useSupabaseAuth();
  const { t } = useTranslation(['animals', 'common', 'forms']);
  const isMobile = useIsMobile();
  const { isOnline } = useConnectivity();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [cabañas, setCabañas] = useState<Cabaña[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [userCabaña, setUserCabaña] = useState<string>("");
  const [parentAnimals, setParentAnimals] = useState<ParentAnimal[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [breedFilter, setBreedFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDeathDialog, setShowDeathDialog] = useState(false);
  const [animalToMarkDead, setAnimalToMarkDead] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    id_tag: "",
    caravana_electronica: "",
    sex: "",
    breed: "",
    birth_date: "",
    status: "Activo",
    mother_id: "",
    father_id: "",
    mother_name: "",
    father_name: "",
    mother_breed: "",
    father_breed: "",
    mother_registration: "",
    father_registration: "",
    cabaña_id: "",
    peso_nacimiento: "",
    mocho: "",
    color: "",
    condicion_corporal: "",
    observaciones: "",
    registration_level: ""
  });

  const { isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh: async () => {
      await fetchAnimals();
    },
    disabled: !isMobile,
  });

  useEffect(() => {
    fetchCabañas();
    fetchUserCabaña();
  }, [currentUser]);

  // Fetch animals when userCabaña is available
  useEffect(() => {
    if (userCabaña) {
      fetchAnimals();
    }
  }, [userCabaña]);

  const fetchUserCabaña = async () => {
    if (!currentUser?.id) {
      console.log("No currentUser.id found, currentUser:", currentUser);
      return;
    }
    
    console.log("Fetching cabaña for user:", currentUser.id);
    
    try {
      const { data, error } = await supabase.rpc("get_user_cabana_info", {
        user_uuid: currentUser.id,
      });
      
      console.log("RPC response:", { data, error });
      
      if (error) {
        console.error("RPC error:", error);
        throw error;
      }
      
      // If user doesn't exist in users table, show a message
      if (!data) {
      console.log("No cabaña data found for user");
        toast({
          title: t('animals:errors.configRequired'),
          description: t('animals:errors.contactAdmin'),
          variant: "destructive",
        });
        return;
      }
      
      console.log("Setting userCabaña to:", data[0]?.cabana_id);
      setUserCabaña(data[0]?.cabana_id || "");
    } catch (error) {
      console.error("Error fetching user cabaña:", error);
      toast({
        title: t('common:errors.generic'),
        description: t('animals:errors.loadUserInfo'),
        variant: "destructive",
      });
    }
  };

  const fetchParentAnimals = async () => {
    if (!userCabaña) return;
    try {
      const { data, error } = await supabase
        .from("animals")
        .select("id, name, id_tag, sex")
        .eq("cabaña_id", userCabaña)
        .eq("status", "Activo")
        .order("name");

      if (error) throw error;
      setParentAnimals(data || []);
    } catch (error) {
      console.error("Error fetching parent animals:", error);
    }
  };

  useEffect(() => {
    if (userCabaña) {
      fetchParentAnimals();
    }
  }, [userCabaña]);

  // Get animal display name using naming convention: "Nombre – ID" or just "ID"
  const getAnimalDisplayName = (animal: Animal) => {
    if (animal.name && animal.name.trim()) {
      return `${animal.name} – ${animal.id_tag}`;
    }
    return animal.id_tag;
  };

  // Load animals from cache first, then sync from server
  const loadFromCache = useCallback(async () => {
    if (!userCabaña) return;
    try {
      const cached = await db.animals_cache
        .where('cabaña_id')
        .equals(userCabaña)
        .toArray();
      
      if (cached.length > 0) {
        // Sort by birth_date descending
        cached.sort((a, b) => {
          if (!a.birth_date && !b.birth_date) return 0;
          if (!a.birth_date) return 1;
          if (!b.birth_date) return -1;
          return new Date(b.birth_date).getTime() - new Date(a.birth_date).getTime();
        });
        setAnimals(cached as unknown as Animal[]);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading from cache:', err);
    }
  }, [userCabaña]);

  const syncFromServer = useCallback(async () => {
    if (!userCabaña || !isOnline) return;
    
    try {
      console.log("🐄 Animals page - Syncing from server for cabaña:", userCabaña);
      const { data, error } = await supabase
        .from("animals")
        .select("*, is_castrated")
        .eq("cabaña_id", userCabaña)
        .order("birth_date", { ascending: false, nullsFirst: false });

      if (error) throw error;
      
      // Get pending local IDs to avoid overwriting
      const pendingIds = (await db.animals_cache
        .where('sync_status')
        .equals('pending')
        .toArray()
      ).map(a => a.id);

      // Update cache with server data
      for (const animal of data || []) {
        if (pendingIds.includes(animal.id)) continue;
        
        await db.animals_cache.put({
          ...animal,
          cabaña_id: animal.cabaña_id || userCabaña,
          sex: animal.sex as 'Macho' | 'Hembra',
          status: (animal.status || 'activo') as 'activo' | 'vendido' | 'muerto',
          updated_at: new Date().toISOString(),
          sync_status: 'synced'
        } as CachedAnimal);
      }

      setAnimals(data || []);
    } catch (error) {
      console.error("Error syncing animals:", error);
      // Only show error if we have no cached data
      if (animals.length === 0) {
        toast({
          title: t('common:errors.generic'),
          description: t('animals:errors.loadAnimals'),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [userCabaña, isOnline, animals.length, t]);

  const fetchAnimals = useCallback(async () => {
    if (!userCabaña) {
      console.log("No userCabaña available, skipping fetchAnimals");
      setLoading(false);
      return;
    }

    // Load from cache first for instant display
    await loadFromCache();
    
    // Then sync from server if online
    await syncFromServer();
  }, [userCabaña, loadFromCache, syncFromServer]);

  const fetchCabañas = async () => {
    try {
      const { data, error } = await supabase
        .from("cabañas")
        .select("*")
        .order("name");

      if (error) throw error;
      setCabañas(data || []);
    } catch (error) {
      console.error("Error fetching cabañas:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that user has a cabaña associated
    if (!editingAnimal && !userCabaña) {
      console.error("User cabaña validation failed:", { userCabaña, editingAnimal });
      toast({
        title: t('animals:errors.configRequired'),
        description: t('animals:errors.noCabana'),
        variant: "destructive",
      });
      return;
    }
    
    // Validate that birth date is not in the future
    if (formData.birth_date && new Date(formData.birth_date) > new Date()) {
      toast({
        title: t('common:errors.validation'),
        description: t('animals:errors.futureBirthDate'),
        variant: "destructive",
      });
      return;
    }

    // Validate that mother and father are not the same
    if (formData.mother_id && formData.father_id && formData.mother_id === formData.father_id) {
      toast({
        title: t('common:errors.validation'),
        description: t('animals:errors.sameParents'),
        variant: "destructive",
      });
      return;
    }

    try {
      // Look up parent animals by their id_tag values - but don't require they exist
      let motherUUID = null;
      let fatherUUID = null;

      if (formData.mother_id) {
        const { data: motherData } = await supabase
          .from("animals")
          .select("id")
          .eq("id_tag", formData.mother_id)
          .eq("cabaña_id", editingAnimal ? formData.cabaña_id : userCabaña)
          .eq("sex", "Hembra")
          .maybeSingle();
        
        motherUUID = motherData?.id || null;
      }

      if (formData.father_id) {
        const { data: fatherData } = await supabase
          .from("animals")
          .select("id")
          .eq("id_tag", formData.father_id)
          .eq("cabaña_id", editingAnimal ? formData.cabaña_id : userCabaña)
          .eq("sex", "Macho")
          .maybeSingle();
        
        fatherUUID = fatherData?.id || null;
      }

      // Calculate Braford registration if applicable
      let registrationData = {};
      if (formData.breed === 'Braford') {
        let fatherInfo: ParentInfo | undefined;
        let motherInfo: ParentInfo | undefined;

        // Get father registration info
        if (fatherUUID) {
          const { data: fatherData } = await supabase
            .from("animals")
            .select("registration_level, registration_level_override, birth_date, dna_verified")
            .eq("id", fatherUUID)
            .single();
          
          if (fatherData) {
            fatherInfo = {
              level: (fatherData.registration_level_override || fatherData.registration_level) as RegistrationLevel,
              hasDNA: fatherData.dna_verified || false,
            };
          }
        }

        // Get mother registration info
        if (motherUUID) {
          const { data: motherData } = await supabase
            .from("animals")
            .select("registration_level, registration_level_override, birth_date, breed")
            .eq("id", motherUUID)
            .single();
          
          if (motherData) {
            const birthYear = motherData.birth_date ? new Date(motherData.birth_date).getFullYear() : undefined;
            motherInfo = {
              level: (motherData.registration_level_override || motherData.registration_level) as RegistrationLevel,
              isBoMother: motherData.breed === 'Bo',
              birthYear,
            };
          }
        }

        // Calculate registration level
        const registrationResult = calculateBrafordRegistration(
          formData.breed,
          fatherInfo,
          motherInfo,
          false // Not AI for now, this can be enhanced later
        );

        registrationData = {
          registration_level: registrationResult.level,
          registration_father_level: fatherInfo?.level || null,
          registration_mother_level: motherInfo?.level || null,
        };
      }

      // Prepare data for submission
      const submitData = {
        name: formData.name || null,
        id_tag: formData.id_tag,
        sex: formData.sex,
        breed: formData.breed,
        birth_date: formData.birth_date || null,
        status: formData.status,
        mother_id: motherUUID,
        father_id: fatherUUID,
        // Store parent names/info when not found as full animals
        mother_name: !motherUUID && formData.mother_id ? formData.mother_id : null,
        father_name: !fatherUUID && formData.father_id ? formData.father_id : null,
        mother_breed: formData.mother_breed || null,
        father_breed: formData.father_breed || null,
        mother_registration: formData.mother_registration || null,
        father_registration: formData.father_registration || null,
        cabaña_id: editingAnimal ? formData.cabaña_id : userCabaña,
        peso_nacimiento: formData.peso_nacimiento ? parseFloat(formData.peso_nacimiento) : null,
        mocho: formData.mocho || null,
        color: formData.color || null,
        condicion_corporal: formData.condicion_corporal || null,
        observaciones: formData.observaciones || null,
        registration_level: formData.registration_level || null,
        ...registrationData,
      };

      if (editingAnimal) {
        const { error } = await supabase
          .from("animals")
          .update(submitData)
          .eq("id", editingAnimal.id);

        if (error) throw error;
        
        toast({
          title: t('common:status.success'),
          description: t('animals:messages.updated'),
        });
      } else {
        const { error } = await supabase
          .from("animals")
          .insert([submitData]);

        if (error) throw error;
        
        toast({
          title: t('common:status.success'),
          description: t('animals:messages.created'),
        });
      }

      setShowAddDialog(false);
      setEditingAnimal(null);
      resetForm();
      fetchAnimals();
      
      // Cleanup inactive animals from corrals if status changed to inactive
      if (editingAnimal && 
          (submitData.status === "vendido" || submitData.status === "muerto" || 
           submitData.status === "Vendido" || submitData.status === "Muerto")) {
        await cleanupInactiveAnimalsFromCorrals(editingAnimal.cabaña_id || userCabaña);
      }
    } catch (error: any) {
      console.error("Error saving animal:", error);
      
      // Handle unique constraint violation
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        toast({
          title: t('common:errors.generic'),
          description: t('animals:errors.duplicateId'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('common:errors.generic'),
          description: t('animals:errors.saveFailed'),
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (animal: Animal) => {
    setEditingAnimal(animal);
    setFormData({
      name: animal.name || "",
      id_tag: animal.id_tag,
      caravana_electronica: animal.caravana_electronica || "",
      sex: animal.sex,
      breed: animal.breed,
      birth_date: animal.birth_date || "",
      status: animal.status,
      mother_id: animal.mother_name || "",
      father_id: animal.father_name || "",
      mother_name: animal.mother_name || "",
      father_name: animal.father_name || "",
      mother_breed: animal.mother_breed || "",
      father_breed: animal.father_breed || "",
      mother_registration: animal.mother_registration || "",
      father_registration: animal.father_registration || "",
      cabaña_id: animal.cabaña_id,
      peso_nacimiento: animal.peso_nacimiento?.toString() || "",
      mocho: animal.mocho || "",
      color: animal.color || "",
      condicion_corporal: animal.condicion_corporal || "",
      observaciones: animal.observaciones || "",
      registration_level: animal.registration_level || ""
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (animalId: string) => {
    if (!confirm(t('animals:messages.confirmDelete'))) return;

    try {
      // Delete related records first to avoid foreign key constraints
      await supabase.from("animal_vaccines").delete().eq("animal_id", animalId);
      await supabase.from("activities").delete().eq("animal_id", animalId);
      await supabase.from("reproductive_events").delete().eq("animal_id", animalId);
      await supabase.from("preñeces").delete().eq("animal_id", animalId);
      await supabase.from("reproductive_current_state").delete().eq("animal_id", animalId);
      await supabase.from("verification_tasks").delete().eq("animal_id", animalId);
      await supabase.from("reproductive_alerts").delete().eq("animal_id", animalId);
      await supabase.from("vaccination_alerts").delete().eq("animal_id", animalId);
      await supabase.from("finances_animal_sales").delete().eq("animal_id", animalId);
      await supabase.from("animal_weight_history").delete().eq("animal_id", animalId);
      await supabase.from("individual_reproductive_kpis").delete().eq("animal_id", animalId);
      await supabase.from("reproductive_active_years").delete().eq("animal_id", animalId);
      await supabase.from("reproductive_activities").delete().eq("animal_id", animalId);
      
      // Now delete the animal
      const { error } = await supabase
        .from("animals")
        .delete()
        .eq("id", animalId);

      if (error) throw error;

      toast({
        title: t('common:status.success'),
        description: t('animals:messages.deleted'),
      });
      
      fetchAnimals();
    } catch (error) {
      console.error("Error deleting animal:", error);
      toast({
        title: t('common:status.error'),
        description: t('animals:errors.deleteFailed'),
        variant: "destructive",
      });
    }
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

  const resetForm = () => {
    setFormData({
      name: "",
      id_tag: "",
      caravana_electronica: "",
      sex: "",
      breed: "",
      birth_date: "",
      status: "Activo",
      mother_id: "",
      father_id: "",
      mother_name: "",
      father_name: "",
      mother_breed: "",
      father_breed: "",
      mother_registration: "",
      father_registration: "",
      cabaña_id: "",
      peso_nacimiento: "",
      mocho: "",
      color: "",
      condicion_corporal: "",
      observaciones: "",
      registration_level: ""
    });
    setShowOptionalFields(false);
  };

  const toggleExpandedRow = (animalId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(animalId)) {
      newExpanded.delete(animalId);
    } else {
      newExpanded.add(animalId);
    }
    setExpandedRows(newExpanded);
  };

  // Filter animals based on search term and filters
  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = 
      !searchTerm ||
      animal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.id_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.breed?.toLowerCase().includes(searchTerm.toLowerCase());

    const animalCategory = getAgeCategory(animal);
    const matchesCategory = 
      categoryFilter === "all" || 
      animalCategory === categoryFilter;
    
    // Debug when filtering by category
    if (categoryFilter !== "all" && categoryFilter === "Ternero") {
      console.log('🐮 Ternero Filter Debug:', {
        id: animal.id_tag,
        sex: animal.sex,
        birthDate: animal.birth_date,
        isCastrated: animal.is_castrated,
        calculatedCategory: animalCategory,
        matches: matchesCategory
      });
    }

    const matchesBreed = 
      breedFilter === "all" || 
      animal.breed === breedFilter;

    const normalizedStatus = normalizeAnimalStatus(animal.status);
    const matchesStatus = 
      statusFilter === "all" || 
      normalizedStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesBreed && matchesStatus;
  });

  // Get unique breeds for filter
  const availableBreeds = Array.from(new Set(animals.map(animal => animal.breed))).filter(Boolean);

  // Calculate metrics
  const totalAnimals = animals.length;
  const activeAnimals = animals.filter(animal => {
    const status = normalizeAnimalStatus(animal.status);
    return status === "active";
  }).length;
  const femaleAnimals = animals.filter(animal => animal.sex === "Hembra").length;
  const maleAnimals = animals.filter(animal => animal.sex === "Macho").length;

  const getStatusBadge = (status: string) => {
    const normalizedStatus = normalizeAnimalStatus(status);
    const displayStatus = getTranslatedStatus(normalizedStatus, t);
    
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    
    if (normalizedStatus === "active") {
      variant = "default";
    } else if (normalizedStatus === "sold") {
      variant = "secondary";
    } else if (normalizedStatus === "dead") {
      variant = "destructive";
    } else {
      variant = "outline";
    }
    
    return <Badge variant={variant}>{displayStatus}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando animales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-6 relative">
      {/* Pull to refresh indicator for mobile */}
      {isMobile && isPulling && (
        <div 
          className="absolute top-0 left-0 right-0 bg-primary/10 flex items-center justify-center transition-all duration-200 ease-out z-10 rounded-lg"
          style={{ height: `${Math.min(pullDistance, 80)}px` }}
        >
          <RefreshCw 
            className={cn(
              "h-5 w-5 text-primary transition-transform duration-200",
              isRefreshing && "animate-spin"
            )}
            style={{ 
              transform: `rotate(${Math.min(pullDistance * 4, 360)}deg)` 
            }}
          />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={t('animals:title')}
          subtitle={t('animals:subtitle')}
          className="hidden sm:block"
        />
        
        <div className="hidden lg:flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
          <ReadOnlyProtectedAction>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingAnimal(null); }} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('animals:addAnimal')}
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background">
            <DialogHeader>
              <DialogTitle>
                {editingAnimal ? t('animals:editAnimal') : t('animals:addAnimal')}
              </DialogTitle>
              <DialogDescription>
                {editingAnimal ? t('animals:subtitle') : t('animals:subtitle')}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Essential Information Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="id_tag">{t('animals:form.identification')} *</Label>
                    <Input
                      id="id_tag"
                      value={formData.id_tag}
                      onChange={(e) => setFormData({...formData, id_tag: e.target.value})}
                      placeholder={t('animals:form.identification')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caravana_electronica">{t('animals:form.electronicTag')} ({t('forms:placeholders.optional')})</Label>
                    <Input
                      id="caravana_electronica"
                      value={formData.caravana_electronica}
                      onChange={(e) => setFormData({...formData, caravana_electronica: e.target.value})}
                      placeholder={t('animals:form.electronicTag')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('animals:fields.name')} ({t('forms:placeholders.optional')})</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder={t('animals:fields.name')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sex">{t('animals:fields.sex')} *</Label>
                    <Select value={formData.sex} onValueChange={(value) => setFormData({...formData, sex: value})} required>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={t('animals:form.selectSex')} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        <SelectItem value="Macho">{t('animals:sex.male')}</SelectItem>
                        <SelectItem value="Hembra">{t('animals:sex.female')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breed">{t('animals:fields.breed')} *</Label>
                    <Select value={formData.breed} onValueChange={(value) => setFormData({...formData, breed: value})} required>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={t('animals:form.selectBreed')} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50 max-h-60">
                        {ARGENTINE_BREEDS.map((breed) => (
                          <SelectItem key={breed} value={breed}>
                            {breed}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Conditional Mocho field */}
                {formData.breed && HORNED_BREEDS.includes(formData.breed) && (
                  <div className="space-y-2">
                    <Label htmlFor="mocho">{t('animals:form.hornCondition')}</Label>
                    <Select 
                      value={formData.mocho || "Desconocido"} 
                      onValueChange={(value) => setFormData({...formData, mocho: value})}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={t('animals:form.selectCondition')} />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        {getMochoOptions(t).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                 {/* Conditional Registration field */}
                 {formData.breed && breedRequiresRegistration(formData.breed) && (
                   <div className="space-y-2">
                     <Label htmlFor="registration_level">{t('animals:form.registration')}</Label>
                     <Select 
                       value={formData.registration_level} 
                       onValueChange={(value) => setFormData({...formData, registration_level: value})}
                     >
                       <SelectTrigger className="bg-background">
                         <SelectValue placeholder={t('animals:form.selectRegistration')} />
                       </SelectTrigger>
                       <SelectContent className="bg-background border shadow-md z-50">
                         {getRegistrationOptions(formData.breed).map((option) => (
                           <SelectItem key={option} value={option}>
                             {option}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">{t('animals:fields.birthDate')}</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="peso_nacimiento">{t('animals:form.birthWeight')} (kg)</Label>
                    <Input
                      id="peso_nacimiento"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.peso_nacimiento}
                      onChange={(e) => setFormData({...formData, peso_nacimiento: e.target.value})}
                      placeholder="32.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mother_id">{t('animals:form.motherNameOrId')}</Label>
                    <Input
                      id="mother_id"
                      value={formData.mother_id}
                      onChange={(e) => setFormData({...formData, mother_id: e.target.value})}
                      placeholder={t('animals:form.motherNameOrId')}
                      list="mother-suggestions"
                    />
                    <datalist id="mother-suggestions">
                      {parentAnimals
                        .filter(animal => animal.sex === "Hembra" && animal.id_tag !== formData.father_id)
                        .map((animal) => (
                          <option key={animal.id} value={animal.id_tag}>
                            {animal.name ? `${animal.name} (${animal.id_tag})` : animal.id_tag}
                          </option>
                        ))}
                    </datalist>
                    
                    {/* Additional mother info fields */}
                    {formData.mother_id && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('animals:form.motherBreed')}</Label>
                          <Select value={formData.mother_breed} onValueChange={(value) => setFormData({...formData, mother_breed: value})}>
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder={t('animals:fields.breed')} />
                            </SelectTrigger>
                            <SelectContent className="bg-background border shadow-md z-50">
                              {ARGENTINE_BREEDS.map((breed) => (
                                <SelectItem key={breed} value={breed}>
                                  {breed}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {formData.mother_breed && breedRequiresRegistration(formData.mother_breed) && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t('animals:form.motherRegistration')}</Label>
                            <Select value={formData.mother_registration} onValueChange={(value) => setFormData({...formData, mother_registration: value})}>
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue placeholder={t('animals:form.registration')} />
                              </SelectTrigger>
                              <SelectContent className="bg-background border shadow-md z-50">
                                {getRegistrationOptions(formData.mother_breed).map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="father_id">{t('animals:form.fatherNameOrId')}</Label>
                    <Input
                      id="father_id"
                      value={formData.father_id}
                      onChange={(e) => setFormData({...formData, father_id: e.target.value})}
                      placeholder={t('animals:form.fatherNameOrId')}
                      list="father-suggestions"
                    />
                    <datalist id="father-suggestions">
                      {parentAnimals
                        .filter(animal => animal.sex === "Macho" && animal.id_tag !== formData.mother_id)
                        .map((animal) => (
                          <option key={animal.id} value={animal.id_tag}>
                            {animal.name ? `${animal.name} (${animal.id_tag})` : animal.id_tag}
                          </option>
                        ))}
                    </datalist>
                    
                    {/* Additional father info fields */}
                    {formData.father_id && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('animals:form.fatherBreed')}</Label>
                          <Select value={formData.father_breed} onValueChange={(value) => setFormData({...formData, father_breed: value})}>
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder={t('animals:fields.breed')} />
                            </SelectTrigger>
                            <SelectContent className="bg-background border shadow-md z-50">
                              {ARGENTINE_BREEDS.map((breed) => (
                                <SelectItem key={breed} value={breed}>
                                  {breed}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {formData.father_breed && breedRequiresRegistration(formData.father_breed) && (
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">{t('animals:form.fatherRegistration')}</Label>
                            <Select value={formData.father_registration} onValueChange={(value) => setFormData({...formData, father_registration: value})}>
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue placeholder={t('animals:form.registration')} />
                              </SelectTrigger>
                              <SelectContent className="bg-background border shadow-md z-50">
                                {getRegistrationOptions(formData.father_breed).map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">{t('animals:fields.status')}</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={t('animals:form.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      <SelectItem value="Activo">{t('animals:status.active')}</SelectItem>
                      <SelectItem value="Vendido">{t('animals:status.sold')}</SelectItem>
                      <SelectItem value="Muerto">{t('animals:status.dead')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Optional Fields Section */}
              <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-2">
                    <span>{t('animals:form.additionalFields')}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showOptionalFields ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="color">{t('animals:fields.color')}</Label>
                      <Input
                        id="color"
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                        placeholder={t('animals:fields.color')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="condicion_corporal">{t('animals:form.bodyCondition')} (1-5)</Label>
                      <Select value={formData.condicion_corporal} onValueChange={(value) => setFormData({...formData, condicion_corporal: value})}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder={t('animals:form.selectCondition')} />
                        </SelectTrigger>
                        <SelectContent className="bg-background border shadow-md z-50">
                          {BODY_CONDITION_SCORES.map((score) => (
                            <SelectItem key={score} value={score}>
                              {score}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observaciones">{t('animals:form.generalObservations')}</Label>
                    <Textarea
                      id="observaciones"
                      value={formData.observaciones}
                      onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                      placeholder={t('animals:form.additionalNotes')}
                      rows={3}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  {t('forms:buttons.cancel')}
                </Button>
                <Button type="submit">
                  {editingAnimal ? t('forms:buttons.save') : t('common:add')}
                </Button>
              </div>
            </form>
            </DialogContent>
            </Dialog>
          </ReadOnlyProtectedAction>
          
          <AnimalExcelUploadAdvanced userCabañaId={userCabaña} onUploadComplete={fetchAnimals} />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('animals:totalAnimals')}
          value={totalAnimals}
          icon={Users}
        />
        <MetricCard
          title={t('animals:activeAnimals')}
          value={activeAnimals}
          icon={Activity}
        />
        <MetricCard
          title={t('animals:sex.female')}
          value={femaleAnimals}
          icon={TrendingUp}
        />
        <MetricCard
          title={t('animals:sex.male')}
          value={maleAnimals}
          icon={TrendingUp}
        />
      </div>

      {/* Filters and Search */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="text-xl font-display">{t('animals:animalsList')}</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('animals:searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-80 bg-background/50 backdrop-blur-sm"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-auto">
                    <SelectValue placeholder={t('animals:filters.allCategories')} />
                  </SelectTrigger>
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
                  <SelectTrigger className="w-full sm:w-auto">
                    <SelectValue placeholder={t('animals:filters.allBreeds')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('animals:filters.allBreeds')}</SelectItem>
                    {availableBreeds.map(breed => (
                      <SelectItem key={breed} value={breed}>{breed}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-auto">
                    <SelectValue placeholder={t('animals:filters.allStatuses')} />
                  </SelectTrigger>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpandedRow(animal.id)}
                              className="p-1 hover:bg-primary/10 transition-colors"
                            >
                              {expandedRows.has(animal.id) ? (
                                <ChevronDown className="h-4 w-4 text-primary" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                           <TableCell 
                             className="font-medium cursor-pointer hover:text-primary transition-colors"
                             onClick={() => navigate(`/animales/${animal.id}`)}
                           >
                             {getAnimalDisplayName(animal)}
                           </TableCell>
                           <TableCell className="font-mono text-sm">{animal.id_tag}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium">
                                {getTranslatedCategory(getAgeCategory(animal), t)}
                              </Badge>
                            </TableCell>
                           <TableCell className="font-medium">{animal.breed}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>{getStatusBadge(animal.status)}</TableCell>
                           <TableCell>
                             <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/animales/${animal.id}`)}
                                  className="flex items-center gap-1"
                                >
                                  <Eye className="h-4 w-4" />
                                  {t('animals:actions.view')}
                                </Button>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => handleEdit(animal)}
                               >
                                 <Edit className="h-4 w-4" />
                               </Button>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => handleDelete(animal.id)}
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                               {animal.status !== 'muerto' && animal.status !== 'vendido' && (
                                 <Button
                                   variant="outline"
                                   size="sm"
                                   onClick={() => handleMarkDeath(animal)}
                                   className="text-destructive hover:text-destructive"
                                 >
                                   <Skull className="h-4 w-4" />
                                 </Button>
                               )}
                             </div>
                           </TableCell>
                        </TableRow>
                        
                        {/* Expandable Animal Details */}
                        {expandedRows.has(animal.id) && (
                          <TableRow>
                            <TableCell colSpan={8} className="p-0 bg-muted/20">
                               <div className="p-4 md:p-6 space-y-6">
                                 {/* Top Section: Info + Genealogy */}
                                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                   {/* Basic Info Recap */}
                                    <Card>
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-base">{t('common:basicInfo')}</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                          <div className="flex flex-col">
                                            <span className="text-muted-foreground text-xs">{t('animals:fields.sex')}</span>
                                            <span className="font-medium">{getTranslatedSex(animal.sex, t)}</span>
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-muted-foreground text-xs">{t('animals:fields.breed')}</span>
                                            <span className="font-medium">{animal.breed}</span>
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-muted-foreground text-xs">{t('animals:fields.birthDate')}</span>
                                            <span className="font-medium">{animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : "N/A"}</span>
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-muted-foreground text-xs">{t('animals:form.hornCondition')}</span>
                                            <span className="font-medium">{animal.mocho || "N/A"}</span>
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-muted-foreground text-xs">{t('animals:form.birthWeight')}</span>
                                            <span className="font-medium">{animal.peso_nacimiento ? `${animal.peso_nacimiento} kg` : "N/A"}</span>
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-muted-foreground text-xs">{t('animals:fields.status')}</span>
                                            <span className="font-medium">{getTranslatedStatus(animal.status, t)}</span>
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-muted-foreground text-xs">{t('animals:fields.color')}</span>
                                            <span className="font-medium">{animal.color || "N/A"}</span>
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-muted-foreground text-xs">{t('animals:form.bodyCondition')}</span>
                                            <span className="font-medium">{animal.condicion_corporal || "N/A"}</span>
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-muted-foreground text-xs">{t('animals:form.registration')}</span>
                                            <span className="font-medium">{animal.registration_level || "N/A"}</span>
                                          </div>
                                        </div>
                                        {animal.observaciones && (
                                          <div className="mt-4 pt-4 border-t">
                                            <span className="text-xs text-muted-foreground">{t('animals:fields.observations')}</span>
                                            <p className="text-sm mt-1">{animal.observaciones}</p>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                   
                                   {/* Genealogy Tree */}
                                   <div className="min-w-0">
                                     <GenealogyTree 
                                       animalId={animal.id}
                                       animalName={animal.name}
                                       animalIdTag={animal.id_tag}
                                     />
                                   </div>
                                 </div>

                                 {/* Registration System for Braford and Brangus */}
                                 {(animal.breed === 'Braford' || animal.breed === 'Brangus') && (
                                   <div>
                                     <BrafordRegistrationDisplay
                                       breed={animal.breed}
                                       currentLevel={animal.registration_level as RegistrationLevel}
                                       overrideLevel={animal.registration_level_override as RegistrationLevel}
                                       overrideReason={animal.registration_override_reason}
                                       readonly
                                     />
                                   </div>
                                 )}
                                 
                                 {/* Activities History for all animals */}
                                 <div>
                                   <AnimalActivitiesHistory 
                                     animalId={animal.id}
                                     animalName={animal.name || animal.id_tag}
                                   />
                                 </div>
                                 
                                 {/* Reproductive Performance Section - Only for females */}
                                 {animal.sex === "Hembra" && (
                                   <div className="space-y-6">
                                     <ReproductivePerformance 
                                       animalId={animal.id}
                                       animalSex={animal.sex}
                                     />
                                     <ReproductiveEventsTable
                                       animalId={animal.id}
                                       animalSex={animal.sex}
                                       cabaña_id={animal.cabaña_id}
                                     />
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

              {/* Mobile Card Layout */}
              <div className="lg:hidden space-y-3">
                {filteredAnimals.map((animal) => (
                  <Card key={animal.id} className="overflow-hidden">
                    <Collapsible
                      open={expandedRows.has(animal.id)}
                      onOpenChange={() => toggleExpandedRow(animal.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2">
                                 <h3 
                                  className="font-medium truncate cursor-pointer hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/animales/${animal.id}`);
                                  }}
                                >
                                  {getAnimalDisplayName(animal)}
                                </h3>
                                 <Badge variant="outline" className="shrink-0">
                                   {getTranslatedCategory(getAgeCategory(animal), t)}
                                 </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="truncate">{animal.breed}</span>
                                <span className="shrink-0">
                                  {animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : "Sin fecha"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                {getStatusBadge(animal.status)}
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/animales/${animal.id}`);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(animal);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {animal.status !== 'muerto' && animal.status !== 'vendido' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkDeath(animal);
                                      }}
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Skull className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <Button variant="ghost" size="sm" className="shrink-0 ml-2">
                              {expandedRows.has(animal.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t border-border bg-muted/20">
                          <div className="space-y-4 pt-4">
                            {/* Basic Info */}
                            <div className="space-y-2">
                              <h4 className="font-medium">Información Básica</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Sexo:</span>
                                  <span>{animal.sex}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Color:</span>
                                  <span>{animal.color || "N/A"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Peso nacer:</span>
                                  <span>{animal.peso_nacimiento ? `${animal.peso_nacimiento} kg` : "N/A"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Registro:</span>
                                  <span>{animal.registration_level || "N/A"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Genealogy */}
                            <div className="space-y-2">
                              <GenealogyTree 
                                animalId={animal.id}
                                animalName={animal.name}
                                animalIdTag={animal.id_tag}
                              />
                            </div>

                            {/* Registration System for Braford and Brangus */}
                            {(animal.breed === 'Braford' || animal.breed === 'Brangus') && (
                              <div className="space-y-2">
                                <BrafordRegistrationDisplay
                                  breed={animal.breed}
                                  currentLevel={animal.registration_level as RegistrationLevel}
                                  overrideLevel={animal.registration_level_override as RegistrationLevel}
                                  overrideReason={animal.registration_override_reason}
                                  readonly
                                />
                              </div>
                            )}
                            
                            {/* Activities History */}
                            <div className="space-y-2">
                              <AnimalActivitiesHistory 
                                animalId={animal.id}
                                animalName={animal.name || animal.id_tag}
                              />
                            </div>
                            
                            {/* Reproductive Performance - Only for females */}
                            {animal.sex === "Hembra" && (
                              <div className="space-y-2">
                                <ReproductivePerformance 
                                  animalId={animal.id}
                                  animalSex={animal.sex}
                                />
                                <ReproductiveEventsTable
                                  animalId={animal.id}
                                  animalSex={animal.sex}
                                  cabaña_id={animal.cabaña_id}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
