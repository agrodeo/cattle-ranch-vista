import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, userId, newPassword, requesterId } = await req.json()

    // Verify that the requester is an admin
    const { data: requesterRole, error: roleError } = await supabaseAdmin
      .rpc('get_user_role', { _user_id: requesterId })

    if (roleError || requesterRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (action === 'change_password') {
      // Change user password
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      })

      if (authError) {
        throw authError
      }

      // Update stored password
      const { error: passwordError } = await supabaseAdmin
        .from('user_passwords')
        .update({ 
          password_text: newPassword,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (passwordError) {
        console.error('Error updating stored password:', passwordError)
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else if (action === 'delete_user') {
      // Delete user completely
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (deleteError) {
        throw deleteError
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in manage-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})