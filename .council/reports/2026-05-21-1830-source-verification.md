# P0.5-01 — Source Verification of Third-Walkthrough Critical Findings

**Date:** 2026-05-21T18:30
**Status:** complete
**Task brief:** `.council/current.md`
**Walkthrough evidence:** `test-reports/stress-walkthrough-2026-05-21/`
**Method:** Read-only source audit of `src/**` and `content/sentences/*.json`. No file mutations to `src/`.

---

## Executive summary

Twelve Critical walkthrough findings map cleanly onto source defects. The most consequential discovery is that **F010 is a content-corpus problem, not a code regression**: the items 5+7 fix (commits `77e54b2`, `bf118fe`) is still intact — every exercise component correctly derives `errorTag` from `sentence.errorTagsDetectable[0]`. The collapse to `word-order` is caused by the seed JSON itself: 9/9 sentences tagged to `question-formation` declare `error_tags_detectable: ['word-order']` first, and 9/9 sentences tagged `v2-word-order` also declare `['word-order']`. The corpus uses a concept-id scheme that aligns with the graph but diverges from the diagnostic — the same root cause produces F036 (progress shows 0% / Locked everywhere), F019 (scheduler "no eligible sentence" warnings) and schedule degradation across the dashboard. Three independent AI surfaces (`explainMistake`, `conversationTurn`, `reviewWriting`) lack any shared validity gate before display, confirming F022/F029/F033 share a single fix shape (P0.5-04). Conversation and journal *do* call the engine's `logError`/`updateConceptMastery` API, so F030 and F034 are downstream symptoms of (a) the AI never producing a parseable correction (F030) and (b) per-surface hard-coded `tag → conceptId` maps silently dropping any tag outside their short list (F034). F012 and F023 share a guard-after-render anti-pattern at `src/app/session/complete/page.tsx`. F017 is a one-line bug at `src/lib/diagnostic/engine.ts:140`: `Math.max(seedScore, rawScore)` floors wrong answers at 20, combined with destructive overwrite at `OnboardingFlow.tsx:94` that loses wrong-answer signal across re-runs.

---

## F010 — Every recentErrors entry tagged `word-order` regardless of mistake type

**Symptom (from walkthrough):** 24 errors logged across `question-formation`, `adjective-agreement`, `v2-word-order`, `sentence-transformation` — all carry `errorTag: 'word-order'`. `errorPatterns[0]` collapses to a single `word-order` pattern with frequency 23.

**Source location:**
- `src/components/session/exercises/WordOrderExercise.tsx:67` — `errorTag: correct ? undefined : (sentence.errorTagsDetectable[0] ?? 'word-order')`
- `src/components/session/exercises/SpeedRound.tsx:57` — `errorTag: correct ? undefined : (errorTag ?? sentence.errorTagsDetectable[0] ?? 'spelling')`
- `src/components/session/exercises/TranslationExercise.tsx:81` — `errorTag: correct ? undefined : (errorTag ?? sentence.errorTagsDetectable[0] ?? 'unspecified')`
- `src/components/session/exercises/FillInBlankExercise.tsx:48,134` — `errorTag: isCorrect ? undefined : errorTag` (passed from parent)
- `src/app/session/actions.ts:77` — server grader: `errorTag: correct ? undefined : pickErrorTag(sentence.errorTagsDetectable)` where `pickErrorTag` returns `tags[0]`
- `content/sentences/a1.json`, `content/sentences/a2.json` — the seed corpus that is the source of `sentence.errorTagsDetectable`
- `src/lib/mock-sentences.ts:122` — `mock-s11` declares `errorTagsDetectable: ['word-order']` for a `question-formation` sentence-transformation

**Current code behaviour:** The items 5+7 fix is intact (verified in commits `77e54b2` and `bf118fe`). Every exercise component pulls `errorTag` from `sentence.errorTagsDetectable[0]`. There is no hard-coded tag override anywhere in the components. The grader (server action) also returns the first declared tag.

**Why the symptom manifests — definitive answer: (b) content-corpus mis-tagging.** Counted programmatically over the 397 seed sentences in `content/sentences/{a1,a2}.json`, sliced by `concept_id`:

| concept_id | sentences | first-tag breakdown |
|---|---|---|
| `question-formation` | 9 | `word-order` × 9 |
| `v2-word-order` | 9 | `word-order` × 9 |
| `noun-gender` | 9 | `noun-gender` × 9 |
| `adjective-agreement` | 9 | `adjective-agreement` × 9 |
| `negation-placement` | 0 | (absent from corpus — see F036) |
| `past-tense-regular` | 0 | (absent from corpus — see F036) |
| `modal-verbs` | 0 | (absent from corpus — see F036) |
| `prepositions-place` | 0 | (absent from corpus — see F036) |

