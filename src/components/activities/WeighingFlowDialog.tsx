import { useState } from "react";
import { WeighingMethodSelector } from "./WeighingMethodSelector";
import { NewWeighingDialog } from "./NewWeighingDialog";
import { BulkWeighingUpload } from "./BulkWeighingUpload";

interface WeighingFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type WeighingMethod = "manual" | "bulk" | null;

export function WeighingFlowDialog({
  open,
  onOpenChange,
  onSuccess,
}: WeighingFlowDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<WeighingMethod>(null);

  const handleMethodSelect = (method: WeighingMethod) => {
    setSelectedMethod(method);
  };

  const handleMethodSelectorClose = () => {
    setSelectedMethod(null);
    onOpenChange(false);
  };

  const handleDialogClose = () => {
    setSelectedMethod(null);
  };

  const handleSuccess = () => {
    setSelectedMethod(null);
    onOpenChange(false);
    onSuccess?.();
  };

  const handleBack = () => {
    setSelectedMethod(null);
  };

  return (
    <>
      {/* Method Selector */}
      <WeighingMethodSelector
        open={open && selectedMethod === null}
        onOpenChange={handleMethodSelectorClose}
        onSelectManual={() => handleMethodSelect("manual")}
        onSelectBulk={() => handleMethodSelect("bulk")}
      />

      {/* Manual Weighing Dialog */}
      <NewWeighingDialog
        open={selectedMethod === "manual"}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleDialogClose();
          }
        }}
        onSuccess={handleSuccess}
      />

      {/* Bulk Weighing Upload */}
      <BulkWeighingUpload
        open={selectedMethod === "bulk"}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleDialogClose();
          }
        }}
        onSuccess={handleSuccess}
      />
    </>
  );
}