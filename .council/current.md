# Task Brief
**Task:** P1-10 — Remove dead notifications bell from dashboard
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## What

`src/app/dashboard/page.tsx` — the notifications bell button (lines ~209–215) has no `onClick` handler. Clicking it registers a brief active state then does nothing. Notifications as a feature are not built. Per the no-silent-substitution principle (CLAUDE.md), a tappable button that does nothing is silent wrong-state. The roadmap (UI-1.3) explicitly notes this button will be "wired or removed" during the dashboard pass. P1-10 moves the removal forward before UI-1.3 reaches it.

**One file to change:** `src/app/dashboard/page.tsx`

## How

**Read the file first.** Find and delete these lines (approximately 209–215):

```tsx
<button
  type="button"
  aria-label="Notifications"
  className="nc-glass flex size-10 shrink-0 items-center justify-center text-[var(--nc-text-muted)]"
>
  <Bell size={16} />
</button>
```

After removal, check whether `Bell` is still imported anywhere else in the file. If `Bell` is no longer referenced, remove it from the lucide-react import line at the top:

```tsx
import { Bell, Play, Mic, ArrowRight } from 'lucide-react'
```
→ remove `Bell,` from this import.

Do not change any other part of the file.

## Model
sonnet

## Acceptance Criteria

1. The bell button is absent from the dashboard — not rendered, not hidden, not disabled
2. No unused `Bell` import remains (remove it if no other references exist)
3. The header layout around where the bell was still renders correctly — the level badge and heading remain
4. No TypeScript errors introduced

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- `Bell` is referenced elsewhere in the file (not just the button) — list usages
- Removing the button breaks surrounding layout structure in an unexpected way — describe what broke

## Playwright Checkpoint
yes

What to test:
- Navigate to `/dashboard` — confirm no bell button in the header area
- Confirm "Notifications" button is absent from the accessibility tree
- Confirm the dashboard header (greeting, level badge) still renders correctly
