import { ReactNode } from "react";
import { X } from "lucide-react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerClose,
  DrawerTrigger 
} from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  title: string;
  children: ReactNode;
  trigger: ReactNode;
  className?: string;
}

export function BottomSheet({ title, children, trigger, className }: BottomSheetProps) {
  return (
    <>
      {/* Mobile: Bottom Sheet */}
      <div className="lg:hidden">
        <Drawer>
          <DrawerTrigger asChild>
            {trigger}
          </DrawerTrigger>
          <DrawerContent className={cn("max-h-[85vh]", className)}>
            <DrawerHeader className="border-b border-slate-200">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-lg font-semibold text-slate-900">
                  {title}
                </DrawerTitle>
                <DrawerClose asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 focus:ring-2 focus:ring-emerald-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Desktop: Modal */}
      <div className="hidden lg:block">
        <Dialog>
          <DialogTrigger asChild>
            {trigger}
          </DialogTrigger>
          <DialogContent className={cn("max-w-2xl max-h-[85vh] overflow-y-auto", className)}>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                {title}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {children}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}