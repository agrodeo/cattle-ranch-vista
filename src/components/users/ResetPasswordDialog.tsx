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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";
import { InternalProfile } from "@/hooks/useInternalProfiles";

interface ResetPasswordDialogProps {
  profile: InternalProfile;
  onPasswordReset: () => void;
}

export const ResetPasswordDialog = ({ profile, onPasswordReset }: ResetPasswordDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("password") as string;

    try {
      // Use edge function to securely hash and store password
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'change_password',
          userId: profile.id,
          newPassword: newPassword,
          requesterId: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message || 'Failed to update password');

      toast({
        title: "Contraseña actualizada",
        description: `La contraseña de ${profile.full_name} ha sido actualizada exitosamente.`,
      });
      
      setOpen(false);
      onPasswordReset();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la contraseña. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Restablecer Contraseña</DialogTitle>
          <DialogDescription>
            Establece una nueva contraseña para {profile.full_name}.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Ingresa la nueva contraseña"
              required
              minLength={6}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Actualizando..." : "Actualizar Contraseña"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};