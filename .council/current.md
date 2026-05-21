# Task Brief
**Task:** P1-1 — Diagnostic explanation shows next question's topic, not current
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## What

Fix `src/components/onboarding/DiagnosticQuiz.tsx` so that when a user selects an answer, the explanation card shows the **answered question's** explanation, prompt, CEFR label, and concept — not the next question's.

## The Bug (root cause confirmed by code read)

In `handleSelect`, two things happen together:
1. `setRevealed(true)` — triggers the explanation card to render
2. `setDiagState(nextState)` — triggers the `useEffect([diagState])` which calls `selectNextQuestion(nextState)` and sets `currentQuestion` to the NEXT question

Because React batches the state update but runs effects after the render, by the time the explanation card actually appears, `currentQuestion` has already been replaced with the next question. So:
- The question card shows the NEXT question's prompt and label
- The explanation shows the NEXT question's explanation text

## How

**One new state variable: `answeredQuestion`.**

```tsx
const [answeredQuestion, setAnsweredQuestion] = useState<DiagnosticQuestion | null>(null)
```

In `handleSelect` — snapshot BEFORE state update:
```tsx
function handleSelect(index: number) {
  if (revealed || !currentQuestion) return
  setAnsweredQuestion(currentQuestion)   // ← snapshot here, before setDiagState
  setSelected(index)
  setRevealed(true)
  const correct = index === currentQuestion.correctIndex
  const nextState = recordAnswer(diagState, currentQuestion, correct)
  setDiagState(nextState)
  if (isDiagnosticComplete(nextState)) {
    setTimeout(() => { onComplete(computeResult(nextState)) }, 900)
  }
}
```

In `advance()` — clear snapshot:
```tsx
function advance() {
  if (!isDiagnosticComplete(diagState)) {
    setAnsweredQuestion(null)
    setSelected(null)
    setRevealed(false)
    setQuestionKey((k) => k + 1)
  }
}
```

Add a derived `displayedQuestion` above the return:
```tsx
const displayedQuestion = (revealed && answeredQuestion) ? answeredQuestion : currentQuestion
```

Replace ALL `currentQuestion.` references in the rendered output with `displayedQuestion.` — specifically:
- Question card label: `displayedQuestion.cefrLevel` · `displayedQuestion.conceptId`
- Question card prompt: `displayedQuestion.prompt`
- Options map: `displayedQuestion.options.map(...)` and `displayedQuestion.correctIndex`
- Explanation text: `displayedQuestion.explanation`

The guard at `if (!currentQuestion) return null` stays on `currentQuestion` (it's the null-safety guard for initial load before any question is selected).

## Model
sonnet

## Acceptance Criteria
1. Answer Q1 (any option) → the explanation card shows Q1's CEFR level, concept label, and explanation text
2. The question card continues to show Q1's prompt while the explanation is visible
3. Click "Next question" → Q2's prompt appears with Q2's label; explanation is hidden
4. Answer Q2 → explanation shows Q2's text, not Q3's
5. This holds regardless of which CEFR level the IRT engine selects next

## Blocking Flags
Stop immediately and write `BLOCKED: [reason]` to this file if:
- Any TypeScript error is introduced
- The options no longer show correct/incorrect coloring after selection
- The `computeResult` hint at the bottom breaks (it reads `diagState`, not `displayedQuestion` — leave it unchanged)

## Playwright Checkpoint
yes

What to test:
- Load `/onboarding` → get to the diagnostic quiz
- Answer question 1 (pick any option) → verify explanation text matches the concept shown in the question card label (NOT the label that would appear after advancing)
- Click "Next question" → verify a new question appears with a different prompt
- Answer question 2 → verify explanation text matches question 2's concept
- Console: no errors during the above flow
