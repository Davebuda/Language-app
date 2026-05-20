# NorskCoach — Recovery Backlog

Sourced from: `test-reports/system-walkthrough-2026-05-20.md`  
Supersedes: prior next-phase plan (UI-1.3, A2–A4 engine corrections, muntlig). See `docs/roadmap.md` for the formal re-sequencing.

The walkthrough found that the session loop — the single most important surface in the app — is uncompletable for a real user. Three distinct failure modes block session completion: the English-direction grader always fails, exercises silently render blank, and word-order exercises cannot be solved without drag events. These must be resolved before any other phase work resumes.

---

## No-silent-substitution — architectural principle confirmed during P0 recovery

Three items during P0 recovery were fundamentally the same class of bug: the system silently did something other than what the user expected, with no visible signal. The fixes share a pattern: **honest visible state over silent fallback.**

1. **Item 4 (AI badge):** Model loaded but generations returned null. The badge showed "AI ready." Fix: show "AI unavailable" when generation consistently fails. Honest state over silent lie.
2. **Items 5 and 7 (error tag derivation):** Exercise components hardcoded wrong error tags. The fingerprint silently recorded `'verb-conjugation'` or `'word-order'` for errors that were nothing of the kind. Fix: derive from `sentence.errorTagsDetectable[0]`. Correct data over silently wrong data.
3. **Item 8 (session auto-skip):** An exercise with no resolved content silently advanced the session counter after 3 seconds. The user's progress jumped without interaction. Fix: remove the silent skip; show LoadingSkeleton and let the user exit via X if needed. Honest state over silent advancement.

This is the same principle stated in CLAUDE.md ("honest banners over silent fallbacks") applied at three distinct layers — AI status, fingerprint data, and session progression. Future items at any layer should default to honest visibility when in doubt.

---

## Repair loop principle — durable context for items 3, 7, 8

The repair loop has three layers with three distinct jobs. Future items must respect this division:

- **Micro-drills vary** — two exercises on the same concept but different sentences and types. Their job is generalisation: can the learner apply the rule to a novel example?
- **Retry repeats** — the same sentence, the same exercise type. Its job is verification: can the learner now do the specific thing they failed at?
- **SRS scheduling** — sets the review interval based on the retry outcome. Its job is persistence: will the learner still know this next week?

These jobs are non-interchangeable. Putting varied practice in the retry step muddies verification. Repeating the original exercise in the micro-drills wastes the drill slot. Items 3 (retry), 7 (template targeting), and 8 (atomic progression) each touch one layer — keep that layer's job in scope and leave the others alone.

## Error-tag derivation contract — durable context for all exercise components

**Default:** Exercise components derive `errorTag` from `sentence.errorTagsDetectable[0]` to honestly reflect what the sentence's declared detectable issues are. When the grader server action is called (TranslationExercise, SpeedRound, ListeningExercise), the grader's response takes priority; `sentence.errorTagsDetectable[0]` is the client-side fallback for corpus-miss cases. When the grader is not called (WordOrderExercise, FillInBlankExercise — both do local comparison), `sentence.errorTagsDetectable[0]` is the primary source.

**Listening exemption:** `ListeningExercise` uses `'listening-recognition'` as its fallback — deliberate. Listening errors are channel-level (audio processing) regardless of the sentence's grammar tags. The `'listening-recognition'` tag signals to the repair loop that this is a listening-channel failure, not a grammar failure, and should route to listening/dictation remediation drills. Future exercise types inherit the default unless they have an equally explicit channel-level reason to override.

**Table of current state (post item 7):**

| Component | errorTag source | Notes |
|---|---|---|
| `TranslationExercise` | `gradeAnswer` → fallback `sentence.errorTagsDetectable[0]` | Server-first |
| `FillInBlankExercise` | `sentence.errorTagsDetectable[0]` | Fixed item 5 |
| `WordOrderExercise` | `sentence.errorTagsDetectable[0]` (fallback `'word-order'`) | Fixed item 7 |
| `SpeedRound` | `gradeAnswer` → fallback `sentence.errorTagsDetectable[0]` (fallback `'spelling'`) | Fixed item 7 |
| `ListeningExercise` | `gradeAnswer` → fallback `'listening-recognition'` | Deliberate exemption |

