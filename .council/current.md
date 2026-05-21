# Task Brief
**Task:** P1 Accessibility Bundle — reduced-motion, text size, aria-live
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21T11:20

---

## What

Three surgical accessibility fixes that touch the core session loop. All three are P1 from the `/audit` report. No new features, no scope creep.

### Fix 1 — MotionConfig reducedMotion="user" (systemic)
**File:** `src/app/layout.tsx` + new `src/components/ui/MotionProvider.tsx`
- Create `MotionProvider.tsx` as a `'use client'` wrapper around `MotionConfig reducedMotion="user"` from framer-motion
- In `layout.tsx`, import and wrap `{children}` with `<MotionProvider>` (layout stays a Server Component)
- This fixes ALL Framer Motion animations in one line — every exercise, every page entrance, every transition will respect the OS "reduce motion" preference

```tsx
// src/components/ui/MotionProvider.tsx
'use client';
import { MotionConfig } from 'framer-motion';
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
```

```tsx
// layout.tsx — add MotionProvider import, wrap children:
<MotionProvider>
  <TopographicGrid />
  {children}
  <ClientAILoader />
</MotionProvider>
```

### Fix 2 — Text size 10px → 12px (two files)
**Files:** `WordOrderExercise.tsx:73`, `FillInBlankExercise.tsx:55`

Both have `text-[10px]` instruction labels. Audit called out WordOrderExercise only, but FillInBlankExercise has the identical pattern (discovered during file read). Fix both:
- `WordOrderExercise.tsx:73` — `text-[10px]` → `text-[12px]`
- `FillInBlankExercise.tsx:55` (MultipleChoice "Fyll inn" label) — `text-[10px]` → `text-[12px]`

### Fix 3 — aria-live feedback region (four exercise components)
**Files:** `TranslationExercise.tsx`, `FillInBlankExercise.tsx`, `WordOrderExercise.tsx`, `SpeedRound.tsx`

Add a visually-hidden `aria-live="polite"` region to each exercise component that announces the result when an answer is submitted. Pattern:

```tsx
// Add state in each component:
const [resultAnnouncement, setResultAnnouncement] = useState('');

// Set in the submit/choose function when result is known:
setResultAnnouncement(correct ? 'Riktig svar.' : `Feil. Riktig svar er: ${correctAnswer}`);

// Render (after the submit button, inside the return):
<div aria-live="polite" className="sr-only">{resultAnnouncement}</div>
```

**Per-component specifics:**

- **TranslationExercise** — already has `feedbackTone` state. Derive: `feedbackTone === 'correct' ? 'Riktig svar.' : feedbackTone === 'wrong' ? 'Feil svar.' : ''`. Render inline from existing state — NO new useState needed.
- **FillInBlankExercise MCQ (MultipleChoice sub-component)** — `selected` state already tracks chosen option. Derive: `selected !== null ? (selected.trim().toLowerCase() === correct.trim().toLowerCase() ? 'Riktig svar.' : 'Feil svar.') : ''`. No new useState needed.
- **FillInBlankExercise FreeText** — add `resultAnnouncement` useState, set in the submit handler after `isCorrect` is computed.
- **WordOrderExercise** — add `resultAnnouncement` useState, set in `submit()` after `correct` is computed.
- **SpeedRound** — add `resultAnnouncement` useState, set inside the `.then()` callback after `correct` arrives from `gradeAnswer`.

**ListeningExercise** — skip for now (audio-focused, separate channel; not in audit P1 list).

---

## How

- Total files changed: 6 (MotionProvider.tsx new, layout.tsx, WordOrderExercise.tsx, FillInBlankExercise.tsx, TranslationExercise.tsx, SpeedRound.tsx)
- No new dependencies
- No new Zustand state
- `className="sr-only"` is already in globals.css (verify before assuming; if absent add `.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }` to globals.css)
- Framer Motion `MotionConfig` is already installed (used everywhere)
- Keep all existing exercise logic untouched — aria-live is additive only

---

## Model
sonnet (three mechanical fixes, well-specified)

---

## Acceptance Criteria

1. `MotionProvider.tsx` exists with `'use client'` and `MotionConfig reducedMotion="user"`. Layout wraps children with it. Layout itself has no `'use client'` directive.
2. `WordOrderExercise.tsx:73` reads `text-[12px]` not `text-[10px]`.
3. `FillInBlankExercise.tsx:55` (the "Fyll inn" label) reads `text-[12px]` not `text-[10px]`.
4. All four exercise components (`TranslationExercise`, `FillInBlankExercise`, `WordOrderExercise`, `SpeedRound`) have a `<div aria-live="polite" className="sr-only">` that is populated with a Norwegian result string on answer submission. Empty string before submission.
5. No TypeScript errors introduced.
6. All existing exercise logic (onResult callback, state management, tile movement) is unchanged.

---

## Blocking Flags
Stop immediately and write `BLOCKED: [reason]` to this file if:
- Any TypeScript error is introduced
- `sr-only` class is absent from globals.css and you can't confirm where to add it
- `MotionConfig` import fails (would mean framer-motion version change)
- You are about to change any exercise logic beyond the three fixes listed

---

## Playwright Checkpoint
yes
Test flows:
1. Navigate to a live session exercise (or `/session` if accessible) — verify no blank screens
2. Confirm existing exercises still render and submit normally
3. Verify layout renders without visual regression at 375px and 1280px
4. Check console for TypeScript compilation errors
