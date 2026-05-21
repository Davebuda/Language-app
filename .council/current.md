# Task Brief
**Task:** Stream 4.1 — Daily Learning Card
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## What

Three files to create, two files to modify:

**Create:**
- `src/lib/dailyContent.ts` — rotation logic + 7 grammar rules seed + 42 words seed (used by 4.1 and 4.2)
- `src/components/DailyLearningCard.tsx` — card component with tap-to-reveal (dashboard) and always-visible (landing) modes

**Modify:**
- `src/app/page.tsx` — add DailyLearningCard with `alwaysVisible` prop after hero / before waitlist
- `src/app/dashboard/page.tsx` — add DailyLearningCard (default tap-to-reveal) after the greeting section

---

## How

### `src/lib/dailyContent.ts`

Export a `getDailyRule()` function:

```ts
export type GrammarRule = {
  title: string         // short rule name in English (for screen readers / admin)
  norwegianExample: string   // the Norwegian sentence — T1 element
  englishTranslation: string // literal translation
  ruleExplanation: string    // 1–2 sentences, in English, explaining the rule
}

const RULES: GrammarRule[] = [
  // 7 entries, one per weekday index
]

export function getDailyRule(): GrammarRule {
  return RULES[new Date().getDate() % 7]
}
```

Seed 7 grammar rules covering: V2 word order, noun gender (en/et), definite forms (-en/-et suffix), adjective agreement (stor/stort/store), prepositions (i/på/til), reflexive verbs (vaske seg), question formation (hva/hvor/hvem).

Norwegian examples must be complete, grammatically correct Bokmål sentences. English translations must be literal. Rule explanations must be 1–2 sentences max.

### `src/components/DailyLearningCard.tsx`

```tsx
'use client'

interface Props {
  alwaysVisible?: boolean  // landing page: always show translation; dashboard: tap to reveal
}
```

Card structure:
1. Small label chip: `"Dagens grammatikk"` (Schibsted Grotesk, text-sm, muted)
2. Norwegian sentence — T1 element: `text-2xl font-bold` minimum, Schibsted Grotesk
3. Rule explanation line below the sentence (text-sm, muted)
4. Translation reveal:
   - `alwaysVisible=true`: show `englishTranslation` inline, no interaction needed
   - default: "Vis oversettelse" button → reveals translation; button text changes to "Skjul oversettelse"
5. Card styling: `nc-glass` or `bg-[var(--nc-card)]` border radius matching existing cards

**Accessibility:**
- `aria-expanded` on reveal button
- `role="region"` on card with `aria-label="Dagens grammatikk"`
- Keyboard: Space/Enter on reveal button toggles translation

**No Framer Motion.** This is a static card with a simple CSS transition for the translation reveal (`transition-all duration-200 ease-out`). Framer Motion is for interactive/complex animations; this is a one-state toggle.

### Landing page (`src/app/page.tsx`)

Read the file first to understand current structure. Place `<DailyLearningCard alwaysVisible />` after the hero/intro section and before the waitlist/CTA section. If there is a container/section pattern, match it.

### Dashboard (`src/app/dashboard/page.tsx`)

Read the file first. Place `<DailyLearningCard />` (no props — tap-to-reveal mode) after the greeting + level section and before the session CTA or progress strip. Match existing card spacing and container width.

---

## Model
sonnet

## Acceptance Criteria

1. DailyLearningCard renders on `/` with translation always visible — no tap required
2. DailyLearningCard renders on `/dashboard` with translation hidden by default; tap/click reveals it
3. Both show the same grammar rule on a given day (same `getDailyRule()` call, same date)
4. Norwegian sentence is the visually dominant element — larger and bolder than the explanation text
5. Card is keyboard accessible: reveal button responds to Enter/Space; `aria-expanded` updates
6. No new npm dependencies introduced
7. No TypeScript errors
8. Landing page and dashboard load without console errors

## Blocking Flags

Stop immediately and write `BLOCKED: [reason]` to this file if:
- `src/app/page.tsx` or `src/app/dashboard/page.tsx` is a Server Component that cannot directly use `useState` for the reveal — if so, extract the reveal toggle into a small `DailyLearningCardClient.tsx` wrapper
- Any TypeScript error is introduced
- The `nc-glass` class or `--nc-card` token is not found in the project (check globals.css before using)

## Playwright Checkpoint
yes

What to test:
- Navigate to `/` — confirm DailyLearningCard renders with Norwegian sentence visible and translation visible (alwaysVisible mode)
- Navigate to `/dashboard` (as guest) — confirm card renders; translation hidden initially; click "Vis oversettelse" — translation appears
- Confirm same grammar rule appears on both pages on same day
- Snapshot accessibility tree on dashboard to confirm `role="region"` and `aria-label` present
- No console errors on either page
