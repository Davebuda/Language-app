# Plan: P1 Bug 3 — Conversation Grammar Pipeline

**Status: AWAITING APPROVAL — do not implement until approved**
**Date:** 2026-05-21
**Source:** `docs/recovery-backlog.md` P1 bug 3 (new finding, not in original backlog)
**Flags resolved:** Flag 1 (delete inline path), Flag 2 (fire-and-forget), Flag 3 (Rule 8 own item — done)

---

## What this plan addresses

`logConversationError()` has never been called in production. The inline `CORRECTION:` token
path in `conversationTurn` requires the model to output a structured token it has never once
produced. Five-turn live session confirmed: zero correction cards rendered, zero fingerprint
writes. The pipeline has been silently empty since the AI shipped — a pipeline-honesty
violation (CLAUDE.md Rule 8).

**Root cause:** The model detects grammar errors but outputs corrections as natural Norwegian
prose ("Det var en feil! ... skal være ..."), not as `CORRECTION:{...}` tokens. The regex
`/CORRECTION:(\{.*?\})/s` never matches.

**Fix:** Delete the broken inline path entirely. Replace with a `detectErrors()` second pass on
every user turn, run fire-and-forget after the tutor reply is displayed. `detectErrors()` already
exists, returns structured `TaggedError[]`, has a non-AI fallback (returns `[]`), and field-maps
cleanly to what `logConversationError()` needs.

---

## Files touched

| File | Change |
|---|---|
| `src/ai/webllm.ts` | Delete `CORRECTION:` parsing block; remove stripping regex; remove `correction` from return |
| `src/ai/prompts.ts` | Remove `CORRECTION:{...}` output instructions from conversation system prompt |
| `src/app/conversation/page.tsx` | Import `ALL_ERROR_TAGS`; add `runSecondPassDetection`; update `handleSend`; delete dead `logConversationError` call in `addTutorMessage` |
| `tests/conversation/second-pass.test.ts` (new) | Unit tests for allowlist check and field mapping |

No schema changes. No new stores. No new components.

---

## The change

### Step 1 — webllm.ts: delete inline CORRECTION path

**Delete** the `CORRECTION:` parsing block (currently lines 310–317):
```typescript
// DELETE ENTIRELY:
const correctionMatch = raw.match(/CORRECTION:(\{.*?\})/s)
let correction: ConversationTurnResult['correction']
if (correctionMatch) {
  try {
    const c = JSON.parse(correctionMatch[1]) as { original: string; correct: string; tag: string; why: string }
    correction = { original: c.original, corrected: c.correct, errorTag: c.tag, explanation: c.why }
  } catch { /* ignore */ }
}
```

**Delete** the `CORRECTION:` stripping from `tutorResponse`:
```typescript
// BEFORE:
const tutorResponse = raw
  .replace(/\nCORRECTION:\{.*?\}/s, '')   // ← DELETE this line only
  .replace(/\nCONSTRAINT_MET/, '')
  .replace(/\nCONSTRAINT_MISSED:.*/, '')
  .trim()

// AFTER:
const tutorResponse = raw
  .replace(/\nCONSTRAINT_MET/, '')
  .replace(/\nCONSTRAINT_MISSED:.*/, '')
  .trim()
```

**Simplify** the return — remove `correction`:
```typescript
// BEFORE:
return { tutorResponse, correction, constraintMet, constraintFeedback, source: 'ai' }

// AFTER:
return { tutorResponse, constraintMet, constraintFeedback, source: 'ai' }
```

### Step 2 — prompts.ts: remove CORRECTION output instructions

In `buildConversationPrompt`, the current system prompt has:

```
6. If the error is significant, add a correction note in [brackets] at the very end of your response: [merk: "their mistake" → "correct form"]
7. Never break character, never explain that you are AI.

After your Norwegian response, if there was a grammar error, output this on a new line:
CORRECTION:{"original":"exact words they used wrong","correct":"the right form","tag":"error category","why":"one sentence English explanation"}

If no error, output nothing extra.
```

**Replace with** (renumbering rule 7 to 6):
```
6. Never break character, never explain that you are AI.
```

Keep Rule 5 unchanged: "If the learner made a clear grammar mistake, weave the correct form naturally into your own response without pointing it out explicitly." This produces better teaching (model demonstrates the correct form in context) and no longer conflicts with a structured output side-channel.

### Step 3 — page.tsx: add second-pass detection

**Add import** at the top of the file:
```typescript
import { ALL_ERROR_TAGS } from '@/types/taxonomy'
```

**Add `runSecondPassDetection`** inside the component, alongside `logConversationError`:
```typescript
async function runSecondPassDetection(userInput: string): Promise<void> {
  try {
    const errors = await aiService.detectErrors(userInput, level)
    for (const error of errors) {
      if (!(ALL_ERROR_TAGS as readonly string[]).includes(error.tag)) {
        console.warn('[Conversation] detectErrors: unknown tag discarded:', error.tag)
        continue
      }
      logConversationError({
        original: error.wrong,
        corrected: error.correct,
        errorTag: error.tag,
        explanation: error.briefWhy,
      })
    }
  } catch {
    // Silent — a fingerprint miss is acceptable; conversation never blocks.
  }
}
```

**Update `handleSend`** — add fire-and-forget call after `await addTutorMessage`:
```typescript
async function handleSend(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return
  setInputText('')
  const nextMessages = [...messages, { role: 'user' as const, content: trimmed }]
  setMessages(nextMessages)
  void persistTurn('user', trimmed)
  await addTutorMessage(nextMessages.map((m) => ({ role: m.role, content: m.content })))
  void runSecondPassDetection(trimmed)  // fire-and-forget: reply already shown, fingerprint updates async
}
```

