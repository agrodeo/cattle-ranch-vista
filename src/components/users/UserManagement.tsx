import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Users, UserCheck, UserX, Key, Eye, EyeOff, Ban, Check } from "lucide-react";
import { useUserRoles, UserWithRole } from "@/hooks/useUserRoles";
import { CreateUserDialog } from "./CreateUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { PasswordManagementDialog } from "./PasswordManagementDialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function UserManagement() {
  const { users, loading, isAdmin, fetchUsers, deleteUser, updateUser, getUserPassword, changeUserPassword } = useUserRoles();
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserWithRole | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [loadingPasswords, setLoadingPasswords] = useState<Record<string, boolean>>({});
  const [updatingUsers, setUpdatingUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  useEffect(() => {
    if (isAdmin && users.length > 0) {
      loadAllPasswords();
    }
  }, [users]);

  const loadAllPasswords = async () => {
    if (!isAdmin || users.length === 0) return;
    
    const passwords: Record<string, string> = {};
    const loadingStates: Record<string, boolean> = {};
    
    for (const user of users) {
      loadingStates[user.id] = true;
    }
    setLoadingPasswords(loadingStates);
    
    for (const user of users) {
      try {
        const result = await getUserPassword(user.id);
        if (result.success && result.password) {
          passwords[user.id] = result.password;
        }
      } catch (error) {
        console.error(`Error loading password for user ${user.id}:`, error);
      } finally {
        setLoadingPasswords(prev => ({ ...prev, [user.id]: false }));
      }
    }
    
    setUserPasswords(passwords);
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleToggleUserStatus = async (user: UserWithRole) => {
    setUpdatingUsers(prev => ({ ...prev, [user.id]: true }));
    
    try {
      const result = await updateUser(user.id, {
        is_active: !user.is_active
      });
      
      if (result?.success) {
        toast({
          title: "Estado actualizado",
          description: `El usuario ha sido ${!user.is_active ? 'activado' : 'desactivado'} exitosamente.`,
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado del usuario.",
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
      setUpdatingUsers(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: UserWithRole) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handlePasswordManagement = (user: UserWithRole) => {
    setPasswordUser(user);
    setPasswordDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteUser(userToDelete.id);
      
      if (result?.success) {
        toast({
          title: "Usuario eliminado",
          description: "El usuario ha sido eliminado exitosamente.",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo eliminar el usuario. Inténtalo de nuevo.",
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
      setUserToDelete(null);
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
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.is_active).length;
    const inactiveUsers = totalUsers - activeUsers;
    
    return { totalUsers, activeUsers, inactiveUsers };
  };

  const stats = getStats();

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acceso Denegado</CardTitle>
          <CardDescription>
            No tienes permisos para acceder a la gestión de usuarios.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Inactivos</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactiveUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>
                Administra los usuarios del sistema y sus permisos.
              </CardDescription>
            </div>
            <CreateUserDialog />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Cargando usuarios...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No hay usuarios registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Contraseña</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || "Sin nombre"}
                    </TableCell>
                    <TableCell>{user.email || "Sin email"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-48">
                        {loadingPasswords[user.id] ? (
                          <span className="text-muted-foreground">Cargando...</span>
                        ) : userPasswords[user.id] ? (
                          <>
                            <Input
                              type={visiblePasswords[user.id] ? "text" : "password"}
                              value={userPasswords[user.id]}
                              readOnly
                              className="text-xs"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePasswordVisibility(user.id)}
                              title={visiblePasswords[user.id] ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                              {visiblePasswords[user.id] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        ) : (
                          <span className="text-muted-foreground">No disponible</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_login
                        ? format(new Date(user.last_login), "dd/MM/yyyy HH:mm", { locale: es })
                        : "Nunca"
                      }
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                     <TableCell className="text-right">
                       <div className="flex justify-end gap-1">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleEditUser(user)}
                           title="Editar usuario"
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handlePasswordManagement(user)}
                           title="Cambiar contraseña"
                         >
                           <Key className="h-4 w-4" />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleToggleUserStatus(user)}
                           disabled={updatingUsers[user.id]}
                           title={user.is_active ? "Desactivar usuario" : "Activar usuario"}
                         >
                           {updatingUsers[user.id] ? (
                             <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                           ) : user.is_active ? (
                             <Ban className="h-4 w-4" />
                           ) : (
                             <Check className="h-4 w-4" />
                           )}
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => handleDeleteUser(user)}
                           title="Eliminar usuario"
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
      <EditUserDialog
        user={editingUser}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Password Management Dialog */}
      <PasswordManagementDialog
        user={passwordUser}
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario
              "{userToDelete?.full_name}" y todos sus datos asociados.
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