import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  variant: "activo" | "vendido" | "muerto" | "prenada" | "riesgo";
  children: React.ReactNode;
  className?: string;
}

const statusVariants = {
  activo: "status-activo",
  vendido: "status-vendido", 
  muerto: "status-muerto",
  prenada: "status-prenada",
  riesgo: "status-riesgo",
};

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}