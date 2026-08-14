/**
 * Shared tenant/authorization helpers for edge functions.
 *
 * These helpers use plain fetch so they work regardless of which Supabase
 * client version a function imports.
 */

const SUPABASE_URL = () => Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = () => Deno.env.get("SUPABASE_ANON_KEY") ?? "";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export interface Caller {
  id: string;
  email: string | null;
  cabanaId: string | null;
  role: string | null;
}

function bearer(req: Request): string {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new AuthError("Missing authorization header");
  return token;
}

/** Validates the caller's JWT and returns their verified identity. */
export async function getAuthenticatedUser(req: Request): Promise<{ id: string; email: string | null }> {
  const token = bearer(req);
  const res = await fetch(`${SUPABASE_URL()}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY() || SERVICE_KEY(),
    },
  });
  if (!res.ok) throw new AuthError("Invalid or expired session");
  const user = await res.json();
  if (!user?.id) throw new AuthError("Invalid or expired session");
  return { id: user.id, email: user.email ?? null };
}

/** Verified caller identity plus their own cabaña and role, resolved server-side. */
export async function getCaller(req: Request): Promise<Caller> {
  const user = await getAuthenticatedUser(req);

  const profileRes = await fetch(
    `${SUPABASE_URL()}/rest/v1/profiles?user_id=eq.${user.id}&select=${encodeURIComponent('cabaña_id')}&limit=1`,
    { headers: { apikey: SERVICE_KEY(), Authorization: `Bearer ${SERVICE_KEY()}` } },
  );
  const profiles = profileRes.ok ? await profileRes.json() : [];
  const cabanaId = profiles?.[0]?.["cabaña_id"] ?? null;

  const roleRes = await fetch(`${SUPABASE_URL()}/rest/v1/rpc/get_user_role`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY(),
      Authorization: `Bearer ${SERVICE_KEY()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ _user_id: user.id }),
  });
  let role: string | null = null;
  if (roleRes.ok) {
    const raw = await roleRes.json();
    role = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
  }

  return { id: user.id, email: user.email, cabanaId, role };
}

/**
 * Ensures the caller belongs to the ranch they are trying to act on.
 * Never trust a cabaña id coming from the request body without this check.
 */
export async function requireCabanaAccess(req: Request, targetCabanaId?: string | null): Promise<Caller> {
  const caller = await getCaller(req);
  if (!caller.cabanaId) {
    throw new AuthError("Your account is not linked to a ranch", 403);
  }
  if (targetCabanaId && targetCabanaId !== caller.cabanaId) {
    throw new AuthError("You do not have access to this ranch", 403);
  }
  return caller;
}

const MANAGER_ROLES = ["admin", "owner", "manager"];

/** Ensures the verified caller has a management role (never trust a client-supplied id). */
export async function requireManager(req: Request): Promise<Caller> {
  const caller = await getCaller(req);
  if (!caller.role || !MANAGER_ROLES.includes(caller.role)) {
    throw new AuthError("Unauthorized - admin access required", 403);
  }
  return caller;
}

export function authErrorResponse(error: unknown, corsHeaders: Record<string, string>): Response | null {
  if (error instanceof AuthError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}