---

## P0 item 8 — CLOSED 2026-05-21

**Acceptance test: passed.** Session progression is gate-controlled. `advanceItem()` is only reachable from `submitResult` (user submits an answer) and `continueAfterRepair` (user clicks "Prøv igjen"). No silent advancement path remains.

**What shipped:**
- `src/hooks/useSession.ts` — removed the 3-second auto-skip `useEffect` (lines 297–310). The loading skeleton was always the honest state; the timer was the silent substitution.
- `tests/hooks/useSession.test.ts` — test asserting `advanceItem` is only called from user-initiated paths

**Root cause:** An `useEffect` fired whenever `currentContent` was null. After 3 seconds it called `sessionStore.advanceItem()` with no user interaction and no result recorded. This is what produced the Q5→Q7 jump in the walkthrough. The comment even said "silently skipping."

**After item 1+2's scheduler guard:** All queued items have eligible seeds, so `resolveItem` should always find content. The auto-skip was a fallback for a case that item 1+2 prevents. Removing it trusts the guard and makes the edge case visible (LoadingSkeleton + X-exit) rather than hiding it.

**No-silent-substitution principle — third instance:** This is the same class of fix as item 4 (AI badge lying about model state) and items 5+7 (error tags lying about error type). The pattern across P0 recovery: honest visible state over silent wrong-state advancement. See the architectural principle section at the top of this backlog.

---

## P0 item 4 — CLOSED 2026-05-20

**Acceptance test: passed.** Badge correctly shows "AI unavailable" when store state is `unavailable`. Generation health counter fires at threshold 2, resets on success, re-init allowed from `unavailable`.

**What shipped:**
- `src/ai/webllm.ts` — `complete()` and `completeChat()` throw on null/empty response; `consecutiveGenerationFailures` counter, threshold 2 → `_updateStore('unavailable')`; `init()` re-init allowed from `unavailable`; `_load()` resets counter on each attempt
- `src/components/ai/AIStatusBadge.tsx` — static "AI unavailable" chip (`bg-nc-card text-nc-text-dim`) for `unavailable` state; `idle → null` unchanged; animated `loading/ready` unchanged
- `tests/ai/webllm-health.test.ts` — 7 tests; full suite 77 passing

**Deeper finding vs backlog framing:** The backlog said "wire the badge to existing state." Reading the code found two bugs: (1) component returned `null` for `unavailable` (silent disappearance), and (2) the model "loads" but `complete()` returns null content — the SyntaxError appeared in callers, never inside `complete()`, so state stayed `'ready'` indefinitely. Both bugs fixed.

**AI explanation side-effect — partially confirmed:** The AI produced a real accurate word-order explanation during live verification. Sentence-transformation context (English vs Norwegian) still queued — no production sentence currently declares `sentence-transformation` in `exerciseTypes`.

**Live badge-to-unavailable:** Counter/threshold confirmed by unit test. Live trigger requires walkthrough failure mode (all completions return null). Not reproducible in current environment where model partially works.

---

## P0 item 3 — CLOSED 2026-05-20

**Acceptance test: passed.** Repair loop retry now returns to the original sentence with the original exercise type.

**What shipped:**
- `src/types/session.ts` — `sentenceId?: string` added to `ExerciseResult`; populates `ErrorLogEntry.sentenceId` in the fingerprint error log (field already existed but was never set)
- `src/hooks/useSession.ts / submitResult` — captures resolved sentence ID from `contentCache.current.get(item.id)?.id` at submission time; included in error object
- `src/hooks/useSession.ts / continueAfterRepair` — pre-seeds the retry item's contentCache entry with the original resolved content before `resolveItem` fires; explicit fallback + `console.warn` on cache miss
- `src/engine/repair-loop.ts / buildRepairPlan` — `retryExerciseType = error.exerciseType`; removed "slightly different" logic and comment
- `src/engine/repair-loop.ts / EXPLANATION_TEMPLATES` — added missing `unspecified` entry (pre-existing TS error, fixed in passing)
- `tests/engine/repair-loop.test.ts` — 12 new tests; total across engine suite now 29

