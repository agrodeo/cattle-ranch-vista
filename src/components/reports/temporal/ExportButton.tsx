import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import type { TemporalDataPoint } from '@/lib/temporalAnalysis';

interface ExportButtonProps {
  data: TemporalDataPoint[];
  filename?: string;
}

export function ExportButton({ data, filename = 'analisis-temporal' }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const exportToExcel = () => {
    try {
      setExporting(true);

      // Prepare data for export
      const exportData = data.map(row => ({
        'Período': row.periodo,
        'Año': row.year,
        'Peso Nacimiento (kg)': row.peso_nacimiento_promedio || '-',
        'Peso Destete (kg)': row.peso_destete_promedio || '-',
        'Peso Final (kg)': row.peso_final_promedio || '-',
        'ADG (kg/día)': row.adg_promedio || '-',
        'Cantidad Animales': row.cantidad_animales,
        'Mejora vs Anterior (%)': row.mejora_vs_anterior !== null ? row.mejora_vs_anterior.toFixed(2) : '-',
        'Percentil 25': row.percentil_25 || '-',
        'Percentil 75': row.percentil_75 || '-'
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const colWidths = [
        { wch: 12 }, // Período
        { wch: 8 },  // Año
        { wch: 18 }, // Peso Nacimiento
        { wch: 16 }, // Peso Destete
        { wch: 14 }, // Peso Final
        { wch: 14 }, // ADG
        { wch: 16 }, // Cantidad
        { wch: 20 }, // Mejora
        { wch: 12 }, // P25
        { wch: 12 }  // P75
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Análisis Temporal');

      // Generate file
      XLSX.writeFile(wb, `${filename}.xlsx`);

      toast({
        title: 'Exportación exitosa',
        description: 'Los datos se han exportado a Excel correctamente'
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        variant: 'destructive',
        title: 'Error al exportar',
        description: 'No se pudo exportar los datos a Excel'
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    try {
      setExporting(true);

      // Prepare CSV content
      const headers = [
        'Período',
        'Año',
        'Peso Nacimiento (kg)',
        'Peso Destete (kg)',
        'Peso Final (kg)',
        'ADG (kg/día)',
        'Cantidad Animales',
        'Mejora vs Anterior (%)',
        'Percentil 25',
        'Percentil 75'
      ];

      const rows = data.map(row => [
        row.periodo,
        row.year,
        row.peso_nacimiento_promedio || '',
        row.peso_destete_promedio || '',
        row.peso_final_promedio || '',
        row.adg_promedio || '',
        row.cantidad_animales,
        row.mejora_vs_anterior !== null ? row.mejora_vs_anterior.toFixed(2) : '',
        row.percentil_25 || '',
        row.percentil_75 || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}.csv`;
      link.click();

      toast({
        title: 'Exportación exitosa',
        description: 'Los datos se han exportado a CSV correctamente'
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({
        variant: 'destructive',
        title: 'Error al exportar',
        description: 'No se pudo exportar los datos a CSV'
      });
    } finally {
      setExporting(false);
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar a Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar a CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