So during a session exercising `question-formation` or `v2-word-order` concepts, every wrong answer is tagged `word-order`. The walkthrough's 24 errors collapsing to a single `word-order` pattern is the direct consequence. Note that several diagnostic concept IDs have ZERO sentences in the corpus — see F036.

Secondary amplifier in `src/ai/webllm.ts:219`: `errorTagsDetectable: params.recentErrors ?? []` — AI-generated content sets the sentence's detectable tags to the learner's recent error tags. Once `word-order` dominates `recentErrors`, all AI-generated content gets tagged `word-order` too, locking in the pattern.

**Intended behaviour:** Each sentence's `error_tags_detectable[0]` should reflect the canonical error tag for the concept's typical failure mode. `question-formation` sentences might legitimately declare `word-order` (question formation IS word-order rearrangement), but the broader corpus must spread tags so the fingerprint actually diagnoses different concepts.

**Likely scope of fix:** Content corpus rewrite. Both `content/sentences/{a1,a2}.json` need their `error_tags_detectable` re-authored. `src/lib/mock-sentences.ts:122` (`mock-s11`) needs the tag rebalanced. The AI write-back at `webllm.ts:219` should derive tags from concept, not from learner's recent errors. No source-code change to the items 5+7 path required.

**Dependencies on other findings:** Fixes F010 directly. Heavily overlaps with F036 (concept-id mismatch — without that fix, `negation-placement` etc. still have zero sentences). Sequence AFTER F036.

**Confidence:** high (verified via Node script counting tags by concept).


---

## F011 — Half of stored errors have `correct: "[unavailable]"`

**Symptom (from walkthrough):** 12 of 24 historical error entries store the literal placeholder string `"[unavailable]"` in the `correct` field. Affects `exerciseType: sentence-transformation` and `translation-to-english` with `sentenceId: item-0`/`item-1`.

**Source location:**
- `src/app/session/actions.ts:63` — `return { correct: false, correctAnswer: "[unavailable]", errorTag: undefined }`
- Called by `src/components/session/exercises/TranslationExercise.tsx:61` — `await gradeAnswer(sentence.id, item.exerciseType, userInput)`
- Flow: `serverAnswer` → `ExerciseResult.correctAnswer` (TranslationExercise.tsx:79) → `recordResult` → `logError(... correct: result.correctAnswer ...)` at `src/hooks/useFingerprint.ts:160`

**Current code behaviour:** `gradeAnswer` is a server action that looks up the sentence in (1) `loadContentSentences()` from local JSON, (2) Supabase `sentences` table. If neither resolves the sentence id (line 61-64), it returns the literal placeholder. The value propagates downstream and is persisted as if it were a real correct answer.

**Why the symptom manifests:** The walkthrough sentenceId values `item-0` and `item-1` strongly suggest the errors originated from sentences with literal IDs `item-0`, `item-1` — likely from an AI-generated fallback path or stale mock content that no longer exists in either source. `gradeAnswer` falls open to the placeholder. CLAUDE.md operating rule 6 ("no silent substitution") prohibits this.

**Intended behaviour:** Either (a) refuse to log an error when the correct answer cannot be derived (drop the entry, console.warn, telemetry), or (b) log a structured "unresolvable" marker that the repair loop can detect and skip the "Correct answer" rendering. Storing the placeholder string in user data is the failure mode.

**Likely scope of fix:** Single-file (`src/app/session/actions.ts:61-64`). Change the return to a discriminated-union `{ ok: false, reason: 'unknown-sentence' }` and have `TranslationExercise.tsx:55-84` skip the `onResult` call when the grader cannot resolve. Bonus: trace what creates `sentenceId: item-0` (search the codebase) — likely an AI top-up path or partially-removed mock.

**Dependencies on other findings:** Independent of F010. Slot into the corpus pass (P0.5-02).

**Confidence:** high.

---

## F012 — `totalSessionsCompleted: 0` despite 24 logged errors / sessions never log as completed

**Symptom (from walkthrough):** Fingerprint shows `totalSessionsCompleted: 0`, `lastSessionAt: null` while `recentErrors.length: 24` and `conceptMastery['question-formation'].attemptCount: 27`. Counter never increments.

**Source location:**
- `src/app/session/complete/page.tsx:109-121` — increment site (inside `useEffect`); line 114: `totalSessionsCompleted: (fp.totalSessionsCompleted ?? 0) + 1`
- Gated by `src/app/session/complete/page.tsx:85` — `if (session) { … increment }`
- Trigger: `src/components/session/SessionScreen.tsx:78-81` — `if (isComplete) { incrementStreak(); router.push("/session/complete") }`

**Current code behaviour:** The increment IS wired correctly when the user reaches `/session/complete` with a valid session. The effect runs once (deps: `[session?.id]`), increments the counter, persists. The code is structurally correct.