**Key architectural finding (durable):** Threading `sentenceId` through to `error.sentenceId → makeRepairItems retry contentId` is necessary for fingerprint logging but NOT sufficient to make the retry show the original sentence. `resolveItem` ignores `contentId` — it always resolves by concept pool. The `contentCache` pre-seed is what forces the retry to show the correct sentence. Both changes are needed; one without the other would leave the bug partially alive.

**AI explanation side-effect:** The AI model is still non-functional (C2 open). Could not verify whether the explanation now references English grammar context vs Norwegian. Queued for verification at item 4 (AI badge) or item 5 (template targeting) when the AI module is in scope.

---

## P0 item 1/2 — CLOSED 2026-05-20

**Acceptance test: passed.** All three translation-style exercise types now grade correctly:
- `translation-to-english` — always routed to English ✓
- `translation-to-norwegian` — always routed to Norwegian ✓
- `sentence-transformation` — was mis-routed to Norwegian (grader bug); now correctly routed to English ✓

**What shipped:**
- `engine/scheduler.ts` — `firstEligibleType` guard: no session item is queued unless the concept has at least one seed sentence supporting the chosen exercise type. Prevents both blank cards (no seed) and grader type mismatch (wrong-type fallback seed).
- `app/session/actions.ts` + `lib/grade-utils.ts` — extracted `deriveCorrectAnswer` to a testable utility; moved `sentence-transformation` from the Norwegian branch to the English branch of the switch. `grade-utils.ts` has full unit test coverage.
- `lib/mock-sentences.ts` — added `mock-s11` (sentence-transformation fixture) so the type has an ongoing test seed.
- `tests/engine/scheduler.test.ts` and `tests/engine/grade-utils.test.ts` — 17 passing tests across both files.

**Three-way mismatch discovery — durable context for items 3, 7, 8:**
The original C1 investigation identified a grader/scheduler mismatch. The deeper finding is that exercise types have a three-way contract between (1) the scheduler pool assignment, (2) the component rendering logic, and (3) the grader answer derivation. `sentence-transformation` had the component and scheduler treating it as translate-to-English while the grader treated it as produce-Norwegian. Future similar audits for items 3 (retry), 7 (template targeting), and 8 (atomic progression) must verify all three layers are consistent — component rendering, grader derivation, and state-machine triggering. A two-layer check will miss the same class of bug.

**AI explanation side-effect — confirmed resolved:**
In the pre-fix session, the AI received English input ("Who is that man over there?") and tried to explain it as wrong Norwegian grammar — a confused explanation caused by the grader treating English as a wrong-Norwegian attempt. With `sentence-transformation` now routed to English, the AI receives the correct context: user input is English and will be compared to the English expected answer. If the AI fires, it will evaluate the English translation, not misinterpret it as Norwegian.

---

## Architecture notes — what the code actually looks like

These notes record what was verified by reading source files. They exist to prevent the same architecture confusion from recurring on items 4, 8, and 9.

**Item 1 and 2 have the same root and the same fix.**  
`generateSession` (`engine/scheduler.ts`) assigns exercise types to session items without checking whether any sentence for the concept supports that type. The grader (`actions.ts/gradeAnswer`) is correct — it derives the expected answer via `deriveCorrectAnswer(exerciseType, norwegian, english, notes)`. The bug is that the `exerciseType` in the session item can mismatch the `exerciseTypes` array on the sentence that `resolveItem` eventually picks. The fix is one guard in `generateSession`. Items 1 and 2 are the same code change described from two angles (correctness and blank-card prevention).

**There is no `expectedAnswer` column in the content schema.**  
The sentence schema has `norwegian`, `english`, `notes`, and `exerciseTypes: ExerciseType[]`. `deriveCorrectAnswer` selects the right field based on the exercise type. No migration needed.

