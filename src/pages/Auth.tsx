import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCountries } from "@/hooks/useCountries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, Mail, UserPlus } from "lucide-react";

const Auth = () => {
  // Separate loading states
  const [loading, setLoading] = useState(false); // For sign in form
  const [isSubmitting, setIsSubmitting] = useState(false); // For register form submission
  const [activeTab, setActiveTab] = useState("signin");
  
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [regions, setRegions] = useState<any[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  
  // Use centralized countries hook
  const { countries, isLoadingCountries, countriesError } = useCountries();
  
  // DEBUG: Log state changes to track the issue
  useEffect(() => {
    console.log('🔍 Country loading state changed:', {
      isLoadingCountries,
      countriesError: !!countriesError,
      countriesCount: countries.length,
      selectedCountry,
      timestamp: new Date().toISOString()
    });
  }, [isLoadingCountries, countriesError, countries.length, selectedCountry]);
  
  const { signIn, signUp, isAuthenticated } = useSupabaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Show error toast if countries failed to load but we have fallback
  useEffect(() => {
    if (countriesError && countries.length > 0) {
      toast({
        title: "Advertencia",
        description: "No se pudieron cargar todos los países. Usando lista predeterminada.",
        variant: "default",
      });
    }
  }, [countriesError, countries.length]);

  useEffect(() => {
    const loadRegions = async () => {
      if (!selectedCountry) {
        setRegions([]);
        setSelectedRegion("");
        return;
      }
      
      setIsLoadingRegions(true);
      
      try {
        const { data: jurisdictions, error } = await supabase
          .from('jurisdictions')
          .select('*')
          .eq('parent_code', selectedCountry)
          .order('name');
        
        if (error) throw error;
        
        // Filter regions for selected country (has parent_code = selectedCountry)
        const countryRegions = jurisdictions?.filter((j: any) => 
          j.parent_code === selectedCountry
        ).sort((a: any, b: any) => a.name.localeCompare(b.name)) || [];
        
        setRegions(countryRegions);
      } catch (error) {
        console.error('Error loading regions:', error);
        setRegions([]);
      } finally {
        setIsLoadingRegions(false);
      }
    };

    loadRegions();
  }, [selectedCountry]);

  // Clear region when country changes
  useEffect(() => {
    setSelectedRegion("");
  }, [selectedCountry]);

  // Reset form states on tab change
  useEffect(() => {
    setIsSubmitting(false);
    setSelectedCountry("");
    setSelectedRegion("");
  }, [activeTab]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
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
        description: "Has iniciado sesión exitosamente.",
      });
      navigate("/dashboard");
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const companyName = formData.get("companyName") as string;
      const ownerName = formData.get("ownerName") as string;
      const email = formData.get("email") as string;
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
        email,
        password,
        ownerName,
        companyName,
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
          description: "Tu empresa ha sido registrada exitosamente. Revisa tu email para confirmar tu cuenta.",
        });
      }
    } catch (error) {
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error inesperado. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin" className="flex items-center gap-2" type="button">
                <Mail className="h-4 w-4" />
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2" type="button">
                <UserPlus className="h-4 w-4" />
                Registrar Empresa
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Ingresa con tu email y contraseña
              </div>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Contraseña</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión
                </Button>
                <div className="mt-3 text-center text-sm">
                  <Link to="/forgot-password" className="text-primary hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Crear una nueva empresa/cabaña
              </div>
              <form 
                onSubmit={handleSignUp} 
                className="space-y-4"
                style={{ pointerEvents: 'auto' }} // Ensure form is never blocked
              >
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
                  
                  {/* Force clean remount with different keys */}
                  {isLoadingCountries ? (
                    <Select key="loading-countries" disabled value="">
                      <SelectTrigger id="country" className="cursor-wait">
                        <SelectValue placeholder="Cargando países..." />
                      </SelectTrigger>
                    </Select>
                  ) : countriesError && countries.length === 0 ? (
                    <Input
                      key="error-countries"
                      id="countryText"
                      name="countryText"
                      type="text"
                      placeholder="Escribe tu país manualmente"
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      required
                      className="cursor-text"
                    />
                  ) : (
                    <Select
                      key="ready-countries"
                      value={selectedCountry}
                      onValueChange={setSelectedCountry}
                      required
                      disabled={false}
                    >
                      <SelectTrigger 
                        id="country"
                        forceEnabled={!isLoadingCountries}
                      >
                        <SelectValue placeholder="Selecciona un país" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {/* DEBUG: Native select fallback for testing */}
                  {process.env.NODE_ENV === 'development' && !isLoadingCountries && !countriesError && countries.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">🔧 Debug: Native Select</summary>
                      <select 
                        id="countryNative" 
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)} 
                        className="w-full mt-1 p-2 border rounded cursor-default"
                      >
                        <option value="">Selecciona país (nativo)...</option>
                        {countries.map(c => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </details>
                  )}
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
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Creando..." : "Crear Empresa"}
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