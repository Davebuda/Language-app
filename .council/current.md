# Task Brief
**Task:** P0.5-01 — Verify the third-walkthrough Critical findings against source code
**Date:** 2026-05-21T18:30
**Status:** IN PROGRESS
**corrections:** 0

---

## What

Before scheduling any code fixes, confirm each of the 10 Critical findings from `test-reports/stress-walkthrough-2026-05-21/report.md` is reproducible from the current source tree. The walkthrough captured observable behaviour (network, IndexedDB, DOM) — this task maps each observed defect back to the code that causes it, so subsequent P0.5-02..12 tasks have precise file:line targets.

**No code changes.** Read-only audit. Output is a structured verification doc.

The 10 Critical findings (from `report.md` § Critical and `_findings.md`):

| ID | Symptom (observable) | Verification goal |
|---|---|---|
| F010 | Every recentErrors entry tagged `word-order` regardless of mistake type | Locate every site that writes `errorTag` to the fingerprint. Determine whether this is (a) code regression of items 5+7 [exercise components hardcoding the tag again], (b) content-corpus issue [every sentence has `errorTagsDetectable: ['word-order']`], (c) grader override post-derivation, or (d) some other mechanism |
| F011 | Half of stored errors have `correct: "[unavailable]"` | Find the call site that builds the error record. Identify why the `correct` field falls back to the literal string `"[unavailable]"` for sentence-transformation and translation-to-english types |
| F012 | `totalSessionsCompleted: 0` despite 24 logged errors | Locate the increment site for `totalSessionsCompleted`. Determine why it never fires. Likely candidate: session-complete handler not reached, or fingerprint mutation not persisted |
| F017 | Diagnostic seeds rawScore=100 even when answer was wrong | Read the diagnostic completion handler (likely `src/lib/diagnostic/engine.ts` or `src/engine/diagnostic.ts`). Identify the function that maps diagnostic answers → fingerprint rawScores. Confirm whether it sets-to-100 or aggregates correctly |
| F016 | Diagnostic write happens on navigation, not on result-screen completion | Find the diagnostic finalize flow. Identify where the write to IndexedDB is invoked — is it tied to a router event rather than the completion handler? |
| F022 | AI repair-card explanation: "et is for masculine, ei is for neuter" (wrong) | Find the AI explanation render site for the repair card. Confirm: is there any validation pass between `aiService.generate*` and the rendered explanation string? |
| F029 | Kari (conversation AI) produces non-Norwegian strings | Find the conversation AI reply render path. Same validation-gate question |
| F030 | Conversation message with grammar error: no fingerprint write | Find the conversation grammar-check write path. Trace from message-send to `recordError`/equivalent. Identify the gap |
| F033 | Journal AI corrections invent words; meaning-flip on negation | Find the journal AI feedback path. Identify whether the corrections are aggregated into the rewrite without validation (likely the cause of the meaning flip) |
| F034 | Journal entry: no fingerprint writes despite 3 surfaced corrections | Find the journal correction → fingerprint write path. Trace from "Analyser tekst" success to `recordError`. Identify the gap |
| F036 | /progress shows 0% / Locked for concepts the fingerprint has at rawScore 100 | Identify two concept-id schemes. Find the canonical scheme (if one exists) and the divergent IDs. Likely: `prepositions-place` (fingerprint) vs `common-prepositions` (progress curriculum) |
| F023 | /session/complete directly accessible with no guard | Locate `src/app/session/complete/page.tsx`. Identify whether there is any guard (state check, route protection, redirect) |

**Files in scope:** Read-only access to the entire `src/` tree. No file mutations. Output is one new file: `.council/reports/2026-05-21-1830-source-verification.md`.

---

## How

1. **Read the walkthrough report and _findings.md.** Both live at `test-reports/stress-walkthrough-2026-05-21/`. The IndexedDB inspections and screenshots are the evidence base.

