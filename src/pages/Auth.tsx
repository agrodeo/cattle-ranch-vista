import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, Shield } from "lucide-react";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useSimpleAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Bienvenido!",
        description: "Has accedido al sistema exitosamente.",
      });
      navigate("/dashboard");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">AgroDeo</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Sistema de Gestión Integral de Ganado
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6 p-4 bg-secondary/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Sistema de Acceso Único</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Utiliza las credenciales del sistema para acceder a la gestión de perfiles internos.
            </p>
            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Usuario:</strong> admin@agrodeo.com</p>
              <p><strong>Contraseña:</strong> password</p>
            </div>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email del Sistema</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@agrodeo.com"
                defaultValue="admin@agrodeo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña del Sistema</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Ingresa la contraseña del sistema"
                defaultValue="password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Acceder al Sistema
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;