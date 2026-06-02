# NorskCoach — Vision, Goal, and Execution Plan

Single source of truth for what NorskCoach is, where it's going, and what to build next. Produced 2026-05-26 from competitive research across 14+ apps, 40+ academic sources, and full project document synthesis. Supersedes scattered planning in roadmap.md for forward-looking sequencing (roadmap.md remains the historical record).

---

## The Vision (One Paragraph)

NorskCoach is a free, AI-powered Norwegian coach that knows exactly where each learner is weak, explains why those weaknesses exist, and fixes them with targeted practice across every surface — drilling, writing, speaking, reading, and conversation — unified by a weekly rhythm that makes progress visible. It is not a course. It is not a game. It is a coach. The learner's experience: "I have 5 concepts to lock in this week. Every feature in the app is helping me practice them. On Saturday I prove whether I've got them." Norwegian dominates every screen. AI powers the coaching but is never the headline. Every feature either feeds the diagnosis or is retired.

---

## The Goal (Ship-Ready Definition)

NorskCoach is ship-ready when a learner can:

1. **Get placed** — Complete the diagnostic and receive an honest, adaptive assessment
2. **Practice daily** — Run a personalized session that adapts to their weak spots (10-15 min)
3. **Write freely** — Use the journal with focus-biased prompts and AI correction
4. **Converse** — Talk with Kari (AI tutor) on a focus-biased topic with error correction
5. **Practice speaking** — Complete a focus-biased roleplay scenario with speech recognition
6. **See the week** — Dashboard shows weekly focus, progress delta, and day-dots
7. **Prove it Saturday** — Take the weekly check at `/uke` to confirm retention
8. **See their profile** — View mastery, weak spots, error patterns, and level

AND:

9. **Hear Norwegian** — At least one surface plays real Norwegian audio (not browser TTS)
10. **Auth works** — Authenticated users sync fingerprint to Supabase; magic-link tested end-to-end
11. **No lies** — Zero placeholder surfaces, zero silent substitutions, zero dead buttons
12. **Tests pass** — Full test suite green, build clean, deployed to pandoai.no

Items 1-12 are DONE — deployed and live at pandoai.no (Hetzner VPS); Supabase keys rotated 2026-05-29.

---

## The Moat (Ranked)

| Leg | Strength | What makes it unbeatable |
|---|---|---|
| **Diagnosis** | STRONGEST | Per-concept fingerprint, 4 root-cause rules, 17-tag error taxonomy. No competitor does this. Deepen with more rules, cross-surface pattern detection, L1-interference diagnosis. |
| **Scheduling** | STRONG | 40/30/20/10 recipe, SRS ladder, weekly focus bias, decay with floor. Upgrade path: FSRS-7 (20-30% efficiency gain, requires usage data). |
| **Remediation** | FOUNDATIONAL | Template explain + micro-drill + retry + SRS schedule. Externalized queue-only from all production surfaces. Upgrade path: richer explanations, more drill variety, prove it works via analytics. |

The moat is an architectural bet until proven. **The analytics surface is the way to prove it.** Event logging writes exist, and the analytics surface v1 (`/analytics`, Wave 2) now reads them; proving the moat still requires real-user data.

---

## Dependency Map

