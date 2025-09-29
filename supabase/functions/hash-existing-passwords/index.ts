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

    const { requesterId } = await req.json()

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

    // Get all plain text passwords that need to be hashed
    const { data: passwords, error: fetchError } = await supabaseAdmin
      .from('user_passwords')
      .select('id, user_id, password_text')
      .not('password_text', 'like', 'bcrypt_placeholder:%')
      .not('password_text', 'like', '$2%') // Skip already hashed passwords

    if (fetchError) {
      console.error('Fetch passwords error:', fetchError)
      throw fetchError
    }

    if (!passwords || passwords.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No plain text passwords found to hash', updated: 0 }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let updated = 0
    const saltRounds = 12

    // Hash each password
    for (const passwordRecord of passwords) {
      try {
        // Skip if already hashed or empty
        if (!passwordRecord.password_text || 
            passwordRecord.password_text.startsWith('$2') ||
            passwordRecord.password_text.startsWith('bcrypt_placeholder:')) {
          continue
        }

        // Hash the plain text password
        const hashedPassword = await bcrypt.hash(passwordRecord.password_text, saltRounds.toString())

        // Update the record with hashed password
        const { error: updateError } = await supabaseAdmin
          .from('user_passwords')
          .update({ 
            password_text: hashedPassword,
            updated_at: new Date().toISOString()
          })
          .eq('id', passwordRecord.id)

        if (updateError) {
          console.error(`Error updating password for user ${passwordRecord.user_id}:`, updateError)
          continue
        }

        updated++

        // Log security event
        await supabaseAdmin.rpc('log_security_event', {
          _action: 'password_hashed',
          _table_name: 'user_passwords',
          _record_id: passwordRecord.user_id,
          _details: { migrated_by: requesterId }
        })

      } catch (error) {
        console.error(`Error processing password for user ${passwordRecord.user_id}:`, error)
        continue
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully hashed ${updated} passwords`,
        total: passwords.length,
        updated 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in hash-existing-passwords function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})