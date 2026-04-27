import { useState } from "react";
import { Loader2, Shield, UserPlus, Users } from "lucide-react";
import { useRanchUsers } from "@/hooks/useRanchUsers";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CreateUserDialog } from "./CreateUserDialog";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  manager: "Gerente",
  worker: "Trabajador",
  vet: "Veterinario",
  read_only: "Solo lectura",
  admin: "Propietario",
  employee: "Trabajador",
};

const ROLE_BADGES: Record<string, string> = {
  owner: "border-primary/30 bg-primary/10 text-primary",
  manager: "border-accent/40 bg-accent/20 text-accent-foreground",
  worker: "border-primary/20 bg-primary/10 text-primary",
  vet: "border-accent/40 bg-accent/20 text-accent-foreground",
  read_only: "border-muted bg-muted text-muted-foreground",
  admin: "border-primary/30 bg-primary/10 text-primary",
  employee: "border-primary/20 bg-primary/10 text-primary",
};

export function UserManagement() {
  const { users, isLoading, toggleUserActive, updateUserRole } = useRanchUsers();
  const { currentUser } = useSupabaseAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const isOwner = currentUser?.role === "owner" || currentUser?.role === "admin";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden border-0 shadow-sm sm:border sm:shadow-md">
        <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between sm:pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Usuarios del establecimiento</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {users.length} usuario{users.length !== 1 ? "s" : ""} en tu establecimiento
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} size="sm" className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Agregar usuario</span>
            <span className="sm:hidden">Agregar</span>
          </Button>
        </CardHeader>

        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="divide-y divide-border">
            {users.map((user) => {
              const isCurrentUser = user.user_id === currentUser?.id;
              const isProtectedOwner = user.role === "owner" || user.role === "admin";

              return (
                <div key={user.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
                      {(user.full_name || user.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-foreground">{user.full_name || user.email}</p>
                        {isCurrentUser && <span className="text-xs text-muted-foreground">(tú)</span>}
                        {!user.is_active && <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                      {user.position && <p className="truncate text-xs text-muted-foreground">{user.position}</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    {isCurrentUser || isProtectedOwner || !isOwner ? (
                      <Badge variant="outline" className={ROLE_BADGES[user.role] || ""}>
                        <Shield className="mr-1 h-3 w-3" />
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    ) : (
                      <Select value={user.role} onValueChange={(newRole) => updateUserRole({ userId: user.user_id, role: newRole })}>
                        <SelectTrigger className="h-9 w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Gerente</SelectItem>
                          <SelectItem value="worker">Trabajador</SelectItem>
                          <SelectItem value="vet">Veterinario</SelectItem>
                          <SelectItem value="read_only">Solo lectura</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {!isCurrentUser && !isProtectedOwner && (
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={(checked) => toggleUserActive({ userId: user.user_id, isActive: checked })}
                        aria-label={user.is_active ? "Desactivar usuario" : "Activar usuario"}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {users.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-0">
                No hay usuarios cargados. Agrega el primer usuario.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CreateUserDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </>
  );
}
