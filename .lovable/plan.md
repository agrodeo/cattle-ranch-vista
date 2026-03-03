

## Analysis

The phone field in the signup form **already has** `required` validation in the form rules, so submitting without it will show an error. However, unlike the Country field which displays a visible `*` asterisk, the phone label does not visually indicate it's mandatory.

## Plan

Add the `*` asterisk to the phone field's `FormLabel` in `src/pages/Auth.tsx` to match the visual pattern used by the Country and Province fields, making it clear to users that the phone number is required before they attempt to submit.

Single-line change in the phone field's `FormLabel`:
```
<Phone className="h-4 w-4" />
{t('auth:register.phone', 'Teléfono')} *
```

