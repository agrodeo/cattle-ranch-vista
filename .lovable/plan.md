
Objetivo: corregir el flujo de compra nativa (TestFlight) para que al tocar un plan sí aparezca la hoja de pago de Apple/Google, manteniendo MercadoPago solo en web y sin permitir activaciones sin pago.

Lo que encontré en el código actual (causas probables del error inmediato):
1) Flujo fragmentado de compras
- Hay lógica de compra repartida en `Plans.tsx`, `SubscriptionPlansModal.tsx`, `ReadOnlyModeModal.tsx` y `RevenueCatPaywall.tsx`.
- No todos usan el mismo camino (algunos llaman `revenueCatService` directo, otros `usePlatformPurchase`), lo que genera comportamientos distintos y errores difíciles de rastrear.

2) Detección de plataforma frágil
- `usePlatformPurchase` define `const platform = detectPlatform()` al render del hook y luego lo reutiliza; si esa detección inicial falla o queda desfasada, puede rutear mal.
- `detectPlatform()` hace fallback por user-agent y puede devolver `ios/android` en contextos web iPhone/Android, lo cual es riesgoso para compras nativas.

3) Inicialización de RevenueCat poco estricta
- `revenueCatService.configure()` atrapa errores y no los relanza; eso oculta fallas reales.
- `RevenueCatProvider` marca `isConfigured=true` incluso cuando la configuración falla.
- `ensureInitialized()` en no-nativo hace `return` (no error), permitiendo que se intente usar `Purchases.*` fuera de contexto.

4) Carga de offerings bloqueada por estado interno
- `useEntitlements` exige `revenueCatService.isInitialized()` antes de cargar; si hubo un fallo inicial y luego recuperación, puede quedarse sin offerings cargados/reintentos.

5) Síntoma del usuario coincide con ruta de error genérica
- El mensaje “Error en la compra…” viene de `usePlatformPurchase`, consistente con fallo previo a abrir la hoja de pago.

Plan de implementación (sin romper reglas del proyecto):
Paso 1: Unificar el flujo de compra en un solo punto
- Centralizar la ejecución real de compra en `usePlatformPurchase.initiatePurchase`.
- Hacer que `Plans.tsx`, `SubscriptionPlansModal.tsx`, `ReadOnlyModeModal.tsx` y `RevenueCatPaywall.tsx` usen ese flujo unificado.
- Mantener la regla:
  - Nativo iOS/Android: RevenueCat -> App Store / Google Play.
  - Web: MercadoPago.

Archivos:
- `src/hooks/usePlatformPurchase.tsx`
- `src/pages/Plans.tsx`
- `src/components/subscription/SubscriptionPlansModal.tsx`
- `src/components/subscription/ReadOnlyModeModal.tsx`
- `src/components/subscription/RevenueCatPaywall.tsx`

Paso 2: Endurecer detección de plataforma para compras
- Para decisiones de pago, priorizar solo `Capacitor.isNativePlatform()` + `Capacitor.getPlatform()`.
- Evitar fallback por user-agent en lógica crítica de pago.
- Resolver plataforma “en el momento del click”, no sólo al render inicial del hook.

Archivo:
- `src/lib/platformDetection.ts`
- `src/hooks/usePlatformPurchase.tsx`

Paso 3: Hacer explícitas las fallas de inicialización RevenueCat
- En `revenueCatService.configure()`, relanzar errores críticos (no tragarlos silenciosamente).
- En `ensureInitialized()`, si no es entorno nativo y se intenta compra nativa, lanzar error claro.
- Validar `productId` vacío antes de llamar SDK.
- Enriquecer logs (código, dominio, mensaje y detalles serializados de error nativo).

Archivo:
- `src/services/revenueCatService.ts`

Paso 4: Corregir el estado de “configured” y reintentos reales
- `RevenueCatProvider` debe reflejar estado real de configuración (no “true” si falló).
- `useEntitlements` debe permitir reintentos de `getOfferings/getCustomerInfo` apoyándose en `ensureInitialized()` en vez de bloquear por `isInitialized()` local.

Archivos:
- `src/providers/RevenueCatProvider.tsx`
- `src/hooks/useEntitlements.tsx`

Paso 5: Mensajes de error útiles para soporte
- Diferenciar errores:
  - cancelación del usuario,
  - producto no encontrado,
  - tienda no disponible / configuración nativa faltante,
  - RevenueCat no inicializado.
- Mostrar texto accionable para usuario final y dejar detalle técnico en consola.

Archivos:
- `src/hooks/usePlatformPurchase.tsx`
- componentes de planes/paywall que muestran toast

Paso 6: Verificación funcional obligatoria (incluye E2E)
1. iOS TestFlight:
- Abrir `/plans` y modal de suscripción.
- Tocar plan mensual y anual.
- Confirmar que aparece hoja de pago nativa.
- Cancelar: no debe mostrar error destructivo.
- Completar compra sandbox: debe actualizar estado premium.

2. Web:
- Seleccionar plan en `/plans` y modal.
- Debe abrir MercadoPago (sin tocar App Store/Google Play).

3. Seguridad/facturación:
- Verificar que nadie puede activar plan sin pago (RPC restringida sigue intacta).
- Confirmar que no se alteran límites, trial ni nombres de planes.

4. Regresión guardrails:
- No cambios en rutas críticas (`/actividades`, `/animales`).
- Sin cambios globales de estilo.
- Sin cambios destructivos de DB/políticas.

Riesgo y mitigación:
- Riesgo principal: romper alguna de las entradas actuales de compra al unificar.
- Mitigación: unificar con una interfaz común mínima y mantener los mismos IDs de planes/productos existentes (`Personal_Monthly`, `Advanced_*`, `Producer_*`, `Herd_*`), más pruebas E2E en TestFlight y web antes de cerrar.

Resultado esperado después del cambio:
- En TestFlight, tocar un plan abrirá flujo de compra nativo en vez de caer directo en toast de error.
- En web, seguirá MercadoPago.
- Sin posibilidad de “activar plan sin pagar”.
