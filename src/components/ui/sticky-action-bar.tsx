import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StickyActionBarProps {
  children: ReactNode;
  className?: string;
}

export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "lg:hidden fixed inset-x-0 z-40 pointer-events-none",
        className
      )}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
    >
      <div className="mx-auto max-w-screen-sm px-3 pointer-events-auto">
        <div className="rounded-full bg-white/95 shadow-lg backdrop-blur border border-slate-200 p-2 mb-3">
          {children}
        </div>
      </div>
    </div>
  );
}