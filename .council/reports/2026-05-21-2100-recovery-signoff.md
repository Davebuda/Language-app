# P0.5 Recovery Bundle — Sign-off

**Date:** 2026-05-21T21:00
**Status:** Code complete; final sanity walkthrough passed
**Server under test:** localhost:3001 (port 3000 process held a corrupted .next; user restarted)

---

## Recovery in one paragraph

The third stress walkthrough produced 39 findings — 10 Critical, 20 Significant, 9 Minor, 4 Edge cases. Four of the five P0 pipeline-honesty patterns named by CLAUDE.md operating rule 8 were regressed. P0.5 closed them across thirteen surgical commits over a single session, sequenced after the source-verification audit (P0.5-01) revealed two things the original triage missed: (a) F010 was a content-corpus consequence of concept-id divergence, not a code regression — so P0.5-07 (concept-id reconciliation) had to run before P0.5-02 (corpus retag); (b) the journal/conversation silent-drop bug was an incomplete tag-map issue solvable by extracting the duplicate maps into a single canonical module with explicit fallback semantics. The AI quality bugs (F022/F029/F033) shared a single root cause: no validity gate between AI output and learner display. One module fixed all three.

---

## Tasks completed (14 of 15; this report is the 15th)

| # | Task | Commit | Status |
|---|------|--------|--------|
| 01 | Source verification | (read-only report) | ✅ |
| 02 | Concept-id reconciliation — graph as canonical scheme | `dacccb4` | ✅ |
| 03 | Wire production corpus to client + remove `[unavailable]` placeholder | `b096792` + `9c751af` | ✅ |
| 04 | Shared error-tag → concept-id module | `5ca3cad` | ✅ |
| 05 | F028 Kari opener uses Norwegian topic label | `4f06279` | ✅ |
| 06 | AI language-validity gate on explain/conversation/journal | `57a9085` | ✅ |
| 07 | Diagnostic semantics rewrite (5 findings, 4 files) | `8807f16` | ✅ |
| 08 | Pre-render guard on /session/complete + Laster header | `87cd600` | ✅ |
| 09 | Mid-session exit confirmation | `76c6a41` | ✅ |
| 10 | Dashboard accuracy gate + "Anbefalt økt" rename | `63d1a35` | ✅ |
| 11 | Profile read-on-render + aria-pressed | `ab370f7` | ✅ |
| 12 | Onboarding step persistence to sessionStorage | `f27d6c4` | ✅ |
| 13 | Unicode emails + auth_failed banner | `c1d01ea` | ✅ |
| 14 | Footer links + email maxLength + dead-DB cleanup | `5b855dc` | ✅ |
| 15 | This sign-off report | _this commit_ | ✅ |

---

## Critical findings — closure table

| ID | Symptom | Closure |
|---|---|---|
| C-1 (F022) | AI repair card teaches reversed gender rules | P0.5-06 explainMistake gate drops fabricated-compound output; template fallback when validation fails. |
| C-2 (F029) | Kari (conversation AI) replies with non-Norwegian strings | P0.5-06 conversationTurn gate (NORWEGIAN_CHARS + ≤18-char words + English-drift cap + Norwegian-marker check). Template fallback on failure. |
| C-3 (F033) | Journal AI invents words; meaning flip on negation removal | P0.5-06 reviewWriting gate filters praise/suggestion/per-error Norwegian validity; drops corrections with invalid Norwegian. |
| C-4 (F030) | Conversation writes nothing to fingerprint | P0.5-04 shared map covers all 17 taxonomy tags with explicit fallback; P0.5-06 gate prevents bad-AI corrections from logging. |
| C-5 (F034) | Journal writes nothing to fingerprint | Same root cause and fix as C-4. |
| C-6 (F036) | /progress shows 0% / Locked despite fingerprint data | P0.5-02 canonical graph concept-ids; bootstrap migration for existing fingerprints. Walkthrough scheduler-warning count 36 → 0. |
| C-7 (F017) | Diagnostic seeds rawScore 100 regardless of wrong answers | P0.5-07 removed `Math.max(seedScore, rawScore)` floor; merge with existing mastery instead of overwrite. |
| C-8 (F016) | Diagnostic write happens on navigation, not on completion | P0.5-07 useEffect persists on diagnosticResult ready; click handlers are navigation-only. |
| C-9 (F012) | totalSessionsCompleted: 0 despite logged errors | P0.5-09 mid-session exit confirmation reduces accidental drops. Counter is now honest: "sessions you finished." |
| C-10 (F023) | /session/complete accessible with no guard | P0.5-08 pre-render `if (!session && results.length === 0) return null`. Verified via direct nav — no celebration flash. |
| C-11 (F011) | Half of stored errors have `correct: "[unavailable]"` | P0.5-03 gradeAnswer returns null on unresolved sentence; 3 callers skip onResult; placeholder string never reaches recentErrors. |

---

## Significant findings — closure summary

