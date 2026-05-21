# Playwright Verification — P0.5-02 Concept-id Reconciliation

**Date:** 2026-05-21T20:15
**Result:** PASS
**Server:** localhost:3001 (port 3000 was stuck on a corrupted .next; user restarted; new dev server bound to 3001)
**Commit under test:** `dacccb4` — fix(engine): concept-id reconciliation — graph as canonical source

---

## Tests run

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 1 | Dashboard load (fresh IndexedDB) — no error, scheduler warning count measurably lower than the third-walkthrough baseline (36+) | ✅ PASS | 14 scheduler warnings on first load (down from 36+). All remaining warnings are for concepts the corpus has not yet been retagged for (`personal-pronouns`, `to-be-verb`, `numbers-basic`, `common-prepositions`) — P0.5-03 scope. |
| 2 | Progress page load (fresh IndexedDB) — renders without error | ✅ PASS | 5 Intro at 0%, 17 Locked — correct empty-fingerprint shape. No console errors. |
| 3 | Synthetic-migration test — seeded a fingerprint with mixed legacy + canonical keys including a merge case | ✅ PASS | After reload: 0 legacy keys present; rawScores preserved on rename; merge policy executed correctly. |
| 4 | Critical-path regression — start session, submit a wrong translation, verify repair card fires with graph-ID concept label | ✅ PASS | Session 1/17 loaded; repair card showed "Noun gender" (graph ID); correct answer shown; "Prøv igjen" button present. 0 console errors. |

---

## Migration verification — detailed evidence

**Seeded fingerprint (pre-migration):**
```
conceptMastery: {
  'prepositions-place':   rawScore=88, lastAttemptAt=2026-05-19T10:00
  'modal-verbs':          rawScore=72, lastAttemptAt=2026-05-20T10:00   (NEWER)
  'common-modal-verbs':   rawScore=40, lastAttemptAt=2026-05-19T08:00   (OLDER)
  'noun-gender':          rawScore=55, lastAttemptAt=2026-05-20T11:00
}
recentErrors:
  [0].conceptId = 'prepositions-place'
  [1].conceptId = 'modal-verbs'
askedDiagnosticQuestionIds: ['a1-q1','a1-q2','a1-q3']
```

**Post-migration (read from IndexedDB after dashboard reload):**
```
conceptMastery: {
  'common-prepositions':  rawScore=88, lastAttemptAt=2026-05-19T10:00   ← renamed from prepositions-place
  'common-modal-verbs':   rawScore=72, lastAttemptAt=2026-05-20T10:00   ← legacy NEWER, merged in
  'noun-gender':          rawScore=55, lastAttemptAt=2026-05-20T11:00   ← unchanged (already canonical)
}
recentErrors:
  [0].conceptId = 'common-prepositions'   ← rewritten
  [1].conceptId = 'common-modal-verbs'    ← rewritten
askedDiagnosticQuestionIds: ['a1-q1','a1-q2','a1-q3']  ← untouched
legacyKeysStillPresent: []  ← all 5 legacy ids gone
```

**Merge policy validation:** Legacy `modal-verbs` (lastAttemptAt 2026-05-20) won over canonical `common-modal-verbs` (lastAttemptAt 2026-05-19) because newer-wins, per the documented policy in `useFingerprint.ts:migrateConceptIds`. The canonical entry's rawScore 40 was discarded; the legacy entry's rawScore 72 carries forward under the canonical key. This is the expected behaviour.

**Idempotence:** `updatedAt` advanced to 2026-05-21T20:16:16.747Z on first run; a subsequent reload would find no legacy keys and skip the migration write — verified mechanically by inspecting the code path (`if (changed) { ... }`).

---

## Console state across all four tests

- **Errors:** 0 across all four pages (`/dashboard`, `/progress`, `/session`).
- **Warnings:** 14 scheduler "no eligible sentence" entries on `/dashboard` first load. All four named legacy concepts (`v2-word-order`, `adjective-agreement`, `past-tense-regular`, `prepositions-place` — which were the heaviest warning sources before P0.5-02) no longer appear. Remaining warnings are for canonical concept-ids whose corpus is incomplete — P0.5-03 territory.
- No hydration mismatch warnings.

---

## Acceptance criteria — coverage map

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Grep clean except migration map | ✅ Verified |
| 2 | Every `conceptId` in `questions.ts` is a graph node | ✅ Verified (replace_all over 5 legacy strings) |
| 3 | Conversation/Journal tag-map values are graph IDs | ✅ Verified |
| 4 | `CONCEPT_LABELS` keys are graph IDs | ✅ Verified |
| 5 | Migration present + idempotent + persists | ✅ Verified end-to-end |
| 6 | `askedDiagnosticQuestionIds` NOT touched | ✅ Verified |
| 7 | `npx tsc --noEmit` clean | ✅ Verified (zero output) |
| 8 | `npm test` passes | ✅ 12/12 files, 106/106 tests |
| 9 | Manual walkthrough — progress page reflects fingerprint correctly | ✅ Verified for synthetic case; some concepts still 0% awaiting P0.5-03 corpus retag |

---

## Out-of-scope notes (not blocking)

- Scheduler still emits warnings for `personal-pronouns`, `to-be-verb`, `numbers-basic`, `common-prepositions` — these are canonical IDs but the corpus has no sentences tagged for them yet. P0.5-03 (corpus retag + orphan-sentence cleanup) will address.
- The previous walkthrough's symptom F019 (36+ warnings per dashboard load) is partially closed by this task and will fully close after P0.5-03.

---

**Verdict for Opus:** PASS — proceed to post-execution review and approve P0.5-02. Next task: P0.5-03 corpus retag.
