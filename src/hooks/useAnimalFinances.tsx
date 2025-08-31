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
  costoAproximado: number;
  roi: number;
}

export function useAnimalFinances(animalId: string) {
  const [records, setRecords] = useState<AnimalFinanceRecord[]>([]);
  const [summary, setSummary] = useState<AnimalFinanceSummary>({
    totalGastos: 0,
    totalIngresos: 0,
    gastosVeterinarios: 0,
    costoAproximado: 0,
    roi: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFinances = async () => {
      if (!animalId) return;
      
      setIsLoading(true);
      try {
        // Get user's cabaña_id first using the helper function
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('User not authenticated');

        const { data: userInfo, error: userError } = await supabase
          .rpc('get_user_cabana_info', { user_uuid: userData.user.id });

        if (userError) throw userError;
        if (!userInfo || userInfo.length === 0) throw new Error('User has no cabaña');

        const cabanaId = userInfo[0].cabana_id;

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

        // Fetch total expenses from the cabaña
        const { data: allExpenses, error: expensesError } = await supabase
          .from('finances')
          .select('amount')
          .eq('cabaña_id', cabanaId)
          .eq('type', 'expense');

        if (expensesError) throw expensesError;

        // Count active animals in the cabaña
        const { count: activeAnimalsCount, error: countError } = await supabase
          .from('animals')
          .select('*', { count: 'exact', head: true })
          .eq('cabaña_id', cabanaId)
          .not('status', 'in', '(muerto,vendido)');

        if (countError) throw countError;

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

        // Calculate approximate cost per animal
        const totalCabanaExpenses = allExpenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
        const costoAproximado = activeAnimalsCount && activeAnimalsCount > 0 
          ? totalCabanaExpenses / activeAnimalsCount 
          : 0;

        setRecords(financeRecords);
        setSummary({
          totalGastos,
          totalIngresos,
          gastosVeterinarios: 0, // Would need separate calculation
          costoAproximado,
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