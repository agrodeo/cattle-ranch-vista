

## Fix: auth-email-hook import error

### Problem
The `auth-email-hook` edge function fails to boot because `@lovable.dev/webhooks-js` does not export a named `Webhook`. Every auth email (password reset, signup confirmation, etc.) is silently failing.

### Solution
1. **Fix the import** in `supabase/functions/auth-email-hook/index.ts` — change the named import to a default import or the correct export name. I will check the package's actual API first, then update the import accordingly.
2. **Redeploy** the `auth-email-hook` edge function.
3. **Verify** the function boots without errors by checking logs after deploy.

### Scope
- One file changed: `supabase/functions/auth-email-hook/index.ts` (import line only)
- No database, RLS, or UI changes
- Templates themselves are fine — only the hook's import is broken

