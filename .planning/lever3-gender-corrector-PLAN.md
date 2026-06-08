# Plan: Lever 3 — Deterministic Noun-Gender Corrector (gender-only filter)

**Status:** PLAN — awaiting approval. Do not execute until approved (HARD RAIL #2/#4).
**Date:** 2026-06-08

## Context
- **User intent:** Build a deterministic (no-AI) gender verifier that re-arms the gated-off conversation + journal AI corrections — but ONLY for lexicon-verified `noun-gender` errors — so verified production errors feed the diagnosis moat without the wrong-but-valid-Norwegian poisoning that got them gated off (e.g. AI "jobb"→"et jobb").
- **Stack:** Next.js 15.3.2 + TS 5.8 strict + Zustand 5 + Vitest 4 + tsx 4.21 (build scripts). No new runtime deps.
- **Existing patterns leveraged:** committed-output build script (`scripts/audit-corpus.ts`, `scripts/build-*` precedent); pure fingerprint writers (`repairFromSurface`/`repairBatchFromSurface` in `src/engine/repair-from-surface.ts`); the standing `npm run audit:gate`.
- **New pattern introduced:** a bundled deterministic lexicon (`src/lib/gender-map.ts`) + a pure verifier (`src/lib/gender-verifier.ts`). Validated against Norsk ordbank format (`.scout/lane-ordbank-format.md`).

## Phase 0 Discovery Summary

**Installed versions:** next ^15.3.2, typescript ^5.8.3, vitest ^4.1.5, tsx ^4.21.0, zod ^3.24.4 (all in `package.json`). No lexicon/NLP dep needed — parse raw TSV.

**Lexicon format (Norsk ordbank Bokmål 2005, CC-BY 4.0):** parse `fullformsliste.txt` only — TSV, **Latin-1**, no header. Cols: `0 LOEPENR · 1 LEMMA_ID · 2 OPPSLAG(form) · 3 TAG`. Noun filter: TAG contains `subst` AND not `prop`. Gender tokens (literal, space-sep in TAG): `mask`→m, `fem`→f, `nøyt`→n, `m/f`→{m,f} (single token). Dual gender also appears as separate `mask`+`fem` rows under one LEMMA_ID → union into a set. Source: `.scout/lane-ordbank-format.md`.

**Correction write sites (both intact, only gated):**
- Conversation: `src/app/conversation/page.tsx:181` `logConversationError(correction)` → `repairFromSurface({surfaceKind:'conversation', errorTag: correction.errorTag, wrong: correction.original, correct: correction.corrected})`; gated at `:265` (`CONVERSATION_CORRECTIONS_ENABLED ? result.correction : undefined`). Type `ConversationCorrection {errorTag, original, corrected}` (`src/ai/types.ts:60`).
- Journal: `src/components/journal/WritingEditor.tsx:190-198` builds `RepairInput[]` from `result.errors` → `repairBatchFromSurface`; gated by `JOURNAL_ERROR_WRITE_ENABLED` at `:168`. Type `TaggedError {tag, wrong, correct}` (`src/ai/types.ts`, in `WritingFeedback.errors`).
- Write API: `repairFromSurface`/`repairBatchFromSurface` (`src/engine/repair-from-surface.ts`) — takes `{surfaceKind, errorTag, conceptId?, wrong?, correct?}`, does `updateConceptMastery(wrong)` + `logError` + `aggregateErrorPatterns`. **No schema change; no new fingerprint field.**

**Taxonomy:** `noun-gender` is a dedicated tag (`src/types/taxonomy.ts:6`), distinct from `article-use` (`:7`). Verifier targets `noun-gender`; ignores the AI's claimed tag and decides from the article/definite-suffix itself.

**Test patterns:** Rule-8 writer tests exist at `tests/engine/repair-from-surface.test.ts` + `tests/integration/production-wall-trace.test.ts` (build fp → call writer → assert mastery/error-log/SRS pre→post). Returning-user guard: `tests/integration/returning-user-read-safety.test.ts` + `tests/types/returning-user-fixture.ts` — **no extension needed** (no new fingerprint field).

**Discovery status: PASS.**

## Key design decisions (locked)
1. **Artifact is keyed by SURFACE FORM, not lemma** → `src/lib/gender-map.ts` exports `GENDER_MAP: Record<string, Gender[]>` where every inflected noun form of the trimmed CEFR vocab maps to its lemma's gender SET. This makes the verifier a pure lookup (no heuristic ending-strip) and keeps the two-gender trap correct (`boka`,`boken`,`bok` → `['m','f']`). Frequency-trim to the app's corpus noun vocab to stay <~300KB.
2. **Verifier ignores the AI's claimed tag.** It extracts (learner-gender, proposed-gender, noun) from `original`/`corrected` via article tokens (`en`→m,`ei`→f,`et`→n) or definite suffix, looks up the noun's gender set, and returns `confirmed | rejected | not-applicable`.
3. **Verdict rule:** `confirmed` ⟺ noun is in the map AND learner-gender ∉ set AND proposed-gender ∈ set. Everything else → `rejected` (both valid / proposed-gender wrong, e.g. the `et jobb` poisoning case) or `not-applicable` (OOV, no article/noun pair, non-gender correction). Only `confirmed` writes/displays.
4. **Re-arm = gate the existing call**, do not rebuild. For conversation, the same gate covers display+write (we must never SHOW an unverifiable correction as truth — supersedes the brief's "display unchanged" for the conversation surface; journal display already shows feedback and only the write is gated).
5. **Scope fence:** only `noun-gender`. V2/conjugation/everything else stays show-don't-grade (the two booleans' non-gender behavior is preserved: still no write).

## Tasks

### Task 1 — Write the gender-map build script
**Diff:** Create `scripts/build-gender-map.ts` (tsx) that fetches/reads the Norsk ordbank tarball, decodes `fullformsliste.txt` as Latin-1, keeps `subst`-not-`prop` rows, unions gender tokens per `LEMMA_ID` into a set, expands to every surface form, frequency-trims to the corpus noun vocab, and emits `src/lib/gender-map.ts` with a CC-BY attribution header.
**Files in scope:** `scripts/build-gender-map.ts` (new) [reads `src/data/**` corpus for the trim list].
**Depends on:** none
**Verification:** script runs clean; logs distinct-form count; emitted file parses.

### Task 2 — Generate + commit the gender-map artifact
**Diff:** Run Task 1's script and commit the generated `src/lib/gender-map.ts` (the trimmed form→gender-set map).
**Files in scope:** `src/lib/gender-map.ts` (new, generated).
**Depends on:** Task 1
**Verification:** file <~300KB; exports `GENDER_MAP: Record<string, Gender[]>`; spot-checks `bok→['m','f']`, `hus→['n']`, `gutt→['m']`, `jobb→['m']`, `jobben→['m']`.

### Task 3 — Implement the pure verifier
**Diff:** Create `src/lib/gender-verifier.ts` exporting `verifyGenderCorrection(c: {original: string; corrected: string}): 'confirmed' | 'rejected' | 'not-applicable'` plus a longest-suffix compound fallback, importing `GENDER_MAP`.
**Files in scope:** `src/lib/gender-verifier.ts` (new).
**Depends on:** Task 2
**Verification:** type-checks; exported contract matches the design rule (Task 4 proves behavior).

### Task 4 — Unit-test the verifier
**Diff:** Add `tests/lib/gender-verifier.test.ts` covering the two-gender trap, the poisoning case, true errors, OOV, and compound fallback.
**Files in scope:** `tests/lib/gender-verifier.test.ts` (new).
**Depends on:** Task 3
**Verification:** cases pass — `en bok`/`ei bok` neither flagged; AI `jobb→et jobb` → `rejected`; learner `et jobb→en jobb` → `confirmed`; `en hus→et hus` → `confirmed`; `boka→boken` → `rejected`; unknown noun → `not-applicable`; `barnehage` (OOV compound) → inherits `m`.

### Task 5 — Gate the journal write on the verifier
**Diff:** In `WritingEditor.tsx`, replace the `JOURNAL_ERROR_WRITE_ENABLED` block so `result.errors` are filtered to those where `verifyGenderCorrection(err) === 'confirmed'` before building `RepairInput[]` → `repairBatchFromSurface` (drop the dead boolean).
**Files in scope:** `src/components/journal/WritingEditor.tsx`.
**Depends on:** Task 3
**Verification:** a `confirmed` gender error writes one repair; a `rejected`/non-gender error writes nothing; production-brick path unchanged.

### Task 6 — Gate the conversation correction on the verifier
**Diff:** In `conversation/page.tsx`, replace `CONVERSATION_CORRECTIONS_ENABLED ? result.correction : undefined` with a verifier check so `correction` passes through (display + `logConversationError` write) only when `verifyGenderCorrection(result.correction) === 'confirmed'` (drop the dead boolean).
**Files in scope:** `src/app/conversation/page.tsx`.
**Depends on:** Task 3
**Verification:** a `confirmed` gender correction shows + writes; a `rejected` one (e.g. `et jobb`) neither shows nor writes.

### Task 7 — Rule-8 live trace test
**Diff:** Add `tests/integration/gender-corrector-trace.test.ts` proving a verified gender error moves mastery + logs the error + resets SRS, and an invalid AI claim leaves the fingerprint untouched.
**Files in scope:** `tests/integration/gender-corrector-trace.test.ts` (new).
**Depends on:** Tasks 3, 5, 6
**Verification:** pre/post fingerprint asserts both directions (write on `confirmed`, no-write on `rejected`).

### Task 8 — Gate green + isolation check
**Diff:** Run `npm run audit:gate` and confirm corpus + tsc + vitest + returning-user all green; confirm `validateNorwegianOutput` and the template/rule fallback are byte-unchanged.
**Files in scope:** none (verification only).
**Depends on:** Tasks 1–7
**Verification:** `audit:gate` exits 0; `git diff --stat` shows no change to `src/ai/validate.ts` or the fallback branches.

## Dependency Graph
| Task | Depends on | Parallel-safe with |
|---|---|---|
| 1 build script | none | — |
| 2 commit artifact | 1 | — |
| 3 verifier | 2 | — |
| 4 verifier tests | 3 | 5, 6 |
| 5 journal gate | 3 | 4, 6 |
| 6 conversation gate | 3 | 4, 5 |
| 7 trace test | 3,5,6 | — |
| 8 audit:gate | 1–7 | — |

Critical path: 1 → 2 → 3 → (4 ‖ 5 ‖ 6) → 7 → 8. Tasks 4/5/6 touch disjoint files → safe to parallelize.

## Subagent Handoffs (build phase)
```yaml
# Task 3 — verifier
handoff:
  intent: "Pure deterministic gender verifier; confirmed iff noun in GENDER_MAP ∧ learner-gender∉set ∧ proposed-gender∈set; else rejected/not-applicable. No AI."
  slug: gender-verifier
  status: READY_FOR_BUILD
  artifacts: [src/lib/gender-map.ts (read), src/types/taxonomy.ts (read), src/lib/gender-verifier.ts (create)]
  constraints:
    in_scope_files: [src/lib/gender-verifier.ts]
    forbidden_actions: ["no AI calls", "no fingerprint writes here (pure)", "no edits to gender-map.ts"]
    time_budget: 30
# Tasks 5 & 6 — gates (dispatch in parallel; disjoint files)
handoff:
  intent: "Replace the dead boolean with a per-correction verifier gate; only 'confirmed' gender corrections write to mastery. Preserve all non-gender behavior (no write) and the production-brick path."
  slug: rearm-[journal|conversation]
  status: READY_FOR_BUILD
  artifacts: [src/lib/gender-verifier.ts (read), src/components/journal/WritingEditor.tsx OR src/app/conversation/page.tsx (modify)]
  constraints:
    forbidden_actions: ["no change to repair-from-surface.ts", "no change to validate.ts", "do not re-arm V2/conjugation"]
    time_budget: 25
```

## Verification Strategy
Per task above. Overall acceptance = Task 4 (unit, two-gender trap) + Task 7 (Rule-8 live pre/post, both directions) + Task 8 (`audit:gate` green + fallback/validate untouched).

## Open Risks (flags, not blockers)
- **Corpus trim source:** the frequency-trim needs the app's noun vocab list — Task 1 reads the sentence corpus under `src/data/**`; if nouns aren't cleanly extractable, fall back to shipping the full common-noun map (still likely <1MB gzipped) and note the size.
- **Latin-1 decode:** mirrors may already be UTF-8; the script must sniff (æ/ø/å mojibake) before decoding — covered in the format ref.
- **Display-vs-write on conversation:** gating display too (not just write) is the safe call — we never show an unverified correction as truth. This intentionally keeps non-gender corrections suppressed on conversation (unchanged from today). Confirm this is the intended UX.
- **AI mislabels gender as `article-use`:** mitigated — the verifier decides from the article/suffix, not the claimed tag. But a correction that changes BOTH gender and another feature in one string may parse ambiguously → `not-applicable` (safe: no write).

## Estimated Scope
Files affected: 6 (2 new lib + 1 new script + 2 new tests + 2 edits). Tasks: 8. Parallel-safe: 4/5/6. Rough tokens: ~50–80k for the build phase.
