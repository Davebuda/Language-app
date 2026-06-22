# NorskCoach — Live Audit Log (append-only)

> Each entry timestamped. Newest at bottom. HEAD `a72f7b7` (clean tree = origin/main).

---

**2026-06-22T13:30 · Phase 1 — System map**
- Enumerated 22 routes + 1 API (`/api/ai`), 3 Zustand stores, engine + AI layers. Wrote `audit/system-map.md`.
- Identified 7 risk seams (grader↔generated-content, `notes` overload, AI-graded-without-recourse, write-before-navigate, orphan routes, eval-unguarded, reading-silent-substitution).

**2026-06-22T13:35 · Phase 2/4 — 5 parallel read-only cluster audits dispatched**
- Cluster B (graders/content), C (diagnostic/persistence/SSR), D (session/repair state machine), E (AI paths/safety), A (routes/stubs/dead-UI/a11y). All grounded in `file:line`, each re-verifying the relevant reported hypotheses.

**2026-06-22T13:40 · Cluster B (graders) returned**
- **VERIFIED CRITICAL candidate A-01:** B2 fill-in-blank `notes` = "answer — explanation" → grader expects verbatim → unwinnable.
- Translate-EN-vs-Norwegian-source hypothesis: **FALSE**. Translate-NO: sound. Mic/recourse for translation: correct.

**2026-06-22T13:45 · Cluster C (diagnostic) returned**
- Diagnostic explanation off-by-one: **NOT REPRODUCED** (frozen `answeredQuestion`).
- SSR/CSR level mismatch: **NOT REPRODUCED** (all client).
- New: **D-01** onboarding seed-write race (level can reset to A1 on fast click).

**2026-06-22T13:50 · Cluster D (session/repair) returned**
- Seed-path retry: **FIXED** (re-presents exact failed sentence). Generated-path retry: **S-01 freeze (High)**.
- New honesty gaps: S-02 (timeout→repair+SRS reset), S-03 (repair cap silent swallow), S-04 (skip=correct), S-05 (infinite skeleton soft-stall).

**2026-06-22T13:55 · Cluster E (AI safety) returned**
- Mic auto-start: **REFUTED** (gesture-gated). WebLLM null/gibberish: **REFUTED** (fallbacks + gated off).
- `confirmedRepair` single gate, only 4 verified classes move mastery: **CONFIRMED**.
- New: AI-01 (journal corrected-text shows unverified corrections as truth), AI-02/03/04 (low).

**2026-06-22T14:00 · Cluster A (routes/stubs/a11y) returned**
- **R-01 (High):** muntlig lanes (/listen,/drills,/shadow) ORPHANED — contradicts CLAUDE.md "Muntlig section links to all three".
- **E-01 (Medium ops):** `/eval` ships to prod unguarded → unauth Groq spend.
- R-02 (/reading silent below-level), R-03 (word-tap dead-end), R-04 (/analytics orphan), R-05 (a11y), R-06 (login copy). /vocab, /recalibrate, muntlig banners, landing auth label: **CONFIRMED honest**.

**2026-06-22T14:05 · Own verification — A-01 (Critical)**
- `deriveCorrectAnswer` fill-in-blank → `notes` verbatim (grade-utils.ts:21-22). Corpus scan: A1 0/121, A2 0/103, B1 0/149, **B2 182/184** annotation-shaped notes. CONFIRMED Critical with own eyes.

**2026-06-22T14:08 · Phases 5–7 written**
- `issue-registry.md` (triaged), `root-cause-map.md` (10 clusters), `diagnostic-plan.md`, `fix-plan.md` (top-10 dependency-ordered), `regression-checklist.md`. Audit deliverables complete.

**2026-06-22T14:20 · A-01 (Critical) FIXED — content migration + CI gate**
- Verified the extraction first (preview flagged 11 judgment cases: 7 legit multi-word phrase answers + 4 slash-encoded alternatives — both handled).
- Migrated 182 B2 fill-in-blank `notes` → bare answer; `/` alternatives → `accepted_answers` (e.g. `måtte/ville` → notes=`måtte`, accepted=`["ville"]`). Clean diff (file is canonical 2-space JSON). 0 still-dirty.
- Added CI gate (`fill-in-blank-integrity.test.ts`: no annotation-shaped notes). `audit:gate` AUDIT-CLEAN, 812 tests. Temp migration scripts removed. UNCOMMITTED.