2. **For each Critical finding, find the source.** Use Grep to locate:
   - errorTag write sites: `errorTag:`, `recordError`, `logError`
   - rawScore write sites: `rawScore`, `applyDiagnostic`
   - totalSessionsCompleted: `totalSessionsCompleted`, session-complete handlers
   - Diagnostic finalize: `applyDiagnosticToFingerprint`, `finalize`, completion handlers
   - AI explanation render: `aiService.explainMistake`, RepairCard component
   - Conversation grammar-check: `useConversation`, `conversationStore`, gradeMessage
   - Journal grammar-check: `useJournal`, `analyseText`, `journalStore`
   - Concept-id schemes: `conceptId`, concept-graph definitions, fingerprint key names
   - /session/complete guard: `src/app/session/complete/page.tsx`, any layout guard, any redirect

3. **For each finding, produce a structured entry:**

   ```markdown
   ### F0XX — [finding headline]
   **Symptom (from walkthrough):** [observable behaviour]
   **Source location:** [file:line] (one or more)
   **Current code behaviour:** [what the code actually does]
   **Why the symptom manifests:** [the gap between intent and actual]
   **Intended behaviour:** [what should happen]
   **Likely scope of fix:** [single file / multi-file / requires new module / requires content edit]
   **Dependencies on other findings:** [e.g. F010 fix needs F011 fix first because…]
   **Confidence:** high / medium / low
   ```

4. **Special focus areas:**
   - **F010 is the most important** because everything downstream of the fingerprint depends on correct error tagging. If F010 is content-corpus (sentences mis-tagged), the fix is data, not code. If it's code regression of items 5+7, the fix is exercise components. Determine which.
   - **F022/F029/F033 share a root cause hypothesis** (no AI validity gate). Verify the hypothesis by grep — is there ANY function that validates AI output before display? If yes, identify why it doesn't fire. If no, that confirms the P0.5-04 design.
   - **F030/F034 share a root cause hypothesis** (the surface doesn't call into the fingerprint write API). Confirm whether `recordError` (or equivalent) is invoked at all from conversation and journal paths.
   - **F036 concept-id scheme:** produce a comprehensive mismatch table (every fingerprint concept-id → corresponding progress-graph concept-id). This becomes the migration map for P0.5-07.

5. **Read REVIEW.md's WARNING items** and flag whether any are likely still live (e.g., the auto-skip false-correct may have regressed alongside F012).

6. **Output location:** `.council/reports/2026-05-21-1830-source-verification.md`. Use the structure from step 3 for each finding. Open with a one-paragraph executive summary; close with a "Suggested ordering revisions" section noting if any of the 12 P0.5 task buckets should be split, merged, or reordered based on what the source actually reveals.

---

## Model

opus — this is a cross-file analysis with judgement calls about whether observed behaviour matches intent. Not mechanical.

---

## Acceptance Criteria

1. The verification doc exists at `.council/reports/2026-05-21-1830-source-verification.md`.
2. Each of the 10 Critical findings (F010, F011, F012, F016, F017, F022, F023, F029, F030, F033, F034, F036) has a structured entry with file:line, current behaviour, gap, intended behaviour, and confidence rating. (Yes — twelve IDs total; F022 is one entry though the issue spans surfaces.)
3. F010 has a definitive answer on code-vs-content (or both).
4. F022/F029/F033 has a definitive answer on whether any AI validity gate exists in source.
5. F030/F034 has a definitive answer on whether the conversation/journal surfaces invoke `recordError` (or equivalent) at all.
6. F036 has a concept-id mismatch table.
7. The doc closes with a "Suggested ordering revisions" section.
8. No source files modified. (Verify with `git status` → only `.council/reports/...` is new.)

---

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:

- Source-code reading reveals the walkthrough report contains a misinterpretation that invalidates the finding (e.g., a Critical turns out to be working-as-designed). Write the correction inline.
- Any of the 12 findings cannot be located in source (likely indicates the symptom is content/corpus rather than code — note this, do not block).
- The task scope expands beyond the 12 findings into a general code review (it should not — stay tight to the walkthrough findings).

---

## Playwright Checkpoint

**none** — this is a source-code audit with no UI changes.
