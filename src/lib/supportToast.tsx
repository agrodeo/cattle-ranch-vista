import React from "react";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { SupportContextInfo } from "./support";

export function showErrorToast(title: string, message: string, errorCode?: string, context?: Partial<SupportContextInfo>) {
  toast({
    title,
    description: message,
    variant: "destructive",
    action: (
      <ToastAction 
        altText="Contactar soporte"
        onClick={() => {
          const supportOpen = (window as any).__supportOpen as ((ctx?: any) => void) | undefined;
          supportOpen?.({ 
            title, 
            message, 
            errorCode, 
            ...context 
          });
        }}
      >
        Contactar soporte
      </ToastAction>
    )
  });
}

export function showSupportToast(title: string, message: string, context?: Partial<SupportContextInfo>) {
  toast({
    title,
    description: message,
    action: (
      <ToastAction 
        altText="Contactar soporte"
        onClick={() => {
          const supportOpen = (window as any).__supportOpen as ((ctx?: any) => void) | undefined;
          supportOpen?.({ title, message, ...context });
        }}
      >
        Contactar soporte
      </ToastAction>
    )
  });
}