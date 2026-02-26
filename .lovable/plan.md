

# Internationalize Plans Page Fully (ES/EN/PT)

## Problem
Several components on the Plans page still have hardcoded Spanish text, breaking the experience for English and Portuguese users:

1. **FAQAccordion** -- All 4 FAQ questions and answers are hardcoded in Spanish. The trial FAQ still says "7 days" instead of 14.
2. **BillingToggle** -- "Mensual", "Anual", and "-20%" are hardcoded in Spanish.
3. **CompareSheet** -- Feature names ("Animales", "Chat IA", "Soporte"), feature values ("Ilimitados", "Ilimitado", "Basico", "Prioritario", etc.), header text ("Comparar planes", "Encontra el plan perfecto..."), column labels ("Gratis"), and CTA buttons ("Elegir {name}") are all hardcoded in Spanish.
4. **PlanCard** -- The badge comparison `plan.badge === 'Mas popular'` is fragile since badges are now translated; needs to compare by plan ID instead.

## Plan

### 1. Add translation keys to all 3 locale files

Add the following keys under `subscription` namespace in `es`, `en`, and `pt`:

**FAQ section** (`plansPage.faq`):
- `title`: "Preguntas frecuentes" / "Frequently asked questions" / "Perguntas frequentes"
- `q1` through `q4` and `a1` through `a4` for each question/answer pair
- Update the trial FAQ answer to reference 14 days (not 7)

**Billing toggle** (`plansPage.billing`):
- `monthly`: "Mensual" / "Monthly" / "Mensal"
- `annual`: "Anual" / "Annual" / "Anual"
- `discount`: "-20%"

**Compare sheet** (`plansPage.compare`):
- `title`, `description`
- Feature names: `animals`, `aiChat`, `support`
- Feature values: `upTo50`, `upTo125`, `upTo250`, `upTo500`, `upTo1000`, `unlimited`, `limited20mo`, `basic`, `email`, `priority`, `support247`
- `choosePlan`: "Elegir {{name}}" / "Choose {{name}}" / "Escolher {{name}}"
- `free`: "Gratis" / "Free" / "Gratis"

### 2. Update FAQAccordion component
- Import `useTranslation`
- Replace hardcoded FAQ_DATA with translated strings using `t()` calls
- Fix trial FAQ to say 14 days

### 3. Update BillingToggle component
- Import `useTranslation`
- Replace "Mensual", "Anual", "-20%" with `t()` calls

### 4. Update CompareSheet component
- Import `useTranslation`
- Replace all hardcoded Spanish strings with `t()` calls
- Replace feature value functions with translated strings

### 5. Fix PlanCard badge comparison
- Change `plan.badge === 'Mas popular'` to `plan.id === 'productor'` so the styling works regardless of language

## Files to Modify

| File | Change |
|------|--------|
| `src/i18n/locales/es/subscription.json` | Add FAQ, billing, compare keys |
| `src/i18n/locales/en/subscription.json` | Add FAQ, billing, compare keys |
| `src/i18n/locales/pt/subscription.json` | Add FAQ, billing, compare keys |
| `src/components/subscription/FAQAccordion.tsx` | Use `useTranslation` for all strings |
| `src/components/subscription/BillingToggle.tsx` | Use `useTranslation` for all strings |
| `src/components/subscription/CompareSheet.tsx` | Use `useTranslation` for all strings |
| `src/components/subscription/PlanCard.tsx` | Fix badge comparison to use plan ID |

## Risk Assessment
- No database changes, no route changes, no plan limits altered
- Purely UI/i18n text changes scoped to subscription components
- Existing behavior and layout preserved

