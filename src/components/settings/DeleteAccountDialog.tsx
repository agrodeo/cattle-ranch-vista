import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

export function DeleteAccountDialog() {
  const { t } = useTranslation(["settings"]);
  const { signOut } = useSupabaseAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const requiredText = t("settings:deleteAccount.confirmWord", "ELIMINAR");
  const isConfirmed = confirmText === requiredText;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setIsDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t("settings:deleteAccount.errorNotAuth", "You must be logged in"));
        return;
      }

      const { data, error } = await supabase.functions.invoke("delete-user-account", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(t("settings:deleteAccount.success", "Account deleted successfully"));
      
      // Sign out and redirect
      await signOut();
      navigate("/auth", { replace: true });
    } catch (err: any) {
      console.error("Delete account error:", err);
      toast.error(
        t("settings:deleteAccount.errorGeneral", "Failed to delete account. Please try again.")
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmText(""); }}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-auto gap-2">
          <Trash2 className="h-4 w-4" />
          {t("settings:deleteAccount.button", "Delete Account")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-lg">
              {t("settings:deleteAccount.title", "Delete Account")}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm space-y-3">
            <p className="font-semibold text-destructive">
              {t("settings:deleteAccount.warning", "This action is PERMANENT and cannot be undone.")}
            </p>
            <p>
              {t("settings:deleteAccount.description", "All your data will be permanently deleted, including:")}
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>{t("settings:deleteAccount.dataFarm", "Your farm and all its settings")}</li>
              <li>{t("settings:deleteAccount.dataAnimals", "All animals and their records")}</li>
              <li>{t("settings:deleteAccount.dataActivities", "Activities, weighings, and reproductive data")}</li>
              <li>{t("settings:deleteAccount.dataFinance", "Financial records")}</li>
              <li>{t("settings:deleteAccount.dataSub", "Your subscription")}</li>
            </ul>
            <p className="text-sm pt-2">
              {t("settings:deleteAccount.confirmInstruction", 'Type "{{word}}" to confirm:', { word: requiredText })}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={requiredText}
          className="mt-2"
          disabled={isDeleting}
        />
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={isDeleting}>
            {t("settings:deleteAccount.cancel", "Cancel")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("settings:deleteAccount.confirmButton", "Delete account permanently")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
