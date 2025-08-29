import { useSupport } from "./SupportProvider";
import { LifeBuoy } from "lucide-react";

export function SupportInline({ title, errorCode, message }: { title?: string; errorCode?: string; message?: string; }) {
  const support = useSupport();
  return (
    <button
      onClick={() => support.open({ title, errorCode, message })}
      className="inline-flex items-center text-emerald-700 hover:text-emerald-800 underline decoration-dotted"
    >
      <LifeBuoy className="w-4 h-4 mr-1" /> Contactar soporte
    </button>
  );
}