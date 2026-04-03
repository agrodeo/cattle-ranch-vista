

## Fix: Paddle Customer Portal 404

### Problem
The "Administrar Suscripcion" button links to `https://customer-portal.paddle.com`, which is a generic placeholder that returns 404. Paddle requires opening the customer portal programmatically via their JS SDK's `Paddle.Checkout.open()` or the dedicated `Paddle.CustomerPortal.open()` method — not a bare URL.

### Solution
Use the Paddle JS SDK (already initialized in `PaddleProvider`) to open the customer portal. The SDK method is `paddle.CustomerPortal.open()`, which requires a `customer_id` or an active `subscription_id`.

### Changes

**1. `src/pages/Subscription.tsx`**
- Replace `window.open('https://customer-portal.paddle.com', '_blank')` with a call that uses the Paddle SDK to open the portal.
- Import `usePaddle` hook and retrieve the paddle instance.
- Look up the user's Paddle subscription ID (from `billing_subscriptions` table or the existing subscription hook) and call `paddle.Checkout.open` with the cancel/update URL, or use the Paddle-provided cancel/update links stored in the subscription record.

**2. `src/components/subscription/CustomerCenter.tsx`**
- Same fix: replace the hardcoded URL with the SDK-based portal open.

**3. Alternative approach (simpler):**
If the Paddle subscription record stores a `management_url` or `update_url` (which Paddle webhooks provide in `subscription.created` / `subscription.updated` events), we can:
- Store those URLs in `billing_subscriptions` during webhook processing
- Use them directly as the link target — no SDK call needed

I'll check the webhook and billing_subscriptions schema to determine which approach fits best.

### Files affected
| File | Change |
|------|--------|
| `src/pages/Subscription.tsx` | Replace hardcoded URL with SDK or stored management URL |
| `src/components/subscription/CustomerCenter.tsx` | Same replacement |
| `supabase/functions/paddle-webhook/index.ts` | Possibly store `management_urls` from Paddle events |
| Migration (if needed) | Add `management_url` column to `billing_subscriptions` |

