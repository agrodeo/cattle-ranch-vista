export const SUPPORT_EMAIL = "ayuda@agrodeo.farm";

export type SupportContextInfo = {
  title?: string;                 // ej: "Error al cargar animales"
  message?: string;               // ej: "Fetch failed: 500"
  errorCode?: string;             // ej: "ANIMALS_FETCH_500"
  route?: string;                 // window.location.pathname
  userId?: string | null;
  cabanaId?: string | null;
  browser?: string;               // navigator.userAgent
  online?: boolean;
  appVersion?: string;            // si tenemos commit/versión
  extra?: Record<string, any>;    // payload opcional
};

export function buildMailtoLink(info: SupportContextInfo) {
  const subject = `[Agrodeo] Soporte - ${info.title ?? "Consulta/Reporte"}`;
  const bodyLines = [
    "Hola equipo Agrodeo, necesito ayuda:",
    "",
    `Asunto: ${info.title ?? "-"}`,
    `Detalle: ${info.message ?? "-"}`,
    `Código de error: ${info.errorCode ?? "-"}`,
    "",
    "Contexto:",
    `Ruta: ${info.route ?? window.location.pathname}`,
    `Usuario: ${info.userId ?? "-"}`,
    `Cabaña: ${info.cabanaId ?? "-"}`,
    `Online: ${String(info.online ?? navigator.onLine)}`,
    `Navegador: ${info.browser ?? navigator.userAgent}`,
    `Versión app: ${info.appVersion ?? "-"}`,
    `Fecha: ${new Date().toISOString()}`,
    "",
    `Extra: ${info.extra ? JSON.stringify(info.extra, null, 2) : "-"}`,
  ].join("\n");

  const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines)}`;
  return url;
}