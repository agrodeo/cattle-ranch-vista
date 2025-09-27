import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

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

    // Validate input
    if (!email || !password || !fullName || !role) {
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

    // Hash the password securely
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds.toString())

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
      console.error('User creation error:', createError)
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
        console.error('Role insertion error:', roleInsertError)
        // If role creation fails, cleanup the user
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
        throw roleInsertError
      }

      // Store hashed password for admin access
      const { error: passwordError } = await supabaseAdmin
        .from('user_passwords')
        .insert({
          user_id: userData.user.id,
          password_text: hashedPassword, // Store hashed password
          created_by: requesterId
        })

      if (passwordError) {
        console.error('Error storing password:', passwordError)
        // Don't fail the entire operation if password storage fails
      }

      // Log security event
      await supabaseAdmin.rpc('log_security_event', {
        _action: 'user_created',
        _table_name: 'users',
        _record_id: userData.user.id,
        _details: { email, role, created_by: requesterId }
      })
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})