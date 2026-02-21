

# AI Chat Optimization: Deep Context for Actionable Insights

## Goal
Keep the ChatGPT API and enrich the AI's data context so it can confidently analyze trends like "animal X has been losing weight for 6 months -- possible disease" or "your pregnancy loss rate spiked last quarter."

## Current Issues Found

1. **Weight history capped at 20 animals** -- The AI only sees weight trends for the top 20 animals by record count; the rest are invisible.
2. **No trend analysis in context** -- Raw weight numbers are passed, but no pre-computed trends (declining, stagnant, gaining) are flagged for the AI.
3. **max_tokens = 600** -- Responses get cut off mid-sentence for any detailed analysis.
4. **No markdown rendering** -- AI responses show raw `**bold**` and `- lists` as plain text.
5. **Loading dots overlap streaming** -- Bouncing dots appear even while tokens are already streaming in.
6. **Sidebar JSX duplicated 4x** -- Same conversation card markup copy-pasted for today/yesterday/thisWeek/older.

---

## Plan

### 1. Backend: Enrich context with trend analysis (ai-chat edge function)

**File:** `supabase/functions/ai-chat/index.ts`

- **Increase `max_tokens`** from 600 to 4096 so the AI can give complete, detailed analyses.
- **Add `gpt-4o` to the allowed models list** so users can opt for deeper reasoning when needed (keep `gpt-4o-mini` as default for cost efficiency).
- **Weight trend analysis**: Instead of listing raw weights for 20 animals, compute per-animal trends for ALL animals with weight history:
  - Last 3 weights with dates
  - Direction: "declining", "stable", or "gaining"
  - Flag animals that lost weight over the last 3+ months with a warning marker
  - Average daily gain over last 90 days vs. overall GDP
- **Expand animal detail**: For each active animal, include its full weight history summary (last weight, weight 3 months ago, weight 6 months ago) so the AI can spot patterns.
- **Add reproductive timeline per animal**: Include last insemination date, pregnancy status, days to expected calving, and loss history per female -- enabling the AI to correlate reproductive and weight issues.
- **Add mortality pattern analysis**: Pre-compute mortality by month/cause so the AI can identify seasonal patterns without counting raw records.

### 2. Frontend: Markdown rendering for AI messages

**File:** `src/components/ai-chat/AIChatMessage.tsx`

- Install `react-markdown` dependency.
- Render assistant messages through `ReactMarkdown` with `prose prose-sm` styling.
- Keep user messages as plain text.

### 3. Frontend: Fix streaming indicator

**File:** `src/components/ai-chat/AIChatDialog.tsx`

- Only show bouncing dots when `isLoading` is true AND the last message is NOT an in-progress assistant message (i.e., hide dots once the first token arrives).

### 4. Frontend: Deduplicate conversation sidebar

**File:** `src/components/ai-chat/AIChatDialog.tsx`

- Extract a `ConversationGroup` component that takes a label and conversation list.
- Replace the 4 identical JSX blocks (today/yesterday/thisWeek/older) with the reusable component.

### 5. Frontend: Remove hardcoded API key

**File:** `src/hooks/useAIChat.tsx`

- Replace the hardcoded Supabase anon key string with `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`.

---

## Technical Details

### Enhanced weight context structure (backend)

```text
=== TENDENCIAS DE PESO POR ANIMAL ===
- TAG001 (Vaca, 36m): 420kg (2026-02-15) -> 405kg (2025-11-20) -> 390kg (2025-08-10) | DECLINANDO -0.15kg/dia | ALERTA: perdida sostenida 6 meses
- TAG002 (Ternero, 8m): 180kg (2026-02-10) -> 150kg (2025-12-01) -> 120kg (2025-09-15) | GANANDO +0.39kg/dia | Normal
```

### Enhanced reproductive context per animal

```text
=== HISTORIAL REPRODUCTIVO POR HEMBRA ===
- TAG001: ultima IA 2025-09-15 (toro: Emperador), tacto positivo 2025-11-20, parto estimado 2026-06-15, 0 perdidas previas
- TAG003: ultima IA 2025-07-01, tacto negativo 2025-09-05, sin prenez actual, 2 perdidas en ultimo ano
```

### New dependency

- `react-markdown` for rendering formatted AI responses

### Files modified

| File | Changes |
|------|---------|
| `supabase/functions/ai-chat/index.ts` | max_tokens 4096, add gpt-4o to allowed list, enrich weight trends + reproductive timeline + mortality patterns |
| `src/components/ai-chat/AIChatMessage.tsx` | Render assistant messages with react-markdown |
| `src/components/ai-chat/AIChatDialog.tsx` | Fix streaming dots, extract ConversationGroup component |
| `src/hooks/useAIChat.tsx` | Replace hardcoded key with env var |

### Risk assessment

- No database schema changes
- No existing routes or components removed
- System prompt content extended but same structure
- OpenAI API key already configured as secret
- Backward-compatible: existing conversations load normally

