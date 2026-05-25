# Onboarding Redesign — Activación de carga masiva de animales

## Objetivo
Pasar de un onboarding que termina con 1 animal cargado a uno donde el productor carga 20-50+ animales en menos de 5 minutos, ve valor inmediato y queda activado.

## Cambios principales

### 1. `OnboardingWizard.tsx` — reestructura
- Reordenar pasos: `["animals", "corrals", "vaccines"]` (antes: vaccines → corrals → animals).
- Agregar **pantalla de bienvenida** previa al wizard con nombre del owner y de la cabaña (leído de `pending_owner_data` / `pending_cabana` o de los datos ya creados), 3 pasos resumidos y CTA "Empezar".
- Reemplazar la pantalla de éxito genérica por un **resumen real**: cantidad de animales cargados, corrales creados, CTA "Ver mi rodeo" → `/animales`, secundario "Ir al Dashboard". Quitar el auto-redirect de 2s.
- Mantener el indicador de progreso existente pero agregar una `Progress` bar de shadcn y el texto "Paso X de 3".
- El paso de animales NO muestra botón skip; corrals y vaccines muestran skip con labels "Lo haré después" / "Configurar después".

### 2. `AnimalStep.tsx` — reescritura completa (carga masiva)
Reemplazar el formulario de 1 animal por una **tabla de carga batch inline**:
- Columnas: Caravana, Sexo (toggle ♂/♀), Año Nac., Raza (combobox), Categoría, Fecha exacta (opcional).
- Inicia con 5 filas vacías. Botón "Agregar más filas" agrega 5. Auto-añade 3 cuando se completa la última fila visible.
- Sección **"Valores por defecto"** arriba: año de nacimiento (pre-cargado con `año actual - 2`), raza, categoría. Se aplican a filas nuevas.
- **Generador de rango rápido** abajo: prefijo + desde + hasta + sexo + año → genera filas (ej. AG-001..AG-050) que el usuario revisa antes de enviar.
- **Validación inline** sin bloquear otras filas:
  - Duplicados dentro del batch (resaltados en rojo).
  - Duplicados contra `animals` existentes en la DB (mismo `cabaña_id`).
  - Límite de plan (`max_animals` de la suscripción).
- Contador en vivo: "X animales listos para cargar".
- Requeridos por fila: `id_tag` + `sex` + `birth_year` (puede venir del default). `breed`/`category`/`birth_date` opcionales.
- Submit:
  - Filtra filas válidas, ignora vacías.
  - Inserta en bulk a `animals` con `cabaña_id = currentUser.cabañaId`, `birth_date = row.birth_date || \`${year}-01-01\``, `status = 'Activo'`.
  - Progreso visible, toast de éxito con conteo, avance automático a corrales.
- NO tiene botón skip.

### 3. `CorralStep.tsx` — simplificar
- Texto corto: "Organizá tus animales en corrales para un mejor seguimiento".
- 3 inputs de nombre por defecto + botón "Agregar otro".
- Insert batch a `corrales`.
- Skip "Lo haré después" disponible.
- (La asignación drag-and-drop opcional se deja como follow-up para no inflar este cambio; mantenemos el alcance del onboarding ajustado.)

### 4. `VaccinesStep.tsx` — simplificar a checklist
- Reducir a checkbox list de las 5 vacunas default (todas checked por defecto).
- Eliminar configuración expandible (edad, sexo, mandatory) del onboarding — esto sigue disponible en Settings.
- Texto: "Seleccioná las vacunas que usás en tu establecimiento. Podés configurar los detalles después."
- Submit hace upsert simple a `cabaña_vaccination_requirements` con defaults.
- Skip "Configurar después".

### 5. `Dashboard.tsx` — tarjeta "Getting Started"
- Si el usuario tiene ≥1 animal y no descartó la tarjeta (`localStorage.agrodeo_onboarding_explored`), mostrar card al tope con:
  - "🎉 ¡Tu rodeo está listo! Tenés N animales cargados."
  - Botones: Ver mis animales, Reproducción, Sanidad, "Entendido, cerrar".

### 6. Traducciones
Agregar el namespace de claves nuevas en `src/i18n/locales/{es,en,pt}/onboarding.json` (no en `es.json/en.json/pt.json` planos, que no existen — el proyecto usa locales separados por namespace).

## Guardrails respetados
- Sin renombrar/eliminar columnas, RLS, rutas o componentes existentes.
- Ruta animales sigue siendo `/animales` (el CTA del éxito navega ahí).
- Sin cambios globales de tipografía/color: todo con tokens semánticos existentes.
- Reutiliza lógica de duplicados y límite de plan del `AnimalFormDialog.tsx` (mismo query por `id_tag` + `cabaña_id`, mismo check de suscripción).
- Migraciones: ninguna (toda la lógica es client-side sobre tablas existentes).

## Detalles técnicos
- Tipos nuevos `OnboardingAnimalRow` y `BatchDefaults` locales a `AnimalStep.tsx`.
- Estado por `useState` con array de filas, índice estable (`crypto.randomUUID()`).
- Validación con debounce ligero al editar `id_tag`.
- Insert masivo: `supabase.from('animals').insert(animalsToInsert)` en una sola llamada; si excede el límite del plan, se cortan al máximo permitido y se avisa.
- Progress bar: `<Progress value={(stepIndex + 1) / 3 * 100} />`.

## Pre-merge smoke tests
1. Cargar Animals, Activities, Corrales, Finance — sin regresiones.
2. Onboarding flow: bienvenida → cargar 10 animales con generador de rango → crear 2 corrales → seleccionar vacunas → éxito → CTA navega a `/animales`.
3. Skip de corrales y vaccines funciona; skip de animals NO existe.
4. Validar que duplicados (dentro del batch y vs DB) se marcan sin bloquear el resto.
5. Validar tope de plan: cargar más que `max_animals` corta y avisa.
6. RLS: insert con usuario `owner` funciona; `worker` también (políticas actuales ya lo permiten).
7. Dashboard muestra "Getting Started" tras onboarding y se puede descartar.
