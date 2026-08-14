import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.2.0/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { authErrorResponse, requireManager } from "../_shared/tenant.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ChangePasswordSchema = z.object({
  action: z.literal('change_password'),
  userId: z.string().uuid(),
  newPassword: z.string().min(8).max(128),
});

const DeleteUserSchema = z.object({
  action: z.literal('delete_user'),
  userId: z.string().uuid(),
});

const ManageUserSchema = z.discriminatedUnion('action', [
  ChangePasswordSchema,
  DeleteUserSchema,
]);

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
    const parsed = ManageUserSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = parsed.data;

    // Verify the requester from their JWT (never from the request body)
    const caller = await requireManager(req);
    const requesterId = caller.id;

    switch (data.action) {
      case 'change_password': {
        const saltRounds = 12
        const hashedPassword = await bcrypt.hash(data.newPassword, saltRounds.toString())

        const { error: authError } = await supabaseAdmin
          .from('auth.users')
          .update({ 
            encrypted_password: hashedPassword,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.userId);

        if (authError) {
          console.error('Auth password update error:', authError)
          throw authError
        }

        const { error: passwordError } = await supabaseAdmin
          .from('user_passwords')
          .upsert({
            user_id: data.userId,
            password_text: hashedPassword,
            updated_at: new Date().toISOString()
          })

        if (passwordError) {
          console.error('Password storage error:', passwordError)
          throw passwordError
        }

        await supabaseAdmin.rpc('log_security_event', {
          _action: 'password_changed',
          _table_name: 'user_passwords',
          _record_id: data.userId,
          _details: { changed_by: requesterId }
        })

        return new Response(
          JSON.stringify({ success: true, message: 'Password updated successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete_user': {
        await supabaseAdmin.rpc('log_security_event', {
          _action: 'user_deleted',
          _table_name: 'users',
          _record_id: data.userId,
          _details: { deleted_by: requesterId }
        })

        const { error: deleteError } = await supabaseAdmin
          .from('auth.users')
          .delete()
          .eq('id', data.userId);

        if (deleteError) {
          console.error('User deletion error:', deleteError)
          throw deleteError
        }

        return new Response(
          JSON.stringify({ success: true, message: 'User deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    const authResponse = authErrorResponse(error, corsHeaders)
    if (authResponse) return authResponse
    console.error('Error in manage-user function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
