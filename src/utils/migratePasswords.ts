import { supabase } from '@/integrations/supabase/client';

export const migrateEmployeePasswords = async () => {
  try {
    console.log('Starting password migration...');
    
    // Get current user to use as requester
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User must be authenticated to migrate passwords');
    }

    // Call the hash-existing-passwords edge function
    const { data, error } = await supabase.functions.invoke('hash-existing-passwords', {
      body: { requesterId: user.id }
    });

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