```
Legend: ──▶ hard dependency (must exist before)
        ···▶ soft dependency (benefits from but doesn't require)

┌─────────────────────────────────────────────────────────────────┐
│ FOUNDATION (all shipped)                                        │
│ • Adaptive engine (fingerprint, mastery, SRS, decay)           │
│ • Session loop + repair loop                                    │
│ • Weekly sprint (focus selection, scheduler bias, graduation)   │
│ • All surfaces laned (Stream 5.5 complete)                     │
│ • Diagnosis engine (4 rules)                                    │
│ • AI validity gate                                              │
│ • Event logging writes                                          │
└─────────────────────────────────────────────────────────────────┘
        │
        ├──▶ AUTH COMPLETION ─────────────────────────────────────┐
        │    Magic-link test, prod env vars, Supabase callback    │
        │    Blocker: 3 manual user actions                       │
        │    No code blocked; purely operational                  │
        │                                                         │
        ├──▶ NB-LLAMA-1B COMPILE (Stream 1.1 Step 2) ──────────┐│
        │    MLC compile pipeline → WebGPU WASM → custom config  ││
        │    Effort: half-day pipeline                           ││
        │    Unblocks: higher-quality AI on all surfaces         ││
        │                                                        ││
        ├──▶ ANALYTICS SURFACE (Stream 1.4 reads) ··············▶│PROVE THE MOAT
        │    First dashboard against learning_events_log          ││
        │    Soft dep: needs real users for interesting data      ││
        │    But: can build the surface now with dev data         ││
        │                                                        ││
        ├──▶ AUDIO INFRASTRUCTURE ──────────────────────────────┐││
        │    edge-tts batch pipeline + static asset hosting      │││
        │    Effort: 1-2 days                                    │││
        │    Unblocks: ALL muntlig modes                         │││
        │         │                                              │││
        │         ├──▶ LISTENING RESTRUCTURE                     │││
        │         │    Real audio playback (not text-rendered)    │││
        │         │    Weekly focus bias on question selection    │││
        │         │    Effort: 1 day                             │││
        │         │                                              │││
        │         ├──▶ SHADOWING MODE                            │││
        │         │    Listen → repeat → self-compare            │││
        │         │    Simplest muntlig mode; proves pipeline    │││
        │         │    Effort: 1-2 days                          │││
        │         │                                              │││
        │         ├──▶ PRONUNCIATION DRILLS                      │││
        │         │    Reuses audio + heuristic table            │││
        │         │    Effort: 1 day                             │││
        │         │                                              │││
        │         └──▶ LISTEN-AND-RESPOND                        │││
        │              Audio prompt → spoken/typed answer         │││
        │              Effort: 1-2 days                          │││
        │                                                        │││
        ├──▶ SURFACE DISPOSITION ────────────────────────────────┘││
        │    /listen: mute or give focus bias lane                ││
        │    /drills: mute or build                               ││
        │    Decision: dependent on audio infra timing            ││
        │                                                         ││
        ├──▶ UI-1.3 DASHBOARD COMPOSITION ························│
        │    Dead button cleanup, WeekStrip integration,          │
        │    lane visibility ("3 of 5 lanes practiced today")     │
        │    Can run parallel with audio infra                    │
        │                                                         │
        ├──▶ UI-2 REMAINING SCREENS ······························│
        │    Conversation, Progress, Landing                      │
        │    Can run parallel with audio infra                    │
        │                                                         │
        ├──▶ B1/B2 CONCEPT GRAPH + CORPUS ───────────────────────┘│
        │    Content authoring (10 B1 concepts minimum)            │
        │    Depends: stable A1/A2 foundation (done)               │
        │    Unblocks: honest level switching                      │
        │                                                          │
        └──▶ V2 ENGINE UPGRADES ──────────────────────────────────┘
             FSRS-7, BKT, adaptive decay, DKT
             All require real usage data
             Blocked by: analytics surface + real users
```

---

## Execution Plan (Dependency-Ordered)

### Wave 0: Ship Blockers (DO FIRST — inline, sequential)

These items must complete before inviting real users. Each is small.

| # | Item | Effort | Depends on | Status |
|---|---|---|---|---|
| 0.1 | **CLAUDE.md sync** — update Current Phase to reflect Stream 5.5 complete | 15 min | Nothing | ✅ DONE 2026-05-26 |
| 0.2 | **Auth completion** — magic-link click, NEXT_PUBLIC_APP_URL, Supabase callback | User actions | Nothing | ⏳ Pending user |
| 0.3 | **Surface disposition** — mute `/listen` and `/drills` on dashboard | 30 min | Nothing | ✅ DONE 2026-05-26 |
| 0.4 | **F027 repair-loop cap** — cap session at 2x original size | 30 min | Nothing | ✅ DONE 2026-05-26 |
| 0.5 | **NB-Llama-1B compile** (Stream 1.1 Step 2) — MLC compile pipeline | Half day | Nothing | Queued |

### Wave 1: Audio Foundation (THE GATE — one track, depth-first)

Audio infrastructure is the single hardest dependency. Everything in the muntlig module depends on it. Build it as a standalone phase with one test sentence before building any mode UI.

