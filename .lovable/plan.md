

# Add 14-Day Free Trial to Subscription Flow

## Overview
Update the Plans page and subscription components to clearly communicate a 14-day free trial for all paid plans. This involves UI text changes and translation updates across 3 languages.

## Changes

### 1. Update subtitle from "7 days" to "14 days" (translation files)
The `plansPage.subtitle` key currently says "Try it for 7 days. Cancel anytime." -- update to 14 days in all 3 locales.

### 2. Add free trial badge on PlanCard for paid plans
Below the price on each paid plan card, add a small green text line: "14 days free" to make it clear the trial applies. Add a new translation key `plansPage.freeTrial` = "14-day free trial".

### 3. Update StickyFooterCTA with trial info
When a paid plan is selected, show "Start 14-day free trial" instead of "Continuar" on the CTA button, and update the legal text to mention the trial. Add translation keys for these strings.

### 4. Update StickyFooterCTA hardcoded Spanish strings
The component has hardcoded Spanish text ("Plan gratuito", "Procesando...", "Continuar", legal text). These will be replaced with translation keys for proper i18n.

## Files to Modify

| File | Change |
|------|--------|
| `src/i18n/locales/es/subscription.json` | Update `plansPage.subtitle` to 14 days; add `plansPage.startTrial`, `plansPage.trialLegal`, `plansPage.processing`, `plansPage.continue`, `plansPage.freePlanLabel`, `plansPage.freeTrialBadge` |
| `src/i18n/locales/en/subscription.json` | Same keys in English |
| `src/i18n/locales/pt/subscription.json` | Same keys in Portuguese |
| `src/components/subscription/PlanCard.tsx` | Add "14-day free trial" text below the price for paid plans |
| `src/components/subscription/StickyFooterCTA.tsx` | Change CTA button text to "Start free trial" for paid plans; update legal text; replace hardcoded Spanish with i18n keys |

## Risk Assessment
- No database changes
- No route changes
- No plan names, limits, or trial logic altered (this is purely UI messaging)
- Scoped to subscription display components only
