import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Key, Save, Shield } from "lucide-react";
import { useUserRoles, UserWithRole } from "@/hooks/useUserRoles";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PasswordManagementDialogProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordManagementDialog({ user, open, onOpenChange }: PasswordManagementDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { changeUserPassword } = useUserRoles();

  const handleChangePassword = async () => {
    if (!user || !newPassword.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa una nueva contraseña.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await changeUserPassword(user.id, newPassword);
      
      if (result.success) {
        toast({
          title: "Contraseña actualizada",
          description: "La contraseña ha sido cambiada exitosamente.",
        });
        setNewPassword("");
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: "No se pudo cambiar la contraseña.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al cambiar la contraseña.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNewPassword("");
      setShowNewPassword(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Gestionar Contraseña - {user?.full_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Por motivos de seguridad, las contraseñas están cifradas y no pueden ser visualizadas. 
              Solo puedes establecer una nueva contraseña.
            </AlertDescription>
          </Alert>

          {/* Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="new-password">Nueva Contraseña</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ingresa la nueva contraseña"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={loading || !newPassword.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Guardando..." : "Cambiar Contraseña"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}