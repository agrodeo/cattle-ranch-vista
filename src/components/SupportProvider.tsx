import { createContext, useContext, useMemo, useState, useEffect } from "react";
import SupportDialog from "./SupportDialog";
import type { SupportContextInfo } from "@/lib/support";
import { initializeErrorHandlers } from "@/lib/errorHandlers";

type SupportAPI = {
  open: (ctx?: Partial<SupportContextInfo>) => void;
  close: () => void;
};

const SupportCtx = createContext<SupportAPI | null>(null);

export function useSupport() {
  const ctx = useContext(SupportCtx);
  if (!ctx) throw new Error("SupportProvider missing");
  return ctx;
}

export default function SupportProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<Partial<SupportContextInfo>>({});

  const api = useMemo<SupportAPI>(() => ({
    open: (c) => { setCtx(c ?? {}); setOpen(true); },
    close: () => setOpen(false)
  }), []);

  useEffect(() => {
    (window as any).__supportOpen = (ctx?: any) => api.open(ctx);
    const cleanupErrorHandlers = initializeErrorHandlers();

    return () => {
      delete (window as any).__supportOpen;
      cleanupErrorHandlers?.();
    };
  }, [api]);

  return (
    <SupportCtx.Provider value={api}>
      {children}
      <SupportDialog open={open} onOpenChange={setOpen} context={ctx} />
    </SupportCtx.Provider>
  );
}