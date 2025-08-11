import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Recuperar contraseña | AgroDeo"; // SEO title
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.functions.invoke("request-password-reset", {
        body: { identifier, origin: window.location.origin },
      });
      toast({
        title: "Si el usuario existe, enviamos instrucciones",
        description: "Revisa tu correo para continuar con el cambio de contraseña.",
      });
      navigate("/auth");
    } catch (err: any) {
      // Aun en error, no exponemos existencia del usuario
      toast({
        title: "Solicitud recibida",
        description: "Si el usuario existe, recibirás un correo con instrucciones.",
      });
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Recuperar contraseña</CardTitle>
          <CardDescription>Ingresa tu email o código de empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email o Código de Empleado</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="tu@email.com o código de empleado"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar instrucciones"}
            </Button>
            <div className="text-center text-sm">
              <Link to="/auth" className="text-primary hover:underline">Volver al inicio de sesión</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