**The AI status signal is already centralized.**  
`useAIStatusStore` (`src/stores/ai-status-store.ts`) exports `AILoadState = 'idle' | 'loading' | 'ready' | 'unavailable'`. The `'unavailable'` state is already defined. Items 5 and 8 must both read from this store — do not add a second boolean signal alongside it.

**`generateSession` is pure client-side; `sentences` are already available at the call site.**  
`session/page.tsx` (Server Component) loads sentences via `loadContentSentences()` and `fetchSupabaseSentences()`, merges them, and passes both `sentences` and `availableSentenceIds` as props to `SessionScreen`, which passes them to `useSession`. `useSession` at line 152 calls `generateSession` with `availableSentenceIds` only — the `sentences` map is already in scope but not passed through. Extending `SchedulerInput` to include `sentences` and threading it from `useSession` is the only wiring change needed.

**`topUpConcept` exists but is AI-dependent.**  
Background content generation via `topUpConcept` calls `aiService.generateContent()`. Since the AI model is non-functional (C2), `topUpConcept` produces nothing. The item 2 backfill for below-minimum sessions is best-effort concept-skipping from the unlocked pool — not AI generation. `topUpConcept` resumes naturally when C2 is resolved.

**The `resolveItem` fallback is a runtime safety net, not a fix.**  
`useSession.ts` line 123–124 already falls back from `compatible` to `eligible` when no compatible sentence exists. This handles the runtime case but doesn't fix the scheduler mismatch — the item's `exerciseType` field still carries the wrong value, so the grader still gets the wrong type. The scheduler guard is the right fix; `resolveItem`'s fallback can remain as a belt-and-suspenders safety net.

**There is no `exercises` table in Supabase.** The only content table is `sentences`. Any spec or design doc referencing an `exercises` table, `expectedAnswer` column, or `expected_answer` column is citing the wrong schema. Columns verified via Supabase MCP 2026-05-20: `id`, `norwegian`, `english`, `concept_ids`, `vocab_clusters`, `error_tags_detectable`, `cefr_level`, `difficulty`, `scenario_id`, `audio_url`, `exercise_types`, `notes`, `created_at`. There are also no `session_items` or `session_item_validation_logs` tables — sessions live entirely in Zustand (client state) and IndexedDB (persistence). Telemetry logging belongs to the A4 event-logging task in the roadmap, not the P0 items.

**The audio URL field is `audio_url`, not `referenceAudioUri`.** It is nullable. Missing audio is handled by `ListeningExercise` via a three-tier fallback: Howler.js (if `audio_url` set) → Web Speech API TTS → "audio not available" banner. Listening exercises are always traversable regardless of `audio_url`. The item 2 guard excludes listening — Option B confirmed: the three-tier fallback is sufficient.

---

---

## P0 — Session loop must be completable

These **eight** items collectively unblock the core loop. Items 1 and 2 from the original draft were consolidated — they share the same root cause and the same single code change in `generateSession`. The walkthrough confirmed a real user cannot complete a session. Nothing else ships until all eight are verified.

**Critical-path chain (original 9-item numbering):** 2 → 4 → 8 → 9. Items 1 (merged into 2), 3, 5, 6, 7 are distributed independently.

