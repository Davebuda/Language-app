# Task Brief
**Task:** Pronunciation Drills mode verification + corrections
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## Council decision
Pronunciation drills mode (commit fd9e5e7) verified. Two corrections applied before approve:
1. `pickExerciseType` dead code removed from `scheduler.ts` — was blocking `next build`.
2. Dashboard MUNTLIG card updated to link to `/shadow` and `/drills` — both were orphaned.

Build passes. Playwright: PASS. Next task: Listen-and-respond (Muntlig Step 4).
