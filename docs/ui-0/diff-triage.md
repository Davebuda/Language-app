# Dirty Diff Triage — UI-0

52 files modified. Categorized below. No changes have been made yet — this is analysis only.

---

## Legend

- **KEEP** — change is correct, commit as-is after token cleanup pass
- **KEEP (token)** — direction correct, needs token rename applied (nc-violet → nc-red) before commit
- **REDO** — direction wrong or contains inconsistency, must be redone
- **KEEP (flag)** — mostly fine but has a specific flag to verify

---

## Tier A — Engine / Functional (no UI)

These are clean, correct, unambiguous functional improvements. All KEEP.

| File | Change summary | Verdict |
|---|---|---|
| `src/engine/diagnosis.ts` | Added `getReviewDueConcepts()` | **KEEP** |
| `src/engine/fingerprint.ts` | SRS ladder + `srsLevel`/`nextReviewAt` fields | **KEEP** |
| `src/engine/index.ts` | Export `getReviewDueConcepts` | **KEEP** |
| `src/engine/scheduler.ts` | SRS-first review pool; weak count 3→5 | **KEEP** |
| `src/types/fingerprint.ts` | `srsLevel`, `nextReviewAt` on `ConceptMastery` | **KEEP** |
| `src/types/taxonomy.ts` | `MetaErrorTag = 'unspecified'` added | **KEEP** |
| `src/app/session/actions.ts` | `inferErrorTag` removed; real `error_tags_detectable` from DB | **KEEP** |
| `src/hooks/useSession.ts` | `usedSentenceIds` moved to Zustand; default error tag `→ 'unspecified'` | **KEEP** |
| `src/stores/session-store.ts` | `usedSentenceIds` in store; `markSentenceUsed` action | **KEEP** |
| `src/components/journal/WritingEditor.tsx` | Bug fix: mastery update was missing for journal errors | **KEEP** |
| `package.json` / `package-lock.json` | Dependency updates (follow from new imports) | **KEEP** |

---

## Tier B — Bug Fixes Mixed With UI

These files contain real bug fixes that must be kept regardless of what happens to the surrounding UI.

| File | Bug fix | UI changes | Verdict |
|---|---|---|---|
| `src/app/session/complete/page.tsx` | `totalSessionsCompleted` counter + `lastSessionAt` were never written → sessions stat stayed at 0, recalibration never fired. **Critical.** | Dark gradient wrapper, glass cards, navigation buttons | **KEEP** — both the fix and the UI direction |
| `src/app/dashboard/page.tsx` | Recalibration suggestion now checks `lastSessionAt !== null` — was always showing to new users | Extensive redesign (PHASE_META map, icon mode grid, removed GuestBanner import) | **KEEP** — both |

---

## Tier C — Config / Foundation

| File | Change summary | Verdict |
|---|---|---|
| `components.json` | `baseColor: neutral` (was default) — correct for dark theme | **KEEP** |
| `tailwind.config.ts` | Values align with Ember dark theme; stale "Warm Precision light theme" comment | **KEEP** after comment fix + `nc.violet*` removal (see token contract) |
| `src/app/globals.css` | Full Ember dark token system; `--nc-violet*` naming issue | **KEEP** after `--nc-violet*` removal (see token contract) |
| `src/app/layout.tsx` | Font registration cleanup | **KEEP** |
| `CLAUDE.md` | 149-line change | **FLAG** — verify this is intentional project doc update, not a conflation with something else |

---

## Tier D — UI Rework: Correct Direction

These files moved from light/violet to dark Ember. All are the right direction. All need the token rename applied before commit (swap any remaining `--nc-violet` refs to `--nc-red`).

