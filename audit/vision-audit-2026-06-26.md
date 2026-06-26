# Deep Vision Audit — NorskCoach — 2026-06-26

Read-only audit of the live system (pandoai.no @ `6ef0132`) against the project VISION:
**moat** = Diagnosis → Scheduling → Remediation; **north star** = make the learner PRODUCE/SPEAK;
**Vision Contract** = one motivating journey, not "a clutter of random Norwegian".

Method: 4 parallel code-side audit lanes (moat / north-star / pipeline-honesty / coherence — opus
read-only agents) + a live Playwright walkthrough (landing → onboarding → 12-Q diagnostic →
dashboard) at 390px on prod. Screenshots: `.claude/screenshots/vision-audit-20260626/`.

---

## The convergent meta-finding

The moat and the north star are both **real and honest at the CORE**, but they share one structural
failure and one over-claim:

1. **Speaking is orphaned from BOTH engines.** Two independent lanes converged here:
   - It feeds ~**zero diagnosis** signal (only the 4 `confirmedRepair` classes from conversation/journal/skriv reach `recentErrors`; Kari/roleplay/listen/shadow errors don't).
   - It lays **zero production brick** (the dashboard "production wall" — the headline reward — counts no speech; Kari only ever *subtracts*).
   - → The north-star behaviour ("speak") is structurally disconnected from the moat (diagnose) and from the reward (brick). The app trains diligent *typed* practice while telling the learner it builds *speaking*.

2. **The diagnosis engine under-delivers vs the UI's claim.** The steer gates at confidence ≥0.7, which only 4 dense-signature hand-coded rules reach; 5 of 8 detectable error classes never become a root cause. For a normal learner most sessions return the 0.45 fallback → the moat behaves as a competent SRS + "weakest-area" labeler, not the root-cause coach the dashboard advertises. **Live-confirmed:** a fresh B2 learner's dashboard coach line is the generic cold-start fallback, not a diagnosis.

Plus one concrete **safety breach** and a **coherence regression** at the edges.

---

## Findings by lane (severity · alignment)

### Lane 1 — MOAT (Diagnosis→Scheduling→Remediation)
- **CRITICAL · DRIFTED — steer inert in the common case.** `scheduler.ts` gates all steering on `confidence >= 0.7`; only the 4 targeted `diagnosis.ts` rules reach it, and they need dense signatures (rule 1: ≥3 article-use AND ≥2 adjective-agreement in last 50). Typical learner → 0.45 fallback → no steer → decayedScore-sorted weak concepts. *Fix:* mid-confidence band (~0.55–0.69) allowed to steer ONLY the moat-safe pools (snakk + new-material), + relax thresholds to realistic volumes.
- **HIGH · DRIFTED — 5 of 8 detectable classes orphaned.** `classify-error.ts` HIGH_CONFIDENCE has 8 classes; `DIAGNOSIS_RULES` only consume article-use+adjective-agreement, listening, word-order. pronoun-choice / modal-verb / negation-placement / compound-word / wrong-word-different-category never become a root cause. *Fix:* add a targeted single-class rule per orphaned tag.
- **HIGH · DRIFTED — speaking feeds ~zero diagnosis** (see meta-finding #1).
- **MED · BROKEN — classifier relabel leak.** observed `adjective-agreement`/`verb-tense` aren't in HIGH_CONFIDENCE → `classifyError` returns `candidateTags[0]` instead → real adjective errors under-counted, starving the flagship gender rule. *Fix:* add both to HIGH_CONFIDENCE.
- **LOW — rule 4 can't see word-order *tile* failures** (`exerciseType:'word-order'` matches neither its context nor drill bucket). **LOW — calibration only decrements on session-complete** (abandoners stay in calibration forever).
- **ALIGNED (verified):** engine constants all match docs (decay 25d/floor 35, EMA α 0.40/0.25/0.15/0.08, SRS [1,3,7,14,30], slip 30%); diagnosis IS visible + traces to a live result; Plan C snakk/new-material steer is real when it fires; "no unverified AI moves mastery" holds (except Lane 3).

### Lane 2 — NORTH STAR (produce/speak)
- **CRITICAL — the production wall is blind to all speaking.** Hero = production+guided bricks only. Kari lays no brick (only logs gated errors + mic-only minutes); roleplay/listen/shadow/drills call no `bumpDailyBrick`. A learner who speaks 20 min sees the hero move by **0**. *The exclusion is an inconsistency, not a principle* — the in-økt Snakk block already lays a `guided` brick from an identical self-rating. *Fix:* route the dedicated speaking surfaces (+ completed Kari turns) through the existing `recordSpeakingProduction` guided-brick path, gated on completion/turns (never ASR/AI grading — Rule-8-safe).
- **MAJOR — Kari only ever subtracts.** Its only fingerprint writes are an error (mastery DOWN) + the constraint verdict; typed conversation credits literally nothing. Demotivating by construction on the most "speak confidently" surface.
- **MAJOR — speaking is structurally the tail.** Coach scores `session` 100 vs `conversation` 80 / `roleplay` 65; speaking becomes the prescribed action only AFTER the økt is done. In-økt block order is `lytt → lær → snakk` (recognition first, speaking last). *Fix:* let `recommendedFocus:'production'` (already computed) steer the coach lane choice; consider a speaking warm-up.
- **MINOR — `/drills` untracked + ASR moves mastery** (no minutes, no brick, and `matchScore>=0.7` moves mastery — the "speech as judge" pattern banned elsewhere). **MINOR — reading/notebook passive** (honestly scoped, but reading ships a recognition surface with no output wrapper).

### Lane 3 — PIPELINE HONESTY / AI SAFETY
- **CRITICAL · POISON-RISK — conversation CONSTRAINT evaluator moves mastery on RAW unverified AI.** The LLM's `CONSTRAINT_MET/MISSED` self-report is parsed verbatim (`api/ai/route.ts:131-135`) and written straight to mastery (`conversation/page.tsx:215,283-285` → `updateConceptMastery`) with **no `confirmedRepair` gate**, on exactly the classes the correction path keeps show-don't-grade (`constraints.ts`: v2-word-order, adjective-agreement, negation, modal, preterite). The *same function* gates the correction yet ungates the constraint. A false `MISSED` injects a phantom weakness into the diagnosis moat silently. *Fix:* demote the constraint verdict to show-don't-grade (display feedback, credit speaking-minutes only) OR gate through the class verifier; add a Rule-8 trace test. **This is the most actionable single fix in the audit.**
- **MINOR — `/drills` below-level: no banner** (parity gap vs listen/shadow/roleplay/reading). **MINOR — auto-cloze fallback below-level: no banner.** **MINOR — static "Live" chip** in conversation setup (cosmetic; functional Sky/Maler badge is honest).
- **Otherwise HONEST:** every other traced "feeds-the-engine" surface writes real signal or is honestly display-only; AI-01/R-02 fixes confirmed live; speed-round/notebook/speaking correctly walled from mastery.

### Lane 4 — COHERENCE (Vision Contract)
- **The center holds** — the daily loop (command card → session → repair → complete) is genuinely coherent + motivating; this is no longer "a clutter of random Norwegian" *at the core*.
- **HIGH · SPRAWL — two overlapping menus of the same ~7 doors.** conversation/roleplay/journal/reading/skriv/listen/drills/shadow appear on BOTH the dashboard (lanes + muntlig tiles) AND the Snakk hub. Learner builds two mental maps. **Live-confirmed** on the dashboard walkthrough.
- **HIGH · DRIFTED — the conductor dissolves below the command card.** The 2026-06-24 redesign explicitly REVERSED the T1.1 "collapse the menu" choice ("show everything") → home is a long scroll of competing doors again. **This is a genuine PRODUCT TENSION** (Vision Contract: collapse vs the explicit recent user direction: show everything) — surface to the user, do not resolve unilaterally.
- **MED — T1.5 not done** (muntlig cluster un-laddered: flat tiles, no progression/why-this). **MED — T1.7 not done** (no unified journey vocabulary: "Samtale med Kari" / "Snakk med Kari" / "SAMTALE" for one surface).
- **LOW bugs:** `/session/complete` renders `BottomNav active="deg"` (finishing a session lights Profile, not Home); `/recalibrate` is a dead redirect route; `/analytics` duplicates `/progress` as a second status door.

---

## Prioritized fix plan

| P | Fix | Lane | Type | Effort |
|---|---|---|---|---|
| **P0** | Demote/gate the conversation **constraint** mastery write (+ Rule-8 test) | 3 | safety, clear | ~½ day |
| **P1** | **Brick speaking** via `recordSpeakingProduction` across Kari/roleplay/listen/shadow + credit typed Kari; steer coach lane by `recommendedFocus:'production'` | 2 | north-star, high-leverage | ~1 day |
| **P2** | Widen diagnosis: add the 5 orphaned high-confidence rules + a mid-confidence steer band + adjective/verb-tense → HIGH_CONFIDENCE | 1 | moat engine | ~1–2 days |
| **P3** | **Decide** show-everything vs conductor (T1.1 reversal) + plan T1.5/T1.7; quick wins: `/recalibrate` removal, `/analytics` fold, session-complete tab | 4 | product decision | discuss |
| minors | `/drills` below-level banner + reconsider ASR-moves-mastery; auto-cloze banner; static "Live" chip | 2/3 | hardening | small each |

**Rule-2 flags:** P2 (diagnosis-rule expansion) and P3 (coherence direction) are architectural/product
decisions → plan + approve before building. P0 and P1 are clear, moat-safe, and shippable directly.

**Headline:** the foundation is honest and well-built, but **speaking — the literal north star — is
decoupled from both the diagnosis and the reward**, the diagnosis engine is gated too tightly to earn
the UI's moat claim for a normal learner, and one constraint-eval path silently breaks the
"no-unverified-AI-moves-mastery" invariant. Fixing P0+P1+P2 closes the gap between what the product
claims and what the engine does.

---

## P3 — resolution + the direction decision (FOR DAVE — not decided unilaterally)

**Quick-wins (done / assessed):**
- ✅ `/recalibrate` dead route removed (`dde1c70`) — zero inbound refs; tradeoff surfaced (old bookmarks 404 instead of redirecting to `/uke`).
- ✅ Wrong-tab nav: `/session/complete` was the only genuine bug — fixed in P1 (`9d7ad8e`). The other actives match the current IA.
- ⏸️ `/analytics` vs `/progress`: **already subordinated** (both under one "Fremgang og status" heading on `/profile`, Fremgang first). No change needed.

**The real P3 decision — the coherence direction (Lane 4).** The audit found the daily loop's
*center* is coherent, but the *edges* re-cluttered: the dashboard "show everything" (your explicit
2026-06-24 T1.1 reversal) + the parallel Snakk hub list the same ~7 speaking/writing doors **twice**.
This is a product tension between the Vision Contract ("one motivating journey / collapse the menu")
and your latest direction ("show everything, design it well"). Three ways forward:

- **A — Keep show-everything as-is.** Fully honors your 2026-06-24 call; nothing hidden. Cost: the
  two-competing-menus duplication + the un-laddered muntlig cluster persist (the re-cluttered edges).
- **B — De-duplicate, keep everything visible (RECOMMENDED).** Each surface gets ONE home:
  the dashboard shows the coach-prescribed **short** plan (top 2–3 lanes — the `getCoachRecommendation`
  ranker already computes this, only the top is used today); the **full** speaking/writing catalog lives
  in the Snakk hub (one nav tap away). Nothing is hidden — it's reachable via the hub — but the home
  stops being a second full menu. Pair with **T1.5** (ladder listen/drills/shadow with a coach reason +
  progression instead of flat tiles) and **T1.7** (one journey vocabulary — unify "Samtale/Snakk med
  Kari/SAMTALE"). Keeps your "design it well, show everything" spirit while killing the clutter.
- **C — Full conductor collapse** (original T1.1). Highest coherence, but reverses your 2026-06-24
  decision entirely — you already rejected this ("show everything").

**Recommendation: B.** It resolves the only real coherence problem (duplication) without reversing
your call or hiding anything, and folds in T1.5/T1.7. It's a real frontend redesign (multi-surface,
needs the visual-QA loop), so it warrants its own planned effort — **awaiting your pick (A / B / C)
before any build.**
