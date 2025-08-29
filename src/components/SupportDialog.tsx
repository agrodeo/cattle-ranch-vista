import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { buildMailtoLink, SupportContextInfo, SUPPORT_EMAIL } from "@/lib/support";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context?: Partial<SupportContextInfo>;
};

export default function SupportDialog({ open, onOpenChange, context = {} }: Props) {
  const mailto = buildMailtoLink({
    title: context.title ?? "Consulta/Reporte",
    message: context.message,
    errorCode: context.errorCode,
    route: context.route ?? window.location.pathname,
    userId: context.userId ?? null,
    cabanaId: context.cabanaId ?? null,
    browser: context.browser ?? navigator.userAgent,
    online: context.online ?? navigator.onLine,
    appVersion: context.appVersion ?? (window as any).__APP_VERSION__,
    extra: context.extra
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>¿Necesitás ayuda?</DialogTitle>
          <DialogDescription>
            Escribinos a <a className="underline font-medium" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. 
            Incluí el detalle del problema para acelerar la respuesta.
          </DialogDescription>
        </DialogHeader>

        <div className="text-sm space-y-2 bg-muted rounded-xl p-3">
          <div className="text-muted-foreground">Incluiremos información técnica básica (ruta, navegador, estado de conexión) en tu correo.</div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.location.href = mailto}>
            <Mail className="w-4 h-4 mr-2" /> Contactar soporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}