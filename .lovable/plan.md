
Objetivo: lograr que al tocar un plan en TestFlight (desplegado con Despia) se abra el flujo nativo de compra (App Store), evitando que caiga al flujo web de MercadoPago y eliminando los errores silenciosos previos.

Diagnóstico confirmado (con evidencia)
- Síntoma actual: al seleccionar plan no aparece hoja nativa de compra.
- Evidencia de logs: hubo invocaciones recientes a `mp-sub-create-link` con error interno (`Cannot read properties of undefined...`) durante intentos de compra.
- Conclusión: en TestFlight/Despia el código está ruteando al flujo web, no al nativo.
- Causa raíz principal: la detección nativa actual depende de Capacitor (`Capacitor.isNativePlatform()`), pero en runtime Despia ese check no necesariamente representa el entorno de compra.
- Causas adicionales que agravan:
  1) `RevenueCatPaywall` envía `pkg.product.identifier` como `planId`, mientras `usePlatformPurchase` espera claves de plan (`personal|avanzado|productor|cabana`) para mapear producto.
  2) `purchaseWeb` espera `response.init_point`, pero la edge function devuelve `url`.
  3) `mp-sub-create-link` usa un cliente Supabase antiguo en Deno que rompe en runtime.
  4) `Plans.tsx` muestra éxito tras `await initiatePurchase()` sin validar `result.success`.

Do I know what the issue is?
- Sí: hoy la compra en Despia está tomando el camino web por detección de plataforma incorrecta para ese runtime; además, el fallback web está roto por incompatibilidad de respuesta y por error en la edge function.

Implementación propuesta (secuencia)
1) Agregar detección explícita de runtime Despia para compras
- Archivo: `src/lib/platformDetection.ts`
- Añadir helpers específicos:
  - `isDespiaRuntime()` (detección segura por señales de runtime Despia).
  - `getDespiaPlatform()` (`ios|android|null`).
  - Mantener helpers actuales de Capacitor para no romper otros módulos.
- Importante: no convertir globalmente todo “native” a Despia para hooks de RevenueCat Capacitor (evita regresiones en `useEntitlements`).

2) Unificar ruteo de compra por runtime real (Capacitor vs Despia vs Web)
- Archivo: `src/hooks/usePlatformPurchase.tsx`
- Cambiar `initiatePurchase` para resolver en click-time:
  - Capacitor nativo -> flujo actual RevenueCat Capacitor.
  - Despia runtime -> comando nativo Despia para RevenueCat (compra nativa).
  - Web -> MercadoPago.
- Añadir `resolveProductId(...)` robusto:
  - Si entra clave de plan, mapear a product ID.
  - Si entra product ID directo (caso paywall), usarlo sin remap.
- Mejorar logs de diagnóstico por rama (`[Purchase][runtime]`).

3) Corregir entradas UI para no falsear éxito y no romper mapping
- Archivos:
  - `src/components/subscription/RevenueCatPaywall.tsx`
  - `src/pages/Plans.tsx`
  - `src/components/subscription/SubscriptionPlansModal.tsx`
  - `src/components/subscription/ReadOnlyModeModal.tsx` (si aplica)
- Cambios:
  - Usar resultado estructurado (`success`, `pending`, `cancelled`) y no asumir éxito.
  - En `Plans.tsx`, no mostrar “suscripción activada” hasta `success === true`.
  - Asegurar que todos los entry points consuman el mismo contrato de `initiatePurchase`.

4) Reparar fallback web para que no falle en caso de ruta web
- Archivos:
  - `src/hooks/usePlatformPurchase.tsx`
  - `supabase/functions/mp-sub-create-link/index.ts`
- Cambios:
  - Cliente: aceptar `response.url || response.init_point`.
  - Edge function: actualizar cliente Supabase Deno a implementación compatible (evitar crash actual) y devolver payload consistente.
- Resultado: aunque no debería usarse en TestFlight/Despia, el fallback web queda sano.

5) Mantener integridad de negocio y guardrails
- Sin tocar nombres de planes/límites/trial.
- Sin cambios destructivos de DB, rutas críticas o estilos globales.
- No habilitar activación premium sin pago: la fuente de verdad sigue siendo backend/webhooks.

Validación obligatoria (E2E)
1. TestFlight (Despia)
- Abrir app autenticada.
- Probar compra desde:
  - `/plans`
  - modal de suscripción
  - paywall de feature premium (si aplica)
- Esperado: se abre hoja nativa de App Store al tocar plan.
- Cancelar compra: sin toast destructivo engañoso.
- Completar sandbox: estado premium actualizado tras sincronización/webhook.

2. Web
- Seleccionar plan en `/plans` y modal.
- Esperado: abre MercadoPago correctamente (sin error de edge function).

3. Regresión
- Verificar que no se alteraron rutas críticas, límites, trial ni nombres de planes.
- Confirmar que no hay cambios globales de estilo ni regresiones en flujo existente.

Riesgos y mitigación
- Riesgo: detectar mal runtime Despia y disparar rama incorrecta.
  - Mitigación: helper dedicado + logs por rama + prueba E2E en TestFlight.
- Riesgo: UX de éxito prematuro.
  - Mitigación: contrato de resultado explícito y toasts condicionados por `success`.

Archivos previstos para tocar
- `src/lib/platformDetection.ts`
- `src/hooks/usePlatformPurchase.tsx`
- `src/pages/Plans.tsx`
- `src/components/subscription/SubscriptionPlansModal.tsx`
- `src/components/subscription/RevenueCatPaywall.tsx`
- `src/components/subscription/ReadOnlyModeModal.tsx` (si aplica)
- `supabase/functions/mp-sub-create-link/index.ts`
