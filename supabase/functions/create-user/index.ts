import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.2.0/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(100).trim(),
  role: z.enum(['admin', 'employee', 'read_only']),
  requesterId: z.string().uuid(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, fullName, role, requesterId } = parsed.data;

    // Verify that the requester is an admin
    const { data: requesterRole, error: roleError } = await supabaseAdmin
      .rpc('get_user_role', { _user_id: requesterId })

    if (roleError || (Array.isArray(requesterRole) ? requesterRole[0] : requesterRole) !== 'admin') {
      console.error('Authorization error:', roleError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized - admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hash the password securely
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds.toString())

    // Create user with admin privileges using direct SQL insert
    const userId = crypto.randomUUID();
    
    const { error: createError } = await supabaseAdmin
      .from('auth.users')
      .insert({
        id: userId,
        email,
        encrypted_password: hashedPassword,
        email_confirmed_at: new Date().toISOString(),
        raw_user_meta_data: { full_name: fullName },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (createError) {
      console.error('User creation error:', createError)
      throw createError
    }

    const userData = { id: userId, email, user_metadata: { full_name: fullName } };

    if (userData) {
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userData.id,
          role,
          created_by: requesterId
        })

      if (roleInsertError) {
        console.error('Role insertion error:', roleInsertError)
        await supabaseAdmin.from('auth.users').delete().eq('id', userData.id)
        throw roleInsertError
      }

      const { error: passwordError } = await supabaseAdmin
        .from('user_passwords')
        .insert({
          user_id: userData.id,
          password_text: hashedPassword,
          created_by: requesterId
        })

      if (passwordError) {
        console.error('Error storing password:', passwordError)
      }

      await supabaseAdmin.rpc('log_security_event', {
        _action: 'user_created',
        _table_name: 'users',
        _record_id: userData.id,
        _details: { email, role, created_by: requesterId }
      })
    }

    return new Response(
      JSON.stringify({ success: true, user: userData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
