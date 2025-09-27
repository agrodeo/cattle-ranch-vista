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
    <div className="fixed inset-0 z-50 bg-background lg:hidden">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Cargar por Excel</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto pb-20">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500 text-white">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Subir Archivo Excel</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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