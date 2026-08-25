import { supabase } from "@/integrations/supabase/client";

/**
 * Invokes a Supabase Edge Function always attaching an explicit Authorization
 * header from the current session.
 *
 * Why: relying on the client's implicit token injection can produce a generic
 * 401 "Missing authorization header" when the session is still hydrating or a
 * token refresh is in-flight. Reading the session first makes the call
 * deterministic and gives us a clear error instead of an opaque non-2xx.
 */
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  options: { body?: unknown; headers?: Record<string, string> } = {}
): Promise<{ data: T | null; error: Error | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const headers: Record<string, string> = { ...(options.headers || {}) };
  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return supabase.functions.invoke<T>(name, {
    body: options.body as Record<string, unknown> | undefined,
    headers,
  }) as Promise<{ data: T | null; error: Error | null }>;
}
