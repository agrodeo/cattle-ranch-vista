import { useState, useEffect } from "react";
import { useHybridAuth } from "@/hooks/useHybridAuth";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Search, Edit, Trash2, Users, Calendar, MapPin, ChevronDown, ChevronRight, Skull } from "lucide-react";
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

const MOCHO_OPTIONS = [
  { value: "Mocho", label: "Mocho" },
  { value: "Con Cuernos", label: "Con Cuernos" },
  { value: "Desconocido", label: "Desconocido" }
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

// Age classification function
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

const Animals = () => {
  const { currentUser } = useHybridAuth();
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
  const [animalToMarkDead, setAnimalToMarkDead] = useState<Animal | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    id_tag: "",
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
      const { data, error } = await supabase.rpc("get_internal_user_cabana_info", {
        user_uuid: currentUser.id,
      });
      
      console.log("RPC response:", { data, error });
      
      if (error) {
        console.error("RPC error:", error);
        throw error;
      }
      
      // If user doesn't exist in users table, show a message
      if (!data || data.length === 0) {
        console.log("No cabaña data found for user");
        toast({
          title: "Configuración requerida",
          description: "Por favor contacte al administrador para asignar su cabaña",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Setting userCabaña to:", data[0]?.cabana_id);
      setUserCabaña(data[0]?.cabana_id || "");
    } catch (error) {
      console.error("Error fetching user cabaña:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del usuario",
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

  const fetchAnimals = async () => {
    if (!userCabaña) {
      console.log("No userCabaña available, skipping fetchAnimals");
      setLoading(false);
      return;
    }

    try {
      console.log("🐄 Animals page - Fetching animals for cabaña:", userCabaña);
      const { data, error } = await supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", userCabaña)
        .order("birth_date", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setAnimals(data || []);
    } catch (error) {
      console.error("Error fetching animals:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los animales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
    
    // Validate that birth date is not in the future
    if (formData.birth_date && new Date(formData.birth_date) > new Date()) {
      toast({
        title: "Error de validación",
        description: "La fecha de nacimiento no puede ser en el futuro",
        variant: "destructive",
      });
      return;
    }

    // Validate that mother and father are not the same
    if (formData.mother_id && formData.father_id && formData.mother_id === formData.father_id) {
      toast({
        title: "Error de validación",
        description: "La madre y el padre no pueden ser el mismo animal",
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
          title: "Éxito",
          description: "Animal actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from("animals")
          .insert([submitData]);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Animal agregado correctamente",
        });
      }

      setShowAddDialog(false);
      setEditingAnimal(null);
      resetForm();
      fetchAnimals();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el animal",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (animal: Animal) => {
    setEditingAnimal(animal);
    
    // Convert parent UUIDs to id_tag values for display
    let motherIdTag = "";
    let fatherIdTag = "";
    
    if (animal.mother_id) {
      const { data: motherData } = await supabase
        .from("animals")
        .select("id_tag")
        .eq("id", animal.mother_id)
        .single();
      motherIdTag = motherData?.id_tag || "";
    }
    
    if (animal.father_id) {
      const { data: fatherData } = await supabase
        .from("animals")
        .select("id_tag")
        .eq("id", animal.father_id)
        .single();
      fatherIdTag = fatherData?.id_tag || "";
    }
    
    setFormData({
      name: animal.name || "",
      id_tag: animal.id_tag || "",
      sex: animal.sex || "",
      breed: animal.breed || "",
      birth_date: animal.birth_date || "",
      status: animal.status || "Activo",
      mother_id: motherIdTag,
      father_id: fatherIdTag,
      mother_name: "",
      father_name: "",
      mother_breed: "",
      father_breed: "",
      mother_registration: "",
      father_registration: "",
      cabaña_id: animal.cabaña_id || "",
      peso_nacimiento: animal.peso_nacimiento?.toString() || "",
      mocho: animal.mocho || (animal.breed && HORNED_BREEDS.includes(animal.breed) ? "Desconocido" : ""),
      color: animal.color || "",
      condicion_corporal: animal.condicion_corporal || "",
      observaciones: animal.observaciones || "",
      registration_level: animal.registration_level || ""
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este animal?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("animals")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: "Animal eliminado correctamente",
      });
      
      fetchAnimals();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el animal",
        variant: "destructive",
      });
    }
  };

  const handleMarkDeath = (animal: Animal) => {
    setAnimalToMarkDead(animal);
    setShowDeathDialog(true);
  };

  const handleDeathSuccess = () => {
    fetchAnimals();
    setShowDeathDialog(false);
    setAnimalToMarkDead(null);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      id_tag: "",
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

  // Toggle expanded row
  const toggleExpandedRow = async (animalId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(animalId)) {
      newExpanded.delete(animalId);
    } else {
      newExpanded.add(animalId);
    }
    setExpandedRows(newExpanded);
  };

  // Enhanced filtering with categories
  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = animal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.id_tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      animal.breed?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || categoryFilter === "all" || getAgeCategory(animal.birth_date, animal.sex) === categoryFilter;
    const matchesBreed = !breedFilter || breedFilter === "all" || animal.breed === breedFilter;
    const matchesStatus = !statusFilter || statusFilter === "all" || animal.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesBreed && matchesStatus;
  });

  // Calculate category counts
  const getCategoryCounts = () => {
    const activeAnimals = animals.filter(a => a.status === "Activo");
    const counts = {
      "Ternero": 0,
      "Ternera": 0,
      "Novillo": 0,
      "Vaquillona": 0,
      "Toro": 0,
      "Vaca adulta": 0
    };

    activeAnimals.forEach(animal => {
      const category = getAgeCategory(animal.birth_date, animal.sex);
      if (counts.hasOwnProperty(category)) {
        counts[category as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const categoryCounts = getCategoryCounts();
  const totalActiveAnimals = animals.filter(a => a.status === "Activo").length;
  const uniqueBreeds = [...new Set(animals.map(a => a.breed).filter(Boolean))];
  const categories = ["Ternero", "Ternera", "Novillo", "Vaquillona", "Toro", "Vaca adulta"];

  const getStatusBadge = (status: string) => {
    const variants = {
      "Activo": "default",
      "Vendido": "secondary",
      "Muerto": "destructive"
    };
    return <Badge variant={variants[status as keyof typeof variants] as any}>{status}</Badge>;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Animales</h1>
          <p className="text-muted-foreground">Administra tu ganado y registra información detallada</p>
        </div>
        <div className="flex flex-col space-y-2">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingAnimal(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Animal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background">
            <DialogHeader>
              <DialogTitle>
                {editingAnimal ? "Editar Animal" : "Agregar Nuevo Animal"}
              </DialogTitle>
              <DialogDescription>
                {editingAnimal ? "Modifica la información del animal" : "Registra un nuevo animal en el sistema"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Essential Information Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="id_tag">Identificación *</Label>
                    <Input
                      id="id_tag"
                      value={formData.id_tag}
                      onChange={(e) => setFormData({...formData, id_tag: e.target.value})}
                      placeholder="Número de identificación"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre (opcional)</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Nombre del animal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sex">Sexo *</Label>
                    <Select value={formData.sex} onValueChange={(value) => setFormData({...formData, sex: value})} required>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Seleccionar sexo" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        <SelectItem value="Macho">Macho</SelectItem>
                        <SelectItem value="Hembra">Hembra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breed">Raza *</Label>
                    <Select value={formData.breed} onValueChange={(value) => setFormData({...formData, breed: value})} required>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Seleccionar raza" />
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
                    <Label htmlFor="mocho">Condición de Cuernos</Label>
                    <Select 
                      value={formData.mocho || "Desconocido"} 
                      onValueChange={(value) => setFormData({...formData, mocho: value})}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Seleccionar condición" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-md z-50">
                        {MOCHO_OPTIONS.map((option) => (
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
                     <Label htmlFor="registration_level">Registro</Label>
                     <Select 
                       value={formData.registration_level} 
                       onValueChange={(value) => setFormData({...formData, registration_level: value})}
                     >
                       <SelectTrigger className="bg-background">
                         <SelectValue placeholder="Seleccionar registro" />
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
                    <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="peso_nacimiento">Peso al Nacer (kg)</Label>
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
                    <Label htmlFor="mother_id">Madre (Nombre o ID)</Label>
                    <Input
                      id="mother_id"
                      value={formData.mother_id}
                      onChange={(e) => setFormData({...formData, mother_id: e.target.value})}
                      placeholder="Nombre o ID de la madre"
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
                          <Label className="text-xs text-muted-foreground">Raza de la Madre</Label>
                          <Select value={formData.mother_breed} onValueChange={(value) => setFormData({...formData, mother_breed: value})}>
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Raza" />
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
                            <Label className="text-xs text-muted-foreground">Registro de la Madre</Label>
                            <Select value={formData.mother_registration} onValueChange={(value) => setFormData({...formData, mother_registration: value})}>
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue placeholder="Registro" />
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
                    <Label htmlFor="father_id">Padre (Nombre o ID)</Label>
                    <Input
                      id="father_id"
                      value={formData.father_id}
                      onChange={(e) => setFormData({...formData, father_id: e.target.value})}
                      placeholder="Nombre o ID del padre"
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
                          <Label className="text-xs text-muted-foreground">Raza del Padre</Label>
                          <Select value={formData.father_breed} onValueChange={(value) => setFormData({...formData, father_breed: value})}>
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Raza" />
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
                            <Label className="text-xs text-muted-foreground">Registro del Padre</Label>
                            <Select value={formData.father_registration} onValueChange={(value) => setFormData({...formData, father_registration: value})}>
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue placeholder="Registro" />
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
                  <Label htmlFor="status">Estado</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Vendido">Vendido</SelectItem>
                      <SelectItem value="Muerto">Muerto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Optional Fields Section */}
              <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-2">
                    <span>Campos Adicionales (Opcional)</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showOptionalFields ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                        placeholder="Color del animal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="condicion_corporal">Condición Corporal (1-5)</Label>
                      <Select value={formData.condicion_corporal} onValueChange={(value) => setFormData({...formData, condicion_corporal: value})}>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Seleccionar condición" />
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
                    <Label htmlFor="observaciones">Observaciones Generales</Label>
                    <Textarea
                      id="observaciones"
                      value={formData.observaciones}
                      onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                      placeholder="Notas adicionales sobre el animal..."
                      rows={3}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAnimal ? "Actualizar" : "Agregar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        <AnimalExcelUploadAdvanced
          userCabañaId={userCabaña}
          onUploadComplete={fetchAnimals}
        />
      </div>
    </div>

      <Tabs defaultValue="animals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="animals" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Animales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="animals" className="space-y-4">
          {/* Category Distribution Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📊 Distribución por Categoría</CardTitle>
              <CardDescription>
                Clasificación automática basada en edad y sexo - Total: {totalActiveAnimals} Animales Activos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(categoryCounts).map(([category, count]) => (
                  <div key={category} className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{count}</div>
                    <div className="text-sm text-muted-foreground">{category}{count !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Animales</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{animals.length}</div>
                <p className="text-xs text-muted-foreground">
                  Registrados en el sistema
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Animales Activos</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalActiveAnimals}</div>
                <p className="text-xs text-muted-foreground">
                  En la cabaña actualmente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Razas Registradas</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueBreeds.length}</div>
                <p className="text-xs text-muted-foreground">
                  Diferentes razas
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
        <CardHeader>
          <CardTitle>Lista de Animales</CardTitle>
          <CardDescription>
            Visualiza y gestiona todos los animales registrados
          </CardDescription>
          
          {/* Enhanced Search and Filter Controls */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, ID o raza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col space-y-2">
                <Label className="text-sm font-medium">Categoría</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40 bg-background">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Label className="text-sm font-medium">Raza</Label>
                <Select value={breedFilter} onValueChange={setBreedFilter}>
                  <SelectTrigger className="w-40 bg-background">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="all">Todas las razas</SelectItem>
                    {uniqueBreeds.map((breed) => (
                      <SelectItem key={breed} value={breed}>
                        {breed}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Label className="text-sm font-medium">Estado</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Vendido">Vendido</SelectItem>
                    <SelectItem value="Muerto">Muerto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {(categoryFilter && categoryFilter !== "all" || breedFilter && breedFilter !== "all" || statusFilter && statusFilter !== "all") && (
                <div className="flex flex-col justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setCategoryFilter("all");
                      setBreedFilter("all");
                      setStatusFilter("all");
                    }}
                  >
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAnimals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No se encontraron animales que coincidan con tu búsqueda." : "No hay animales registrados aún."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Raza</TableHead>
                  <TableHead>Fecha de Nacimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnimals.map((animal) => (
                  <>
                    <TableRow key={animal.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpandedRow(animal.id)}
                          className="p-1"
                        >
                          {expandedRows.has(animal.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{getAnimalDisplayName(animal)}</TableCell>
                      <TableCell>{animal.id_tag}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getAgeCategory(animal.birth_date, animal.sex)}
                        </Badge>
                      </TableCell>
                      <TableCell>{animal.breed}</TableCell>
                      <TableCell>
                        {animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell>{getStatusBadge(animal.status)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
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
                        <TableCell colSpan={8} className="p-0">
                           <div className="p-6 bg-muted/20 border-t space-y-6">
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                               {/* Basic Info Recap */}
                               <div className="space-y-3">
                                 <h4 className="font-semibold text-lg">Información Básica</h4>
                                 <div className="grid grid-cols-2 gap-3 text-sm">
                                   <div>
                                     <span className="font-medium">Sexo:</span> {animal.sex}
                                   </div>
                                   <div>
                                     <span className="font-medium">Raza:</span> {animal.breed}
                                   </div>
                                   <div>
                                     <span className="font-medium">Fecha de Nacimiento:</span> {animal.birth_date ? new Date(animal.birth_date).toLocaleDateString() : "N/A"}
                                   </div>
                                   <div>
                                     <span className="font-medium">Estado de Cuernos:</span> {animal.mocho || "N/A"}
                                   </div>
                                   <div>
                                     <span className="font-medium">Peso al Nacer:</span> {animal.peso_nacimiento ? `${animal.peso_nacimiento} kg` : "N/A"}
                                   </div>
                                   <div>
                                     <span className="font-medium">Estado Actual:</span> {animal.status}
                                   </div>
                                    <div>
                                      <span className="font-medium">Color:</span> {animal.color || "N/A"}
                                    </div>
                                    <div>
                                      <span className="font-medium">Condición Corporal:</span> {animal.condicion_corporal || "N/A"}
                                    </div>
                                    <div>
                                      <span className="font-medium">Registro:</span> {animal.registration_level || "N/A"}
                                    </div>
                                 </div>
                                 {animal.observaciones && (
                                   <div className="mt-4">
                                     <span className="font-medium">Observaciones:</span>
                                     <p className="text-sm text-muted-foreground mt-1">{animal.observaciones}</p>
                                   </div>
                                 )}
                               </div>
                               
                                {/* Enhanced Genealogy Tree */}
                                <div className="space-y-3">
                                  <GenealogyTree 
                                    animalId={animal.id}
                                    animalName={animal.name}
                                    animalIdTag={animal.id_tag}
                                  />
                                </div>
                              </div>

                              {/* Registration System for Braford and Brangus */}
                              {(animal.breed === 'Braford' || animal.breed === 'Brangus') && (
                                <div className="space-y-3">
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
                              <div className="space-y-4">
                                <AnimalActivitiesHistory 
                                  animalId={animal.id}
                                  animalName={animal.name || animal.id_tag}
                                />
                              </div>
                              
                              {/* Reproductive Performance Section - Only for females */}
                              {animal.sex === "Hembra" && (
                                <div className="space-y-4">
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
          )}
        </CardContent>
      </Card>
        </TabsContent>

      </Tabs>

      <MarkDeathDialog
        open={showDeathDialog}
        onOpenChange={setShowDeathDialog}
        animal={animalToMarkDead}
        onSuccess={handleDeathSuccess}
      />
    </div>
  );
};

export default Animals;