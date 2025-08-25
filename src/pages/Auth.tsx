import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useLocationOptions } from "@/hooks/useLocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, Mail, UserPlus } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface SignInForm {
  email: string;
  password: string;
}

interface SignUpForm {
  companyName: string;
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
  country_code: string;
  province_code?: string;
}

const Auth = () => {
  const [activeTab, setActiveTab] = useState("signin");
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  
  const { isAuthenticated, loading, signIn } = useSupabaseAuth();
  const { isReady, countries, arProvinces } = useLocationOptions();
  const navigate = useNavigate();

  // Form setup
  const signInForm = useForm<SignInForm>();
  const signUpForm = useForm<SignUpForm>();

  const country = signUpForm.watch('country_code');
  const isAR = country === 'AR';

  // Redirect to dashboard if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Clear province when country changes to non-AR
  useEffect(() => {
    if (country && country !== 'AR') {
      signUpForm.setValue('province_code', undefined);
    }
  }, [country, signUpForm]);

  const handleSignIn = async (values: SignInForm) => {
    setSignInLoading(true);
    
    try {
      const { error } = await signIn(values.email, values.password);
      
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
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor.",
        variant: "destructive",
      });
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (values: SignUpForm) => {
    setSignUpLoading(true);

    try {
      // Validate passwords match
      if (values.password !== values.confirmPassword) {
        toast({
          title: "Error",
          description: "Las contraseñas no coinciden",
          variant: "destructive",
        });
        return;
      }

      // Validate Argentina province requirement
      if (values.country_code === 'AR' && !values.province_code) {
        toast({
          title: "Error",
          description: "Debes seleccionar una provincia para Argentina",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Creando cuenta...",
        description: "Por favor espera mientras procesamos tu registro.",
      });

      // Store pending company data in localStorage for deferred creation
      localStorage.setItem('pending_cabana', JSON.stringify({
        name: values.companyName,
        country_code: values.country_code,
        province_code: values.country_code === 'AR' ? values.province_code ?? null : null,
      }));
      
      localStorage.setItem('pending_owner_data', JSON.stringify({
        full_name: values.ownerName,
        email: values.email,
        country_code: values.country_code,
        province_code: values.country_code === 'AR' ? values.province_code ?? null : null,
      }));

      // Create the Supabase auth user
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast({
        title: "¡Cuenta creada!",
        description: data.user?.email_confirmed_at 
          ? "Tu cuenta ha sido creada exitosamente." 
          : "Revisa tu email para verificar tu cuenta y completar el registro.",
      });

      // Switch to sign in tab and pre-fill email
      setActiveTab("signin");
      signInForm.setValue("email", values.email);

    } catch (e: any) {
      const msg = e?.message || e?.error_description || 'Error de conexión';
      console.error('Signup error:', e);
      toast({
        title: "Error al crear la cuenta",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSignUpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
              <TabsTrigger value="signin" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Registrar Empresa
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Ingresa con tu email y contraseña
              </div>
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <FormField
                    control={signInForm.control}
                    name="email"
                    rules={{ required: "Email es requerido", pattern: { value: /^\S+@\S+$/i, message: "Email inválido" } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="tu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signInForm.control}
                    name="password"
                    rules={{ required: "Contraseña es requerida" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={signInLoading}>
                    {signInLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Iniciar Sesión
                  </Button>
                  <div className="mt-3 text-center text-sm">
                    <Link to="/forgot-password" className="text-primary hover:underline">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Crear una nueva empresa/cabaña
              </div>
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <FormField
                    control={signUpForm.control}
                    name="companyName"
                    rules={{ required: "Nombre de empresa es requerido" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Cabaña Los Alamos" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="ownerName"
                    rules={{ required: "Nombre del propietario es requerido" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Propietario</FormLabel>
                        <FormControl>
                          <Input placeholder="Juan Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    rules={{ required: "Email es requerido", pattern: { value: /^\S+@\S+$/i, message: "Email inválido" } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@cabaña.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="country_code"
                    rules={{ required: "País es requerido" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>País *</FormLabel>
                        <Select
                          key="country"
                          disabled={!isReady}
                          onValueChange={(value) => field.onChange(value)}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger 
                              aria-label="País" 
                              className={!isReady ? 'cursor-wait' : 'cursor-default'}
                            >
                              <SelectValue placeholder={isReady ? 'Selecciona un país' : 'Cargando países…'} />
                            </SelectTrigger>
                          </FormControl>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {isAR && (
                    <FormField
                      control={signUpForm.control}
                      name="province_code"
                      rules={{ required: isAR ? "Provincia es requerida para Argentina" : false }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provincia *</FormLabel>
                          <Select
                            key={`prov-${country}`}  // remount on toggle to avoid stale disabled state
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger aria-label="Provincia">
                                <SelectValue placeholder="Selecciona provincia" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {arProvinces.map(province => (
                                <SelectItem key={province.code} value={province.code}>
                                  {province.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={signUpForm.control}
                    name="password"
                    rules={{ required: "Contraseña es requerida", minLength: { value: 6, message: "Mínimo 6 caracteres" } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="confirmPassword"
                    rules={{ 
                      required: "Confirmar contraseña es requerido",
                      validate: (value) => value === signUpForm.getValues('password') || "Las contraseñas no coinciden"
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Contraseña</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Repite tu contraseña" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={signUpLoading}>
                    {signUpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {signUpLoading ? "Creando..." : "Crear Empresa"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;