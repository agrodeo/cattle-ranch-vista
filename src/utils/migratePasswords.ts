import { supabase } from '@/integrations/supabase/client';

export const migrateEmployeePasswords = async () => {
  try {
    console.log('Starting password migration...');
    
    // Call the public migrate-employee-passwords edge function
    const { data, error } = await supabase.functions.invoke('migrate-employee-passwords');

    if (error) {
      console.error('Password migration error:', error);
      throw error;
    }

    console.log('Password migration result:', data);
    return data;
  } catch (error) {
    console.error('Failed to migrate passwords:', error);
    throw error;
  }
};