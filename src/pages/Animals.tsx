import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
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
import { Plus, Search, Edit, Trash2, Users, Calendar, MapPin, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Animal {
  id: string;
  name?: string;
  id_tag: string;
  sex: string;
  breed: string;
  birth_date: string;
  status: string;
  mother_id?: string;
  father_id?: string;
  cabaña_id: string;
  peso_nacimiento?: number;
  mocho?: string;
  color?: string;
  condicion_corporal?: string;
  observaciones?: string;
}

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

const Animals = () => {
  const { user } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [cabañas, setCabañas] = useState<Cabaña[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [userCabaña, setUserCabaña] = useState<string>("");
  const [parentAnimals, setParentAnimals] = useState<ParentAnimal[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    id_tag: "",
    sex: "",
    breed: "",
    birth_date: "",
    status: "Activo",
    mother_id: "",
    father_id: "",
    cabaña_id: "",
    peso_nacimiento: "",
    mocho: "",
    color: "",
    condicion_corporal: "",
    observaciones: ""
  });

  useEffect(() => {
    fetchAnimals();
    fetchCabañas();
    fetchUserCabaña();
  }, [user]);

  const fetchUserCabaña = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      setUserCabaña(data?.cabaña_id || "");
    } catch (error) {
      console.error("Error fetching user cabaña:", error);
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

  const fetchAnimals = async () => {
    try {
      const { data, error } = await supabase
        .from("animals")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setAnimals(data || []);
    } catch (error) {
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
      // Look up parent animals by their id_tag values
      let motherUUID = null;
      let fatherUUID = null;

      if (formData.mother_id) {
        const { data: motherData } = await supabase
          .from("animals")
          .select("id")
          .eq("id_tag", formData.mother_id)
          .eq("cabaña_id", editingAnimal ? formData.cabaña_id : userCabaña)
          .eq("sex", "Hembra")
          .single();
        
        motherUUID = motherData?.id || null;
      }

      if (formData.father_id) {
        const { data: fatherData } = await supabase
          .from("animals")
          .select("id")
          .eq("id_tag", formData.father_id)
          .eq("cabaña_id", editingAnimal ? formData.cabaña_id : userCabaña)
          .eq("sex", "Macho")
          .single();
        
        fatherUUID = fatherData?.id || null;
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
        cabaña_id: editingAnimal ? formData.cabaña_id : userCabaña,
        peso_nacimiento: formData.peso_nacimiento ? parseFloat(formData.peso_nacimiento) : null,
        mocho: formData.mocho || null,
        color: formData.color || null,
        condicion_corporal: formData.condicion_corporal || null,
        observaciones: formData.observaciones || null,
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
      cabaña_id: animal.cabaña_id || "",
      peso_nacimiento: animal.peso_nacimiento?.toString() || "",
      mocho: animal.mocho || (animal.breed && HORNED_BREEDS.includes(animal.breed) ? "Desconocido" : ""),
      color: animal.color || "",
      condicion_corporal: animal.condicion_corporal || "",
      observaciones: animal.observaciones || ""
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
      cabaña_id: "",
      peso_nacimiento: "",
      mocho: "",
      color: "",
      condicion_corporal: "",
      observaciones: ""
    });
    setShowOptionalFields(false);
  };

  const filteredAnimals = animals.filter(animal =>
    animal.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    animal.id_tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    animal.breed?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                    <Label htmlFor="mother_id">Madre (ID de Identificación)</Label>
                    <Input
                      id="mother_id"
                      value={formData.mother_id}
                      onChange={(e) => setFormData({...formData, mother_id: e.target.value})}
                      placeholder="Ingrese ID de la madre"
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="father_id">Padre (ID de Identificación)</Label>
                    <Input
                      id="father_id"
                      value={formData.father_id}
                      onChange={(e) => setFormData({...formData, father_id: e.target.value})}
                      placeholder="Ingrese ID del padre"
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
      </div>

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
            <div className="text-2xl font-bold">
              {animals.filter(a => a.status === "Activo").length}
            </div>
            <p className="text-xs text-muted-foreground">
              En la cabaña actualmente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cabañas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cabañas.length}</div>
            <p className="text-xs text-muted-foreground">
              Ubicaciones registradas
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
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, ID o raza..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Raza</TableHead>
                  <TableHead>Fecha de Nacimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnimals.map((animal) => (
                  <TableRow key={animal.id}>
                    <TableCell className="font-medium">{animal.name}</TableCell>
                    <TableCell>{animal.id_tag}</TableCell>
                    <TableCell>{animal.sex}</TableCell>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Animals;