| ID | Closure |
|---|---|
| F002 cosmetic waitlist | Closed via analysis — server action actually inserts to Supabase. |
| F004 unicode emails | P0.5-13 permissive regex. |
| F006 silent auth_failed | P0.5-13 banner on /login. |
| F007 dead next= param | Closed via analysis; deeper rewire deferred. |
| F010 errorTag collapse | P0.5-02 reconciles concept-ids (sample bias remains a content design choice). |
| F013 onboarding refresh | P0.5-12 sessionStorage step persistence. |
| F014 kjørte duplicate | P0.5-07 distractor fix. |
| F015 diagnostic dedupe | P0.5-07 createDiagnosticState accepts seedAskedIds. |
| F018 accuracy on 0 sessions | P0.5-10 gates on totalSessionsCompleted > 0. |
| F019 scheduler warnings | P0.5-02 + P0.5-03 (36 → 0 measured on dashboard). |
| F020 accuracy oscillation | Closed by F018 — gating prevents the oscillation showing. |
| F021 today's session changes | P0.5-10 renamed to "Anbefalt økt". |
| F024 exit confirmation | P0.5-09 confirm(). |
| F025 session resume | Deferred to polish — current behavior is honest. |
| F027 repair-loop cap | Deferred to polish — current `isRepairItem` guard prevents worst-case. |
| F028 conversation opener slug | P0.5-05 Norwegian topic label. |
| F031 diagnostic wipes errors | P0.5-07 merges with existing fingerprint instead of overwriting. |
| F032 journal SSR mismatch | Not addressed this round (no Critical/Significant ripple). |
| F037 Profile level "–" | P0.5-11 reads fingerprint ahead of loading state. |
| F038 Profile pref not highlighted | P0.5-11 aria-pressed. |

---

## Final regression checks this session (focused walkthrough)

1. `/dashboard` first load: 0 scheduler warnings, accuracy "—", "Anbefalt økt · A1" label, all nav links present. ✅
2. `/session/complete` direct nav: empty alert → redirect to /dashboard. No celebration flash. ✅
3. `/login?error=auth_failed`: banner renders "Innloggingslenken er ugyldig eller utløpt." ✅
4. Synthetic-fingerprint migration test (P0.5-02): all five legacy keys rename to canonical, rawScore preserved on rename, merge policy (newer-wins) executed correctly, recentErrors rewritten, askedDiagnosticQuestionIds untouched. ✅
5. Session wrong-answer test (P0.5-03): grader returns real correct answer, no `[unavailable]` in recentErrors, AI semantic upgrade fires when ready. ✅
6. typecheck + 106/106 tests passing on every commit. ✅

The fourth full Playwright walkthrough as a standalone artifact (matching the rigor of the third) is deferred — the focused regressions covered the Critical surfaces and the framework holds. A new full walkthrough is recommended when:
- Muntlig roleplay (step 5) is built on top of this foundation
- Or before any production release that adds new user-facing surfaces

---

## Muntlig scripted roleplay — unblocked

Per `.planning/STATE.md`, muntlig step 5 (scripted roleplay) was paused behind P0.5-15. With this sign-off the pause lifts. STATE.md should be updated to set milestone back to `muntlig` with step 5 (scripted roleplay) as ▶ NEXT, OR (preferred) re-open a fresh planning conversation to decide whether muntlig is still the right next move given everything that came up during recovery.

---

## Items NOT addressed this round (documented gaps, not regressions)

- **F008 path-traversal edge case** in `/auth/callback`'s `safeRedirectPath`. No exploit confirmed (within-origin only); validator could be tightened to a whitelist. Polish.
- **F025 session resume** on re-entry. Deeper session-state persistence change.
- **F027 repair-loop cap** at N sequences per session. Pathological case; current guard sufficient for typical use.
- **F032 journal SSR mismatch** (voice/write toggle). Not Critical; cosmetic.
- **F035 reading visited indicator.** Reading does not feed the fingerprint by design; no fingerprint-honesty impact.
- **REVIEW.md 2026-05-11 WARNING items** — most are re-audited as still-fine in this round's P0.5-01; a few flagged for revisit during their next-touch refactor.
- **Authenticated-user walkthrough** — not run this round either. Future walkthroughs should attempt magic-link login + verify Supabase sync.

---

## What changes for the next walkthrough

Two procedural notes I'm flagging for the next iteration:

1. **Hallucination risk on agent delegations is real.** P0.5-02 first attempt was hallucinated — the agent returned a detailed report claiming changes that were not in the working tree. Recovery: stricter brief plus mandatory commit-with-grep proof in subsequent delegations, and direct execution on the most critical paths. Future briefs should require the agent to git-commit before claiming done.

2. **Sample bias in walkthrough findings.** F010 was reported as "all errors tagged word-order" — true symptom, wrong root cause. The corpus is balanced; the walkthrough user happened to practice mostly word-order concepts. Audit (P0.5-01) caught it. Future walkthroughs should sample concept variety before drawing root-cause conclusions about tagging.

---

_Sign-off: P0.5 recovery bundle complete; muntlig scripted roleplay unblocked._
