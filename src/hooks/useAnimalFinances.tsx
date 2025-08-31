import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AnimalFinanceRecord {
  id: string;
  fecha: string;
  tipo: 'gasto' | 'ingreso';
  categoria: string;
  monto: number;
  descripcion?: string;
}

export interface AnimalFinanceSummary {
  totalGastos: number;
  totalIngresos: number;
  gastosVeterinarios: number;
  valorEstimado: number;
  roi: number;
}

export function useAnimalFinances(animalId: string) {
  const [records, setRecords] = useState<AnimalFinanceRecord[]>([]);
  const [summary, setSummary] = useState<AnimalFinanceSummary>({
    totalGastos: 0,
    totalIngresos: 0,
    gastosVeterinarios: 0,
    valorEstimado: 0,
    roi: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFinances = async () => {
      if (!animalId) return;
      
      setIsLoading(true);
      try {
        // Fetch animal sales records
        const { data: sales, error: salesError } = await supabase
          .from('finances_animal_sales')
          .select(`
            id,
            unit_price,
            finance:finances(
              date,
              amount,
              description,
              type,
              category:finance_categories(name)
            )
          `)
          .eq('animal_id', animalId);

        if (salesError) throw salesError;

        const financeRecords: AnimalFinanceRecord[] = [];
        let totalIngresos = 0;
        let totalGastos = 0;

        sales?.forEach(sale => {
          if (sale.finance) {
            const record: AnimalFinanceRecord = {
              id: sale.id,
              fecha: sale.finance.date || '',
              tipo: sale.finance.type === 'income' ? 'ingreso' : 'gasto',
              categoria: sale.finance.category?.name || 'Venta de Animal',
              monto: sale.finance.amount || 0,
              descripcion: sale.finance.description
            };
            financeRecords.push(record);
            
            if (record.tipo === 'ingreso') {
              totalIngresos += record.monto;
            } else {
              totalGastos += record.monto;
            }
          }
        });

        setRecords(financeRecords);
        setSummary({
          totalGastos,
          totalIngresos,
          gastosVeterinarios: 0, // Would need separate calculation
          valorEstimado: 0, // Would need market value calculation
          roi: totalIngresos > 0 ? ((totalIngresos - totalGastos) / totalGastos) * 100 : 0
        });

      } catch (error) {
        console.error('Error fetching animal finances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFinances();
  }, [animalId]);

  return { records, summary, isLoading };
}