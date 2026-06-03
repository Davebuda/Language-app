# QA Walkthrough — Remediation Plan (2026-06-03)

Source: full manual walkthrough of the live app (auth → onboarding → diagnostic →
session → conversation → journal → reading → progress/profile → stubs → eval harness).
Captured in "collecting mode" (all findings first, then one plan — per holistic-planning rule).

## HANDOFF STATE — READ FIRST (work already landed 2026-06-03)

A prior agent ran code-traced verification of an external audit and landed four
small, tested, committed hardening fixes BEFORE this locked plan surfaced. They
do not conflict with the plan and need no revert — treat them as partial down
payments on the phases below. Verification log: `.omc/logs/audit-verification-2026-06-03.md`.

| Commit | What landed | Maps to | Remaining in that area |
|---|---|---|---|
| `83b2add` | Guard all 6 unguarded `decayedScore` reads (`?? 0`) + legacy-mastery-row fixture/test | Contract #4 / **Phase 4** | The level-commit cascade (2b → 7a/7d) and write-decisions are the real Phase 4 work — untouched |
| `f4f0ba3` | `validateNorwegianOutput` gate on WebLLM `generateContent` (was the only ungated AI path) | Contract #2 / **Phase 2** | Doesn't fix WebLLM-dead root (9) nor the Swedish "Hur" gap (4c — gate doesn't catch non-NO yet). Compatible if Phase 2 disables WebLLM |
| `e17a421` | Corpus test: every `fill-in-blank` has non-empty `notes` + `___` marker (all levels pass) | Contract #1 / **Phase 1** | Blank cards (3b) and translate-EN (3a) and word-order keys (3c) still open |
| `372879b` | Word-order: opt-in `acceptedOrders` field (type+loader+pure `checkWordOrder` helper+test) | Finding **3c** / **Phase 1** | **3c's priority items remain**: radio-button tile UI, submit-without-arranging, the wrong `du/deg` answer key, keyboard/a11y. My change only added *alternative-order grading*; no corpus uses the field yet |

**NOT done, and a trap to avoid:** translate-to-English (3a) was deliberately left
untouched. A Council pass had recommended "extend AI semantic re-grade to English"
— that is **SUPERSEDED** by this plan's settled **Option C (demote AI)**. Phase 1
must fix 3a **deterministically** (unify expected-answer representation + grader),
NOT by adding an AI grader.

**Test-suite FYI:** `tests/lib/exposure.test.ts` is a pre-existing **flaky** timing
test (fire-and-forget + `setTimeout(0)`); it intermittently fails ~2 assertions
under the full suite and passes on re-run / in isolation. Not caused by the above
commits (confirmed: clean-tree full suite was green; this is independent of any
fix). Don't chase it as a regression. Full suite otherwise green (646 tests).

## DRIFT FLAGS (CLAUDE.md is now wrong — fix in Phase 0)

- **"SHIP-READY 2026-05-27 / all 12 criteria met" is FALSE.** Core session loop is not
  reliably completable; repair-loop retry skips the failed item; some graders make
  exercises unpassable. App is in **stabilization**, not ship-ready.
- **"The adaptive engine is built, traced, and verified correct" is FALSE in production.**
- **`/shadow`** listed as a live muntlig mode but QA found it rendering as a stub with
  overpromising copy. Reconcile (two surfaces vs stale doc).

## THE REAL PROBLEM — four unaudited contracts

These ~20 findings are not isolated bugs. They are four broken contracts between
backend (data / AI / fingerprint), graders, and frontend representation:

| Contract | Guarantee | Leaks at |
|---|---|---|
| **1. Grader ↔ content** | `expectedAnswer` matches grader's compare language/form; every "correct answer" is actually correct | 3a, 3b, 3c |
| **2. AI output** | Valid Norwegian or deterministic template fallback — never null, Swedish, or wrong-tense | 3e, 4c, 5b, 5d, 9 (root: WebLLM path dead) |
| **3. Fingerprint write** | A surface that claims to feed the engine actually lands a write | 3d, 4d, 6b, 8a |
| **4. State read** | Every surface reads the same committed learner state at the same moment | 2a, 2b, 7a, 7d, 5a |

## FINDINGS LOG

