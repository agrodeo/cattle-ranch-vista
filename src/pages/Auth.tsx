import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocationOptions } from "@/hooks/useLocation";
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
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  
  // Use new location options hook (no remote fetch needed)
  const { isReady, countries, arProvinces } = useLocationOptions();
  
  const { signIn, signUp, isAuthenticated } = useSupabaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear province when country changes
  useEffect(() => {
    setSelectedProvince("");
  }, [selectedCountry]);

  // Reset form states on tab change
  useEffect(() => {
    setIsSubmitting(false);
    setSelectedCountry("");
    setSelectedProvince("");
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
    console.log('🚀 Form submitted, setting loading to true');
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const companyName = formData.get("companyName") as string;
      const ownerName = formData.get("ownerName") as string;
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      if (password !== confirmPassword) {
        console.log('❌ Password validation failed');
        toast({
          title: "Error",
          description: "Las contraseñas no coinciden",
          variant: "destructive",
        });
        setIsSubmitting(false); // CRITICAL: Reset loading state
        return;
      }

      if (!selectedCountry) {
        console.log('❌ Country validation failed');
        toast({
          title: "Error",
          description: "Debes seleccionar un país",
          variant: "destructive",
        });
        setIsSubmitting(false); // CRITICAL: Reset loading state
        return;
      }

      const isAR = selectedCountry === 'AR';
      if (isAR && !selectedProvince) {
        console.log('❌ Province validation failed');
        toast({
          title: "Error",
          description: "Debes seleccionar una provincia para Argentina",
          variant: "destructive",
        });
        setIsSubmitting(false); // CRITICAL: Reset loading state
        return;
      }

      console.log('📞 Calling signUp function...');
      const { error } = await signUp(
        email,
        password,
        ownerName,
        companyName,
        selectedCountry, 
        isAR ? selectedProvince : null
      );
      
      console.log('📋 SignUp result:', { error });
      
      if (error) {
        console.error('❌ Signup error detected:', error);
        toast({
          title: "Error al crear la cuenta",
          description: error.message,
          variant: "destructive",
        });
        console.log('🔄 Resetting loading state due to error');
        setIsSubmitting(false);
        return;
      } 
      
      console.log('✅ Signup successful, showing success toast');
      toast({
        title: "¡Cuenta creada!",
        description: "Tu empresa ha sido registrada exitosamente. Revisa tu email para confirmar tu cuenta.",
      });
    } catch (error) {
      console.error('💥 Unexpected signup exception:', error);
      toast({
        title: "Error inesperado",
        description: "Ocurrió un error inesperado. Intenta nuevamente.",
        variant: "destructive",
      });
      console.log('🔄 Resetting loading state due to exception');
      setIsSubmitting(false);
    } finally {
      console.log('🏁 Finally block - ensuring loading state is reset');
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
                  <Select
                    key="country"
                    value={selectedCountry}
                    onValueChange={setSelectedCountry}
                    disabled={!isReady}
                  >
                    <SelectTrigger 
                      id="country" 
                      aria-label="País" 
                      className={!isReady ? 'cursor-wait' : 'cursor-default'}
                    >
                      <SelectValue placeholder={isReady ? 'Selecciona un país' : 'Cargando países…'} />
                    </SelectTrigger>
                    {isReady && (
                      <SelectContent>
                        {countries.map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    )}
                  </Select>
                </div>
                
                {/* Show provinces only for Argentina */}
                {selectedCountry === 'AR' && (
                  <div className="space-y-2">
                    <Label htmlFor="province">Provincia *</Label>
                    <Select
                      key={`prov-${selectedCountry}`}  // forces remount when toggling AR
                      value={selectedProvince}
                      onValueChange={setSelectedProvince}
                    >
                      <SelectTrigger aria-label="Provincia">
                        <SelectValue placeholder="Selecciona provincia" />
                      </SelectTrigger>
                      <SelectContent>
                        {arProvinces.map(province => (
                          <SelectItem key={province.code} value={province.code}>
                            {province.name}
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