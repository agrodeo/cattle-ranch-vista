import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Terms() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Términos de Servicio | agrodeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Términos y condiciones de uso de agrodeo");
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-3 sm:px-4 py-8 overflow-x-hidden">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h1>Términos de Servicio</h1>
        <p className="text-muted-foreground">Última actualización: {new Date().toLocaleDateString('es-AR')}</p>

        <h2>1. Aceptación de los Términos</h2>
        <p>
          Al acceder y utilizar agrodeo, aceptas estar sujeto a estos términos de servicio. Si no estás de acuerdo con alguno de estos términos, no debes utilizar esta aplicación.
        </p>

        <h2>2. Suscripciones</h2>
        <h3>2.1 Renovación Automática</h3>
        <p>
          Las suscripciones se renuevan automáticamente a menos que se cancelen al menos 24 horas antes del final del período actual. El pago se cargará a tu cuenta de Apple ID en el momento de la confirmación de compra.
        </p>

        <h3>2.2 Precios</h3>
        <p>
          Los precios están sujetos a cambios con previo aviso. Los cambios de precio no afectarán las suscripciones existentes durante su período actual.
        </p>

        <h3>2.3 Cancelación</h3>
        <p>
          Puedes cancelar tu suscripción en cualquier momento a través de la configuración de tu cuenta de App Store. La cancelación será efectiva al final del período de facturación actual.
        </p>

        <h2>3. Uso del Servicio</h2>
        <h3>3.1 Licencia</h3>
        <p>
          Te otorgamos una licencia limitada, no exclusiva, no transferible y revocable para usar agrodeo para tu gestión ganadera personal o comercial.
        </p>

        <h3>3.2 Restricciones</h3>
        <p>No puedes:</p>
        <ul>
          <li>Copiar, modificar o distribuir la aplicación</li>
          <li>Realizar ingeniería inversa del software</li>
          <li>Usar la aplicación para fines ilegales</li>
          <li>Compartir tu cuenta con terceros</li>
        </ul>

        <h2>4. Datos del Usuario</h2>
        <h3>4.1 Propiedad de los Datos</h3>
        <p>
          Mantienes todos los derechos sobre los datos que ingresas en agrodeo. Consulta nuestra Política de Privacidad para más información sobre cómo manejamos tus datos.
        </p>

        <h3>4.2 Respaldo de Datos</h3>
        <p>
          Aunque realizamos respaldos regulares, es tu responsabilidad mantener copias de seguridad de tu información crítica.
        </p>

        <h2>5. Limitación de Responsabilidad</h2>
        <p>
          agrodeo se proporciona "tal cual" sin garantías de ningún tipo. No seremos responsables por pérdidas directas, indirectas, incidentales o consecuentes derivadas del uso o la imposibilidad de usar el servicio.
        </p>

        <h2>6. Modificaciones del Servicio</h2>
        <p>
          Nos reservamos el derecho de modificar o discontinuar el servicio en cualquier momento, con o sin previo aviso.
        </p>

        <h2>7. Ley Aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de Argentina. Cualquier disputa será resuelta en los tribunales de Argentina.
        </p>

        <h2>8. Contacto</h2>
        <p>
          Para preguntas sobre estos términos, contáctanos en: fausto@agrodeo.farm
        </p>

        <h2>9. Términos de Compra en App Store</h2>
        <p>
          Las compras realizadas a través de la App Store están sujetas también a los términos y condiciones de Apple Inc. En caso de conflicto, prevalecen los términos de Apple para aspectos relacionados con el proceso de compra.
        </p>
      </div>
    </div>
  );
}
