import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useSupport } from "./SupportProvider";
import { SUPPORT_EMAIL } from "@/lib/support";
import { useIsMobile } from "@/hooks/use-mobile";

export function SupportFooter() {
  const support = useSupport();
  const isMobile = useIsMobile();

  return (
    <div className={`border-t border-border bg-muted/30 p-4 mt-8 ${isMobile ? 'pb-20' : ''}`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Soporte: <a 
            href={`mailto:${SUPPORT_EMAIL}`} 
            className="underline hover:text-foreground transition-colors"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => support.open({ title: "Consulta general" })}
          className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
        >
          <Mail className="w-4 h-4 mr-2" />
          Contactar soporte
        </Button>
      </div>
    </div>
  );
}