| # | Item | Effort | Depends on | Status |
|---|---|---|---|---|
| 1.1 | **Audio pipeline proof-of-concept** — AudioPlayer component + batch script + 784 MP3s generated | 1 day | Nothing | ✅ DONE 2026-05-26 |
| 1.2 | **Batch audio generation** — 784 MP3s for A1/A2/B1 corpus + listen + drills via edge-tts | 1 day | 1.1 | ✅ DONE 2026-05-26 |
| 1.3 | **Listening restructure** — `/listen` live with focus-biased question ordering, lane completion | 1 day | 1.2 | ✅ DONE 2026-05-26 |
| 1.4 | **Shadowing mode** — `/shadow` live with B1 corpus, lane completion | 1-2 days | 1.2 | ✅ DONE 2026-05-26 |
| 1.5 | **Pronunciation drills** — `/drills` live with 4 sound groups, heuristic feedback, lane completion | 1 day | 1.2 | ✅ DONE 2026-05-26 |
| 1.6 | **Listen-and-respond** — `/listen` with timer, speech recognition, fingerprint recording | 1-2 days | 1.2, 1.5 | ✅ DONE 2026-05-26 |

### Wave 2: Prove the Moat (CAN RUN PARALLEL with Wave 1)

The analytics surface is the only way to prove the diagnostic coaching intelligence works. It doesn't depend on audio.

| # | Item | Effort | Depends on | Status |
|---|---|---|---|---|
| 2.1 | **Analytics surface v1** — `/analytics` with 3 read-only metrics: total events, top 5 error tags, avg retention | 2-3 days | Nothing | ✅ DONE 2026-05-26 |
| 2.2 | **Moat metric definition** — **Defined:** "Concepts with 3+ repair-loop entries show ≥20% higher day-7 retention (decayedScore/rawScore) than concepts with 0 repairs at matched attempt counts." Secondary: "Mean sessions-to-graduation for repaired concepts vs. unrepaired." Requires 50+ users with 4+ weeks of data to be statistically meaningful. | 1 hour | 2.1 | ✅ DEFINED |
| 2.3 | **Fingerprint history cap** — `HISTORY_CAP = 26` already in `closeWeek` (line 37 of weekly-sprint.ts). `learning_events_log` retention TBD when data volume warrants it | 1 hour | Nothing | ✅ DONE (already shipped) |

### Wave 3: UI Polish (CAN RUN PARALLEL with Waves 1-2)

These don't depend on audio or analytics. They can run alongside.

| # | Item | Effort | Depends on | Status |
|---|---|---|---|---|
| 3.1 | **UI-1.3 dashboard composition** — dead buttons removed, lane strip added, Norwegian text, visual hierarchy reordered | 1-2 days | Nothing | ✅ DONE 2026-05-26 |
| 3.2 | **UI-2 conversation page** — aesthetic pass matching session loop | 1 day | 3.1 | ✅ DONE 2026-05-26 |
| 3.3 | **UI-2 progress page** — phase distribution bar + weekly sprint history, all Norwegian | 1 day | 3.1 | ✅ DONE 2026-05-26 |
| 3.4 | **UI-2 landing page** — Norwegian-first, direct CTA, lane model preview | 1 day | 3.1 | ✅ DONE 2026-05-26 |
| 3.5 | **UI-3 cleanup** — dead nc-* classes removed, focus-visible rings, Lighthouse pass | Half day | 3.4 | ✅ DONE 2026-05-26 |

### Wave 4: Content Expansion (AFTER Waves 0-1)

