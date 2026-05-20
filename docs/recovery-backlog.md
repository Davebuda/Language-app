# NorskCoach — Recovery Backlog

Sourced from: `test-reports/system-walkthrough-2026-05-20.md`  
Supersedes: prior next-phase plan (UI-1.3, A2–A4 engine corrections, muntlig). See `docs/roadmap.md` for the formal re-sequencing.

The walkthrough found that the session loop — the single most important surface in the app — is uncompletable for a real user. Three distinct failure modes block session completion: the English-direction grader always fails, exercises silently render blank, and word-order exercises cannot be solved without drag events. These must be resolved before any other phase work resumes.

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

---

---

## P0 — Session loop must be completable

These **eight** items collectively unblock the core loop. Items 1 and 2 from the original draft were consolidated — they share the same root cause and the same single code change in `generateSession`. The walkthrough confirmed a real user cannot complete a session. Nothing else ships until all eight are verified.

### 1. Fix exercise-type mismatch between scheduler and sentence data — grader correctness fix

**Finding:** C1 in the walkthrough report.  
**What's wrong:** `generateSession` assigns exercise types to session items without checking whether any sentence for that concept actually supports the chosen type. `resolveItem` in `useSession.ts` (line 123) already tries to find a compatible sentence (`s.exerciseTypes.includes(item.exerciseType)`), but if none exists it falls back to any eligible sentence. That fallback sentence has a different `exerciseType` than the item. The grader (`actions.ts/gradeAnswer`) correctly derives the expected answer from the item's `exerciseType` — so a `'sentence-transformation'` item presented with a `'translation-to-english'` sentence produces `correctAnswer = sentence.norwegian`. The user typing English can never match. This is a scheduler correctness bug, not a content schema bug.  
**There is no `expectedAnswer` field in the schema.** `gradeAnswer` in `actions.ts` derives the correct answer via `deriveCorrectAnswer(exerciseType, sentence.norwegian, sentence.english, sentence.notes)`. That function is correct. The bug is upstream: the exercise type in the session item must match the exercise types the sentence actually declares.  
**Scope:** In `generateSession` (`engine/scheduler.ts`), before assigning an exercise type to an item, verify that at least one sentence for the concept has that type in its `exerciseTypes` array. If not, try other types from the same pool. If no type in any pool has matching sentences, skip the concept. This requires passing `sentences: Record<string, Sentence>` into `SchedulerInput` alongside the existing `availableSentenceIds`. The fix is pure client-side scheduler logic — no migration, no schema change.  
**Subsystem:** `engine/scheduler.ts` (client-side) + `useSession.ts` (pass `sentences` through).  
**Acceptance:** Submit the correct English translation for three "Oversett til engelsk" exercises (`translation-to-english` type sentences). All three advance without triggering the repair loop. Confirm by logging that `item.exerciseType === 'translation-to-english'` and `sentence.exerciseTypes.includes('translation-to-english')` for each.  

---

*(Item 2 consolidated into item 1 — same root cause, same code change.)*

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

## Unverifiable — needs auth or longer interaction

See `test-reports/system-walkthrough-2026-05-20.md` sections U1–U7.  
Key items: speed round stale-closure (U1), authenticated session persistence (U2), session counter increment post-completion (U3), streak update logic (U4).

---

*Last updated: 2026-05-20 | Source: system walkthrough*
