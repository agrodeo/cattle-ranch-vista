import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInternalProfiles, ProfileRole } from "@/hooks/useInternalProfiles";
import { toast } from "@/hooks/use-toast";
import { UserPlus, Building2 } from "lucide-react";

export const CreateInternalProfileDialog = () => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { createProfile } = useInternalProfiles();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const profileData = {
      username: formData.get("username") as string,
      full_name: formData.get("full_name") as string || undefined,
      position: formData.get("position") as string || undefined,
      department: formData.get("department") as string || undefined,
      role: formData.get("role") as ProfileRole,
      password: formData.get("password") as string,
    };

    try {
      const result = await createProfile(profileData);
      
      if (result.success) {
        toast({
          title: "Empleado creado",
          description: "El empleado ha sido creado exitosamente y puede iniciar sesión.",
        });
        setOpen(false);
        // Reset form
        (e.target as HTMLFormElement).reset();
      } else {
        toast({
          title: "Error al crear empleado",
          description: "No se pudo crear el empleado. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Crear Empleado
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>Crear Empleado</DialogTitle>
              <DialogDescription>
                Crea un nuevo empleado con acceso al sistema de gestión.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario*</Label>
              <Input
                id="username"
                name="username"
                placeholder="Ej: jperez"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre Completo</Label>
              <Input
                id="full_name"
                name="full_name"
                placeholder="Ej: Juan Pérez (opcional)"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Puesto</Label>
              <Input
                id="position"
                name="position"
                placeholder="Ej: Veterinario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                name="department"
                placeholder="Ej: Producción"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña*</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Contraseña para el empleado"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol en el Sistema*</Label>
              <Select name="role" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="employee">Empleado</SelectItem>
                  <SelectItem value="read_only">Solo lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>


          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear Empleado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};