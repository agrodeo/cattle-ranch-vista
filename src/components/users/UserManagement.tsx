import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Users, UserCheck, UserX, Briefcase, Ban, Check, Building2 } from "lucide-react";
import { useInternalProfiles, InternalProfile } from "@/hooks/useInternalProfiles";
import { CreateInternalProfileDialog } from "./CreateInternalProfileDialog";
import { EditInternalProfileDialog } from "./EditInternalProfileDialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function UserManagement() {
  const { profiles, loading, updateProfile, deleteProfile } = useInternalProfiles();
  
  const [editingProfile, setEditingProfile] = useState<InternalProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<InternalProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingProfiles, setUpdatingProfiles] = useState<Record<string, boolean>>({});

  const handleToggleProfileStatus = async (profile: InternalProfile) => {
    setUpdatingProfiles(prev => ({ ...prev, [profile.id]: true }));
    
    try {
      const result = await updateProfile(profile.id, {
        is_active: !profile.is_active
      });
      
      if (result?.success) {
        toast({
          title: "Estado actualizado",
          description: `El perfil ha sido ${!profile.is_active ? 'activado' : 'desactivado'} exitosamente.`,
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado del perfil.",
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
      setUpdatingProfiles(prev => ({ ...prev, [profile.id]: false }));
    }
  };

  const handleEditProfile = (profile: InternalProfile) => {
    setEditingProfile(profile);
    setEditDialogOpen(true);
  };

  const handleDeleteProfile = (profile: InternalProfile) => {
    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!profileToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteProfile(profileToDelete.id);
      
      if (result?.success) {
        toast({
          title: "Perfil eliminado",
          description: "El perfil interno ha sido eliminado exitosamente.",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo eliminar el perfil. Inténtalo de nuevo.",
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
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setProfileToDelete(null);
    }
  };

  const getRoleDisplayName = (role?: string) => {
    const roleNames = {
      admin: "Administrador",
      employee: "Empleado",
      read_only: "Solo lectura"
    };
    return roleNames[role as keyof typeof roleNames] || "Sin rol";
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'employee':
        return 'default';
      case 'read_only':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStats = () => {
    const totalProfiles = profiles.length;
    const activeProfiles = profiles.filter(profile => profile.is_active).length;
    const inactiveProfiles = totalProfiles - activeProfiles;
    
    return { totalProfiles, activeProfiles, inactiveProfiles };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Gestión de Perfiles Internos</CardTitle>
              <CardDescription>
                Sistema de login único con perfiles de empleados sin autenticación individual
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Perfiles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProfiles}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perfiles Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeProfiles}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perfiles Inactivos</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactiveProfiles}</div>
          </CardContent>
        </Card>
      </div>

      {/* Profiles Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Perfiles de Empleados</CardTitle>
              <CardDescription>
                Gestiona los perfiles internos de empleados del sistema.
              </CardDescription>
            </div>
            <CreateInternalProfileDialog />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Cargando perfiles...</div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No hay perfiles registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código Empleado</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.full_name || "Sin nombre"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                        {profile.employee_code || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{profile.position || "-"}</TableCell>
                    <TableCell>{profile.department || "-"}</TableCell>
                    <TableCell>{profile.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(profile.role)}>
                        {getRoleDisplayName(profile.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.is_active ? "default" : "secondary"}>
                        {profile.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {profile.hire_date
                        ? format(new Date(profile.hire_date), "dd/MM/yyyy", { locale: es })
                        : "-"
                      }
                    </TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-1">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleEditProfile(profile)}
                           title="Editar perfil"
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleToggleProfileStatus(profile)}
                           disabled={updatingProfiles[profile.id]}
                           title={profile.is_active ? "Desactivar perfil" : "Activar perfil"}
                         >
                           {updatingProfiles[profile.id] ? (
                             <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                           ) : profile.is_active ? (
                             <Ban className="h-4 w-4" />
                           ) : (
                             <Check className="h-4 w-4" />
                           )}
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleDeleteProfile(profile)}
                           title="Eliminar perfil"
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

      {/* Edit Dialog */}
      <EditInternalProfileDialog
        profile={editingProfile}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el perfil
              "{profileToDelete?.full_name}" y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}