| Item (original #) | Description | Current doc # | Status |
|---|---|---|---|
| 1 + 2 | Scheduler guard + grader mismatch | 1 | **CLOSED** |
| 4 | Repair loop retry | 3 | **CLOSED** |
| 5 | AI status badge | 4 | **CLOSED** |
| 8 | Template targeting | 7 | Open — must complete before item 9 |
| 9 | Atomic session progression | 8 | Open — depends on 1+2, 4, and 8 |
| 3 | Word-order exercise | 2 | Open, independent |
| 6 | FillInBlank error tag | 5 | Open, independent |
| 7 | Journal rettet versjon | 6 | Open, independent |

**Remaining critical path (current doc numbering):** item 7 (template targeting) → item 8 (atomic progression).

### 1. Fix exercise-type mismatch between scheduler and sentence data — grader correctness fix

**Finding:** C1 in the walkthrough report.  
**What's wrong:** `generateSession` assigns exercise types to session items without checking whether any sentence for that concept actually supports the chosen type. `resolveItem` in `useSession.ts` (line 123) already tries to find a compatible sentence (`s.exerciseTypes.includes(item.exerciseType)`), but if none exists it falls back to any eligible sentence. That fallback sentence has a different `exerciseType` than the item. The grader (`actions.ts/gradeAnswer`) correctly derives the expected answer from the item's `exerciseType` — so a `'sentence-transformation'` item presented with a `'translation-to-english'` sentence produces `correctAnswer = sentence.norwegian`. The user typing English can never match. This is a scheduler correctness bug, not a content schema bug.  
**There is no `expectedAnswer` field in the schema.** `gradeAnswer` in `actions.ts` derives the correct answer via `deriveCorrectAnswer(exerciseType, sentence.norwegian, sentence.english, sentence.notes)`. That function is correct. The bug is upstream: the exercise type in the session item must match the exercise types the sentence actually declares.  
**Scope:** In `generateSession` (`engine/scheduler.ts`), before assigning an exercise type to an item, verify that at least one sentence for the concept has that type in its `exerciseTypes` array. If not, try other types from the same pool. If no type in any pool has matching sentences, skip the concept. This requires passing `sentences: Record<string, Sentence>` into `SchedulerInput` alongside the existing `availableSentenceIds`. The fix is pure client-side scheduler logic — no migration, no schema change.  
**Subsystem:** `engine/scheduler.ts` (client-side) + `useSession.ts` (pass `sentences` through).  
**Acceptance:** Submit the correct English translation for three "Oversett til engelsk" exercises (`translation-to-english` type sentences). All three advance without triggering the repair loop. Confirm by logging that `item.exerciseType === 'translation-to-english'` and `sentence.exerciseTypes.includes('translation-to-english')` for each.  

---

*(Item 2 consolidated into item 1 — same root cause, same code change. Collapse discovered during plan-first analysis: Claude Code read the actual source files — `useSession.ts`, `scheduler.ts`, `actions.ts` — before building, and found both failure modes trace to `generateSession` assigning exercise types without checking `sentence.exerciseTypes`. The architecture did not match what was assumed from the prior external spec.)*

---

### 2. Fix word order exercise — tiles must build an ordered sentence

**Finding:** C4 in the walkthrough report.  
**What's wrong:** Clicking a word tile highlights it (radio-select — one active at a time). No sentence-building zone exists or is populated. Submitting the scrambled default order always triggers repair. Without drag-and-drop, the exercise cannot be solved. The exercise is also surfacing grammatically wrong "correct answers" (e.g., contains both "du" and "deg" in a single clause).  
**Scope:** Two separate fixes:  
(a) UI: the tile click interaction must append the clicked tile to an ordered sentence zone (a horizontal row), not radio-select it. Clicking a tile already in the sentence zone removes it and returns it to the pool. The "Sjekk rekkefølge" check evaluates the ordered sentence, not the pool's display order.  
(b) Content: audit word order sentence entries for grammatically correct expected answers. The specific sentence "Hvordan kommer du deg til jobb om vinteren?" must be corrected — either remove "deg" or restructure. Flag any other entries where the tile set produces an ungrammatical correct answer.  
**Subsystem:** `WordOrderExercise` component (frontend) + content database audit.  
**Acceptance:** User can click tiles in order to build a sentence; sentence appears in a visible ordered zone; submitting the correct order advances the exercise; submitting the wrong order triggers the repair loop with the grammatically correct target sentence shown.  

---

### 3. Fix repair loop retry — "Prøv igjen" must return to the failed question

**Finding:** S3 in the walkthrough report.  
**What's wrong:** Clicking "Prøv igjen" advances to the next scheduled exercise — not the question that failed. The original failed question is never presented again. The repair loop spec is: wrong answer → explain → micro-drill(s) → retry of the original question → if correct, schedule for SRS; if wrong again, advance. The retry step is missing.  
**Scope:** The repair loop must queue a retry of the original sentence immediately after the micro-drills, before advancing the session. The retry question is the same sentence, same exercise type. If the retry is also wrong, the session advances (no infinite loop). If the retry is correct, advance normally.  
**Subsystem:** Repair loop orchestration in the session loop.  
**Acceptance:** Answer Q1 wrong → explanation appears → micro-drill appears → clicking "Prøv igjen" presents Q1 again with the same sentence → answering correctly advances to Q2.  

---

### 4. AI status transparency — explicit "AI unavailable" badge

**Finding:** C2 in the walkthrough report. Operating rule: no silent substitution (CLAUDE.md).  
**What's wrong:** The AI model returns null for all generation tasks. The session header chip shows "AI ready" regardless. The system silently falls back to template explanations with no indication the AI is unavailable. Per the no-silent-substitution rule in CLAUDE.md, honest banners beat silent fallbacks.  
**Decision already made:** When the model fails to produce output (null result, syntax error, repeated failed attempts), the chip must show "AI unavailable" instead of "AI ready." Template explanations may still be shown, but not attributed as AI output. Architect confirmed: no conflict with the aesthetic direction doc. Same component, two states, existing tokens.  
**AI status signal — already centralized:** `useAIStatusStore` (`src/stores/ai-status-store.ts`) already exists with states `idle | loading | ready | unavailable`. The `unavailable` state is already defined. The fix is wiring the chip to display "AI unavailable" when this store state is `'unavailable'`, and ensuring the AI worker sets `unavailable` on null/error results instead of silently discarding them.  
**Separate work — model fix:** The model fix follows the existing A1 three-step path in the roadmap. Badge fix ships first as the honest interim.  
**Subsystem:** `ai-status-store.ts` (set `'unavailable'` on failure) + AI status chip component (render two states).  
**Scope note — simpler than originally estimated:** `useAIStatusStore` already has all four required states (`idle | loading | ready | unavailable`). No new infrastructure or separate signal needed. Work is wiring the badge to read the store, and ensuring the AI worker calls `setState('unavailable')` on null/failure instead of silently discarding. Can run in parallel with the critical-path chain (items 7 → 8) since it touches only the AI worker subsystem.  
**Acceptance:** Load the session with the current broken model. Header chip shows "AI unavailable." If/when model loads successfully, chip switches to "AI ready." Template explanations appear without AI attribution in the unavailable state.  

---

### 5. Fix FillInBlank hardcoded error tag

**Finding:** Roadmap integrity follow-up item 2 + walkthrough confirmation.  
**What's wrong:** Both `MultipleChoice.choose()` and `FreeText.submit()` hardcode `errorTag: 'verb-conjugation'` regardless of the actual error. Wrong answers get tagged with the wrong error type, which corrupts the mistake fingerprint and misdirects the repair loop.  
**Scope:** Replace the hardcoded `'verb-conjugation'` with `sentence.errorTagsDetectable[0]` (or the concept's primary error tag) in both paths.  
**Subsystem:** `FillInBlankExercise` component.  
**Acceptance:** Answer a fill-in-blank question wrong; inspect the fingerprint's error log; confirm the recorded error tag matches the sentence's `errorTagsDetectable[0]`, not `'verb-conjugation'`.  

---

### 6. Fix journal "rettet versjon" — apply identified corrections

**Finding:** S6 in the walkthrough report.  
**What's wrong:** The "Se rettet versjon" button shows a corrected version that (a) does not apply the correction the feedback card already identified ("å spise") and (b) introduces a new error (capitalises "Jeg" mid-sentence). The corrected version is inconsistent with the feedback shown.  
**Scope:** The corrected version must be generated in the same AI call as the feedback, or must mechanically apply the identified corrections, so it is consistent with the feedback card. It must not introduce new errors. A corrected version that is worse than the original fails the purpose.  
**Subsystem:** Journal AI prompt + response parsing.  
**Acceptance:** Submit a text with one deliberate error. The rettet versjon shows the corrected word. The correction matches what the feedback card identified. No new errors are introduced.  

---

### 7. Fix repair loop template targeting — select template by error tag

**Finding:** S2 in the walkthrough report.  
**What's wrong:** Every repair loop card across the entire session showed the identical V2 boilerplate explanation regardless of the error type. The error tag chip shows the correct concept (e.g., "question-formation", "v2-word-order", "noun-gender") but the explanation body is always the V2 text. The template selector is either ignoring the error tag or always resolving to the V2 template.  
**Scope:** Audit the template lookup in the repair loop. The error tag from `sentence.errorTagsDetectable[0]` must route to the correct explanation template. If a template is missing for a given tag, add it or fall back to a generic "check your grammar for [tag-name]" message — but do not route to the V2 template. Every error tag defined in the error taxonomy must have a corresponding template or an explicit fallback, not a silent wrong-template substitution.  
**Subsystem:** Repair loop template lookup (engine) — no UI change.  
**Acceptance:** Answer a noun-gender question wrong → repair card shows a noun-gender explanation. Answer a modal-verb question wrong → repair card shows a modal-verb explanation. V2 template appears only for V2/word-order errors.  
**Dependency:** Must ship and verify before item 8. Item 8's "repair completed correctly" gate depends on the repair loop targeting the right concept.  

---

### 8. Fix atomic session progression — no silent auto-skip, no blank card trap

**Finding:** C3 (variant) in the walkthrough report.  
**What's wrong:** Sessions auto-advance through null exercises (silently skipping Q6, Q8, Q9) and can also trap the user on a blank card (Q10). These are two manifestations of the same root: the session loop does not enforce that an exercise must be fully resolved before advancing. Auto-skip is a silent substitution (CLAUDE.md rule violation). Blank card trap is a hard block.  
**Scope:** Session progression must be gate-controlled: the "advance" action is only available after the current exercise has reached a terminal state (correct answer submitted, or repair loop completed). An exercise that cannot render (null content) must be caught by item 1's guard before it reaches the session queue. This item addresses the progression gate; item 1 addresses the content guard. Both are needed.  
**Subsystem:** Session loop state machine.  
**Acceptance:** (a) No exercise in a session silently auto-advances without user interaction. (b) No blank card renders — item 1's guard ensures this upstream. (c) After completing a repair loop, the session advances only to the retry (item 3) or to the next exercise after the retry.  
**Dependency:** Items 1, 3, and 7 must be complete before this item is verified. Item 8 is the integration test for the session loop.  

---

## P1 — Significant issues, do not block P0

These are ordered by user-impact severity. None may be scheduled until all P0 items are verified done.

| # | Item | Finding |
|---|---|---|
| P1-1 | Diagnostic explanation shows next question's topic, not current | S1 |
| P1-2 | Conversation mic auto-starts recording without user consent | S5 |
| P1-3 | Conversation opener is context-free ("Bra! Kan du fortelle mer?") | S4 |
| P1-4 | Journal feedback quality — nonsensical praise, wrong explanations, English output | S7 |
| P1-5 | Profile/Progress SSR hydration flash (A1→A2) | S10 |
| P1-6 | Progress page shows wrong level's concept graph | S10 |
| P1-7 | Recalibration starts without trigger banner or opt-in | S12 |
| P1-8 | Recalibration accessibility tree empty (screen reader gets nothing) | S12 |
| P1-9 | Diagnostic terminates at 5/12 with "12" visible in counter | S11 |
| P1-10 | Dashboard notifications bell dead | S9 |
| P1-11 | Waitlist form cosmetic — no data captured | S8 |
| P1-12 | Conversation end has no summary or save confirmation | S7 |
| P1-13 | Session complete screen untestable — guarded from direct navigation | S13 |

---

## P2 — Minor / polish, after P1

| # | Item | Finding |
|---|---|---|
| P2-1 | Grey rectangle visual artifact on login and onboarding cards | M1 |
| P2-2 | Excess whitespace below footer on all pages | M2 |
| P2-3 | Footer: "Laer. Forsta. Mestre." missing Norwegian special characters | M3 |
| P2-4 | Dashboard accuracy 53% for 0-session guest — misleading label | M4 |
| P2-5 | Favicon 404 on all pages | M5 |
| P2-6 | Vocab / Shadow "Varsle meg" buttons have no feedback | M6 |
| P2-7 | Conversation end: no summary shown | M7 |
| P2-8 | Shadow stub description overpromises phoneme-level pronunciation analysis | — |
| P2-9 | scroll-behavior:smooth warning on every navigation | M9 |

---

## Integrity follow-ups — real bugs, not cosmetic, not yet scheduled

These were surfaced during the walkthrough and the UI-1.2 phase. Both are correctness bugs that corrupt the mistake fingerprint. Neither is cosmetic. They are not yet scheduled in the P0 or P1 batches because they are out of scope for the current critical path (2 → 3 → 7 → 8), but they must not disappear.

**SpeedRound stale-closure timer (correctness bug — fingerprint corruption)**  
`src/components/session/exercises/SpeedRound.tsx`  
The `setInterval` callback captures `userInput` from the `useEffect` closure at mount time. When the timer expires and auto-submits, it calls `submitAnswer(userInput)` with the stale empty string — not the value the user actually typed. A learner who was mid-answer when time ran out is recorded as a wrong answer with `userAnswer: ''`, corrupting the fingerprint with fake failure data. Fix: use a `useRef` to track the live input value alongside `useState`, and reference `inputRef.current` in the timer callback. Also noted in `docs/roadmap.md` integrity follow-ups.  
**Severity:** Real correctness bug — fingerprint pollution from fake wrong-answer events. Not cosmetic.

**FillInBlank hardcoded `errorTag: 'verb-conjugation'` (correctness bug — same class, also fingerprint corruption)**  
This is P0 item 5 (numbered entry above). Captured here as a cross-reference to make the pair visible together.  
**Severity:** Real correctness bug — same pattern as SpeedRound: wrong data flowing into the learning model from a production exercise surface.

**`errorTagsDetectable[0]` heuristic — future-item concern:**  
Item 5 fixes the hardcoded tag by using `sentence.errorTagsDetectable[0]`. This is correct for single-tag sentences and matches the pattern used elsewhere (repair-loop, grader). For multi-tag sentences, it always logs the first declared tag regardless of which specific error the user actually made. Proper per-answer error classification (deriving the tag from the actual user mistake, not the sentence's declared list) is a future improvement — relevant when the content corpus grows to sentences that test multiple concepts simultaneously.

**FillInBlank blank indicator size mismatch at 1280px+ (UI polish — not a bug)**  
`src/components/session/exercises/FillInBlankExercise.tsx`  
At `lg`+ breakpoints the inline blank indicator (`text-xl` / 20px) sits visibly smaller than the surrounding sentence text (32px). The hierarchy between prompt and answer buttons still passes the 1.6× rule; this is a cosmetic size inconsistency only. Does not affect correctness, fingerprint, or session traversal.  
**Severity: Polish. Schedule for UI-3 alongside `nc-*` cleanup — not a bug, not a P0 or P1 issue.**

---

## Unverifiable — needs auth or longer interaction

See `test-reports/system-walkthrough-2026-05-20.md` sections U2–U7.  
Key items: authenticated session persistence (U2), session counter increment post-completion (U3), streak update logic (U4).

**AI explanation side-effect from sentence-transformation grader fix — queued eval task:**  
The fix now routes sentence-transformation to the English expected answer, so the AI receives English wrong/correct context. Verify via a single deliberate eval-page task: in `src/app/eval/page.tsx` TASKS array, add one `explain` task with `wrong: 'Where is that man over there?'`, `correct: 'Who is that man over there?'`, `errorTag: 'word-order'`, `conceptId: 'question-formation'`, `level: 'A2'`. Run it on `/eval` and confirm the AI explanation references English question formation (wrong interrogative pronoun "Where" vs "Who"), not Norwegian V2 word order. This is a one-task addition to the eval harness — no corpus addition needed. Queue as a small follow-up whenever `/eval` output is reviewed next.

---

*Last updated: 2026-05-20 | Source: system walkthrough + P0 items 1–4 closure*