**Why the symptom manifests:** The increment requires the user to actually reach `/session/complete` via the natural completion flow. The walkthrough captured many states where this does not happen:

1. **Mid-session exit dropped (F024).** Back button at `SessionScreen.tsx:92-99` calls `router.push("/dashboard")` with no confirmation and no session-finalisation. Errors logged via `submitResult` BEFORE the exit are in `recentErrors`/`conceptMastery`, but `/session/complete` is never reached.
2. **Re-entry generates fresh session (F025).** Going back into `/session` triggers `startNewSession` at `SessionScreen.tsx:64` which calls `generateSession` and `startSession` — wiping prior progress.
3. **Unbounded repair-loop growth (F027).** With session size growing 11 → 14 → 17 per wrong answer, the user is increasingly unlikely to ever reach `currentItemIndex >= totalItems` (the `isComplete` trigger at `SessionScreen.tsx:70`).

**Intended behaviour:** Sessions should count as completed when meaningful progress has been made. Two viable approaches:
1. Increment on first `submitResult` of a fresh session (any session with ≥1 answer is "counted"). Move the increment into `src/hooks/useSession.ts:submitResult` keyed by a per-session `hasCounted` flag.
2. Add mid-session exit confirmation (F024) + session resumption (F025) so the user actually reaches `/session/complete`.

Approach (1) is one-file and behaviour-preserving; approach (2) is a larger UX/state-model change.

**Likely scope of fix:** Single-file if approach (1); multi-file if approach (2). The existing increment site at `complete/page.tsx:109-121` should be kept as a safety net or removed depending on choice.

**Dependencies on other findings:** Sequenced with F023 (same file), F024+F025 (gate the natural completion flow), F027 (repair cap).

**Confidence:** high — increment site is correct; the symptom is upstream flow.

---

## F016 — Diagnostic write happens on navigation, not on result-screen completion

**Symptom (from walkthrough):** At the result screen, IndexedDB still shows pre-diagnostic state. Closing the tab on the celebration page loses all 12 answers. Write fires only on "Gå til dashboard" / "Start første økt".

**Source location:**
- `src/components/onboarding/OnboardingFlow.tsx:157-160` — `handleDiagnosticComplete` only stores the result in component state (`setDiagnosticResult`) and advances UI
- `src/components/onboarding/OnboardingFlow.tsx:162-166` — `commit(destination)` is where `seedFingerprintFromDiagnostic` runs
- `src/components/onboarding/OnboardingFlow.tsx:183-184` — the `onStart` and `onDashboard` button handlers are the only callers of `commit`

**Current code behaviour:** The result screen renders BEFORE any persistence happens. The fingerprint write is deferred to the click handlers, which also do the navigation. If the user closes the tab on the celebration page, the answers are buffered in React state only and lost.

**Why the symptom manifests:** Direct gap between "diagnostic complete" (state transition) and "diagnostic persisted" (the `commit` function). No `useEffect([diagnosticResult])` to persist on result-ready.

**Intended behaviour:** Persist the diagnostic result as soon as `handleDiagnosticComplete` fires. Buttons should be UX navigation, not data commits.

**Likely scope of fix:** Single-file (`OnboardingFlow.tsx`). Add a `useEffect` keyed on `diagnosticResult` that calls `seedFingerprintFromDiagnostic` on first non-null, OR call the seed function directly inside `handleDiagnosticComplete`. Reduce `commit()` to navigation only.

**Dependencies on other findings:** Shares file with F015, F017, F031.

**Confidence:** high.

---

## F017 — Diagnostic seeds rawScore=100 for every concept seen, ignoring wrong answers

**Symptom (from walkthrough):** Answered 5 wrong / 7 correct in the diagnostic. Post-write rawScores show `question-formation: 100, adjective-agreement: 100, past-tense-regular: 100, prepositions-place: 100, negation-placement: 100, modal-verbs: 100, v2-word-order: 67`. Wrong answers do not lower mastery.

**Source location:**
- `src/lib/diagnostic/engine.ts:115-154` — `computeResult` builds `conceptSeeds` from `state.answers`
- `src/lib/diagnostic/engine.ts:129-150` — per-answer accumulator. Critical lines:
  - Line 136: `const seedScore = correct ? 60 : 20`
  - Line 137: `const rawScore = Math.round((nextCorrect / nextAttempts) * 100)`
  - Line 140: `rawScore: Math.max(seedScore, rawScore)` (the bug)
- `src/components/onboarding/OnboardingFlow.tsx:94-110` — `seedFingerprintFromDiagnostic` does `fp.conceptMastery[conceptId] = { conceptId, rawScore: seed.rawScore, ... }` — DESTRUCTIVE OVERWRITE

