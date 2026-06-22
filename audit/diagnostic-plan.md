# NorskCoach — Diagnostics Plan (Phase 3)

> Lightweight, debug-flagged instrumentation so future audits are cheaper and these failure classes surface themselves. Gate behind a single flag (e.g. `localStorage.nc_debug === '1'` or `process.env.NEXT_PUBLIC_NC_DEBUG`) — no permanent console spam. Each diagnostic names WHERE to add it and WHAT contract it guards.

## A. Grading diagnostics (Clusters 1, 2, 3)
| Diagnostic | Location | Logs | Guards |
|---|---|---|---|
| `grade.input` | actions.ts `gradeAnswer` entry | exerciseType, sentenceId, resolvedSource (`json`/`supabase`/`null`), userAnswer, derivedCorrect | A-01, S-01, G-04 |
| `grade.unresolved` | actions.ts when id resolves to null | sentenceId, exerciseType, "GENERATED?" | **S-01** (the freeze) — counts how often the grader gets an id it can't resolve |
| `grade.branch` | grade-utils `deriveCorrectAnswer` | which case returned, value length, contains-em-dash? | **A-01** (em-dash in fill-in-blank answer = annotation leak) |
| `grade.recourse` | TranslationExercise / SpeedRound | exerciseType, exact-match?, recourse-offered? | G-02 (parity gap visible: speed-round will log recourse-offered=false) |

## B. Repair-loop diagnostics (Clusters 2, 4, 6)
| Diagnostic | Location | Logs | Guards |
|---|---|---|---|
| `repair.trigger` | useSession.submitResult on wrong | errorTag, sentenceId, exerciseType, isGeneratedContent | S-01, S-02 |
| `repair.retryTarget` | repair-loop.makeRepairItems | retry contentId == failed sentenceId? retryExerciseType | retry-skips-failed hypothesis, S-06 |
| `repair.injection` | session-store.injectRepairItems | requested, allowedCount, dropped | **S-03** (silent swallow becomes visible) |
| `repair.emptySubmit` | SpeedRound timeout submit | userAnswer.length===0 | **S-02** (timeout-as-wrong) |

## C. Session state-machine diagnostics (Cluster 6)
| Diagnostic | Location | Logs | Guards |
|---|---|---|---|
| `session.unresolved` | useSession.resolveItem when nothing cached | itemId, conceptId, poolSize, reason (allPassed/aiNotReady/noLevelContent) | **S-05** (infinite skeleton) |
| `session.skip` | ExerciseCard NotYetAvailable skip | itemType, recordedCorrect | **S-04** (skip=correct) |
| `session.advance` | useSession.advanceItem | fromIndex, toIndex, isComplete | completion-trap regressions |

## D. Diagnostic / persistence diagnostics (Cluster 5)
| Diagnostic | Location | Logs | Guards |
|---|---|---|---|
| `diag.explanationPair` | DiagnosticQuiz reveal | answeredQuestionId, displayedExplanationId (assert equal) | off-by-one regression |
| `fp.seedWrite` | OnboardingFlow seed | level, awaited?, saveFingerprint resolved before navigate? | **D-01** (the race) |
| `fp.bootstrapReload` | useFingerprint bootstrap | storeHadFp?, reloadedLevel, prevLevel | **D-01** (clobber visible) |
| `fp.levelSource` | dashboard/profile/progress | displayedLevel, source (hydrated/default) | SSR/CSR regression guard |

## E. AI diagnostics (Clusters 3, 8)
| Diagnostic | Location | Logs | Guards |
|---|---|---|---|
| `ai.request` | ai/index dispatch | surface, path (webllm/server/template), start/end/error/null | WebLLM null regressions |
| `ai.masteryGate` | confirmedRepair | claimedClass, verifierVerdict, wrote? | invariant "only 4 verified classes move mastery" |
| `ai.correctedTextDelta` | WritingEditor buildCorrectedText | corrections shown vs corrections gated-in | **AI-01** (shown > recorded) |
| `ai.mic` | useSpeechRecognition.start | trigger (must be 'user-gesture') | mic-consent regression |
| `ai.evalGuard` | /eval | NODE_ENV, reachable? | **E-01** |

## F. Existing telemetry to lean on
- `src/lib/logEvents.ts` already writes per-exercise rows to `learning_events_log` for auth users — extend it (not replace) with a `resolvedSource` + `selfVerified` + `skipped` column so the A-01/S-01/S-04 classes are queryable in production without new infra.

## Implementation note
Add a single `audit/debug.ts` helper: `dbg(channel, payload)` that no-ops unless the debug flag is set. Each diagnostic above is one `dbg('grade.unresolved', {...})` call. Zero cost in prod, one grep to enable. Prefer this over scattering `console.log`.
