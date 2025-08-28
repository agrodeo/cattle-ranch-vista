import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgePillVariants = cva(
  "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        warning: "bg-amber-100 text-amber-800 border border-amber-200", 
        danger: "bg-red-100 text-red-800 border border-red-200",
        neutral: "bg-slate-100 text-slate-800 border border-slate-200",
        info: "bg-blue-100 text-blue-800 border border-blue-200",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgePillProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgePillVariants> {}

function BadgePill({ className, variant, ...props }: BadgePillProps) {
  return (
    <div className={cn(badgePillVariants({ variant }), className)} {...props} />
  );
}

export { BadgePill, badgePillVariants };