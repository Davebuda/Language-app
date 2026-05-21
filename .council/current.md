# Task Brief
**Task:** Session completion screen — make the moat visible
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21T11:10

---

## What

Enhance `src/app/session/complete/page.tsx` to surface the engine's diagnostic intelligence at the end of every session. The screen exists and has a solid foundation — this is an additive enhancement, not a rebuild.

**Add these three things:**

### 1. Repair loop summary section (new section, after the "what you practiced" card)
- Count wrong answers from `results.filter(r => !r.correct)` — these are repair loop triggers
- Group by `conceptId`, collect `errorTag` values
- Show: "X mønstre reparert" heading with a list of concept labels + error tag chips
- If zero wrong answers: do not render this section at all (clean session, no noise)
- Use `nc-glass` surface, teal border accent for the chip labels

### 2. Phase indicators on the concept list (replace "◌" and remove "New" badge)
- For each practiced concept, call `getConceptPhase(mastery, concept.prerequisites, masteredIds)` — same pattern as `dashboard/page.tsx:161`
- Import `getConceptPhase` from `@/engine/fingerprint`
- Show phase as a small chip next to concept label: `intro` (muted), `practice` (teal tint), `consolidation` (green tint), `maintenance` (green)
- Remove the hardcoded `<span>New</span>` badge entirely

### 3. SRS next review pill on the repair card (append to repair section)
- For concepts that got wrong answers: find the earliest `fingerprint.conceptMastery[id]?.nextReviewAt`
- If found: show "Første gjennomgang: [relative date — 'om 3 dager' / 'i morgen' / 'om X dager']"
- Compute the relative date: `Math.ceil((new Date(nextReviewAt).getTime() - Date.now()) / 86400000)` days
- If 0 or past: show "I dag"
- If 1: "I morgen"
- If >1: "Om X dager"

---

## How

- Single file change: `src/app/session/complete/page.tsx`
- No new files unless a helper function exceeds 20 lines
- Import `getConceptPhase` from `@/engine/fingerprint` (already used in dashboard/page.tsx)
- No new dependencies
- Build the repair section ONLY if `wrongResults.length > 0` — no empty state needed
- Keep all existing sections: score circle, stats grid, concept list, reflection, next-session card
- Use existing design tokens only: `nc-glass`, `nc-glass-elevated`, `nc-label`, `nc-teal`, `nc-green`, `nc-red`
- Framer Motion is already imported — entrance animation on the repair section: `initial={{ opacity: 0, y: 8 }}` with `delay: 0.20` (between the concept list and reflection card delays)
- No `cn` needed — inline class logic consistent with the rest of the file

**Error tag display map (inline const in the file):**
```ts
const ERROR_TAG_LABELS: Partial<Record<ErrorTag, string>> = {
  'word-order': 'Ordstilling',
  'verb-tense': 'Verbtid',
  'verb-conjugation': 'Verbform',
  'noun-gender': 'Substantivkjønn',
  'article-use': 'Artikkelbruk',
  'adjective-agreement': 'Adjektivsamsvar',
  'pronoun-choice': 'Pronomen',
  'preposition': 'Preposisjon',
  'modal-verb': 'Modalverb',
  'negation-placement': 'Negasjon',
  'compound-word': 'Sammensatt ord',
  'spelling': 'Stavefeil',
  'wrong-word-same-category': 'Feil ord',
  'unspecified': 'Grammatikk',
}
```

**Phase chip color map (inline):**
```ts
const PHASE_STYLES = {
  locked:        'bg-[rgba(255,255,255,0.04)] text-[var(--nc-text-dim)]',
  intro:         'bg-[rgba(255,255,255,0.06)] text-[var(--nc-text-muted)]',
  practice:      'bg-[var(--nc-teal-tint)] text-[var(--nc-teal)]',
  consolidation: 'bg-[var(--nc-green-tint)] text-[var(--nc-green)]',
  maintenance:   'bg-[var(--nc-green-tint)] text-[var(--nc-green)]',
}
const PHASE_LABELS = {
  locked: 'Låst', intro: 'Intro', practice: 'Øving',
  consolidation: 'Konsolidering', maintenance: 'Vedlikehold',
}
```

---

## Model
sonnet (UI enhancement, well-specified)

---

## Acceptance Criteria

1. After a session with ≥1 wrong answer: a repair section appears between the concept list card and the reflection card. It shows the count of repairs, which concepts triggered repair (by label), and the earliest SRS next review date formatted as "om X dager" / "i morgen" / "i dag".
2. After a perfect session (0 wrong answers): the repair section does NOT render. The screen is quieter — no empty state shown.
3. The concept list ("Hva du øvde på") shows a phase chip next to each concept label. The hardcoded "New" badge is gone.
4. All existing sections still render correctly: ScoreCircle, stats grid, reflection prompt, next-session card.
5. No TypeScript errors. No new test failures.
6. Layout holds at 375px and 1280px (the two critical breakpoints).

---

## Blocking Flags
Stop immediately and write `BLOCKED: [reason]` to this file if:
- Any TypeScript error is introduced
- `getConceptPhase` import does not resolve
- The repair section interferes with the reflection card layout
- You are about to make a change not specified in this brief

---

## Playwright Checkpoint
yes
Test flows:
1. Navigate to `/session/complete` via completing a real session — verify repair section present/absent based on wrong answer count
2. Verify concept phase chips render correctly
3. Verify "New" badge is gone
4. Verify existing sections (ScoreCircle, stats, reflection, next-session card) still render
5. Check 375px mobile layout — no overflow
