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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(['auth', 'common']);
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
          title: t('auth:messages.loginError'),
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('auth:messages.loginSuccess'),
          description: t('auth:messages.loginSuccess'),
        });
      }
    } catch (error) {
      toast({
        title: t('common:errors.network'),
        description: t('common:errors.server'),
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
          title: t('common:errors.validation'),
          description: t('auth:messages.passwordMismatch', 'Las contraseñas no coinciden'),
          variant: "destructive",
        });
        return;
      }

      // Validate Argentina province requirement
      if (values.country_code === 'AR' && !values.province_code) {
        toast({
          title: t('common:errors.validation'),
          description: t('auth:messages.provinceRequired', 'Debes seleccionar una provincia para Argentina'),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('auth:messages.creatingAccount', 'Creando cuenta...'),
        description: t('auth:messages.pleaseWait', 'Por favor espera mientras procesamos tu registro.'),
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
        title: t('auth:messages.registerSuccess'),
        description: data.user?.email_confirmed_at 
          ? t('auth:messages.accountCreated', 'Tu cuenta ha sido creada exitosamente.') 
          : t('auth:messages.verifyEmail', 'Revisa tu email para verificar tu cuenta y completar el registro.'),
      });

      // Switch to sign in tab and pre-fill email
      setActiveTab("signin");
      signInForm.setValue("email", values.email);

    } catch (e: any) {
      const msg = e?.message || e?.error_description || t('common:errors.network');
      console.error('Signup error:', e);
      toast({
        title: t('auth:messages.registerError'),
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
            {t('auth:appDescription', 'Sistema de Gestión Integral de Ganado')}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('auth:login.title')}
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                {t('auth:register.title')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                {t('auth:login.subtitle')}
              </div>
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <FormField
                    control={signInForm.control}
                    name="email"
                    rules={{ required: t('common:validation.required'), pattern: { value: /^\S+@\S+$/i, message: t('common:validation.invalidEmail') } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth:login.email')}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('auth:login.emailPlaceholder', 'tu@email.com')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signInForm.control}
                    name="password"
                    rules={{ required: t('common:validation.required') }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth:login.password')}</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={signInLoading}>
                    {signInLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('auth:login.submit')}
                  </Button>
                  <div className="mt-3 text-center text-sm">
                    <Link to="/forgot-password" className="text-primary hover:underline">
                      {t('auth:login.forgotPassword')}
                    </Link>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                {t('auth:register.subtitle')}
              </div>
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <FormField
                    control={signUpForm.control}
                    name="companyName"
                    rules={{ required: t('common:validation.required') }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth:register.companyName', 'Nombre de la Empresa')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('auth:register.companyPlaceholder', 'Cabaña Los Alamos')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="ownerName"
                    rules={{ required: t('common:validation.required') }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth:register.ownerName', 'Nombre del Propietario')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('auth:register.ownerPlaceholder', 'Juan Pérez')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    rules={{ required: t('common:validation.required'), pattern: { value: /^\S+@\S+$/i, message: t('common:validation.invalidEmail') } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {t('auth:register.email')}
                        </FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('auth:register.emailPlaceholder', 'admin@cabaña.com')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="country_code"
                    rules={{ required: t('common:validation.required') }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth:register.country', 'País')} *</FormLabel>
                        <Select
                          key="country"
                          disabled={!isReady}
                          onValueChange={(value) => field.onChange(value)}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger 
                              aria-label={t('auth:register.country', 'País')}
                              className={!isReady ? 'cursor-wait' : 'cursor-default'}
                            >
                              <SelectValue placeholder={isReady ? t('auth:register.selectCountry', 'Selecciona un país') : t('common:status.loading')} />
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
                      rules={{ required: isAR ? t('common:validation.required') : false }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('auth:register.province', 'Provincia')} *</FormLabel>
                          <Select
                            key={`prov-${country}`}  // remount on toggle to avoid stale disabled state
                            onValueChange={(value) => field.onChange(value)}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger aria-label={t('auth:register.province', 'Provincia')}>
                                <SelectValue placeholder={t('auth:register.selectProvince', 'Selecciona provincia')} />
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
                    rules={{ required: t('common:validation.required'), minLength: { value: 6, message: t('common:validation.tooShort') } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth:register.password')}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={t('auth:register.passwordPlaceholder', 'Mínimo 6 caracteres')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="confirmPassword"
                    rules={{ 
                      required: t('common:validation.required'),
                      validate: (value) => value === signUpForm.getValues('password') || t('auth:messages.passwordMismatch', 'Las contraseñas no coinciden')
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth:register.confirmPassword')}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={t('auth:register.confirmPasswordPlaceholder', 'Repite tu contraseña')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={signUpLoading}>
                    {signUpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {signUpLoading ? t('common:status.loading') : t('auth:register.submit')}
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