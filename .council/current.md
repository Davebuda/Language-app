# Task Brief
**Task:** F032 — eliminate journal SSR mismatch in WritingEditor input-mode initialization
**Date:** 2026-05-22T08:45
**Status:** APPROVED 2026-05-22T08:55 — commit `9bef843`, Playwright SMOKE PASS, report at `.council/reports/2026-05-22-0845-f032-journal.md`
**corrections:** 0

---

## What

`src/components/journal/WritingEditor.tsx` initializes `hasSpeechAPI = false` and `inputMode = 'text'` on lines 70–71 (both stable on SSR and the client's first render). A `useEffect` on lines 74–80 then runs only on the client, detects the SpeechRecognition API, and flips BOTH flags — including `setInputMode('voice')`. The result: every page load shows the textarea-only state for ~500ms, then the page re-renders with the Snakk/Skriv toggle visible AND the textarea replaced by a "Trykk for å snakke" microphone button. Walkthrough finding F032 in `test-reports/stress-walkthrough-2026-05-21/_findings.md:158` and report row S-18.

Two divergences on hydration:
1. **Layout divergence** — the Snakk/Skriv toggle is gated by `{hasSpeechAPI && ...}` on line 189. It is absent on first paint, present after hydration.
2. **Primary-affordance divergence** — `inputMode` flips from `'text'` to `'voice'` post-hydration, which swaps the textarea (line 245-ish area) for the voice-input button (line 209). This is the visible "journal feels broken" symptom.

Same family as the React #418 fix shipped 2026-05-22 on `/dashboard` (`cf1fcc3`): a `useEffect`-driven state change after mount that flips visible primary content. The proven pattern is "keep first paint stable; only widen capability after hydration, do not auto-mutate UX defaults."

**Files in scope:**
- `src/components/journal/WritingEditor.tsx` — only file changed.

**Out of scope:**
- `src/app/journal/page.tsx` — `motion.div` wrapping is fine; the SSR mismatch lives inside WritingEditor.
- The mode-toggle visual styling — leave as-is.
- The voice recognition logic — leave as-is.
- AlertDialog migration, journal AI-quality work, F033 follow-ups — separate tasks.
- Any other components or pages.

---

## How

### 1. Stop auto-flipping `inputMode` on hydration

Inside `WritingEditor.tsx` lines 74–80, the `useEffect` currently does both:

```ts
useEffect(() => {
  const ctor = getSpeechCtor()
  if (ctor) {
    setHasSpeechAPI(true)
    setInputMode('voice')   // ← this is the primary-affordance flip
  }
}, [])
```

Replace with:

```ts
useEffect(() => {
  const ctor = getSpeechCtor()
  if (ctor) {
    setHasSpeechAPI(true)
    // Do NOT auto-switch inputMode to 'voice' — that causes an SSR-vs-CSR
    // primary-affordance flip (textarea ↔ mic button) on every page load.
    // The Snakk/Skriv toggle appears below; users opt into voice via click.
  }
}, [])
```

This single removal stops the swap of the primary affordance.

### 2. Accept the additive toggle appearance

Once `hasSpeechAPI` flips to `true` post-hydration, the toggle row at lines 189–206 will appear above the textarea on devices with speech support. This is **additive** (a new element appears) rather than **substitutive** (one element replaces another). Additive hydration is a small cosmetic addition, not a "primary affordance swap." It is acceptable.

Do **not** wrap the toggle in `hasMounted` gating or skeleton scaffolds — both would either add a loading flash or duplicate state. The goal is the smallest diff that eliminates the bug the walkthrough caught.

### 3. Verify

1. `npx tsc --noEmit` — zero errors.
2. `npm test` — all 155 tests still pass (journal tests live at `tests/journal/`).
3. `npm run dev` — visit `http://localhost:3000/journal`. Open DevTools console. Refresh multiple times. Confirm:
   - No `Hydration failed` warning in dev console.
   - First paint shows the textarea immediately (not the mic button).
   - On devices with speech-API support, the Snakk/Skriv toggle appears post-hydration but the textarea remains visible (additive only — no primary-affordance swap).
   - Clicking "🎙 Snakk" switches to voice mode as before.
4. `git diff HEAD --name-only` — exactly 1 file.

### 4. Commit

```
fix(journal): stop auto-flipping inputMode to voice on hydration (F032)

WritingEditor's mount-effect was flipping inputMode from 'text' to 'voice'
after hydration on devices with speech-API support. SSR/first-paint rendered
the textarea; post-hydration re-render replaced it with the mic button.
Visible primary-affordance swap on every page load. Keep inputMode stable;
toggle is still revealed post-hydration so users can opt into voice.

Same family as the React #418 dashboard fix (cf1fcc3): keep SSR/CSR first
paint stable; only widen capability after hydration, never swap primary UI.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Model
sonnet — single-file surgical edit from a complete spec.

---

## Acceptance Criteria

1. `npx tsc --noEmit` zero errors.
2. `git diff HEAD --name-only` returns exactly `src/components/journal/WritingEditor.tsx`.
3. The `setInputMode('voice')` call inside the `useEffect` is removed (Grep should find zero occurrences of `setInputMode('voice')` in the file — only `setInputMode(mode)` from the toggle click handler remains).
4. `setHasSpeechAPI(true)` is preserved (toggle visibility still flips post-hydration).
5. No other state added (no `hasMounted`, no `isHydrated`, no skeleton component).
6. `npm test` 155/155 passing.
7. Dev probe: page loads → console shows no hydration warning → textarea visible on first paint → toggle appears after hydration without replacing the textarea.
8. Commit message matches the template above.

---

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- The `inputMode='voice'` UX default is load-bearing somewhere I haven't seen (search the codebase for `inputMode` references — only `WritingEditor.tsx` should reference it).
- A test in `tests/journal/` depends on `inputMode` defaulting to `'voice'` post-hydration and starts failing.
- The dev-console hydration warning persists after the change (indicates a third mismatch source we missed — surface and stop for re-scoping).
- The toggle does not appear post-hydration after the change (means `hasSpeechAPI` flip is also broken — investigate before fixing).

---

## Playwright Checkpoint

**SMOKE** — after the implementer ships:
1. Navigate `http://localhost:3000/journal` (dev) OR `https://pandoai.no/journal` (prod, post-deploy).
2. Capture `mcp__playwright__browser_console_messages` filtered to `level: 'error'` and `level: 'warning'`.
3. Pass criteria: zero entries containing `Hydration failed` or `Minified React error #418` or `Text content does not match server-rendered HTML`.
4. Visual check: take a screenshot at 1280px immediately on page load. Confirm the textarea is visible (not the mic button) and the page does not visibly re-flow within the first 1000ms.
5. Critical path regression: navigate to `/`, start a session (guest path), submit one wrong answer, confirm repair loop fires. Same baseline as React #418 verification.