| # | Surface | Finding | Priority | Root / note |
|---|---|---|---|---|
| 1 | Onboarding | Grey rectangle slide 1 = same login artifact | Low-med | Shared root — one fix |
| 2a | Diagnostic | Wrong-answer explanation off-by-one (shows next Q's topic) | High | Index read after pointer advanced |
| 2b | Diagnostic | `currentLevel` stays A1 until first session start | High | Not committed at completion — **root of 7a, 7d** |
| 3a | Session/translate-EN | Expected answer = NO source; grader compares EN→NO; some unpassable; inconsistent | **Critical** | Grader/content contract |
| 3b | Session/exercises | Blank cards (Q8–10); listening items silently skipped or trap user | **Critical** | Phantom routing / missing content |
| 3c | Session/word-order | Tiles act like radio buttons; submit-without-arranging allowed; one "correct" answer wrong (du/deg); keyboard-blocked | **Critical** | UI + content + a11y |
| 3d | Session/repair | "Prøv igjen" jumps to next Q, not failed item; micro-drills inject (14→17) but retry never revisits error | **Critical** | **Moat-breaking** (Rule 8) |
| 3e | Session/AI grading | Boilerplate V2 explanation regardless of error; null returns; WebLLM warnings | **Critical** | AI-layer (WebLLM root) |
| 4a | Conversation | Mic auto-records on entry, no user gesture | **Critical** | Consent/permissions |
| 4b | Conversation | Kari opener contextually wrong as first line | High | Opener not topic-seeded |
| 4c | Conversation | Swedish "Hur" + garbled NO ("Hur forkler du det til dag") | **Critical** | AI-layer; validity gate not catching non-NO |
| 4d | Conversation | Avslutt → no confirm, no summary, no saved/learned signal | High | Write-trace |
| 5a | Journal | Hydration mismatch: SSR text mode → CSR voice mode | High | Client-only value read at first render, no mount guard |
| 5b | Journal | AI feedback nonsensical; miscalls tense ("liker" = future); mislabels caps as V2 | High | AI-layer |
| 5c | Journal | All feedback in English on a Norwegian writing flow | High | North Star violation |
| 5d | Journal | Corrected version contradicts own diagnosis (spiser≠spise; wrongly caps "Jeg") | High | AI-layer |
| 6a | Reading | Word lookup stubbed ("Ordoppslag kommer snart") | — | Honest stub — no action |
| 6b | Reading | "Ferdig lesing" doesn't update fingerprint (`updatedAt` unchanged) | Med | Write-trace — exposure brick may be no-op |
| 7a | Progress | A1 concept graph shown for A2 user | Med-high | Symptom of 2b |
| 7b | Progress | Intro concepts show 0 despite seeding | Med | Verify — may be by design |
| 7c | Progress | Large empty space below nav | Low | Layout |
| 7d | Profile | SSR A1 → CSR A2 level flash | Med | Symptom of 2b (+ maybe 5a class) |
| 8a | Stubs | "Varsle meg" button dead — no toast/request/state | Med | Wire real behavior or remove |
| 8b | Shadow stub | Overpromises "phoneme-level AI" roadmap calls impossible at zero cost | Med | Copy fix; Rule 6 honesty |
| 9 | Eval harness | WebLLM null after 24s; model non-functional; infra correctly wired | High (dev) | **Root cause of contract #2** |

Confirmed WORKING (no action): diagnostic adaptive shift + early termination + real
per-concept seeding (weak concepts accurate: V2 ~36, question-formation ~57);
reading core (load, level filter, clickable words, parallel translation); topic-select
UI; session-style IndexedDB persistence.

## LOCKED REMEDIATION ORDER (user-approved 2026-06-03)

AI-path decision settled: **Option C — demote AI to guardrailed/optional, lean on
deterministic templates** (architecture already supports "core engine does not depend on AI").

### Phase 0 — Truth + decision
- Correct CLAUDE.md: ship-ready → "in stabilization"; strike "engine verified correct";
  link this plan. Reconcile `/shadow` live-vs-stub.

### Phase 1 — Core session engine (Critical) — contract #1 + #3(retry)
- Translate-to-English: unify expected-answer representation + grader logic.
- Remove/fix blank exercises; validate content exists for every item in the pool.
- Word order: accessible clickable/drag layout; correct ALL answer keys (fix du/deg).
- Listening: every item has audio + text; no silent skips.
- Repair loop ALWAYS: shows feedback for the item just answered; returns to that item
  on retry OR clearly marks it skipped.
- **Lock each fix with a test** so the contract can't silently regress.

### Phase 2 — AI layer: simplify, don't trust — contract #2
- WebLLM: use only for specific tasks with clear guardrails, or temporarily disable for
  unreliable tasks.
- Explanations: replace generic/incorrect V2 boilerplate with simple, correct,
  template-based explanations for a small set of error types (keyed to real error tag).
- Journal/talkback: narrower prompts + fallback patterns; no contradictory/wrong grammar.

### Phase 3 — Rebuild talkback on strict interaction rules
- No auto-start mic: explicit tap to start recording.
- Short responses: max one question + one correction.
- Stop-on-speech: AI must not continue while user talks. [user-felt]
- Clean training prompts: no Swedish contamination; natural, safe B1/B2. [user-felt]
- End-of-conversation summary + a real signal written to fingerprint.

### Phase 4 — Align fingerprint & level across surfaces — contract #4
- On diagnostic completion, update `currentLevel` immediately (fixes 2b → cascades to 7a, 7d).
- Progress graph + profile reflect the same level and concept mastery.
- Decide which actions write to fingerprint (session/reading/conversation/journal) and
  implement consistent writes. Then 2a (off-by-one) and verify 7b.

### Phase 5 — Repair journal — contract #2/#4
- Fix hydration mismatch (text vs voice SSR/CSR) — mount guard.
- Feedback simplified to: 1–3 correct grammar tags + short Norwegian explanation +
  corrected text that actually incorporates the changes.

### Phase 6 — Reduce fake/stub behaviors
- Wire "Varsle meg" / waitlist to a real endpoint+toast, OR clearly label "coming soon".
- Adjust Shadow copy to something realistic under cost constraints.
- Cosmetic: grey-rectangle artifact (1), empty space below nav (7c).

### Phase 7 — Stabilize internal eval harness AS A GATE
- Make eval harness reliable for 1–2 key tasks first (translation, short explanations).
- Use it as a gate before pushing any AI-dependent change to production.

## Rationale for the order
Session loop leads because a learner reaches zero value if the core loop is
uncompletable — diagnostic/talkback polish is worthless above a broken core.
AI simplification comes second because its root (WebLLM dead) poisons grading,
conversation, and journal feedback simultaneously.
