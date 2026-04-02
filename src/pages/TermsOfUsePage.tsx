import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfUsePage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Términos de Uso | agrodeo";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-4 max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Términos de Uso</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 prose prose-sm prose-neutral dark:prose-invert">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">a</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground m-0">agrodeo</h2>
            <p className="text-muted-foreground text-sm m-0">Términos de Uso y Acuerdo de Licencia</p>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">Última actualización: 2 de abril de 2025</p>

        <p>
          Bienvenido a <strong>agrodeo</strong>. Al descargar, instalar o utilizar nuestra aplicación, aceptas estos
          Términos de Uso ("Términos"). Si no estás de acuerdo, no utilices la aplicación.
        </p>

        <h3>1. Descripción del Servicio</h3>
        <p>
          agrodeo es una aplicación de gestión ganadera que permite registrar animales, actividades reproductivas,
          pesajes, finanzas, corrales y más. El servicio se ofrece mediante planes de suscripción gratuitos y de pago.
        </p>

        <h3>2. Suscripciones y Renovación Automática</h3>
        <ul>
          <li>agrodeo ofrece planes de suscripción con renovación automática (mensual o anual).</li>
          <li>Al suscribirte, autorizas el cobro recurrente al método de pago asociado a tu cuenta de Apple App Store o Google Play Store.</li>
          <li>La suscripción se renueva automáticamente al final de cada período, salvo que la canceles al menos 24 horas antes de la fecha de renovación.</li>
          <li>El precio de la suscripción puede variar según el plan seleccionado y la región.</li>
        </ul>

        <h3>3. Pago y Facturación</h3>
        <ul>
          <li>Los pagos se procesan a través de Apple App Store (iOS) o Google Play Store (Android), según la plataforma que utilices.</li>
          <li>En la versión web, los pagos se procesan a través de Paddle, nuestro proveedor de pagos autorizado.</li>
          <li>agrodeo no almacena información de tarjetas de crédito ni datos de pago directamente.</li>
          <li>Los precios incluyen los impuestos aplicables según tu jurisdicción.</li>
        </ul>

        <h3>4. Cancelación</h3>
        <ul>
          <li><strong>iOS:</strong> Puedes cancelar tu suscripción desde Configuración → [Tu nombre] → Suscripciones en tu dispositivo Apple.</li>
          <li><strong>Android:</strong> Puedes cancelar desde Google Play Store → Suscripciones.</li>
          <li><strong>Web:</strong> Puedes gestionar tu suscripción desde el portal de clientes de Paddle.</li>
          <li>La cancelación entra en vigencia al final del período de facturación actual. Seguirás teniendo acceso a las funciones premium hasta que finalice el período pagado.</li>
          <li>Desinstalar la aplicación no cancela tu suscripción.</li>
        </ul>

        <h3>5. Política de Reembolsos</h3>
        <ul>
          <li>Los reembolsos para compras realizadas a través de Apple App Store son gestionados exclusivamente por Apple. Consulta <a href="https://support.apple.com/es-es/HT204084" target="_blank" rel="noopener noreferrer">la política de reembolsos de Apple</a>.</li>
          <li>Los reembolsos para compras en Google Play son gestionados por Google. Consulta <a href="https://support.google.com/googleplay/answer/2479637" target="_blank" rel="noopener noreferrer">la política de reembolsos de Google</a>.</li>
          <li>No ofrecemos reembolsos directos por suscripciones adquiridas a través de las tiendas de aplicaciones.</li>
        </ul>

        <h3>6. Responsabilidades del Usuario</h3>
        <ul>
          <li>Eres responsable de mantener la confidencialidad de tu cuenta y contraseña.</li>
          <li>La información ingresada en la aplicación (datos de animales, finanzas, etc.) es tu responsabilidad.</li>
          <li>No debes utilizar la aplicación para actividades ilegales o que violen derechos de terceros.</li>
          <li>Debes proporcionar información veraz y actualizada al registrarte.</li>
        </ul>

        <h3>7. Propiedad Intelectual</h3>
        <p>
          Todos los derechos de propiedad intelectual de agrodeo, incluyendo pero no limitado al diseño, código fuente,
          logotipos, marcas, textos e imágenes, son propiedad exclusiva de agrodeo y están protegidos por las leyes de
          propiedad intelectual aplicables. No se concede ningún derecho sobre estos más allá del uso personal de la aplicación.
        </p>

        <h3>8. Limitación de Responsabilidad</h3>
        <ul>
          <li>agrodeo se proporciona "tal cual" y "según disponibilidad".</li>
          <li>No garantizamos que el servicio sea ininterrumpido, libre de errores o completamente seguro.</li>
          <li>agrodeo no es responsable por pérdidas de datos, daños directos, indirectos, incidentales o consecuentes derivados del uso de la aplicación.</li>
          <li>Las decisiones ganaderas tomadas en base a la información de la aplicación son responsabilidad exclusiva del usuario.</li>
        </ul>

        <h3>9. Uso de Datos</h3>
        <p>
          El uso de tus datos personales se rige por nuestra <a href="/politica-de-privacidad">Política de Privacidad</a>.
          Al utilizar agrodeo, aceptas la recopilación y uso de datos según lo descrito en dicha política.
        </p>

        <h3>10. Terminación de Cuenta</h3>
        <ul>
          <li>Puedes solicitar la eliminación de tu cuenta en cualquier momento contactándonos por correo electrónico.</li>
          <li>Nos reservamos el derecho de suspender o terminar cuentas que violen estos términos.</li>
          <li>Al terminar tu cuenta, perderás acceso a todos los datos almacenados en la aplicación.</li>
        </ul>

        <h3>11. Modificaciones a los Términos</h3>
        <p>
          Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios serán notificados
          a través de la aplicación o por correo electrónico. El uso continuado de agrodeo después de los cambios
          constituye la aceptación de los nuevos términos.
        </p>

        <h3>12. Contacto</h3>
        <p>
          Si tienes preguntas sobre estos Términos de Uso, contáctanos en:
        </p>
        <p>
          📧 <a href="mailto:faustosicilia123@gmail.com">faustosicilia123@gmail.com</a>
        </p>

        <hr />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} agrodeo. Todos los derechos reservados.
        </p>
      </main>
    </div>
  );
}
