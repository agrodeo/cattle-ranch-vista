import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Privacy() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Política de Privacidad | agrodeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Política de privacidad y manejo de datos de agrodeo");
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver
      </Button>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h1>Política de Privacidad</h1>
        <p className="text-muted-foreground">Última actualización: {new Date().toLocaleDateString('es-AR')}</p>

        <h2>1. Introducción</h2>
        <p>
          En agrodeo, respetamos tu privacidad y nos comprometemos a proteger tus datos personales. Esta política explica qué información recopilamos, cómo la usamos y tus derechos respecto a ella.
        </p>

        <h2>2. Información que Recopilamos</h2>
        
        <h3>2.1 Información de Cuenta</h3>
        <ul>
          <li>Nombre y apellido</li>
          <li>Dirección de correo electrónico</li>
          <li>Información de la cabaña (nombre, ubicación)</li>
        </ul>

        <h3>2.2 Datos de Gestión Ganadera</h3>
        <ul>
          <li>Información de animales (identificación, raza, edad, peso)</li>
          <li>Registros de actividades (vacunación, pesaje, reproducción)</li>
          <li>Datos financieros (ingresos y egresos)</li>
          <li>Información de corrales y movimientos</li>
        </ul>

        <h3>2.3 Información de Uso</h3>
        <ul>
          <li>Datos de uso de la aplicación</li>
          <li>Información del dispositivo</li>
          <li>Registros de errores y rendimiento</li>
        </ul>

        <h3>2.4 Información de Compra</h3>
        <ul>
          <li>Historial de suscripciones (manejado por Apple)</li>
          <li>Estado de pago (sin datos de tarjetas)</li>
        </ul>

        <h2>3. Cómo Usamos tu Información</h2>
        <p>Utilizamos tu información para:</p>
        <ul>
          <li>Proporcionar y mantener el servicio de agrodeo</li>
          <li>Gestionar tu cuenta y suscripción</li>
          <li>Generar reportes y análisis de tu cabaña</li>
          <li>Mejorar la aplicación y desarrollar nuevas funcionalidades</li>
          <li>Comunicarnos contigo sobre actualizaciones y soporte</li>
          <li>Cumplir con obligaciones legales</li>
        </ul>

        <h2>4. Compartir Información</h2>
        <p>No vendemos ni alquilamos tus datos personales. Podemos compartir información con:</p>
        <ul>
          <li><strong>Proveedores de servicios:</strong> Supabase (almacenamiento), RevenueCat (suscripciones)</li>
          <li><strong>Apple:</strong> Para procesamiento de pagos y cumplimiento de términos de App Store</li>
          <li><strong>Autoridades:</strong> Si es requerido por ley</li>
        </ul>

        <h2>5. Almacenamiento y Seguridad</h2>
        
        <h3>5.1 Ubicación de los Datos</h3>
        <p>
          Tus datos se almacenan en servidores seguros de Supabase. Implementamos medidas de seguridad estándar de la industria para proteger tu información.
        </p>

        <h3>5.2 Retención de Datos</h3>
        <p>
          Conservamos tu información mientras tu cuenta esté activa. Puedes solicitar la eliminación de tu cuenta en cualquier momento.
        </p>

        <h2>6. Tus Derechos</h2>
        <p>Tienes derecho a:</p>
        <ul>
          <li>Acceder a tus datos personales</li>
          <li>Corregir información inexacta</li>
          <li>Solicitar la eliminación de tu cuenta y datos</li>
          <li>Exportar tus datos</li>
          <li>Oponerte al procesamiento de tus datos</li>
          <li>Retirar el consentimiento en cualquier momento</li>
        </ul>

        <h2>7. Cookies y Tecnologías Similares</h2>
        <p>
          Utilizamos cookies y tecnologías similares para mejorar tu experiencia, recordar tus preferencias y analizar el uso de la aplicación.
        </p>

        <h2>8. Privacidad de Menores</h2>
        <p>
          agrodeo no está dirigido a menores de 13 años. No recopilamos intencionalmente información de menores.
        </p>

        <h2>9. Cambios a esta Política</h2>
        <p>
          Podemos actualizar esta política ocasionalmente. Te notificaremos sobre cambios significativos mediante la aplicación o por correo electrónico.
        </p>

        <h2>10. Información Específica de iOS</h2>
        <p>
          Cuando uses agrodeo en iOS, Apple recopila información de compra de acuerdo con su propia política de privacidad. No tenemos acceso a información de pago como números de tarjeta de crédito.
        </p>

        <h2>11. Contacto</h2>
        <p>
          Para ejercer tus derechos, preguntas sobre privacidad o reportar problemas, contáctanos en:
        </p>
        <p>
          <strong>Email:</strong> privacidad@agrodeo.com<br />
          <strong>Soporte:</strong> soporte@agrodeo.com
        </p>

        <h2>12. Cumplimiento Legal</h2>
        <p>
          Cumplimos con la Ley de Protección de Datos Personales de Argentina (Ley 25.326) y otras regulaciones aplicables.
        </p>
      </div>
    </div>
  );
}
