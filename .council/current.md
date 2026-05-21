# Task Brief
**Task:** P1-7 + P1-8 — Recalibration opt-in banner + accessibility fix
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## What

Two issues on the same surface (`/recalibrate`), bundled because they touch the same two files:

1. **P1-7**: Navigating to `/recalibrate` launches the quiz immediately with no context, no explanation of why it's happening, and no opt-in. User sees 7 questions with no framing.
2. **P1-8**: The Playwright accessibility snapshot of `/recalibrate` shows only an `alert` element — the quiz content (question heading, option buttons, progress) exposes nothing to the screen reader.

Files to change:
- `src/app/recalibrate/page.tsx` — add intro/banner state (P1-7)
- `src/components/onboarding/RecalibrationQuiz.tsx` — add proper semantic structure + ARIA (P1-8)

## How

### Fix 1 — `src/app/recalibrate/page.tsx` (P1-7)

**Read the file first.**

Add a `showIntro` boolean state initialised to `true`.

```tsx
const [showIntro, setShowIntro] = useState(true)
```

After the `if (!fingerprint)` loading guard, insert a conditional:

```tsx
if (showIntro) {
  return (
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <div className="relative z-10 mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-5">
        <button
          onClick={() => router.push('/dashboard')}
          className="nc-glass flex size-10 items-center justify-center text-[var(--nc-text-muted)] transition-colors hover:text-[var(--nc-text)]"
          aria-label="Tilbake"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-[13px] font-medium text-[var(--nc-text-muted)]">Tilbake til oversikten</span>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 pb-10 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-6"
        >
          <div>
            <div className="nc-label mb-3">Sjekk-inn</div>
            <h1 className="text-[2rem] font-bold leading-tight text-nc-text">
              Tid for en liten repetisjon
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-nc-text-muted">
              Noen konsepter har ikke blitt øvd på en stund. En rask sjekk hjelper oss å oppdatere profilen din.
            </p>
          </div>

          <div className="nc-glass p-4">
            <p className="text-sm text-nc-text-muted">
              <span className="font-medium text-nc-text">{MAX_RECALIBRATION_QUESTIONS} spørsmål</span>
              {' '}· tar omtrent 2–3 minutter
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowIntro(false)}
              className="nc-button-primary w-full px-5 py-3.5 text-sm font-medium"
            >
              Start
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-5 py-3 text-sm font-medium text-nc-text-dim transition-colors hover:text-nc-text"
            >
              Hopp over
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
```

You need to import `MAX_RECALIBRATION_QUESTIONS` at the top of the page file (it's already imported inside `RecalibrationQuiz` — add it to the page import from `@/lib/diagnostic/recalibration`).

The existing quiz section stays exactly as-is below this conditional.

### Fix 2 — `src/components/onboarding/RecalibrationQuiz.tsx` (P1-8)

**Read the file first.**

The root accessibility issue: the quiz is wrapped in plain `div` elements with no semantic roles, no headings, and no ARIA live regions. Screen readers have nothing to latch on to.

Four targeted changes (minimal — do not refactor the component structure):

**a) Wrap the outer `<div className="flex flex-1 flex-col gap-5">` in a `<main>` element:**

Change:
```tsx
return (
  <div className="flex flex-1 flex-col gap-5">
```
to:
```tsx
return (
  <main aria-label="Recalibration quiz" className="flex flex-1 flex-col gap-5">
```
and close with `</main>`.

**b) Add a visually-hidden heading inside the header section.** After the `<div className="nc-label">Recalibration</div>` line, add:

```tsx
<h1 className="sr-only">Recalibration quiz</h1>
```

**c) Add `aria-live="polite"` to the question card wrapper** so screen readers announce when the question changes:

Change:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={questionKey}
    ...
    className="nc-glass-dark p-5"
  >
```
to:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={questionKey}
    ...
    aria-live="polite"
    aria-atomic="true"
    className="nc-glass-dark p-5"
  >
```

**d) Add `aria-label` to option buttons** so screen readers announce which number each is. The buttons currently have inline text starting with `0{index + 1}` in a `<span>` — add `aria-label` to the button itself:

```tsx
<button
  key={index}
  onClick={() => handleSelect(index)}
  disabled={revealed}
  aria-label={`Option ${index + 1}: ${option}${revealed ? (isCorrect ? ' — correct' : isSelected ? ' — incorrect' : '') : ''}`}
  className="..."
  style={{ ... }}
>
```

These four changes give the screen reader: a `<main>` landmark, an `<h1>` heading, live-region question announcements, and labelled option buttons.

## Model
sonnet

## Acceptance Criteria

1. Navigating to `/recalibrate` shows the intro banner first — heading, context text, question count, Start button, Skip button
2. Clicking "Start" transitions to the quiz (no page reload — state change in the page)
3. Clicking "Hopp over" (skip) on the banner returns to `/dashboard`
4. Playwright accessibility snapshot of `/recalibrate` (after Start) shows: `<main>` landmark, `<h1>` heading, `progressbar`, and labelled option buttons — not just an `alert`
5. The existing quiz flow is unchanged: questions advance, repair loop still works, `onSkip` / `onComplete` callbacks unchanged
6. No TypeScript errors introduced

## Blocking Flags

Stop immediately and write `BLOCKED: [reason]` to this file if:
- `MAX_RECALIBRATION_QUESTIONS` is not exported from `@/lib/diagnostic/recalibration` — check before importing
- The `nc-button-primary` class does not exist in the token system — check `globals.css` before using it; fall back to `nc-button-dark` if absent
- Any TypeScript error is introduced
- You cannot locate a specific element described — re-read the file, don't guess

## Playwright Checkpoint
yes

What to test:
- Navigate to `/recalibrate` — verify intro banner renders (heading visible, Start + Skip buttons)
- Click "Hopp over" — verify redirect to `/dashboard`
- Navigate to `/recalibrate` again — click "Start" — verify quiz loads and first question visible
- Take accessibility snapshot after Start — verify `main`, `h1`, `progressbar`, and option buttons in tree
- Complete one answer in the quiz — verify the reveal + Next flow still works