| # | Item | Effort | Depends on | Parallel? |
|---|---|---|---|---|
| 4.1 | **B1 concept graph** — 12 concepts, CEFR-tagged, with A2 prerequisites. Starter corpus: 25 sentences (5 concepts × 5). 4 pages migrated to `getGraphForLevel`. | 2-3 days | Stable A1/A2 (done) | ✅ DONE 2026-05-26 |
| 4.2 | **B1 sentence corpus** — 360 sentences (30 per concept × 12), error-tagged, mixed exercise types | 3-5 days | 4.1 | ✅ DONE 2026-05-26 |
| 4.3 | **B1 audio generation** — 360 MP3s via edge-tts for all B1 sentences | 1 day | 4.2, Wave 1 | ✅ DONE 2026-05-26 |
| 4.4 | **Honest level switching** — B1 selection produces real B1 content | 1 day | 4.2 | ✅ DONE 2026-05-26 |
| 4.5 | **B2 concept graph** — 12 concepts, CEFR-tagged, with B1 prerequisites | 1 day | 4.4 | ✅ DONE 2026-05-26 |
| 4.6 | **B2 sentence corpus** — 360 sentences (30 per concept × 12), error-tagged, mixed exercise types | 1 day | 4.5 | ✅ DONE 2026-05-26 |
| 4.7 | **B2 audio generation** — 360 MP3s via msedge-tts (Node.js) for all B2 sentences | 1 day | 4.6 | ✅ DONE 2026-05-27 |
| 4.8 | **CEFR sentence filter** — `filterSentencesByLevel` in scheduler prevents cross-level leakage | 30 min | 4.6 | ✅ DONE 2026-05-27 |
| 4.9 | **Market-readiness hardening** — error boundaries, loading states, security headers, API rate limiter, credentials cleanup | 1 day | All | ✅ DONE 2026-05-27 |

### Wave 5: V2 Engine (REQUIRES REAL USERS + DATA)

| # | Item | Effort | Depends on | Parallel? |
|---|---|---|---|---|
| 5.1 | **FSRS-7 migration** — replace fixed SRS ladder with adaptive D/S/R per concept | 2-3 days | Usage data (100+ users) | After Waves 0-2 |
| 5.2 | **Adaptive per-user decay** — personalized half-life per user and item | 2 days | Usage data | After 5.1 |
| 5.3 | **BKT migration** — replace EMA with Bayesian Knowledge Tracing | 3-5 days | Usage data, 5.1 | After 5.1 |
| 5.4 | **More diagnosis rules** — cross-surface pattern detection, L1-interference | 2-3 days | Analytics surface (Wave 2) | After 2.1 |
| 5.5 | **Kari session memory** — inject compressed memory of past conversations into system prompt | 1-2 days | Nothing | Anytime |

### Wave 6: Content Depth & Production (ACTIVE — 2026-06-01)

Direction set in `docs/ui-1/frontend-representation-brief.md` (engine representation) and the cloze spec below. **Honesty note:** building net-new exercise surface was an explicit user decision that overrode the architect's depth-not-breadth defer (Operating Rule 1) — recorded here so the deviation is visible.

| # | Item | Status |
|---|---|---|
| 6.1 | **Mobile content-supply honesty** — exhausted non-review items show an honest `isReviewFallback` "Repetisjon" badge instead of silently recycling passed content | ✅ DONE 2026-06-01 (commit 8878b9e) |
| 6.2 | **Onboarding honesty** — removed fabricated demo data, fake status strip, and the static dashboard "Tips" tile | ✅ DONE 2026-06-01 (commit 08e8414) |
| 6.3 | **Cloze passage** — first discourse-level pushed-output exercise; per-gap fingerprint + repair (Rule 8); non-AI v1. Spec: `docs/superpowers/specs/2026-06-01-cloze-passage-design.md` | IN DESIGN → implementation plan next |
| 6.4 | **Server-side AI content generation** — wire `generate` action in `/api/ai` + `ServerAIService.generateContent` through the validation gate; unblocks mobile top-up + AI-generated cloze passages | DEFERRED (rate-limiter budget TBD when built) |
| 6.5 | **Frontend representation waves** — make the engine visible (session agenda, fingerprint home, weekly rhythm, level-up); 3-wave plan in the representation brief | PLANNED (gated on architect sign-off) |

#### Exercise-system recalibration (2026-06-01, user-approved, architect-reviewed)

A corpus audit found the app declares 10 `ExerciseType` values but only 6 are real (translation ×2, fill-in-blank, word-order, listening-comprehension, speed-round). Full analysis + evidence: `.scout/2026-06-01-exercise-system-recalibration.md`. **Earned-place test:** a type stays only if it adds an error signal an existing type doesn't OR pushes genuine production, AND traces a real fingerprint write. Sequencing locked to **R0 → cloze (6.3) → R1**.

