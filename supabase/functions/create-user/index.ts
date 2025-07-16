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

    const { email, password, fullName, role, requesterId } = await req.json()

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

    // Create user with admin privileges
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: fullName
      }
    })

    if (createError) {
      throw createError
    }

    if (userData.user) {
      // Create user role
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userData.user.id,
          role,
          created_by: requesterId
        })

      if (roleInsertError) {
        // If role creation fails, cleanup the user
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
        throw roleInsertError
      }

      // Store password for admin access
      const { error: passwordError } = await supabaseAdmin
        .from('user_passwords')
        .insert({
          user_id: userData.user.id,
          password_text: password,
          created_by: requesterId
        })

      if (passwordError) {
        console.error('Error storing password:', passwordError)
        // Don't fail the entire operation if password storage fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: userData.user }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})