**Current code behaviour:** In `computeResult`, with one question per concept:
- Single correct: `rawScore = round(1/1*100) = 100`, `seedScore = 60` → `max = 100`
- Single wrong: `rawScore = 0`, `seedScore = 20` → `max = 20` (NOT 0)
- 1 wrong + 1 correct on same concept within one run (iteration order wrong→correct): final iteration `rawScore=50`, `seedScore=60` → `max = 60`

Per-concept accumulator `existing = conceptSeeds[question.conceptId]` (line 130) only sees answers from the CURRENT diagnostic run, not the fingerprint prior state.

**Why the symptom manifests:** Two compounding issues:
1. `Math.max(seedScore, rawScore)` floors any wrong-answer concept at 20, never 0. A learner who answers a concept entirely wrong cannot drop below 20.
2. `seedFingerprintFromDiagnostic` overwrites `fp.conceptMastery[conceptId]` directly. Combined with F015 (no dedupe across runs), running the diagnostic twice — wrong in run 1, correct in run 2 — destroys the wrong signal and replaces it with rawScore=100.

The walkthrough claim "every wrong concept ended up at 100" is consistent with two diagnostic runs (F015 confirms two runs in-session): wrong in run 1 wrote rawScore=20; run 2 correct answer overwrote with rawScore=100. The `max(seedScore, ...)` floor is the foundational bug; the overwrite is the amplifier.

**Intended behaviour:** Mastery should be a true accuracy-weighted score from the run answers, with wrong answers depressing rawScore proportionally. Re-runs should ADD attempts to existing concept mastery via `updateConceptMastery` per answer, not overwrite.

**Likely scope of fix:** Two-file:
1. `src/lib/diagnostic/engine.ts:140` — drop `Math.max(seedScore, rawScore)`; return accuracy-weighted score directly. Or restructure `computeResult` to call `updateConceptMastery` per answer.
2. `src/components/onboarding/OnboardingFlow.tsx:94-110` — merge with existing `fp.conceptMastery[conceptId]` via `updateConceptMastery` instead of overwriting; replay each `{question, correct}` pair through the same EMA the session loop uses.

**Dependencies on other findings:** Shares files with F015, F016, F031. All four should be addressed as one coherent diagnostic-semantics pass.

**Confidence:** high.

---

## F022 / F029 / F033 — AI surfaces ship unvalidated output (single root cause: no shared validity gate)

**Symptoms (from walkthrough):**
- F022: Repair card grammar prose teaches the OPPOSITE of correct gender-to-article mapping (claims "et" is for masculine, "ei" is for neuter).
- F029: Kari (conversation AI) emits non-Norwegian strings such as "Det lunter for å ikke væreatraftet tidlig oglanda!" plus gender errors ("Te er en fin alternativ!").
- F033: Journal AI produces fabricated words (døvreslekkende, ordensnitt), removes a user negation from a sentence (meaning flip), invents irrelevant grammar explanations.

**Source locations (the three surfaces):**
- F022 — src/hooks/useSession.ts:248-262 (aiService.explainMistake call plus sessionStore.updateRepairExplanation at line 259); rendered at src/components/session/ExplanationCard.tsx:42 (direct render of repairPlan.explanation).
- F022 generator — src/ai/webllm.ts:235-244 (explainMistake returns text without validation).
- F029 — src/app/conversation/page.tsx:236-244 (aiService.conversationTurn call plus setMessages); rendered at page.tsx:444.
- F029 generator — src/ai/webllm.ts:292-345 (conversationTurn); response stripped of CORRECTION/CONSTRAINT markers and trimmed only (lines 335-339).
- F029 fallback — src/ai/webllm.ts:298-301 uses the raw topic slug (this is the F028 root cause for "La oss snakke om daily-routine").
- F033 — src/components/journal/WritingEditor.tsx:178-181 (aiService.reviewWriting call); rendered at WritingEditor.tsx:299, 308, 312, 320 — every field rendered raw.
- F033 generator — src/ai/webllm.ts:263-290 (reviewWriting); each error tag cast at line 277 is unchecked.

**Definitive answer: no shared AI validity gate exists.** Grep across src/ for validity primitives finds exactly one: validateGenerated at src/ai/validate.ts:74-109. It contains:
- A Norwegian-character regex NORWEGIAN_CHARS at validate.ts:36 that would catch some of the gibberish in F029 and F033.
- Word-count bounds and structural checks for fill-in-blank and word-order exercises.

But validateGenerated is called ONLY at src/ai/webllm.ts:203 (inside generateContent). There is no equivalent gate for explainMistake, conversationTurn, or reviewWriting. The AI output flows directly to setMessages, updateRepairExplanation, and setFeedback, then renders verbatim.

There IS one ad-hoc heuristic at webllm.ts:43-45 (likelySyntheticCompound) — but it is also only invoked inside generateContent (line 208).

