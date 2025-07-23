import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from "@/components/ui/switch";
import { useInternalProfiles, ProfileRole, InternalProfile } from "@/hooks/useInternalProfiles";
import { toast } from "@/hooks/use-toast";
import { Building2 } from "lucide-react";

interface EditInternalProfileDialogProps {
  profile: InternalProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditInternalProfileDialog = ({ profile, open, onOpenChange }: EditInternalProfileDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { updateProfile } = useInternalProfiles();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;
    
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const updates = {
      full_name: formData.get("full_name") as string,
      email: formData.get("email") as string || undefined,
      employee_code: formData.get("employee_code") as string || undefined,
      position: formData.get("position") as string || undefined,
      department: formData.get("department") as string || undefined,
      hire_date: formData.get("hire_date") as string || undefined,
      role: formData.get("role") as ProfileRole,
      is_active: formData.get("is_active") === "on",
    };

    try {
      const result = await updateProfile(profile.id, updates);
      
      if (result.success) {
        toast({
          title: "Perfil actualizado",
          description: "El perfil interno ha sido actualizado exitosamente.",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Error al actualizar perfil",
          description: "No se pudo actualizar el perfil. Inténtalo de nuevo.",
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>Editar Perfil Interno</DialogTitle>
              <DialogDescription>
                Actualiza la información del perfil de empleado.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {profile && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo*</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={profile.full_name}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_code">Código Empleado</Label>
                <Input
                  id="employee_code"
                  name="employee_code"
                  defaultValue={profile.employee_code || ""}
                  placeholder="Ej: EMP001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Puesto</Label>
                <Input
                  id="position"
                  name="position"
                  defaultValue={profile.position || ""}
                  placeholder="Ej: Veterinario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  name="department"
                  defaultValue={profile.department || ""}
                  placeholder="Ej: Producción"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={profile.email || ""}
                  placeholder="Ej: juan@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hire_date">Fecha de Ingreso</Label>
                <Input
                  id="hire_date"
                  name="hire_date"
                  type="date"
                  defaultValue={profile.hire_date || ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rol en el Sistema*</Label>
              <Select name="role" defaultValue={profile.role || "employee"} required>
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

            <div className="flex items-center space-x-2">
              <Switch 
                id="is_active" 
                name="is_active" 
                defaultChecked={profile.is_active}
              />
              <Label htmlFor="is_active">Perfil activo</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Actualizando..." : "Actualizar Perfil"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};