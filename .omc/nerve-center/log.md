# Nerve Center — Decision Log

## 2026-05-26T00:00 — Stream 5.5 Full Orchestration

**Mode:** Full orchestration (research → plan → build → verify)
**Scope:** Stream 5.5 Phases 3–8 (Lanes on a Bar)

### Routing decisions

| Phase | Lane | Agent(s) | Rationale |
|---|---|---|---|
| 3 (Journal focus bias) | VERIFY | — | Already shipped; confirmed via test run (12/12 pass) |
| 4 (Roleplay focus scoring) | BUILD | `implementer` (parallel) | Pure new module + UI wire; no engine writes; independent of Phase 5 |
| 5 (Conversation focus bias) | BUILD | `implementer` (parallel) | New module + prompt wire; independent of Phase 4 |
| 7 (Stub removal) | BUILD | `implementer` (parallel) | Pure UI; no engine; independent of all other phases |
| 6 (Repair loop externalization) | BUILD | `implementer` (sequential) | Highest risk — refactors engine write paths in files Phases 4+5 modified; ran after 4+5 merged |
| 8 (Recalibration retirement) | BUILD | `implementer` (sequential) | Touches dashboard (Phase 7 also modified); ran last |

### Parallelization

- **Wave 1 (parallel):** Phases 4, 5, 7 — zero file overlap, all independent
- **Wave 2 (sequential):** Phase 6 — depends on 4+5 file state (RoleplayScreen.tsx, conversation/page.tsx)
- **Wave 3 (sequential):** Phase 8 — depends on 7 file state (dashboard/page.tsx)

### Build issues encountered

- `kari-opener.ts` (Phase 5): Two `!` non-null assertions failed ESLint (`@typescript-eslint/no-non-null-assertion`). Fixed by replacing with guard clauses + `continue`/early return. Build passed after fix.

### Verification evidence

- **Tests:** 209 → 288 (79 new tests across 4 phases)
- **TypeScript:** zero errors throughout
- **Build:** `next build` clean after lint fix
- **No regressions:** all 24 test files pass

### Files created (6)

- `src/lib/roleplay-focus-scoring.ts` — scoreFocusOverlap, rankScenariosByFocusOverlap
- `src/lib/kari-opener.ts` — suggestFocusTopic, buildFocusHint
- `src/engine/repair-from-surface.ts` — repairFromSurface, repairBatchFromSurface
- `tests/lib/roleplay-focus-scoring.test.ts` — 8 tests
- `tests/lib/kari-opener.test.ts` — 7 tests
- `tests/engine/repair-from-surface.test.ts` — 7 tests

### Files modified (9)

- `src/components/muntlig/RoleplayScreen.tsx` — focus scoring + "Anbefalt" chip + error logging
- `src/app/conversation/page.tsx` — focus topic suggestion + prompt hint + repairFromSurface
- `src/components/journal/WritingEditor.tsx` — repairBatchFromSurface refactor
- `src/engine/index.ts` — new exports
- `src/app/vocab/page.tsx` — honest "Kommer i v2" banner
- `src/app/shadow/page.tsx` — honest "Kommer i v2" banner
- `src/app/dashboard/page.tsx` — /shadow link muted + recalibration banner → /uke
- `src/app/recalibrate/page.tsx` — redirect to /uke
- `src/app/profile/page.tsx` — "Feil nivå?" escape hatch