**Intended behaviour:** A single src/ai/validate.ts module exporting a function such as validateNorwegianOutput(text, opts) that every AI surface passes its output through before render. On validation failure: fall back to a deterministic non-AI template (already implemented per-surface — repair has EXPLANATION_TEMPLATES at src/engine/repair-loop.ts:6-43, conversation has fallbackResponse at webllm.ts:298-301, journal has the early-return template at webllm.ts:264-266).

The journal needs the gate twice: once on the error array wrong/correct/why fields, once on the praise plus suggestion strings. The conversation needs it on tutorResponse and on the correction strings if present. The repair card needs it on the AI explanation BEFORE sessionStore.updateRepairExplanation runs.

**Likely scope of fix:** New module plus four call-site changes:
1. Extend src/ai/validate.ts with validateNorwegianOutput plus a fabricated-compound check that runs on all surfaces, not just generateContent.
2. webllm.ts:235-244 (explainMistake) — validate text before returning; on failure return template.
3. webllm.ts:292-345 (conversationTurn) — validate tutorResponse before returning; on failure use fallback.
4. webllm.ts:263-290 (reviewWriting) — validate per-error fields and praise/suggestion; drop invalid entries.
5. useSession.ts:258-260 — re-validate before sessionStore.updateRepairExplanation (defence-in-depth).

**Dependencies on other findings:** F028 (conversation slug substitution) is a 2-line adjacent fix in webllm.ts:300 — pass a Norwegian topic label rather than the raw slug. The validity gate matches the P0.5-04 backlog scope.

**Confidence:** high.

---

## F023 — /session/complete is directly accessible with no guard

**Symptom (from walkthrough):** Typing /session/complete into the URL lands the user on the celebration screen with stats 0 accuracy / 0 produksjon / 0:00 tid brukt / 0 konsepter. No redirect to dashboard.

**Source location:**
- src/app/session/complete/page.tsx:80-84 — guard EXISTS as a router.replace to /dashboard when session is null and results.length is 0.
- BUT guard runs inside a useEffect (line 80), which fires AFTER the initial render.

**Current code behaviour:** The page renders the celebration UI on first paint using session = null, results = empty, then the effect fires and router.replace navigates away. The walkthrough captured the celebration screen between first paint and the redirect.

**Why the symptom manifests:** Effect-based guard is a post-render redirect. The render functions (lines 217-407) do not gate on the absent session. They use safe fallbacks (accuracy = 0, duration = "0:00", practicedConceptIds = empty), which are exactly the values the walkthrough saw.

**Intended behaviour:** Pre-render gate. The page should render null (or a thin loading skeleton) until session is confirmed present in store.

**Likely scope of fix:** Single-file. Add an early-return guard BEFORE the JSX at line 217, in addition to the existing effect.

**Dependencies on other findings:** Same file as F012 increment site. Fixes can land together.

**Confidence:** high.

---

## F029 — covered above with F022 / F033

See the combined entry above.

---

## F030 — Conversation message with grammar error: no fingerprint write

**Symptom (from walkthrough):** Sent a Norwegian sentence with two clear errors (negation placement plus adverb placement). No correction card fired; recentErrors did not grow; updatedAt did not change.

**Source location:**
- src/app/conversation/page.tsx:228-255 — addTutorMessage.
- src/app/conversation/page.tsx:244 — logConversationError is called when result.correction is truthy.
- src/app/conversation/page.tsx:170-201 — logConversationError calls logError + updateConceptMastery + aggregateErrorPatterns + saveFingerprint (full pipeline).
- src/app/conversation/page.tsx:62-73 — ERROR_TAG_TO_CONCEPT map (only 10 tags).
- src/app/conversation/page.tsx:172-173 — silent drop when the tag is not in the map.
- src/ai/webllm.ts:315-322 — parsing path for the CORRECTION marker (regex plus JSON.parse inside try/catch that silently swallows failures).

**Definitive answer: the conversation surface DOES invoke the engine write APIs.** The call chain page.tsx:244 → logConversationError → logError + updateConceptMastery + aggregateErrorPatterns → setFingerprint + saveFingerprint is fully wired. The defect is in two upstream gates:

1. AI may not produce a parseable correction. webllm.ts:315 parses the CORRECTION marker with JSON.parse inside a try/catch (lines 318-321) that silently swallows any failure. If the model does not emit the marker, or emits it malformed, correction stays undefined and logConversationError is never called.
2. Even if correction parses, the tag map is incomplete. ERROR_TAG_TO_CONCEPT covers 10 tags. The taxonomy in src/types/taxonomy.ts has 17. Any correction.errorTag outside the 10 is silently dropped at page.tsx:173. The AI is also free to invent tag strings — the cast at webllm.ts:319 is unchecked.

The walkthrough symptom is consistent with cause 1 firing — the AI did not produce a correction marker for this turn. Cause 2 would still silently bite once cause 1 is fixed.

