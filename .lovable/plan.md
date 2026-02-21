

# AI Chat UI Improvements

## Issues Identified

1. **No usage counter visible** -- Users have no idea how many messages they've used or have left until they're almost out (warning only shows at 5 remaining).
2. **Quick actions are plain text buttons** -- They look generic and don't hint at what the AI can do; no icons or visual grouping.
3. **Welcome screen is bland** -- Just a sparkle icon and text; doesn't convey the AI's analytical capabilities.
4. **No conversation history on mobile** -- Mobile users can't access past conversations at all; the sidebar is desktop-only.
5. **Image preview shows filename only** -- No thumbnail preview of the selected image before sending.
6. **Input area is cramped** -- The text input, image button, and send button are all squeezed into one row with no visual breathing room.
7. **No empty state for conversation sidebar** -- If there are no past conversations, the sidebar is just blank.
8. **Limit alerts are aggressive** -- The destructive alert for "limit reached" pushes the input area down and feels punishing.
9. **FAB button has no usage indicator** -- The floating button gives no hint of remaining messages.

---

## Plan

### 1. Add a usage counter badge on the FAB button

**File:** `src/components/ai-chat/AIChatButton.tsx`

- For non-unlimited plans, show a small counter badge (e.g., "2/3") on the corner of the floating button so users always know their remaining quota.
- Keep the "limit reached" badge but make it less aggressive (use `secondary` variant instead of `destructive`).

### 2. Redesign the welcome screen with categorized quick actions

**File:** `src/components/ai-chat/AIChatDialog.tsx`

- Group quick actions into 2 columns with small icons (e.g., weight icon for production, heart icon for reproductive, shield for health).
- Add a subtle usage indicator below the welcome message: "3 messages remaining this month" for limited plans.
- Make the welcome title more descriptive: highlight that the AI can analyze trends, detect health issues, and give recommendations.

### 3. Add mobile conversation drawer

**File:** `src/components/ai-chat/AIChatDialog.tsx`

- On mobile, add a small "History" button in the header that opens conversation history as a bottom sheet/drawer.
- Reuse the same conversation list and grouping logic already built for desktop.

### 4. Image thumbnail preview

**File:** `src/components/ai-chat/AIChatDialog.tsx`

- When an image is selected, show a small thumbnail (48x48) instead of just the filename.
- Use `URL.createObjectURL(file)` for the preview.

### 5. Softer limit-reached state

**File:** `src/components/ai-chat/AIChatDialog.tsx`

- Replace the destructive alert with a gentler inline message inside the input area.
- Add an "Upgrade" button linking to `/plans` so users can easily upgrade.

### 6. Empty state for sidebar

**File:** `src/components/ai-chat/AIChatDialog.tsx`

- When no conversations exist, show a subtle empty state with text like "Your conversations will appear here."

### 7. Input area polish

**File:** `src/components/ai-chat/AIChatDialog.tsx`

- Use a textarea instead of input for multi-line support (submit on Enter, new line on Shift+Enter).
- Move the image button inside the input field (left side) for a cleaner look.
- Add a subtle character/line hint.

---

## Technical Details

### Files to modify

| File | Changes |
|------|---------|
| `src/components/ai-chat/AIChatButton.tsx` | Add usage counter badge on FAB |
| `src/components/ai-chat/AIChatDialog.tsx` | Redesign welcome screen, add mobile history drawer, image thumbnail, textarea input, softer limits, sidebar empty state |
| `src/components/ai-chat/AIChatMessage.tsx` | No changes needed |

### No new dependencies required

All changes use existing UI components (Badge, Drawer/Sheet, Textarea) already in the project.

### Risk assessment

- No database changes
- No existing routes or flows altered
- All changes scoped to ai-chat components only
- Existing conversation persistence and limit logic untouched

