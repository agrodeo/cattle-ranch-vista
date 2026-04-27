import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { useRanchUsers } from "@/hooks/useRanchUsers";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const { createUser, isCreating } = useRanchUsers();
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("worker");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string } | null>(null);

  const isOwner = currentUser?.role === "owner" || currentUser?.role === "admin";

  const generatePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pwd = "";
    for (let i = 0; i < 10; i += 1) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    setPassword(pwd);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser({ email, fullName, password, role, position, phone });
      setCreatedUser({ email, password });
    } catch {
      // Handled by hook toast.
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdUser) return;
    await navigator.clipboard.writeText(`Email: ${createdUser.email}\nContraseña: ${createdUser.password}`);
    setCopied(true);
    toast({ title: "Credenciales copiadas" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail("");
    setFullName("");
    setPassword("");
    setRole("worker");
    setPosition("");
    setPhone("");
    setShowPassword(false);
    setCreatedUser(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto overflow-x-hidden sm:max-w-xl">
        {createdUser ? (
          <>
            <DialogHeader>
              <DialogTitle>Usuario creado</DialogTitle>
              <DialogDescription>
                Comparte estas credenciales con el nuevo usuario para que pueda iniciar sesión.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <div>
                <p className="font-medium text-foreground">Email:</p>
                <p className="break-all text-muted-foreground">{createdUser.email}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Contraseña:</p>
                <p className="break-all font-mono text-foreground">{createdUser.password}</p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleCopyCredentials}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar credenciales"}
              </Button>
              <Button type="button" onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Agregar usuario</DialogTitle>
              <DialogDescription>
                Crea una cuenta para un nuevo miembro del establecimiento. Podrá iniciar sesión inmediatamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="new-user-name">Nombre completo *</Label>
                <Input id="new-user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Pérez" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-email">Email *</Label>
                <Input id="new-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@ejemplo.com" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-password">Contraseña *</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Input
                      id="new-user-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="button" variant="outline" onClick={generatePassword}>Generar</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {isOwner && <SelectItem value="manager">Gerente — Gestiona datos y usuarios</SelectItem>}
                    <SelectItem value="worker">Trabajador — Operaciones diarias</SelectItem>
                    <SelectItem value="vet">Veterinario — Salud y reproducción</SelectItem>
                    <SelectItem value="read_only">Solo lectura — Solo puede ver datos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-user-position">Cargo</Label>
                  <Input id="new-user-position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Ej: Veterinario" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-phone">Teléfono</Label>
                  <Input id="new-user-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9..." />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear usuario
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
