import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Política de Privacidad | agrodeo";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-4 max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Política de Privacidad</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 prose prose-sm prose-neutral dark:prose-invert">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">a</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground m-0">agrodeo</h2>
            <p className="text-muted-foreground text-sm m-0">Política de Privacidad</p>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">Última actualización: 2 de abril de 2025</p>

        <p>
          En <strong>agrodeo</strong>, nos comprometemos a proteger tu privacidad. Esta Política de Privacidad describe
          cómo recopilamos, usamos, almacenamos y protegemos tu información personal cuando utilizas nuestra aplicación.
        </p>

        <h3>1. Información que Recopilamos</h3>
        <h4>Información de la cuenta:</h4>
        <ul>
          <li>Nombre completo</li>
          <li>Dirección de correo electrónico</li>
          <li>Nombre de usuario</li>
          <li>Número de teléfono (opcional)</li>
        </ul>

        <h4>Datos de la explotación ganadera:</h4>
        <ul>
          <li>Nombre y ubicación de la cabaña/establecimiento</li>
          <li>Registros de animales (caravana, raza, peso, estado reproductivo, etc.)</li>
          <li>Actividades y eventos (pesajes, inseminaciones, partos, vacunaciones)</li>
          <li>Datos financieros (ingresos, gastos, ventas de animales)</li>
          <li>Información de corrales y movimientos</li>
        </ul>

        <h4>Información técnica:</h4>
        <ul>
          <li>Tipo de dispositivo y sistema operativo</li>
          <li>Identificadores de la aplicación</li>
          <li>Datos de uso y navegación dentro de la app</li>
        </ul>

        <h3>2. Cómo Almacenamos los Datos</h3>
        <p>
          Tus datos se almacenan de forma segura en servidores en la nube proporcionados por <strong>Supabase</strong>,
          una plataforma de base de datos que cumple con estándares de seguridad de la industria. Los datos se
          transmiten mediante conexiones cifradas (HTTPS/TLS).
        </p>

        <h3>3. Medidas de Seguridad</h3>
        <ul>
          <li>Cifrado de datos en tránsito (TLS/SSL)</li>
          <li>Cifrado de datos en reposo</li>
          <li>Políticas de seguridad a nivel de fila (RLS) para aislar datos entre usuarios</li>
          <li>Autenticación segura con tokens JWT</li>
          <li>Acceso restringido a datos solo a usuarios autorizados</li>
        </ul>

        <h3>4. Servicios de Terceros</h3>
        <p>Utilizamos los siguientes servicios de terceros:</p>
        <ul>
          <li><strong>Supabase:</strong> Almacenamiento de datos y autenticación</li>
          <li><strong>Apple App Store / Google Play Store:</strong> Procesamiento de pagos en aplicaciones móviles</li>
          <li><strong>Paddle:</strong> Procesamiento de pagos en la versión web</li>
          <li><strong>RevenueCat:</strong> Gestión de suscripciones en plataformas móviles</li>
        </ul>
        <p>
          Cada servicio tiene su propia política de privacidad. Te recomendamos revisarlas para entender cómo manejan tus datos.
        </p>

        <h3>5. Uso de los Datos</h3>
        <p>Utilizamos tus datos para:</p>
        <ul>
          <li>Proporcionar y mejorar el servicio de agrodeo</li>
          <li>Gestionar tu cuenta y suscripción</li>
          <li>Generar reportes y estadísticas de tu ganado</li>
          <li>Enviar notificaciones relevantes sobre tu cuenta</li>
          <li>Cumplir con obligaciones legales</li>
        </ul>
        <p>
          <strong>No vendemos ni compartimos tus datos personales o ganaderos con terceros</strong> con fines publicitarios.
        </p>

        <h3>6. Derechos del Usuario</h3>
        <p>Tienes derecho a:</p>
        <ul>
          <li><strong>Acceder</strong> a todos tus datos almacenados en la aplicación</li>
          <li><strong>Exportar</strong> tus datos en formatos estándar (Excel/CSV)</li>
          <li><strong>Eliminar</strong> tu cuenta y todos los datos asociados</li>
          <li><strong>Rectificar</strong> información incorrecta</li>
          <li><strong>Solicitar</strong> una copia de tus datos personales</li>
        </ul>
        <p>
          Para ejercer estos derechos, contáctanos a <a href="mailto:faustosicilia123@gmail.com">faustosicilia123@gmail.com</a>.
        </p>

        <h3>7. Cookies y Almacenamiento Local</h3>
        <p>
          agrodeo utiliza almacenamiento local del navegador y del dispositivo para:
        </p>
        <ul>
          <li>Mantener tu sesión activa</li>
          <li>Almacenar preferencias de idioma y configuración</li>
          <li>Cachear datos para funcionamiento offline (Dexie/IndexedDB)</li>
          <li>Guardar el estado de suscripción para acceso sin conexión</li>
        </ul>
        <p>No utilizamos cookies de rastreo ni publicidad.</p>

        <h3>8. Privacidad de Menores</h3>
        <p>
          agrodeo no está dirigida a menores de 13 años. No recopilamos intencionalmente información de niños
          menores de 13 años. Si descubrimos que hemos recopilado datos de un menor, los eliminaremos de inmediato.
          Si eres padre o tutor y crees que tu hijo nos ha proporcionado información, contáctanos.
        </p>

        <h3>9. Retención de Datos</h3>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Si solicitas la eliminación de tu cuenta,
          eliminaremos tus datos personales y ganaderos en un plazo de 30 días, salvo que exista una obligación
          legal de conservarlos.
        </p>

        <h3>10. Cambios a esta Política</h3>
        <p>
          Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos de cambios significativos
          a través de la aplicación o por correo electrónico. La fecha de última actualización se indica al inicio
          de este documento.
        </p>

        <h3>11. Contacto</h3>
        <p>
          Si tienes preguntas sobre esta Política de Privacidad, contáctanos en:
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
