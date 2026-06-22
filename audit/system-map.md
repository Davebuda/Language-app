# NorskCoach — System Map (Phase 1)

> Audit date: 2026-06-22 · HEAD `a72f7b7` (= origin/main, clean tree). Built from static code inspection (5 parallel read-only cluster agents) + targeted corpus/grader verification. Mark: verified / likely / suspected.

## 1. Routes (src/app/**/page.tsx — 22 routes + 1 API)

| Route | Component | Type | Linked from | Notes |
|---|---|---|---|---|
| `/` | landing | real | entry | auth label tracks `useAuth().user` (page.tsx:163) |
| `/login` | OTP login | real | landing, dashboard, profile | 6/8-digit OTP (`verifyOtp`) |
| `/onboarding` | OnboardingFlow | real | landing CTA | diagnostic → seed fingerprint |
| `/dashboard` | dashboard | real (client) | BottomNav Hjem | lead "I dag" command card |
| `/session` | SessionScreen | real | BottomNav Lær | core loop + repair |
| `/session/complete` | complete | real | post-session | accuracy/brick summary |
| `/conversation` | conversation | real | BottomNav Øv | AI tutor (server Groq) |
| `/progress` | progress | real (client) | BottomNav Fremgang | breaker-story + trajectory |
| `/profile` | profile | real (client) | BottomNav Profil | level + AI mode (Lokal/Sky/Maler) |
| `/journal` | WritingEditor | real | dashboard lane | AI review → confirmedRepair gate |
| `/skriv` | ReadReciteWriteScreen | real | dashboard lane (B1/B2) | read→recite→write |
| `/reading` | reading | real | dashboard lane (A1/A2) | **A1/A2 only; word-tap cosmetic** |
| `/roleplay` | RoleplayScreen | real | dashboard lane | A2 below-level banner ✓ |
| `/uke` | weekly check | real | dashboard "Mer", WeekStrip | weekly retrieval |
| `/ord` | ConjugationDrillScreen | real | dashboard lane (B2 only) | orphan for A1/A2/B1 |
| `/listen` | ListenRespondScreen | real | **ORPHAN** | A2 banner ✓; no dashboard link |
| `/drills` | DrillsScreen | real | **ORPHAN** | pronunciation; no link |
| `/shadow` | ShadowingScreen | real | **ORPHAN** | B2 below-level cascade ✓; no link |
| `/analytics` | analytics | real | **ORPHAN** | login-gated; no in-app link |
| `/eval` | eval harness | real | **ORPHAN** | **dev tool, NO prod guard** |
| `/vocab` | vocab stub | honest stub | orphan | "Kommer i V2" ✓ |
| `/recalibrate` | redirect | redirect→/uke | orphan | ✓ |
| `/help/mobile-reset` | instructions | real | orphan (URL share) | reset guide |
| `/api/ai` | route.ts | API | client AI services | Groq; actions: conversation/explain/review/generate |

## 2. Major user journeys

- **Cold-start:** landing → onboarding (12-Q adaptive diagnostic) → seed fingerprint (per-concept mastery, accuracy-only rawScore, calibration=5) → dashboard → session.
- **Daily loop:** dashboard "Start dagens økt" → session (lytt/lær/snakk blocks) → per-item grade → wrong → repair loop (explain → micro-drill → retry → SRS schedule) → /session/complete.
- **Production lanes:** journal, /skriv, conversation, roleplay → all feed mastery via `confirmedRepair` gate (AI) or deterministic signal.
- **Muntlig:** /listen, /drills, /shadow feed fingerprint + speaking minutes — but ORPHANED (no entry point).

## 3. Exercise types & grading paths

- **Real in-session:** translation-to-norwegian, translation-to-english, fill-in-blank, word-order, listening-comprehension, speed-round, cloze-passage.
- **Phantom (honest banner):** sentence-transformation, dictation, reading-comprehension, free-writing (`NOT_YET_AVAILABLE_TYPES`, session.ts:24).
- **Grader:** `gradeAnswer` (server action, src/app/session/actions.ts) → resolves sentence by id from **local JSON corpus or Supabase** → `deriveCorrectAnswer` (grade-utils.ts) per type → `checkAnswerWithAlternatives`. **Boundary risk:** AI-generated ids resolve in neither → `null` (see registry S-01, A-01).
  - translation-to-norwegian/word-order/listening/dictation → `norwegian`
  - translation-to-english/speed-round → `english`
  - **fill-in-blank → `notes`** (verbatim — root of A-01)

## 4. Diagnosis → scheduling → remediation (the moat)

- **Diagnostic:** IRT-style adaptive, seeds fingerprint. Explanation correctly paired to frozen `answeredQuestion` (DiagnosticQuiz.tsx:77,107).
- **Fingerprint:** Zustand `fingerprint-store` + IndexedDB persistence + Supabase fire-and-forget. `normalizeFingerprint` (fingerprint.ts:175) backfills legacy fields on both load paths.
- **Scheduler:** `generateSession` (scheduler.ts) — recipe 40/30/20/10. Diagnosis steers ONLY the remediation pool (edcd54d); T1.4 just added `root_cause` in-session label. Pools: remediation / review (SRS-due) / new-material / interleaving / snakk.
- **Diagnosis engine:** 4 root-cause rules; top reasoning = dashboard coach line.
- **Repair loop:** `repair-loop.ts` builds explain + micro-drills (phantom-filtered, 930df13) + retry. Seed-path retry re-presents the EXACT failed sentence (verified). SRS ladder 1→3→7→14→30.

## 5. AI architecture & fallbacks

- **Desktop:** WebLLM (Llama-3.2-1B) in Web Worker / WebGPU. **Mobile/server:** Groq (Llama 3.1 8B) via `/api/ai`. **Fallback:** templates.
- **Safety invariants (verified):** local 1B `explainMistake` gated OFF → template (3dd11ad); all AI surfaces have deterministic fallback; `confirmedRepair` (gender-correction-gate.ts) is the SINGLE mastery-write gate for AI corrections; only 4 deterministically-verified classes (gender/conjugation/adjective/compound) move mastery; mic is gesture-gated (no auto-start).
- **Validation:** `validateNorwegianOutput` / `validateGenerated`. One gap: server A1/A2 explanation un-validated (AI-03).

## 6. State / persistence sources

- **Zustand stores:** `fingerprint-store`, `session-store`, `ai-status-store`.
- **Persistence:** IndexedDB (fingerprint, primary) → Supabase sync (auth users). Guests: IndexedDB only.
- **SSR/CSR:** dashboard/profile/progress are all `'use client'` — no SSR/CSR level mismatch (loading guards show `–`/skeleton). Level source = hydrated Zustand/IndexedDB only.

## 7. Known boundaries / risk seams (feed Phase 4)

1. **Grader ↔ generated content** — server grader can't resolve client-generated/cached ids → null (S-01).
2. **`notes` field overload** — authoring annotation vs answer key collide at B2 (A-01).
3. **AI-graded exercises without recourse parity** — speed-round, timeout-as-wrong (G-02, S-02).
4. **Write-before-navigate races** — onboarding seed fire-and-forget (D-01).
5. **Orphan routes** — muntlig + analytics + eval unreachable/unguarded (R-01, R-04, E-01).
