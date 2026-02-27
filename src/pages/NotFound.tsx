import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SupportInline } from "@/components/SupportInline";
import { showErrorToast } from "@/lib/supportToast";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: route:", location.pathname,
      "| href:", window.location.href,
      "| origin:", window.location.origin,
      "| hash:", window.location.hash
    );

    // Auto-redirect to dashboard for paths that come from native app loading
    // (e.g. /index.html, or any unrecognized initial path)
    const knownNativePaths = ['/index.html', '/index.htm'];
    if (knownNativePaths.includes(location.pathname) || location.pathname === '') {
      navigate('/dashboard', { replace: true });
      return;
    }
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8 max-w-md">
        <h1 className="text-4xl font-bold mb-4 text-foreground">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Página no encontrada</p>
        <div className="space-y-4">
          <Button onClick={() => navigate('/dashboard', { replace: true })}>
            Volver al inicio
          </Button>
          <div className="pt-4">
            <SupportInline 
              title="Página no encontrada (404)" 
              errorCode="PAGE_NOT_FOUND" 
              message={`Ruta solicitada: ${location.pathname}`} 
            />
          </div>
          <div className="pt-2">
            <Button 
              variant="outline" 
              onClick={() => showErrorToast("Error de ejemplo", "Este es un ejemplo de toast con soporte", "EXAMPLE_ERROR")}
            >
              Probar toast con soporte
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