**Intended behaviour:** Two complementary fixes:
1. Validity gate (P0.5-04): every conversation reply runs the AI through a Norwegian-validity check; if the user message contains detectable errors but the AI tutorResponse passes validation without a correction, log a deterministic correction so the engine sees the error.
2. Complete the tag-to-concept map OR add a fallback such as unspecified so writes always happen.

**Likely scope of fix:** Multi-file but each move small:
- src/ai/webllm.ts:315-322 — validate correction shape and tag against taxonomy; warn on malformed correction rather than swallowing.
- src/app/conversation/page.tsx:62-73 — extend the map to 17 tags or add a fallback.
- Better: extract the tag-to-concept map to a shared module (src/lib/error-tag-to-concept.ts) shared with F034 site.

**Dependencies on other findings:** F022/F029/F033 (validity gate). Mirror of F034.

**Confidence:** high.

---

## F033 — covered above with F022 / F029

See the combined entry above.

---

## F034 — Journal entry: no fingerprint writes despite 3 surfaced corrections

**Symptom (from walkthrough):** Analyser tekst produced 3 corrections; recentErrors.length stayed at 2 (just session errors); updatedAt unchanged.

**Source location:**
- src/components/journal/WritingEditor.tsx:181 — pushErrorsToFingerprint(result) is called.
- src/components/journal/WritingEditor.tsx:140-171 — pushErrorsToFingerprint implementation (calls logError + updateConceptMastery + aggregateErrorPatterns + setFingerprint + saveFingerprint).
- src/components/journal/WritingEditor.tsx:22-34 — WRITING_TAG_TO_CONCEPT mapping (11 tags only).
- src/components/journal/WritingEditor.tsx:145-146 — silent drop when conceptId lookup is undefined.

**Definitive answer: the journal surface DOES invoke the engine write API.** The defect is the silent drop at line 146: if the AI tag is not one of the 11 mapped keys, the error is skipped without logging or warning.

The walkthrough corrections were:
1. Negation issue. AI might tag as negation-placement (mapped), word-order (mapped), or invent something else.
2. Adverb placement. Likely word-order (mapped) or invented.
3. Double definiteness. Likely article-use (mapped) or invented.

If all three tags were in the map, 3 errors should have been written. The fact that zero were written means either the AI returned tags outside the 11-key list (for example subject-verb-agreement, definiteness, verb-placement, or any invented string) or reviewWriting returned the template fallback path with empty errors. The visible 3-correction render rules out the latter.

Tags missing from WRITING_TAG_TO_CONCEPT relative to src/types/taxonomy.ts (17 total): wrong-word-same-category, wrong-word-different-category, compound-word, meaning-misunderstood, reading-parsing, listening-recognition, unspecified. Plus any invented tag the AI emits.

**Intended behaviour:** Two complementary moves:
1. Validate the AI tag against the taxonomy in webllm.ts:263-290 (reviewWriting); coerce invalid tags to unspecified rather than passing them through unchecked.
2. Complete the journal-side tag map for every taxonomy entry, with unspecified falling through to a sensible default concept.

**Likely scope of fix:** Single-file for the map fix; multi-file if the shared module is extracted. WritingEditor.tsx:22-34, 145-146 plus ideally a new src/lib/error-tag-to-concept.ts shared with conversation.

**Dependencies on other findings:** Mirror of F030 (same silent-drop pattern, same map shape). Fix together.

**Confidence:** high.

---

## F036 — /progress shows 0% / Locked for concepts the fingerprint has at rawScore 100

**Symptom (from walkthrough):** Fingerprint has prepositions-place: 100, past-tense-regular: 100, modal-verbs: 100, negation-placement: 100, adjective-agreement: 100, question-formation: 100, v2-word-order: 67. Progress page shows all of them at 0% Intro or Locked.

**Source location:**
- src/app/progress/page.tsx:54 — graph loaded from content/concepts/a1-graph.json or a2-graph.json depending on currentLevel.
- src/app/progress/page.tsx:92-95 — iterates over graph concepts, looking up fingerprint.conceptMastery[concept.id].
- src/app/progress/page.tsx:140 — the rendered score: Math.round of decayedScore for the matched concept.
- src/lib/diagnostic/questions.ts:15-313 — diagnostic question conceptId values (the source of fingerprint mastery keys).
- content/concepts/a1-graph.json, content/concepts/a2-graph.json — graph concept IDs.
- content/sentences/a1.json, content/sentences/a2.json — seed corpus concept IDs.

**Current code behaviour:** Progress page iterates graph concept IDs and looks up fingerprint.conceptMastery[id]. Fingerprint mastery is keyed by diagnostic conceptId. These schemes diverge for 5 of the 12 diagnostic concepts.

