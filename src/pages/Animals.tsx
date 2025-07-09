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
import { Plus, Search, Edit, Trash2, Users, Calendar, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Animal {
  id: string;
  name: string;
  id_tag: string;
  sex: string;
  breed: string;
  birth_date: string;
  status: string;
  mother_id?: string;
  father_id?: string;
  cabaña_id: string;
}

interface Cabaña {
  id: string;
  name: string;
  location: string;
}

const Animals = () => {
  const { user } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [cabañas, setCabañas] = useState<Cabaña[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    id_tag: "",
    sex: "",
    breed: "",
    birth_date: "",
    status: "Activo",
    mother_id: "",
    father_id: "",
    cabaña_id: ""
  });

  useEffect(() => {
    fetchAnimals();
    fetchCabañas();
  }, []);

  const fetchAnimals = async () => {
    try {
      const { data, error } = await supabase
        .from("animals")
        .select("*")
        .order("created_at", { ascending: false });

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
    
    try {
      if (editingAnimal) {
        const { error } = await supabase
          .from("animals")
          .update(formData)
          .eq("id", editingAnimal.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Animal actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from("animals")
          .insert([formData]);

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

  const handleEdit = (animal: Animal) => {
    setEditingAnimal(animal);
    setFormData({
      name: animal.name || "",
      id_tag: animal.id_tag || "",
      sex: animal.sex || "",
      breed: animal.breed || "",
      birth_date: animal.birth_date || "",
      status: animal.status || "Activo",
      mother_id: animal.mother_id || "",
      father_id: animal.father_id || "",
      cabaña_id: animal.cabaña_id || ""
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
      cabaña_id: ""
    });
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Nombre del animal"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id_tag">Identificación</Label>
                  <Input
                    id="id_tag"
                    value={formData.id_tag}
                    onChange={(e) => setFormData({...formData, id_tag: e.target.value})}
                    placeholder="Número de identificación"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sex">Sexo</Label>
                  <Select value={formData.sex} onValueChange={(value) => setFormData({...formData, sex: value})}>
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
                  <Label htmlFor="breed">Raza</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => setFormData({...formData, breed: e.target.value})}
                    placeholder="Raza del animal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                  />
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

              <div className="space-y-2">
                <Label htmlFor="cabaña_id">Cabaña</Label>
                <Select value={formData.cabaña_id} onValueChange={(value) => setFormData({...formData, cabaña_id: value})}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccionar cabaña" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    {cabañas.map((cabaña) => (
                      <SelectItem key={cabaña.id} value={cabaña.id}>
                        {cabaña.name} - {cabaña.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
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