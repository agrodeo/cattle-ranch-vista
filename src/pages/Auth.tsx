import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useHybridAuth } from "@/hooks/useHybridAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, Shield, UserPlus, Mail } from "lucide-react";

const Auth = () => {
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { signInAdmin, signInEmployee, signUp } = useHybridAuth();
  const navigate = useNavigate();

  const handleAdminSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoadingAdmin(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signInAdmin(email, password);
    
    if (error) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Bienvenido Administrador!",
        description: "Has iniciado sesión exitosamente.",
      });
      navigate("/dashboard");
    }
    
    setIsLoadingAdmin(false);
  };

  const handleEmployeeSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoadingEmployee(true);
    
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    const { error } = await signInEmployee(username, password);
    
    if (error) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente.",
      });
      navigate("/dashboard");
    }
    
    setIsLoadingEmployee(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsRegistering(true);
    
    const formData = new FormData(e.currentTarget);
    const companyName = formData.get("companyName") as string;
    const ownerName = formData.get("ownerName") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      setIsRegistering(false);
      return;
    }

    const { error } = await signUp(companyName, ownerName, username, password);
    
    if (error) {
      toast({
        title: "Error al crear la cuenta",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Cuenta creada!",
        description: "Tu empresa ha sido registrada exitosamente.",
      });
      navigate("/dashboard");
    }
    
    setIsRegistering(false);
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
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Admin
              </TabsTrigger>
              <TabsTrigger value="employee" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Empleado
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Registrarse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4 mt-6">
              <div className="p-4 bg-secondary/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Acceso de Administradores</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ingresa con tu email y contraseña registrados.
                </p>
              </div>

              <form onSubmit={handleAdminSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    name="email"
                    type="email"
                    placeholder="tu-email@ejemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Contraseña</Label>
                  <Input
                    id="admin-password"
                    name="password"
                    type="password"
                    placeholder="Tu contraseña"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoadingAdmin}>
                  {isLoadingAdmin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión como Admin
                </Button>
                <div className="mt-3 text-right text-sm">
                  <Link to="/forgot-password" className="text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="employee" className="space-y-4 mt-6">
              <div className="p-4 bg-secondary/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Acceso de Empleados</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ingresa con tu nombre de usuario y contraseña.
                </p>
              </div>

              <form onSubmit={handleEmployeeSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-username">Usuario</Label>
                  <Input
                    id="employee-username"
                    name="username"
                    type="text"
                    placeholder="Nombre de usuario"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-password">Contraseña</Label>
                  <Input
                    id="employee-password"
                    name="password"
                    type="password"
                    placeholder="Tu contraseña personal"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoadingEmployee}>
                  {isLoadingEmployee && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-6">
              <div className="p-4 bg-secondary/50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Registro de Nueva Empresa</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Crea tu cuenta empresarial y comienza a gestionar tu ganado.
                </p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    placeholder="Nombre de tu empresa o cabaña"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Nombre del Propietario</Label>
                  <Input
                    id="ownerName"
                    name="ownerName"
                    type="text"
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de Usuario</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Nombre de usuario único"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Repite tu contraseña"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isRegistering}>
                  {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Cuenta Empresarial
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;