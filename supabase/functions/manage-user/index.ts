import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.2.0/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

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

    // Validate input
    if (!action || !requesterId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify that the requester is an admin
    const { data: requesterRole, error: roleError } = await supabaseAdmin
      .rpc('get_user_role', { _user_id: requesterId })

    if (roleError || requesterRole !== 'admin') {
      console.error('Authorization error:', roleError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    switch (action) {
      case 'change_password':
        if (!userId || !newPassword) {
          return new Response(
            JSON.stringify({ error: 'Missing userId or newPassword' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Hash the new password
        const saltRounds = 12
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds.toString())

        // Update password in auth system
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword
        })

        if (authError) {
          console.error('Auth password update error:', authError)
          throw authError
        }

        // Update hashed password in user_passwords table
        const { error: passwordError } = await supabaseAdmin
          .from('user_passwords')
          .upsert({
            user_id: userId,
            password_text: hashedPassword, // Store hashed password
            updated_at: new Date().toISOString()
          })

        if (passwordError) {
          console.error('Password storage error:', passwordError)
          throw passwordError
        }

        // Log security event
        await supabaseAdmin.rpc('log_security_event', {
          _action: 'password_changed',
          _table_name: 'user_passwords',
          _record_id: userId,
          _details: { changed_by: requesterId }
        })

        return new Response(
          JSON.stringify({ success: true, message: 'Password updated successfully' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      case 'delete_user':
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'Missing userId' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Log security event before deletion
        await supabaseAdmin.rpc('log_security_event', {
          _action: 'user_deleted',
          _table_name: 'users',
          _record_id: userId,
          _details: { deleted_by: requesterId }
        })

        // Delete user from auth system (this will cascade to other tables via foreign keys)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (deleteError) {
          console.error('User deletion error:', deleteError)
          throw deleteError
        }

        return new Response(
          JSON.stringify({ success: true, message: 'User deleted successfully' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      default:
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})