**Definitive answer: divergent concept-id schemes between (1) diagnostic, (2) fingerprint write paths, (3) graph, and (4) seed corpus.**

### F036 concept-id mismatch table (the migration map for P0.5-07)

The 12 diagnostic concept IDs (extracted from src/lib/diagnostic/questions.ts) mapped to the A1/A2 graph concept IDs and the seed corpus concept IDs:

| Fingerprint ID (diagnostic) | Graph ID (a1/a2-graph.json) | Seed corpus ID | Status |
|---|---|---|---|
| noun-gender | noun-gender | noun-gender | match |
| present-tense-verbs | present-tense-regular | present-tense-regular | mismatch |
| personal-pronouns | personal-pronouns | personal-pronouns | match |
| svo-word-order | svo-word-order | svo-word-order | match |
| definite-articles-singular | definite-articles-singular | definite-articles-singular | match |
| v2-word-order | v2-word-order | v2-word-order | match |
| negation-placement | negation | negation | mismatch |
| past-tense-regular | preterite-regular | preterite-regular | mismatch |
| adjective-agreement | adjective-agreement | adjective-agreement | match |
| modal-verbs | common-modal-verbs | common-modal-verbs | mismatch |
| question-formation | question-formation | question-formation | match |
| prepositions-place | common-prepositions | common-prepositions | mismatch |

Plus the conversation/journal ERROR_TAG_TO_CONCEPT maps (src/app/conversation/page.tsx:62-73, src/components/journal/WritingEditor.tsx:22-34) reference yet a third set of fingerprint IDs (for example indefinite-articles for the article-use tag, prepositions-place for the preposition tag, noun-gender for the spelling tag). These two surfaces use diagnostic-style IDs (prepositions-place, modal-verbs), so a write from conversation/journal would also fail to surface on the progress page.

The diagnostic question IDs that match the graph by accident of historical naming (noun-gender, v2-word-order, adjective-agreement, etc.) DO appear in both — which is why the walkthrough shows some concepts at rawScore 100 correctly recorded in the fingerprint, while the progress page still shows them at 0% Intro. That part of the symptom is driven by the decayedScore lookup at progress/page.tsx:140 — applyDecayWithFloor at src/engine/fingerprint.ts:41-46 returns 0 when lastAttemptAt is null.

F036 decomposes into two effects:
- Locked concepts: driven by getConceptPhase at src/engine/fingerprint.ts:272-283 — a concept is locked when prerequisites are not yet mastered. With diagnostic IDs mismatching graph IDs, several graph nodes never see mastery (because the diagnostic wrote to the wrong key), so their prerequisites are never marked mastered, so downstream nodes appear locked. The cascade is real.
- 0% Intro concepts: driven by the lookup at progress/page.tsx:140. For graph IDs not in the diagnostic scheme (common-prepositions vs prepositions-place), the lookup returns undefined and the displayed score falls through to 0.

This same mismatch explains F019 (scheduler "no eligible sentence" warnings): generateSession pulls weak concepts from the fingerprint (diagnostic IDs), then searches the seed corpus by those IDs. Five out of seven weak-concept IDs have ZERO sentences in the corpus because the corpus uses graph keys (verified via Node count: negation-placement, past-tense-regular, modal-verbs, prepositions-place, present-tense-verbs all have 0 sentences in the corpus).

**Intended behaviour:** Single canonical concept-id scheme. The graph is the natural source of truth (it has prerequisites, thresholds, attempts, days). Diagnostic questions, fingerprint mastery keys, conversation/journal mappings, AI prompt labels, and seed corpus IDs should all use graph IDs.

**Likely scope of fix:** Multi-file migration:
1. Rewrite src/lib/diagnostic/questions.ts:15-313 — change conceptIds to graph IDs (negation, common-modal-verbs, common-prepositions, preterite-regular, present-tense-regular).
2. Update src/app/conversation/page.tsx:62-73 and src/components/journal/WritingEditor.tsx:22-34 to map error tags to graph IDs.
3. Update src/ai/prompts.ts:5-20 (CONCEPT_LABELS) to use graph IDs.
4. Add a one-shot migration in src/hooks/useFingerprint.ts (during bootstrap) that renames old diagnostic keys in existing fingerprints so live users do not lose their mastery on the upgrade.
5. Audit src/lib/mock-sentences.ts — already uses graph IDs.

**Dependencies on other findings:** Touches every place concept-id strings appear. Should land BEFORE F010 (corpus retag) because both modify content files, and the corpus retag depends on having a stable ID scheme to retag against. Order: F036 → F010 (or fold into one task).

**Confidence:** high — verified by reading all three sources side-by-side and Node-counting corpus concept distribution.

---

## Cross-cutting REVIEW.md WARNING re-audit (per task brief step 5)