| # | Item | Decision | Status |
|---|---|---|---|
| 6.6 | **R0 — phantom honesty** — `sentence-transformation` + `dictation` silently render as Translation/Listening (latent Rule-6 bug). `dictation` ≡ `listening-comprehension`. | Route both fallbacks to the honest `NotYetAvailable` banner (reversible; preserves option). Do FIRST, before cloze — R1 could trip the latent bug. | ✅ DONE 2026-06-01 — ExerciseCard.tsx switch + NOT_YET_LABELS map; tsc clean; no type routes to a wrong renderer |
| 6.7 | **R1 — B1/B2 content-gap fill** — re-tag B1/B2 sentences with `listening-comprehension` + `speed-round` (audio + TTS already exist; tagging only, no authoring). | Acceptance = fingerprint pre/post diff in a real session (Rule 8 / roadmap.md:25), NOT "tag appears." Runs AFTER cloze. | APPROVED — not started |
| — | **free-writing** | **CUT** (keep honest banner) — the journal already does focus-biased free writing + AI correction. A 2nd free-writing surface = duplicate surface, no new signal. | Rejected |
| — | **reading-comprehension** | **DEFER** (keep honest banner) — recognition-heavy, weakest north-star fit. | Backlog |
| — | **sentence-transformation as a real distinct exercise** | **DEFER to backlog** — building it is a 2nd breadth exception beside cloze. Needs its own explicit Rule-1 override + feature-challenger pass before it can become a sequenced step. Highest unbuilt diagnostic value, but that's also its biggest tell. | Backlog (architect-blocked from sequence) |

#### Exercise-structure roadmap — fit to vision (2026-06-02)