| File | Change summary | Verdict |
|---|---|---|
| `src/components/ui/button.tsx` | `min-h-[44px]` touch target; radius token; `link` variant cleanup | **KEEP** |
| `src/components/layout/BottomNav.tsx` | Dark glass background; red active state; `aria-current`, touch targets | **KEEP** |
| `src/components/layout/GuestBanner.tsx` | `nc-panel-soft → nc-glass` | **KEEP** |
| `src/components/dashboard/LevelSelector.tsx` | `nc-panel → nc-glass` | **KEEP** |
| `src/components/onboarding/OnboardingFlow.tsx` | `nc-gradient-page` wrapper; glass cards; orbit patterns removed; red CTAs | **KEEP (token)** |
| `src/components/onboarding/DiagnosticQuiz.tsx` | Orbit patterns removed; `nc-panel-dark → nc-glass-dark` | **KEEP** |
| `src/components/onboarding/RecalibrationQuiz.tsx` | Same pattern as DiagnosticQuiz | **KEEP** |
| `src/components/session/ExerciseCard.tsx` | Orbit patterns removed; `nc-panel-dark → nc-glass-cream-strong` | **KEEP** |
| `src/components/session/ExplanationCard.tsx` | Glass cream strong; red tint tip box; animation direction corrected | **KEEP (token)** |
| `src/components/session/ProgressBar.tsx` | Minor token update (4 lines) | **KEEP** |
| `src/components/session/ScoreCircle.tsx` | Token standardization (40 lines) | **KEEP (token)** |
| `src/components/session/SessionScreen.tsx` | Token cleanup (14 lines) | **KEEP** |
| `src/components/session/exercises/FillInBlankExercise.tsx` | Token cleanup (12 lines) | **KEEP** |
| `src/components/session/exercises/ListeningExercise.tsx` | Token cleanup (6 lines) | **KEEP** |
| `src/components/session/exercises/SpeedRound.tsx` | Token cleanup (6 lines) | **KEEP** |
| `src/components/session/exercises/TranslationExercise.tsx` | Token cleanup (42 lines) | **KEEP (token)** |
| `src/components/session/exercises/WordOrderExercise.tsx` | Token cleanup (4 lines) | **KEEP** |
| `src/components/session/exercises/WordOrderExerciseLazy.tsx` | Line-ending only (0 semantic changes) | **KEEP** |
| `src/components/progress/ConceptProgressRow.tsx` | `className` prop added; `nc-panel → nc-glass`; progress bar red (uniform) | **KEEP** |
| `src/app/session/page.tsx` | 2-line cleanup | **KEEP** |
| `src/app/recalibrate/page.tsx` | Token cleanup (14 lines) | **KEEP** |
| `src/app/journal/page.tsx` | Token cleanup (11 lines) | **KEEP** |
| `src/app/shadow/page.tsx` | Token cleanup (22 lines) | **KEEP** |
| `src/app/vocab/page.tsx` | Token cleanup (24 lines) | **KEEP** |
| `src/app/progress/page.tsx` | Token cleanup (38 lines) | **KEEP** |
| `src/app/reading/page.tsx` | Token cleanup + recalibration fix (71 lines) | **KEEP** |
| `src/app/eval/page.tsx` | Color references updated blue → red tokens | **KEEP** |
| `src/app/profile/page.tsx` | Token standardization | **KEEP** |
| `src/app/login/page.tsx` | Token standardization | **KEEP** |
| `src/app/conversation/page.tsx` | Token standardization | **KEEP** |
| `src/app/onboarding/page.tsx` | Minor (in git status but no stat entry — likely line endings) | **KEEP** |
| `src/components/onboarding/PlacementQuiz.tsx` | Same — likely line endings | **KEEP** |

---

## Tier E — Redo

These two files moved in the wrong direction relative to Ember and must be corrected.

| File | Problem | Action |
|---|---|---|
| `src/components/landing/waitlist-form.tsx` | Submit button background changed from blue (`#3b82f6`) to violet (`#7C3AED`) — opposite of Ember. Success state uses `rgba(124,58,237,...)`. | **REDO** — replace violet values with `--nc-red` |
| `src/components/landing/diagnostic-hero.tsx` | Hero headline gradient uses violet stops (`#a78bfa`, `#c4b5fd`) mixed with `var(--nc-violet)` midpoint — incoherent mix of old violet and new red direction | **REDO** — gradient should be pure red or single color |

---

## Tier F — Landing Page

| File | Change summary | Notes |
|---|---|---|
| `src/app/page.tsx` | Full rewrite. Removed fake social proof ("4.9+ from 1,200+ learners"), removed the `StartButton` import from removed component, proper CTAs with correct hrefs, working waitlist form embedded, `nc-gradient-page` wrapper | **KEEP** — new version is more honest. Token cleanup applies. |

---

## Summary counts

| Verdict | Count |
|---|---|
| KEEP (clean) | 32 |
| KEEP (token cleanup needed) | 8 |
| REDO | 2 |
| FLAG (verify only) | 1 — CLAUDE.md |
| **Total** | **52** |

---

## Commit strategy (post-approval)

Three commits in order:

1. **`fix(engine): SRS ladder, error tagging, session counter, journal mastery`**
   All Tier A files + `WritingEditor.tsx` functional change + `session/complete/page.tsx` functional fix only.

2. **`refactor(tokens): drop --nc-violet*, resolve single brand token contract`**
   `globals.css` + `tailwind.config.ts` rename; redo `waitlist-form.tsx` and `diagnostic-hero.tsx`.

3. **`refactor(ui): apply Ember dark theme across all pages and components`**
   All remaining UI files after token contract is clean.

The CLAUDE.md change should be verified separately and committed with explicit intent.