| WARNING item | Status in current source |
|---|---|
| prevUserRef stale | src/hooks/useFingerprint.ts:86, 126 — prevUserRef.current = user assigned outside the effect async closure but on the same render pass. Race window exists but small; not actively biting. Re-audit during P0.5-03. |
| Module-level scenarioCursor | Not found in current useSession.ts. Either removed or renamed. Closed. |
| Auto-skip false-correct | Removed — confirmed by the comment block at src/hooks/useSession.ts:309-314 (notes the 3-second auto-skip useEffect was removed under P0 item 8). Holds. |
| word-order validator | src/ai/validate.ts:104-106 — only checks words array length is at least 2. Does not verify words equals the split of norwegian. Edge case, not biting. |
| isAvailable vs isReady | src/ai/webllm.ts:122-123 — isAvailable returns true unless explicitly unavailable; isReady requires engine present. Used correctly in TranslationExercise.tsx:66. Holds. |
| DB cast without validation | src/storage/supabase.ts — not re-audited in this pass; queued for P0.5-07. |
| submitResult stale read | src/hooks/useSession.ts:188-193 — reads from useSessionStore.getState() at call time, not closure. Holds. |
| Repair items injected unresolved | src/hooks/useSession.ts:267-307 — first repair item is awaited before injection (line 299). Subsequent items fire-and-forget. Holds for first item; could blank-flash on items 2-3. |

---

## Suggested ordering revisions to P0.5-02..12

The walkthrough bucket allocation is broadly sound. Source verification suggests three tightenings:

### Revision 1 — Sequence P0.5-07 before P0.5-02 (or merge)

**Reason:** F010 is a content-corpus tagging problem AND F036 is a concept-id scheme problem. F010 cannot be fixed correctly without the canonical ID scheme decided by F036 — re-tagging prepositions-place sentences is pointless if those sentences will be renamed to common-prepositions next. Doing them as two separate tasks creates two migrations of the same files.

**Proposed:** Rename **P0.5-07 → "Concept-id reconciliation (graph as source of truth)"** and sequence it first; **P0.5-02 → "Corpus tag re-author"** ships after the ID rename. Alternative: collapse into a single "content integrity migration" with both work-streams.

### Revision 2 — Split P0.5-06 (session lifecycle) by fix shape

**Reason:** F012 (counter increment never fires), F023 (unguarded page), F024 (no exit confirmation), F025 (no session resumption), F026 (loading skeleton), F027 (unbounded repair) all share the session lifecycle theme but have very different fix shapes. F023 and F026 are cheap one-line UI fixes. F012 might be a one-file change (move increment to submitResult) or a multi-file flow change (session resumption). F027 is a scheduler design decision (what is the cap?).

**Proposed:** Keep P0.5-06 as a bucket but split internally into two sub-streams: (a) immediate guards and skeletons (F023, F026) shippable as one PR; (b) session-completion semantics (F012, F024, F025, F027) requiring an architectural decision before implementation.

### Revision 3 — Hoist shared tag-to-concept map ahead of P0.5-03 / 04

**Reason:** Both src/app/conversation/page.tsx:62-73 and src/components/journal/WritingEditor.tsx:22-34 carry near-identical tag-to-conceptId maps, both incomplete, both silently drop unmapped tags (the F030/F034 root cause). Both will need to be updated to use graph IDs (per F036) AND extended for completeness. Putting them in a shared module before P0.5-03 and P0.5-04 prevents duplicated rework.

**Proposed:** Add **P0.5-03a — "Shared error-tag to concept-id mapping module"** that ships before P0.5-03 and P0.5-04, located at src/lib/error-tag-to-concept.ts. F030 and F034 cannot be honestly verified closed until this map is canonical AND complete.

### Other observations (not requiring reorder)

- F011 (literal placeholder stored as correct answer) is independent and small — slot into P0.5-02 (corpus pass) since the orphan-sentence-ID problem is content-adjacent.
- F015 (no dedupe across diagnostic runs), F016 (write-on-nav), F017 (Math.max floor plus destructive overwrite), and F031 (recentErrors wipe) all live in OnboardingFlow.tsx + engine.ts. P0.5-05 should be treated as a single coherent rewrite of those two files, not four separate fixes.
- F028 (conversation slug substitution) is a 2-line fix in src/ai/webllm.ts:298-301 — slot into P0.5-03 with the conversation tag-map work.
- F019 (scheduler "no eligible sentence" warnings) is downstream of F036. It should auto-resolve once the concept-id reconciliation lands, but verify in P0.5-13.

---

## Verification footnote — no source mutations

This task is a read-only audit. The only file created by P0.5-01 is the report you are reading (.council/reports/2026-05-21-1830-source-verification.md). All findings cite specific file:line in src/** and content/** but no file under src/ was modified. `git status` should show this report as the only new file from this task.
