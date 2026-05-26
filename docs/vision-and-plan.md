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

Items 1-8 are DONE. Items 9-12 are the remaining ship blockers.

---

## The Moat (Ranked)

| Leg | Strength | What makes it unbeatable |
|---|---|---|
| **Diagnosis** | STRONGEST | Per-concept fingerprint, 4 root-cause rules, 17-tag error taxonomy. No competitor does this. Deepen with more rules, cross-surface pattern detection, L1-interference diagnosis. |
| **Scheduling** | STRONG | 40/30/20/10 recipe, SRS ladder, weekly focus bias, decay with floor. Upgrade path: FSRS-7 (20-30% efficiency gain, requires usage data). |
| **Remediation** | FOUNDATIONAL | Template explain + micro-drill + retry + SRS schedule. Externalized queue-only from all production surfaces. Upgrade path: richer explanations, more drill variety, prove it works via analytics. |

The moat is an architectural bet until proven. **The analytics surface is the only way to prove it.** Event logging writes exist; nothing reads them yet.

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
| 1.1 | **Audio pipeline proof-of-concept** — AudioPlayer component built (browser TTS fallback), batch generation script at `scripts/generate-audio.mjs` (edge-tts + nb-NO-PernilleNeural). Script not yet run — needs `pip install edge-tts` | 1 day | Nothing | ✅ Component + script DONE; generation pending |
| 1.2 | **Batch audio generation** — generate audio for all A1/A2 corpus sentences via edge-tts, keyed by sentence ID | 1 day | 1.1 | No — feeds 1.3+ |
| 1.3 | **Listening restructure** — `/listen` plays real audio, focus-biased question selection, proper lane wiring | 1 day | 1.2 | Parallel with 1.4 |
| 1.4 | **Shadowing mode** — listen → repeat → self-compare with playback | 1-2 days | 1.2 | Parallel with 1.3 |
| 1.5 | **Pronunciation drills** — targeted audio + heuristic feedback | 1 day | 1.2 | After 1.3 or 1.4 |
| 1.6 | **Listen-and-respond** — audio prompt → spoken/typed answer with timer | 1-2 days | 1.2, 1.5 | After 1.5 |

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
| 3.2 | **UI-2 conversation page** — aesthetic pass matching session loop | 1 day | 3.1 | Queued |
| 3.3 | **UI-2 progress page** — phase distribution bar + weekly sprint history, all Norwegian | 1 day | 3.1 | ✅ DONE 2026-05-26 |
| 3.4 | **UI-2 landing page** — conversion-focused with clear value prop | 1 day | 3.1 | Queued |
| 3.5 | **UI-3 cleanup** — dead nc-* classes, Lighthouse pass | Half day | 3.4 | Queued |

### Wave 4: Content Expansion (AFTER Waves 0-1)

| # | Item | Effort | Depends on | Parallel? |
|---|---|---|---|---|
| 4.1 | **B1 concept graph** — 12 concepts, CEFR-tagged, with A2 prerequisites. Starter corpus: 25 sentences (5 concepts × 5). 4 pages migrated to `getGraphForLevel`. | 2-3 days | Stable A1/A2 (done) | ✅ DONE 2026-05-26 |
| 4.2 | **B1 sentence corpus** — 360 sentences (30 per concept × 12), error-tagged, mixed exercise types | 3-5 days | 4.1 | ✅ DONE 2026-05-26 |
| 4.3 | **B1 audio generation** — edge-tts batch for B1 corpus | 1 day | 4.2, Wave 1 | After 4.2 |
| 4.4 | **Honest level switching** — B1 selection produces real B1 content | 1 day | 4.2 | After 4.2 |

### Wave 5: V2 Engine (REQUIRES REAL USERS + DATA)

| # | Item | Effort | Depends on | Parallel? |
|---|---|---|---|---|
| 5.1 | **FSRS-7 migration** — replace fixed SRS ladder with adaptive D/S/R per concept | 2-3 days | Usage data (100+ users) | After Waves 0-2 |
| 5.2 | **Adaptive per-user decay** — personalized half-life per user and item | 2 days | Usage data | After 5.1 |
| 5.3 | **BKT migration** — replace EMA with Bayesian Knowledge Tracing | 3-5 days | Usage data, 5.1 | After 5.1 |
| 5.4 | **More diagnosis rules** — cross-surface pattern detection, L1-interference | 2-3 days | Analytics surface (Wave 2) | After 2.1 |
| 5.5 | **Kari session memory** — inject compressed memory of past conversations into system prompt | 1-2 days | Nothing | Anytime |

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
