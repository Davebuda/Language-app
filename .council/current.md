# Task Brief
**Task:** P1-13 — Session complete: remove dead share button, fix A1 graph hardcode, fix English text
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## What

`src/app/session/complete/page.tsx` has three issues discovered during code review:

1. **Dead Share2 button** — `aria-label="Del"` button with no `onClick`. Same pattern as P1-10 (notifications bell). Remove it.
2. **Hardcoded `a1-graph.json`** — concept labels always use A1 graph regardless of user level. Same bug as P1-6 (Progress/Profile). Fix: import both graphs, select based on `fingerprint?.currentLevel`.
3. **English text** — `"What you mastered"` section heading is in English in a Norwegian app. Fix: change to `"Hva du øvde på"`.

**One file to change:** `src/app/session/complete/page.tsx`

---

## How

**Read the file first.**

### Fix 1 — Remove dead Share2 button

Find the button with `aria-label="Del"` (approximately lines 145–151):
```tsx
<button
  type="button"
  className="nc-glass flex size-10 items-center justify-center text-[var(--nc-text-muted)] transition-colors hover:text-[var(--nc-text)]"
  aria-label="Del"
>
  <Share2 size={17} />
</button>
```
Delete it entirely. Then check whether `Share2` is still used anywhere else in the file. If not, remove it from the lucide-react import at the top.

### Fix 2 — Fix hardcoded a1-graph.json

At the top of the file, find:
```tsx
import conceptGraphJson from '@content/concepts/a1-graph.json'
...
const conceptGraph = conceptGraphJson as ConceptGraph
```

Change to import both graphs:
```tsx
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'
```

Remove the module-level `const conceptGraph = ...` line.

Inside the component, after the `fingerprint` is read from the store, add:
```tsx
const conceptGraph = (fingerprint?.currentLevel === 'A2' ? a2GraphJson : a1GraphJson) as ConceptGraph
```

This follows the exact same pattern used in `progress/page.tsx` and `profile/page.tsx` from P1-6.

### Fix 3 — Fix English section heading

Find:
```tsx
<div className="text-[15px] font-medium text-[var(--nc-text)]">What you mastered</div>
```

Change to:
```tsx
<div className="text-[15px] font-medium text-[var(--nc-text)]">Hva du øvde på</div>
```

---

## Model
sonnet

## Acceptance Criteria

1. No "Del" share button rendered on the session complete page
2. `Share2` import removed if no longer referenced
3. A2 users see A2 concept labels (conceptGraph selects a2Graph for A2 users)
4. Section heading reads "Hva du øvde på" not "What you mastered"
5. No TypeScript errors introduced

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- `a2GraphJson` import path doesn't exist (check `@content/concepts/a2-graph.json` first)
- `fingerprint` is not in scope where the conceptGraph selection is needed
- Any TypeScript error is introduced

## Playwright Checkpoint
yes

What to test:
- Navigate to `/session/complete` — confirm it redirects to `/dashboard` (guard still works)
- Navigate to `/dashboard` — confirm no regression
- Note: full session complete screen test requires completing an actual session; accessibility snapshot of dashboard confirms no regressions
