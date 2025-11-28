import { useState } from "react";
import { ArrowLeft, Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AnimalExcelUploadAdvanced from "@/components/excel-upload/AnimalExcelUploadAdvanced";

interface ExcelAnimalUploadProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function ExcelAnimalUpload({ onBack, onSuccess }: ExcelAnimalUploadProps) {
  return (
    <div 
      className="fixed inset-0 z-50 bg-background lg:hidden"
      onTouchMove={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{ touchAction: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Cargar por Excel</h1>
      </div>

      {/* Content */}
      <div 
        className="flex-1 p-2 overflow-y-auto overflow-x-hidden pb-20"
        style={{ touchAction: 'pan-y' }}
      >
        <Card className="mx-0">
          <CardHeader className="px-3 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Subir Archivo Excel</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            <AnimalExcelUploadAdvanced 
              userCabañaId="" 
              onUploadComplete={onSuccess}
              isMobileMode={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}