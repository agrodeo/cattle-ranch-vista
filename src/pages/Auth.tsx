import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useHybridAuth } from "@/hooks/useHybridAuth";
import { useLocationAwareVaccination } from "@/hooks/useLocationAwareVaccination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, Shield, UserPlus, Mail, User } from "lucide-react";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [countries, setCountries] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  
  const { signInAdmin, signInEmployee, signUp, isAuthenticated } = useHybridAuth();
  const { getJurisdictions, jurisdictionsLoading } = useLocationAwareVaccination();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const loadJurisdictions = async () => {
      try {
        const jurisdictions = await getJurisdictions();
        
        // Filter for countries only (parent_code is null)
        const countryJurisdictions = jurisdictions.filter((j: any) => !j.parent_code);
        
        // Map countries with proper code and name
        const uniqueCountries = countryJurisdictions.map((j: any) => ({
          code: j.code,
          name: j.name
        })).sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        setCountries(uniqueCountries);
      } catch (error) {
        console.error('Error loading jurisdictions:', error);
      }
    };

    loadJurisdictions();
  }, [getJurisdictions]);

  useEffect(() => {
    const loadRegions = async () => {
      if (!selectedCountry) {
        setRegions([]);
        setSelectedRegion("");
        return;
      }
      
      setIsLoadingRegions(true);
      
      try {
        const jurisdictions = await getJurisdictions();
        
        // Filter regions for selected country (has parent_code = selectedCountry)
        const countryRegions = jurisdictions.filter((j: any) => 
          j.parent_code === selectedCountry
        ).sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        setRegions(countryRegions);
      } catch (error) {
        console.error('Error loading regions:', error);
        setRegions([]);
      } finally {
        setIsLoadingRegions(false);
      }
    };

    loadRegions();
  }, [selectedCountry, getJurisdictions]);

  // Clear region when country changes
  useEffect(() => {
    setSelectedRegion("");
  }, [selectedCountry]);

  const handleAdminSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
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
        title: "¡Bienvenido!",
        description: "Has iniciado sesión exitosamente.",
      });
      navigate("/dashboard");
    }
    
    setLoading(false);
  };

  const handleEmployeeSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
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
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const companyName = formData.get("companyName") as string;
      const ownerName = formData.get("ownerName") as string;
      const email = formData.get("email") as string;
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      if (password !== confirmPassword) {
        toast({
          title: "Error",
          description: "Las contraseñas no coinciden",
          variant: "destructive",
        });
        return;
      }

      if (!selectedCountry) {
        toast({
          title: "Error",
          description: "Debes seleccionar un país",
          variant: "destructive",
        });
        return;
      }

      const { error } = await signUp(
        companyName, 
        ownerName, 
        email,
        username, 
        password, 
        selectedCountry, 
        selectedRegion || null
      );
      
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
    } catch (error) {
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error inesperado. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
                <Shield className="h-4 w-4" />
                Admin
              </TabsTrigger>
              <TabsTrigger value="employee" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Empleado
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Registrar Empresa
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4 mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Para administradores de cabañas
              </div>
              <form onSubmit={handleAdminSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    name="email"
                    type="email"
                    placeholder="admin@cabaña.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Contraseña</Label>
                  <Input
                    id="admin-password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión como Admin
                </Button>
                <div className="mt-3 text-center text-sm">
                  <Link to="/forgot-password" className="text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="employee" className="space-y-4 mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Para empleados de la cabaña
              </div>
              <form onSubmit={handleEmployeeSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-username">Usuario</Label>
                  <Input
                    id="employee-username"
                    name="username"
                    type="text"
                    placeholder="nombre_usuario"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-password">Contraseña</Label>
                  <Input
                    id="employee-password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión como Empleado
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Crear una nueva empresa/cabaña
              </div>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    placeholder="Cabaña Los Alamos"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Nombre del Propietario</Label>
                  <Input
                    id="ownerName"
                    name="ownerName"
                    type="text"
                    placeholder="Juan Pérez"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@cabaña.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País *</Label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry} required disabled={jurisdictionsLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder={jurisdictionsLoading ? "Cargando países..." : "Selecciona un país"} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCountry === 'AR' && (
                  <div className="space-y-2">
                    <Label htmlFor="region">Provincia/Estado</Label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion} disabled={isLoadingRegions}>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          isLoadingRegions 
                            ? "Cargando regiones..." 
                            : regions.length > 0 
                            ? "Selecciona una región (opcional)" 
                            : "No hay regiones disponibles"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((region) => (
                          <SelectItem key={region.code} value={region.code}>
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="juan_perez"
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
                <Button type="submit" className="w-full" disabled={loading || jurisdictionsLoading}>
                  {(loading || jurisdictionsLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Empresa
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