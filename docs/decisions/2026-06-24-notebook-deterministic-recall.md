# Notebook items return as deterministic translation-recall on their own SRS

**Date:** 2026-06-24
**Status:** active

## Decision
A learner-saved notebook item that is "promoted" re-enters the daily økt as a **deterministic `translation-to-norwegian` exercise** (English prompt → learner types Norwegian, graded by the existing exact/accepted-match grader), advancing the item's **own** SRS ladder — it never writes `conceptMastery`. Promotion uses a **HYBRID gate**: an item is eligible only when it is SRS-due AND (the learner explicitly tapped "Øv på dette" OR its `conceptId` is a current weakness in the fingerprint). The scheduler injects at most 2 such items per session, into the **new-material lane only** (never the review/SRS-due/interleaving pools).

## Context
The notebook (`/vocab`) lets learners save words/phrases/corrections from anywhere. The product ask was "words I get right once but can't remember — make them come back." That requires saved items to re-enter practice. But three project invariants constrain *how*:
- **North Star:** every feature must push toward production; a recognition-only flashcard fails the test.
- **"No unverified AI moves mastery":** saved items (esp. from AI corrections) are not corpus-verified, so they must not be allowed to move the diagnosis fingerprint.
- **T1.6:** tilting the spaced-repetition review pool by today's state breaks the 1→3→7→14→30 ladder.

## Why
- **Deterministic translation-recall** reuses the existing translation exercise + grader, so grading is exact/accepted-match — **no AI grading**, sidestepping the "no unverified AI moves mastery" rule entirely. It is also *production* (the learner types Norwegian), satisfying the North Star. The non-corpus item content rides the existing S-01 `fallbackContent` path, so the grader needed zero changes.
- **Own SRS ladder, never `conceptMastery`** keeps the diagnosis fingerprint pristine: a learner's personal saved-word practice cannot pollute the moat's root-cause diagnosis. `submitResult` branches on `selectionReason === 'notebook_practice'`.
- **New-material lane only + cap 2** respects T1.6 (review pool stays diagnosis-agnostic) and keeps notebook practice supplementary, never dominating the prescribed session.
- **HYBRID gate** means an item earns its way back through either explicit learner intent OR diagnostic relevance — "purpose", not an indiscriminate flashcard dump (the learner's stated concern).

## Rejected alternatives
- **Write notebook practice into `conceptMastery`** (treat saved items like corpus concepts) — rejected: violates "no unverified AI moves mastery" and pollutes diagnosis with unverified user/AI content.
- **A dedicated new "notebook exercise" type** (recall + use-in-a-sentence) — rejected: free-text Norwegian grading needs AI, which the hard rule forbids; also more surface area against Operating Rule 1 (depth not breadth).
- **Concept re-injection** (promote = practice the item's grammar *concept* via corpus exercises) — rejected: it's the concept that returns, not the *word* the learner saved; less faithful to the ask.
- **Per-user JSONB blob in Supabase** (like `fingerprint_sync`) — rejected for storage: the notebook is unbounded; row-per-item (`learner_notebook`) scales and avoids re-uploading the whole notebook on every change.

## Consequences
- A promoted item needs an `english` value to be a translation prompt; items lacking one show an inline "Legg til oversettelse" affordance (learner adds it → promotable). Items with no English stay reference-only.
- Notebook SRS lives on the `NotebookItem` itself (`srsLevel`/`nextReviewAt`), advanced by the shared `src/lib/srs.ts` primitive — separate from the fingerprint's concept SRS by design.
- The notebook is the de-facto **v2 vocab** layer; `/vocab` is no longer a stub.
- Cross-device sync is opt-in via auth (`learner_notebook` + RLS); guests are fully functional IndexedDB-only.