**2026-06-22T16:25 · S-01 (High) FIXED — generated-content grader fallback**
- Traced the mechanism: `gradeAnswer` resolves by id (JSON/Supabase) only → generated ids resolve nowhere → null → silent freeze (TranslationExercise:87-93).
- Key evidence: the session page ships the FULL sentence map (incl. `norwegian` answers) to the client → "server-side grading for secrecy" was already void → client-side fallback leaks nothing.
- Chose conservative fix (strict improvement, seed path untouched): optional `fallbackContent` on `gradeAnswer`; 3 components pass it when `source==='generated'`. Keeps classifyError/POS_MAP server-side.
- +3 lock tests; tsc clean; `audit:gate` AUDIT-CLEAN (815 tests). UNCOMMITTED.

**2026-06-22T16:40 · R-01 (High) FIXED — Muntlig dashboard panel**
- Studied the T1.1 conductor IA first (hero = one prescribed action; practice menu behind "Mer"). Placed the new Muntlig panel INSIDE the "Mer" disclosure to avoid re-cluttering the hero.
- Added "Muntlig" sub-panel rendering real LaneTrackRow ×3 (Lytt/Uttale/Skygging) with hints + done-state; supplementary (not in the daily denominator). CLAUDE.md doc claim now true.
- Visual-QA'd 4 widths (throwaway qa-muntlig route, real LaneTrackRow on real surfaces) → screenshots saved → route deleted + .next cleared. tsc clean; `audit:gate` AUDIT-CLEAN.

**2026-06-22T16:55 · DEPLOYED — 5 commits live on pandoai.no (Rule 9)**
- Reconcile: git-reality-check clean (only own uncommitted work), HEAD=origin 0/0, server ff3a70c verified ANCESTOR of new HEAD (clean fast-forward, nothing lost). `audit:gate` AUDIT-CLEAN.
- 5 atomic commits: T1.4 root_cause (4fc8e58), A-01 fill-in-blank (82fc798), S-01 grader fallback (f4b8521), R-01 muntlig panel (afe282b), audit docs (eb188cf). Pushed a72f7b7..eb188cf.
- `deploy/deploy.sh` on VPS (fetch/reset/ci/build/pm2 reload). Server now eb188cf, pm2 online, live smoke /,/dashboard,/session = 200. The Critical (A-01) + both High (S-01, R-01) fixes are LIVE for learners.

**2026-06-22T21:00 · G-02 + S-02 (High + Medium) FIXED — non-punitive speed-round**
- Design fork (user chose "non-punitive"): a speed-round miss is unreliable (paraphrase/typo/empty timeout) → must not punish.
- submitResult exempts speed-round misses from recordFingerprintResult + repair loop (no SRS reset, no error log), advances. SpeedRound reveals the canonical answer + "Neste" instead of routing to repair. One change closes both G-02 and S-02.
- Visual-QA'd 4 widths (real SpeedRound driven to reveal via Playwright). tsc clean; audit:gate AUDIT-CLEAN.
- COMMITTED + DEPLOYED (0d598c3, live pandoai.no, Rule-9 reconciled, server=origin, smoke 200).

**2026-06-22T21:10 · Audit-fix progress summary**
- RESOLVED + DEPLOYED: A-01 (Critical), S-01 (High), R-01 (High), G-02+S-02 (High+Medium), plus T1.4.
- Remaining backlog (all Medium/Low): S-03 (repair-cap silent swallow), S-04 (skip=correct), S-05 (infinite-skeleton stall), AI-01 (journal corrected-text shows unverified corrections), E-01 (/eval unguarded — quick win), D-01 (onboarding level race), R-02 (/reading silent below-level), + Low tier. See issue-registry.md.

**2026-06-22T21:12 · Open for runtime confirmation (Phase 2 runtime not yet executed)**
- A-01 live scheduling frequency of B2 fill-in-blank; S-01 generated-retry freeze in a real session; D-01 race under fast navigation; E-01 `/eval` reachability on the live prod build. These are marked `verified (static)` / `likely` — a runtime Playwright pass would upgrade to `verified (runtime)`. Listed in `regression-checklist.md` §H.
