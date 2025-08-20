import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
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
  const [isLoadingCountries, setIsLoadingCountries] = useState(true); // For country loading
  const [activeTab, setActiveTab] = useState("signin");
  
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [countries, setCountries] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);
  
  const { signIn, signUp, isAuthenticated } = useSupabaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Load countries safely with cleanup
  useEffect(() => {
    let active = true;
    
    const loadCountries = async () => {
      if (countries.length > 0) return; // Avoid reloading if already loaded
      
      setIsLoadingCountries(true);
      console.log('Loading countries...');
      
      try {
        const { data: jurisdictions, error } = await supabase
          .from('jurisdictions')
          .select('*')
          .order('name');
        
        console.log('Jurisdictions response:', { data: jurisdictions, error });
        
        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }
        
        if (!jurisdictions || jurisdictions.length === 0) {
          console.warn('No jurisdictions data received');
          // Fallback data for common countries
          const fallbackCountries = [
            { code: 'AR', name: 'Argentina' },
            { code: 'UY', name: 'Uruguay' },
            { code: 'BR', name: 'Brasil' },
            { code: 'PY', name: 'Paraguay' },
            { code: 'CL', name: 'Chile' }
          ];
          if (active) setCountries(fallbackCountries);
          return;
        }
        
        // Filter for countries only (parent_code is null)
        const countryJurisdictions = jurisdictions.filter((j: any) => !j.parent_code);
        console.log('Filtered countries:', countryJurisdictions);
        
        // Map countries with proper code and name
        const uniqueCountries = countryJurisdictions.map((j: any) => ({
          code: j.code,
          name: j.name
        })).sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        console.log('Final countries list:', uniqueCountries);
        if (active) setCountries(uniqueCountries);
        
      } catch (error) {
        console.error('Error loading countries:', error);
        
        // Show user-friendly error
        toast({
          title: "Advertencia",
          description: "No se pudieron cargar los países. Usando lista predeterminada.",
          variant: "default",
        });
        
        // Set fallback countries so user can still register
        const fallbackCountries = [
          { code: 'AR', name: 'Argentina' },
          { code: 'UY', name: 'Uruguay' },
          { code: 'BR', name: 'Brasil' },
          { code: 'PY', name: 'Paraguay' },
          { code: 'CL', name: 'Chile' }
        ];
        if (active) setCountries(fallbackCountries);
        
      } finally {
        if (active) {
          setIsLoadingCountries(false);
        }
        console.log('Finished loading countries');
      }
    };

    loadCountries();
    return () => { active = false; };
  }, []); // Remove any dependencies that could cause re-runs

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
                  <Select value={selectedCountry} onValueChange={setSelectedCountry} required disabled={isLoadingCountries}>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        isLoadingCountries 
                          ? "Cargando países..." 
                          : countries.length === 0 
                          ? "No hay países disponibles"
                          : "Selecciona un país"
                      } />
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
                <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingCountries}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Cargando..." : "Crear Empresa"}
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