**Course unchanged.** The moat (Diagnosis → Scheduling → Remediation) and the north star (production + speaking) remain the spine. The B1/B2 exercise structures below are **substrate ranked only by how much each strengthens those** — never breadth for its own sake. They pass through the same earned-place test (adds a diagnosis signal an existing type can't, OR pushes genuine production, AND traces a real fingerprint write — Rule 8). Sequencing stays **behind the Move-2 engine + honesty fixes**, one type at a time, each linguist-gated. Sources: `docs/per-level-progression-proposal.md`, `output/b2-exercise-types-design.md`, `output/b1b2-corpus-gap.md`.

**The recognition anomaly (why the B2 mix must shift):** B2 is currently 116 `translation-to-english` (recognition) vs 83 production — backwards for a level whose development area is production + lexical nuance. The roadmap **rebalances B2 scheduling weight away from English-translation recognition toward the production structures below** as they land. No content is deleted; new structures displace it in selection weight.

| Rank | Structure | Level | Earns its place because | Verdict |
|---|---|---|---|---|
| 1 | **Cloze passage** (item 6.3) | B1→B2 | New discourse-level pushed-output; per-gap observed-error tags. Highest content leverage — **0 passages exist at B1/B2**. | BUILD FIRST (already in design) |
| 2 | **Guided one-sentence production** from a paragraph | B1 | Strongest north-star fit — Swain "pushed output" in a gradeable frame; deterministic-diff error tags (word-order/tense/article) feed diagnosis. **Rescues reading by attaching production.** | BUILD — pair with #4 |
| 3 | **Nuance-discrimination** + **conjugation-drill** (B2 track) | B2 | The genuine B2 development area: new lexical signal (`wrong-word-same-category` at nuance) + morphology signal (`verb-conjugation` across the infinitiv→presens→preteritum→perfektum ladder). Approved. Nuance first (cheapest, reuses submitResult), conjugation second. | BUILD (approved) |
| 4 | **Single-paragraph reading + Nor→Nor comprehension** | B1 (→ multi-para B2) | Adds a diagnosis signal sentence-level types can't: main-idea vs detail vs inference vs reference. **Supersedes the earlier `reading-comprehension` DEFER** — that deferral was "recognition-heavy / weak north-star"; bundling #2's production question changes the verdict. Pure-recognition reading alone stays deferred. | BUILD reading+production as ONE unit; multi-para B2 backlog until the frame proves out |
| 5 | **Nor→Nor transformation** (tense shift, statement→question, connector swap) | B1→B2 | Strong structural-control diagnosis signal, deterministic-diff-friendly; semi-production. **= reviving `sentence-transformation`** with the production angle — the Rule-1 override is now explicitly granted on these grounds. | BUILD after #2 (shares the diff classifier) |
| — | **Structured short writing** | B2 | Production, but overlaps the journal (focus-biased free writing + AI repair — `free-writing` was CUT for exactly this duplication). | DEFER — revisit only as an occasional B2 weekly-sprint capstone |

**Hard gate (unchanged):** no row above starts before Move-2 (journal-mastery verify, B1/B2 silent-degradation banner, phantom cleanup) + the diagnosis fixes land. Every row's content runs content-author → **norwegian-linguist (blocking)** → finalize-deepen → seed. **More single-sentence translation/fill-in-blank volume is explicitly NOT on this roadmap** — it lengthens time-to-exhaustion without serving the moat or production (a "longer A1", which fails the north-star test).

**What changed vs the prior Wave-6 decisions (honest delta):** only two items' verdicts moved, and only on the new production-attached grounds above — `reading-comprehension` (DEFER → BUILD, *bundled with production*) and `sentence-transformation` (backlog → sequenced *after #2*, Rule-1 override granted). Everything else (spine, gate, free-writing CUT, one-at-a-time, linguist-blocking) is unchanged.

---

## Parallel Execution Map

```
TIME ──────────────────────────────────────────────────────▶

Wave 0: [0.1 CLAUDE sync][0.3 surface mute][0.4 repair cap][0.5 NB-Llama compile]
         └── 0.2 auth (user actions, async) ──────────────────────────▶

Wave 1: [1.1 audio POC]──▶[1.2 batch gen]──▶[1.3 listening ║ 1.4 shadowing]──▶[1.5 pronunciation]──▶[1.6 listen-respond]

Wave 2:                    [2.1 analytics surface]──▶[2.2 moat metric]
                           [2.3 history cap]

Wave 3:                    [3.1 dashboard]──▶[3.2 conversation UI ║ 3.3 progress UI]──▶[3.4 landing]──▶[3.5 cleanup]

Wave 4:                                      [4.1 B1 graph]──▶[4.2 B1 corpus]──▶[4.3 B1 audio]──▶[4.4 level switch]

Wave 5: ─────────────────────────────────────────────────── (blocked until real users + data) ──────▶
```

**Maximum parallelism:** Waves 1, 2, and 3 can all run simultaneously. Wave 0 items are quick and can start immediately. Wave 4 starts when Wave 1 audio pipeline is proven. Wave 5 is blocked on real users.

---

## Open Decisions (Need User)

1. **When to ship?** — Items 1-8 of ship-ready are done. Items 9-12 are the question. Ship now with text-only (no audio), or wait for Wave 1 audio? Recommendation: ship now with `/listen` and `/drills` muted; add audio in a fast follow.

2. **Muntlig deepening (A) vs. B1/B2 corpus (E)?** — Research says audio infrastructure (Wave 1) comes first regardless, because both options need it. Build audio pipeline first, then decide.

3. **NoCoLA license** — 144K Norwegian sentences, perfect for content seeding. License unconfirmed. Contact LTG Oslo (Matias Jentoft, David Samuel) before using.

4. **chatterbox-tts-norwegian license** — Best Norwegian TTS quality. Non-commercial educational use clause. Confirm with author (akhbar on HuggingFace) that NorskCoach qualifies.

5. **NB-Whisper in-browser** — Tiny model (39M params, 31MB quantized) could theoretically run in-browser via Transformers.js. Needs a 15-minute practical test before committing.

---

## Anti-Patterns (From Project History)

These caused real problems. Do not repeat:

1. **Breadth before depth** — Adding feature surface while foundations are open
2. **Silent substitution** — Making features appear to work when they don't
3. **Pipeline dishonesty** — Claiming a surface feeds the engine without tracing the write
4. **Self-approval** — Building and reviewing in the same context
5. **Assuming it works** — Declaring completion without concrete verification
6. **Chaining unprompted** — Starting the next task without finishing and verifying the current one
7. **English in Norwegian UI** — Breaking the "Norwegian dominates" principle on learning surfaces
