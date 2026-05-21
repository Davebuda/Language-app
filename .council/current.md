# Task Brief
**Task:** Stream 4.3 — Progress Reassurance Strip
**Date:** 2026-05-21
**Status:** IN PROGRESS

---

## What

One file to create, one file to modify:

**Create:**
- `src/components/ProgressReassuranceStrip.tsx` — reads fingerprint, shows reassurance stats

**Modify:**
- `src/app/dashboard/page.tsx` — add `<ProgressReassuranceStrip />` between DailyWordPack and the Stats grid

---

## How

### `src/components/ProgressReassuranceStrip.tsx`

```tsx
'use client'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { getConceptPhase, isMastered } from '@/engine'
import type { ConceptGraph } from '@/types/concepts'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'
```

The component reads the fingerprint from `useFingerprintStore()` directly — this makes it self-contained so it can be folded into UI-1.3 later without needing props threaded through.

**Two states:**

**New user state** (fingerprint null, or `totalSessionsCompleted === 0`, or `status === 'loading'`):
- Do NOT render anything during loading (avoid flash)
- When fingerprint is loaded but no sessions: show a small encouraging prompt:
  ```
  "Start your first session to see your progress here."
  ```
  — styled as a single muted line, text-xs, not a card

**Returning user state** (fingerprint exists + at least 1 session):
- Show a horizontal chip strip with 2-3 stat chips:
  1. **Concepts practiced**: count of concepts with `attemptCount > 0` (from `fingerprint.conceptMastery`)
  2. **Speaking minutes**: `fingerprint.speakingMinutesTotal` rounded (show only if > 0)
  3. **Strongest theme**: the concept at the highest phase that isn't locked — show its label + phase (e.g., "Personal pronouns · consolidation")

Chip styling: `rounded-full border border-[var(--nc-border)] px-3 py-1 text-xs text-[var(--nc-text-muted)]` — small pills in a `flex flex-wrap gap-2` row

For the concept graph: select based on `fingerprint.currentLevel` (same pattern used in progress/page.tsx and session/complete/page.tsx — A2 → a2Graph, else a1Graph).

For "Strongest theme": iterate `activeGraph.concepts`, compute mastery phase for each using `getConceptPhase(mastery, concept.prerequisites, masteredIds)`, find the one at `consolidation` or `maintenance` with the highest `decayedScore`. If none, show "Ingen emner i vedlikehold ennå" or omit the chip.

**No animation, no Framer Motion.** This is a static display strip.

**Accessibility:** `role="region"` with `aria-label="Din fremgang"` on the outer wrapper.

### Modify `src/app/dashboard/page.tsx`

Read the file first. Import `ProgressReassuranceStrip` at the top:
```tsx
import { ProgressReassuranceStrip } from '@/components/ProgressReassuranceStrip'
```

Find the DailyWordPack placement:
```tsx
        {/* ── Daily Word Pack ── */}
        <DailyWordPack />
```

Add immediately BELOW the `<DailyWordPack />` line:
```tsx
        {/* ── Progress Reassurance Strip ── */}
        <ProgressReassuranceStrip />
```

---

## Model
sonnet

## Acceptance Criteria

1. New/guest user: a single muted line "Start your first session to see your progress here." — no card, no flash during loading
2. Returning user: chip strip with at least "X concepts practiced" chip visible
3. Speaking minutes chip only renders when `speakingMinutesTotal > 0`
4. `role="region"` with `aria-label="Din fremgang"` on the wrapper
5. No layout shift on `/dashboard` — strip renders stably whether loading or loaded
6. Layout holds at 375px — chips wrap to new lines, never overflow horizontally
7. No new npm dependencies
8. No TypeScript errors

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- `useFingerprintStore` import path is wrong (check `@/stores/fingerprint-store`)
- `getConceptPhase` or `isMastered` imports fail (check `@/engine`)
- Any TypeScript error that can't be fixed without `as any`

## Playwright Checkpoint
yes

What to test:
- Navigate to `/dashboard` as guest — confirm strip shows the "Start your first session" muted line (or renders nothing if loading state hides it during test)
- Snapshot accessibility tree — confirm `region "Din fremgang"` present
- No console errors
- No horizontal overflow at default viewport
