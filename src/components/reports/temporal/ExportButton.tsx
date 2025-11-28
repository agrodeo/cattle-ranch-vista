import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['reports']);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const exportToExcel = () => {
    try {
      setExporting(true);

      // Prepare data for export
      const exportData = data.map(row => ({
        [t('reports:export.columns.period')]: row.periodo,
        [t('reports:export.columns.year')]: row.year,
        [t('reports:export.columns.birthWeight')]: row.peso_nacimiento_promedio || '-',
        [t('reports:export.columns.weaningWeight')]: row.peso_destete_promedio || '-',
        [t('reports:export.columns.finalWeight')]: row.peso_final_promedio || '-',
        [t('reports:export.columns.adg')]: row.adg_promedio || '-',
        [t('reports:export.columns.animalCount')]: row.cantidad_animales,
        [t('reports:export.columns.improvement')]: row.mejora_vs_anterior !== null ? row.mejora_vs_anterior.toFixed(2) : '-',
        [t('reports:export.columns.percentile25')]: row.percentil_25 || '-',
        [t('reports:export.columns.percentile75')]: row.percentil_75 || '-'
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
        title: t('reports:export.success'),
        description: t('reports:export.successDesc')
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        variant: 'destructive',
        title: t('reports:export.error'),
        description: t('reports:export.errorDesc')
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
        t('reports:export.columns.period'),
        t('reports:export.columns.year'),
        t('reports:export.columns.birthWeight'),
        t('reports:export.columns.weaningWeight'),
        t('reports:export.columns.finalWeight'),
        t('reports:export.columns.adg'),
        t('reports:export.columns.animalCount'),
        t('reports:export.columns.improvement'),
        t('reports:export.columns.percentile25'),
        t('reports:export.columns.percentile75')
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
        title: t('reports:export.success'),
        description: t('reports:export.successDesc')
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast({
        variant: 'destructive',
        title: t('reports:export.error'),
        description: t('reports:export.errorDesc')
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
              {t('reports:export.exporting')}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              {t('reports:export.button')}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {t('reports:export.toExcel')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="mr-2 h-4 w-4" />
          {t('reports:export.toCSV')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