**Update `addTutorMessage`** — delete the dead correction call:
```typescript
// DELETE this line:
if (result.correction) logConversationError(result.correction)
```

`result.correction` is always `undefined` after Step 1; this line is dead code.

---

## Field mapping: TaggedError → logConversationError

`detectErrors()` returns `TaggedError[]`:
```typescript
interface TaggedError {
  tag: ErrorTag       // → correction.errorTag
  wrong: string       // → correction.original
  correct: string     // → correction.corrected
  briefWhy: string    // → correction.explanation
}
```

`logConversationError` accepts `NonNullable<ConversationTurnResult['correction']>`:
```typescript
interface ConversationCorrection {
  original: string
  corrected: string
  errorTag: string    // ← tag goes here; allowlist check ensures it's a valid ErrorTag
  explanation: string
}
```

Clean one-to-one mapping. No new fields, no type coercions beyond the `errorTag: string` widening (already present in the existing type).

---

## Allowlist check

`ALL_ERROR_TAGS` from `types/taxonomy.ts` is the complete 17-tag canonical list:
```
word-order, verb-tense, verb-conjugation, noun-gender, article-use,
adjective-agreement, pronoun-choice, preposition, modal-verb, negation-placement,
compound-word, wrong-word-same-category, wrong-word-different-category, spelling,
listening-recognition, reading-parsing, meaning-misunderstood, unspecified
```

Any tag outside this set — fabricated by the model, malformed, or in a different language —
is logged via `console.warn` and discarded. `logConversationError` is never called with an
unknown tag. `ERROR_TAG_TO_CONCEPT` inside `logConversationError` provides a second gate:
tags with no concept mapping return early without any fingerprint write.

---

## Edge cases

| Scenario | Behavior |
|---|---|
| `detectErrors` returns `[]` | No write; correct |
| AI not ready (`!isReady()`) | `detectErrors` returns `[]`; no write; correct |
| Model fabricates unknown tag | `console.warn`, tag discarded, no write |
| User types English | `detectErrors` may return empty or unusual results; allowlist + `ERROR_TAG_TO_CONCEPT` together prevent any bad write |
| Opening turn (tutor speaks first) | `runSecondPassDetection` is only called from `handleSend`, never on the opener |
| Multiple errors in one turn | Each valid error logs independently; `logConversationError` is called once per error |
| Constraint evaluation fires in same turn | Independent; no conflict |
| `detectErrors` throws | `catch {}` swallows; conversation unaffected |

---

## Known limitation — correction cards not shown

`msg.correction` in the message state is always `undefined` after this fix. The correction card
renderer (page.tsx lines ~438–452) stays in the code but is now dead: second-pass results update
the fingerprint but do not update the messages state. Surfacing second-pass errors as correction
cards is a separate follow-up — it requires either updating the last user message in state after
the async detection, or a new "corrections" state slot. Out of scope for this plan. Until then,
the learner benefits from improved scheduling (fingerprint is now correct) without seeing explicit
inline correction cards from conversation mode.

---

## Unit test plan

New file: `tests/conversation/second-pass.test.ts`

Mocking strategy: mock `aiService.detectErrors` to return controlled `TaggedError[]`; mock
`logConversationError` to spy on calls.

| Test | What it verifies |
|---|---|
| Known tag 'word-order' | `logConversationError` called once with `{ original: wrong, corrected: correct, errorTag: 'word-order', ... }` |
| Fabricated tag 'invented-tag' | `logConversationError` NOT called; `console.warn` fires |
| Empty `errors` array | `logConversationError` never called |
| `detectErrors` throws | No crash; `logConversationError` never called |
| Two errors, one valid / one fabricated | `logConversationError` called exactly once (for the valid tag) |
| `detectErrors` returns `[]` when AI not ready | No write; conversation proceeds |

---

## What does NOT change

- `logConversationError` function body — unchanged; all write logic stays
- `ConversationTurnResult.correction` field — stays optional in the type; returns `undefined`
- Correction card renderer in message display — stays, currently dead, documented above
- `StubAIService` — not touched
- Constraint evaluation path — unaffected
- Session loop, repair loop, fingerprint store — unaffected
- The `persistTurn` call for tutor turns — passes `result.correction` which is `undefined`; no-op, no change in behavior

---

## Acceptance criteria (non-negotiable — CLAUDE.md Rule 3 + Rule 8)

1. **One-write trace:** Send "I dag jeg spiser pizza" in a live conversation. Open the browser dev console. After the tutor responds (~20s), console shows `[detectErrors]` processing. Inspect `useFingerprintStore.getState().fingerprint.recentErrors[0]` — it must be a new entry with `errorTag: 'word-order'`, `wrong` containing the user's input. `conceptMastery['v2-word-order'].attemptCount` must be exactly 1 higher than before the turn. NOT 2. Traced in live console, not in theory.

2. **No double-write:** Confirm `attemptCount` increments by exactly 1 per erroneous turn. The inline path is deleted; there is no second writer. Confirm in the same trace.

3. **Fabrication guard:** Mock `detectErrors` to return `{ tag: 'invented-tag', ... }`. `console.warn` fires. Fingerprint unchanged.

4. **Tests pass:** `npm test` — all new tests in `tests/conversation/second-pass.test.ts` pass; all existing tests unaffected.

5. **TypeScript clean:** `npx tsc --noEmit` — no new errors in touched files. Pre-existing errors in `TopographicGrid.tsx` and `OnboardingFlow.tsx` are not introduced by this change.
