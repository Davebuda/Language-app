# Unified Read → Recite → Write Flow — Decision-Grade Design Spec

**Date:** 2026-06-02
**Status:** Design — analysis only, no code. Pending user review + architect sign-off (new write path + Rule-1 override, as cloze/read-respond required).
**Type:** Fuses three existing modules — **lese** (reading), **snakk/muntlig** (speaking), **skriv** (writing) — onto **ONE level-scaled Norwegian passage**: the learner READS it, RECITES it aloud, then WRITES an opinion on it.

**Reuses, does not redo:** `output/skriv-readwrite-design.md` (the read→write half — per-level passage lengths, 3-tier honest grading, `content/reading/{level}.json`, `recordProductionFromSurface` engine helper). This spec **adds the RECITE middle step** and the **cross-module + daily/weekly integration**.

---

## 0. TL;DR — the recommendation (rank-ordered)

1. **Build it as the read→recite→write extension of the already-specced `read-respond` type — ONE passage, three steps, one fingerprint write per step.** Not a new exercise type beyond `read-respond`; the recite step is a third *page* inside the same flow. (§1)
2. **The three steps write three honest bricks from one passage:** READ → comprehension/exposure brick; RECITE → `speakingMinutesTotal` + a self-reported recognition brick (NEVER ASR-as-judge); WRITE → deterministic production brick (+ AI error bricks when up). All three already have a precedent write path in the codebase. (§2, §3)
3. **RECITE is self-report + word-match assist, honestly.** The browser ASR bag-of-words score (`speechMatchUtils.ts:28`) is an **assist that colours which words were heard** — it is shown, but it is **NOT** the grade. The learner self-reports "I said it" / "that was hard." Non-mic fallback: read aloud + self-report only. This mirrors the N1 critic verdict already baked into `/shadow`. (§2)
4. **The core ask — holistic compounding:** **3 distinct bricks, not 1 composite.** Each lands on the daily wall as its own tile (read · recite · write), and the three roll into ONE weekly-sprint signal differentiated per level (A1 foundations-touched / B1 production-gap↓ / B2 lexical-range). Bricks feed `runDiagnosis` via the WRITE step's real error-tags (the only step that produces *new* error signal) plus the RECITE step's listening/pronunciation recognition signal. Daily/weekly math in §4.
5. **Recite-scope: ship MINIMAL-HONEST v1** (self-report + word-match assist, reusing `ShadowingExercise` verbatim — zero new engine). Do **not** make this flow the vehicle for "full N1 speaking-in-loop" — that is a separate, larger bet that belongs after this frame proves out. Reasoning in §5.
6. **Content cost: one passage serves 3 skills, so a B1 week needs ~5–7 passages** (not 15–21 single-skill items). Authoring + linguist-gate pipeline in §6.
7. **Minimal shippable v1 = B1, all three steps, ~6 authored passages, standalone `/skriv` flow.** Build checklist + open decisions in §7.

This is **Wave-6 rows #2 + #4 fused with the muntlig spine** — it does not add surface; it *unifies three thin surfaces* (`/reading` pure-recognition, `/shadow` recite-only, journal AI-down-no-op) into one production-anchored loop. Every step traces a real fingerprint write (Rule 8) and every step has a non-AI fallback (CLAUDE.md tech-stack rule).

---

## 1. Per-level shape — read → recite → write on ONE passage

Passage length **reuses read-respond unchanged** (`skriv-readwrite-design.md` §1 table). The recite step inserts between read and write. The recite scope (how much of the passage is recited) scales with level so it never becomes a memorisation chore.

| Level | READ (reuse) | RECITE (new middle) | WRITE (reuse) |
|---|---|---|---|
| **A1** | 3–5 short lines (~40–60 words), <8 w/sentence | **recite 1 line** (learner picks or first line) — listen + repeat one sentence | **1 guided frame** `Jeg liker ___ fordi ___.` |
| **A2** | ~2 paragraphs (~90–130 words), ≤12 w/sentence | **recite 2 key sentences** (the passage's topic sentences) | **2–3 sentences**, frame optional |
| **B1** | ~4–5 paragraphs (~200–320 words), ≤18 w | **recite 1 chosen paragraph's lead sentences** (2–3) | **short paragraph (4–6 sentences)**, ≥1 connector |
| **B2** | ~8–9 paragraphs (~450–650 words), complex syntax | **recite the thesis sentence + read the rest aloud** (self-report) | **developed paragraph (8–10 sentences)**, argue + counterpoint |

**Why recite scope shrinks relative to read length:** reciting an entire B2 9-paragraph passage is rote memorisation, not production — it fails the north star (CLAUDE.md: "a pure-recognition feature fails this test unless wrapped with an output requirement"; reciting *back* a long text is recognition, not construction). So recite stays **bounded to the highest-value sentence(s)** (thesis / topic sentences) and the WRITE step carries the real production load. Recite's job is **phonological activation + speaking-minutes accrual + a bridge from passive read to active write** — not a comprehension or production *judge*.

**Flow rationale (read → recite → write is the right order):** read builds the comprehension anchor; reciting the key sentence *aloud* primes the phonological loop and the target vocabulary before the learner must produce their own opinion; writing then reuses the just-spoken words. This is the integrated reading-into-writing construct (`skriv-readwrite-design.md` sources) with a **spoken rehearsal** inserted — a documented L2 production scaffold (rehearsal before output).

---

## 2. The RECITE step — honest (the N1 critic verdict, codified)

The recitation machinery **already exists and is already honest** — `ShadowingExercise.tsx` + `speechMatchUtils.ts`. This spec reuses it; it does not rebuild it.

### 2.1 What recite does and does NOT do

- **Plays** the sentence audio (`sentence.audioUrl`, `ShadowingExercise.tsx:100-108`) — or a no-audio "Tekst-modus — les setningen høyt" banner when audio is missing (`ShadowingExercise.tsx:155-166`).
- **Records** the learner via `useSpeechRecognition` (browser Web Speech API) when supported.
- **Colours** which words the ASR heard (`computeWordMatches`, `speechMatchUtils.ts:19`) — green = heard, muted = not heard (`WordColorDisplay`).
- **Does NOT** treat the bag-of-words score (`computeMatchScore`, `speechMatchUtils.ts:28`) as the grade. It is a **visual assist only**. The browser ASR is unreliable on Norwegian phonemes (æ/ø/å, retroflex, tonal accent) — using it as judge would be a Rule-6/Rule-8 violation (a UI claiming "you pronounced this correctly" when the engine cannot honestly know).

### 2.2 The honest grade: SELF-REPORT, never ASR-as-judge

After the recite attempt, the learner sees the word-colour assist and **self-reports** with one tap:

- **"Jeg sa det"** (I said it) → records a *recognition/attempt* brick (correct attempt on the passage's `primaryConceptId`, exercise type `listening-comprehension` — the same tag `/shadow` uses, `ShadowingScreen.tsx:83` uses `'listening-recognition'`).
- **"Det var vanskelig"** (that was hard) → records an *attempt* brick that nudges toward review without claiming mastery (a wrong/struggling attempt — honest negative signal, queues lighter review, NOT a hard repair).

This is exactly the `/shadow` honesty stance: `ShadowingScreen.tsx:72` already derives `correct = matchScore >= 0.7` from the word-match *as a proxy*, then records it. **This spec is stricter and more honest: it replaces the silent ASR-threshold-as-truth with explicit self-report**, because the bag-of-words proxy is a real Rule-8 soft spot (it can mark a fluent learner "wrong" on an ASR miss, or a mumbler "right" on a lucky match). The word-colour stays as an assist; the *brick* comes from the human.

### 2.3 The exact fingerprint write (Rule 8 trace)

Two writes per recite attempt, both with existing precedent:

```
RECITE attempt complete (self-report tap)
 │
 ├─ WRITE 1 — speaking minutes (precedent: ListenRespondScreen.tsx:122-132,
 │   RoleplayScreen.tsx:553, conversation/page.tsx:294):
 │     fp.speakingMinutesTotal += recitedSentences * (estSecondsPerSentence / 60)
 │     (A1 ~1 sentence ≈ 0.1 min; B1 ~3 sentences ≈ 0.3 min) — honest, mic-active time only
 │     → setFingerprint + saveFingerprint + (auth) saveFingerprintToSupabase
 │
 └─ WRITE 2 — recognition brick via recordResult (precedent: ShadowingScreen.tsx:74-86):
       ExerciseResult {
         conceptId: passage.primaryConceptId,
         correct: selfReport === 'said-it',        // self-report, NOT matchScore
         errorTag: selfReport === 'hard' ? 'listening-recognition' : undefined,
         userAnswer: transcript ?? '',             // the ASR transcript, for the log only
         correctAnswer: recitedSentence,
         sentenceId: passage.id + ':recite',
         exerciseType: 'listening-comprehension',
       }
       → useFingerprint.recordResult (useFingerprint.ts:272) updates mastery EMA,
         logs error if struggling, recomputes productionGap.
```

**Non-mic fallback (mandatory, CLAUDE.md):** when `!isSupported` (`ShadowingExercise.tsx:190`) or mic denied, the step degrades to **"read the sentence aloud, then tap 'Jeg sa det'"** — no recording, self-report only. `speakingMinutesTotal` still accrues (the learner *did* speak; we just couldn't capture audio). The recognition brick still writes. This is the honest floor: the speaking-minutes metric must not silently require a mic the user doesn't have.

### 2.4 No score number on recite

The recite result panel shows the **word-colour assist** and the two self-report buttons. It does **not** show "78%". A percentage implies the ASR judged the pronunciation; it didn't. (This is a deliberate honesty *upgrade* over `/shadow`, which currently does show `scorePercent`, `ShadowingExercise.tsx:125,303-305` — flag the `/shadow` percentage as a separate latent Rule-8 question, do not fix it here; §7 open decisions.)

---

## 3. READ and WRITE bricks (reuse read-respond)

Both reuse `skriv-readwrite-design.md` §2 unchanged. Summarised for the holistic-compounding math (§4):

### 3.1 READ brick — comprehension/exposure signal
- On "Les ferdig →": `recordExposure(passage.conceptIds)` (`useFingerprint.ts:411`) — increments `attemptCount` by 0.3 per exposed concept, **no mastery change** (exposure is not a mastery signal, `useFingerprint.ts:427`). Honest: reading ≠ producing.
- This is the *weakest* brick (recognition only) — which is exactly why read is wrapped by recite + write here.

### 3.2 WRITE brick — production error-tags (the diagnosis engine)
- Tier-1 deterministic gate (length floor + target-structure + on-topic overlap) **always** writes a production brick via `recordProductionFromSurface` (the new correct-attempt helper, §3.3) on PASS, or via `repairFromSurface` (`repair-from-surface.ts:29`) on a deterministically-observed structure FAIL.
- Tier-2 AI rubric (`reviewWriting → repairBatchFromSurface`, `repair-from-surface.ts:72`) adds per-error bricks when AI is up.
- **This is the only step that generates NEW error-tags** → the only step that meaningfully feeds `runDiagnosis` with novel root-cause signal. Read and recite feed *recognition/exposure* signal; write feeds *production-error* signal — the moat.

### 3.3 The one engine helper (carried from read-respond, unchanged)
`recordProductionFromSurface(fp, { conceptId, correct: true, surfaceKind: 'read-respond' })` — a correct-attempt sibling of `repairFromSurface` (today `repair-from-surface.ts` models wrong answers only). `SurfaceKind` (`repair-from-surface.ts:8`) gains `'read-respond'`; `SURFACE_EXERCISE_TYPE` (`repair-from-surface.ts:10`) maps it to `'free-writing'` or the new `'read-respond'` ExerciseType. **Architect sign-off required** (new correct-from-surface write path). This is the *only* genuine engine change the whole flow needs — recite reuses `recordResult`, read reuses `recordExposure`.

---

## 4. Holistic compounding — 3 bricks → daily wall → weekly sprint

**Decision: 3 distinct bricks, NOT 1 composite.** Rationale: the three steps measure three *different* things (comprehension exposure / spoken activation / written production). Collapsing them into one "completed the passage" tile would hide which skill the learner actually exercised — and would let a passage "count" without the production step, the exact silent-substitution failure (Rule 6). Three tiles = three honest claims, each backed by its own write (§2.3, §3.1, §3.2).

### 4.1 Daily wall (the `dailyProgress` blocks)

`recordBlockProgress(blockType, completed, total, correct)` (`useFingerprint.ts:442`) already maps to three daily blocks: **`lytt` / `lær` / `snakk`** (`useFingerprint.ts:450-458`). The unified flow lands its three bricks onto these existing blocks — **no new daily-block type needed**:

| Flow step | Daily block it credits | Why |
|---|---|---|
| READ | `lytt` (recognition) | reading is input/recognition; shares the recognition block with listening |
| RECITE | `snakk` (production/speaking) | reciting aloud accrues speaking-minutes → the speaking block |
| WRITE | `snakk` (production) | written production is the day's production work |

So **one unified-flow completion advances both `lytt` and `snakk`** on the daily wall — visibly, as each step is graded (`recordBlockProgress` writes today's entry, `useFingerprint.ts:460-468`). The day is "complete" when all blocks with `total > 0` are done (`useFingerprint.ts:463`). One passage thus contributes to two-thirds of the daily wall in a single sitting — the compounding the user asked for.

**Per-level daily-wall differentiation** (matches `per-level-progression-proposal.md:22-25` + §1 of that doc):
- **A1** — the daily wall is "foundations touched"; the unified flow's read+recite+write each *touch* foundation concepts (recite the frame's verb, write the frame) → breadth across foundations.
- **B1** — the daily wall is a "production meter" (clauses/minutes produced); recite adds `speakingMinutesTotal`, write adds produced clauses → both meters move from one passage.
- **B2** — the daily wall is "words you no longer miss"; the WRITE step's lexical reuse of passage vocabulary + the recite of nuanced thesis vocabulary feed the expressive-range tile.

### 4.2 Weekly sprint (the `weeklySprintHistory` / `closeWeek` math)

The weekly sprint already promotes/demotes focus concepts on `closeWeek` (`weekly-sprint.ts`, called from `useFingerprint.recordWeeklyCheckResult:390`). The three bricks roll up into the **existing** weekly signals — differentiated per level:

| Level | Weekly wall (from `per-level-progression-proposal.md:22-25`) | How the 3 bricks feed it |
|---|---|---|
| **A1** | foundations **graduated** to mastery | WRITE produces the frame's structure → mastery EMA on the focus concept crosses `masteryThreshold` (`useFingerprint.ts:46`); READ/RECITE supply attempts toward `minAttempts` |
| **A2** | combination concepts graduated + connector error-rate ↓ | WRITE's connector requirement → connector error-tags drop week-over-week; RECITE activates the combined structure |
| **B1** | **production-gap reduction** on focus concepts | WRITE writes production attempts → `computeProductionGap` (`useFingerprint.ts:316`) shrinks the gap for the focus concept; RECITE adds speaking-minutes (a second production-direction signal) |
| **B2** | lexical coverage growth + nuance accuracy | WRITE's reuse of passage vocabulary + RECITE of nuanced thesis sentences → expressive-range growth (future `vocabularyMastery`, today unused, `fingerprint.ts:96`) |

### 4.3 The daily/weekly math (worked B1 example)

**One B1 unified passage, one sitting:**
- READ → `recordExposure(['subordinate-clauses','connectives'])` → +0.3 attemptCount each, no mastery move.
- RECITE 3 sentences → `speakingMinutesTotal += 3 × (4s/60) ≈ 0.2 min`; one recognition brick (`correct: true` self-report) → mastery EMA on `primaryConceptId` nudges up (α=0.25 practice phase), `recordBlockProgress('snakk', …)`.
- WRITE 5-sentence opinion, deterministic PASS (≥30 words, ≥1 connector, on-topic) → `recordProductionFromSurface(correct:true)` → mastery EMA up + `productionGap['subordinate-clauses']` recomputed downward; `recordBlockProgress('snakk', …)`. (If AI up: + per-error bricks → `runDiagnosis` sees real tags.)

**Daily wall after this passage:** `lytt` block +1 (read), `snakk` block +2 (recite + write). A B1 day target of, say, `snakk: 4` is half-filled by one passage.

**Weekly roll-up (5 such passages across the week):**
- `speakingMinutesTotal` += ~1.0 min (5 × 0.2) — feeds the dashboard speaking metric (`dashboard/page.tsx:123`).
- `productionGap[focusConcept]` trends down across 5 production attempts → the B1 weekly wall ("production-gap reduction") shows real movement at `closeWeek`.
- The focus concept accumulates ~10 attempts (read 5 exposures + recite 5 + write 5) toward `minAttempts`, and ~5 production correct-attempts toward `masteryThreshold` → graduation candidacy on Saturday's `/uke` check.

### 4.4 How it feeds `runDiagnosis` (which concepts / error-tags)

- **WRITE** is the diagnosis workhorse: its deterministic + AI error-tags (`word-order`, `tense`, `article`, connector tags) land in `recentErrors` → `aggregateErrorPatterns` (`useFingerprint.ts:305`) → `runDiagnosis`'s 4 root-cause rules read real production errors. This is the new signal the flow earns its place on.
- **RECITE** feeds diagnosis only weakly (recognition/`listening-comprehension` tag on self-reported struggle) — honest: a recite struggle is a soft "review this sound/sentence" signal, not a root-cause.
- **READ** feeds diagnosis **not at all** (exposure only) — correctly, since reading produces no error.

So the diagnosis concepts are **the passage's `primaryConceptId` + `conceptIds`**, and the diagnosis-bearing error-tags come **almost entirely from the WRITE step** — which is why the flow must never let a learner skip write and still "complete" the passage (§4 decision: 3 bricks, write is non-optional for completion credit).

---

## 5. Recite-scope recommendation — MINIMAL-HONEST v1

**Two options:**

| Option | What it is | Verdict |
|---|---|---|
| **A. Minimal-honest** (recommended) | Reuse `ShadowingExercise` verbatim as the recite page; self-report grade; word-colour assist; `recordResult` + `speakingMinutesTotal` writes (all existing). **Zero new engine.** Ships with read-respond's existing `recordProductionFromSurface` as the only engine change. | ✓ **SHIP THIS** |
| **B. Full N1 speaking-in-loop** | Make this flow the vehicle that pulls the whole muntlig spine (shadow + drills + listen-respond + roleplay branching) into the daily session loop, with in-loop pronunciation scoring, branching prompts, and a real speaking-grade engine. | ✗ Defer |

**Recommend A. Reasoning:**
1. **Depth, not breadth (Operating Rule 1).** Option B is a large net-new engine bet (real pronunciation scoring is a hard, separate problem the project has *deliberately* avoided — `/shadow` uses bag-of-words precisely because honest ASR scoring isn't built). Bundling it here would smuggle a big surface in under a "unify three modules" framing — the documented failure mode.
2. **The honest recitation machinery already exists** (`ShadowingExercise`, `speechMatchUtils`). Reusing it is hours, not days. Option B is weeks and needs its own feature-challenger + architect pass.
3. **The north star is served either way.** Recite's job in this flow is *activation + speaking-minutes + a bridge to write* — the WRITE step carries the production load. Minimal recite already delivers that. Full in-loop speaking scoring is a *nice-to-have* that doesn't change whether the flow pushes production.
4. **Honesty is higher in A.** Option B's "speaking grade in the loop" re-opens the ASR-as-judge trap this spec is specifically closing (§2.2). Minimal-honest self-report is the more defensible engine claim.

**So: ship minimal-honest. Revisit full speaking-in-loop only after this flow proves the unified frame and only with real-user speaking data (Wave 5 territory — blocked on users).**

---

## 6. Content cost — one passage, three skills

**The efficiency win is the whole point:** today, filling a B1 week with single-skill items needs ~15–21 authored items (separate reading texts, separate shadow sentences, separate journal prompts). The unified passage serves **read + recite + write from one artifact**.

### 6.1 How many passages a B1 week needs
- A B1 daily `snakk`/production target of ~2 production touches/day × ~5 active days ≈ **~5–7 passages/week**, each reused across all three steps.
- Recite reuses the passage's own sentences (no separate shadow corpus). Write reuses the passage as stimulus (no separate journal prompt). So **5–7 passages replace ~15–21 single-skill items** — roughly a **3× authoring-efficiency gain** per unit of learner work.
- A passage is **re-presentable** across days for the *recite* and *read* steps (recognition/SRS by design) while the *write* opinion stays fresh (a learner can re-read + re-recite a passage and write a *new* opinion) — extending each passage's useful life and lowering time-to-exhaustion (the explicit anti-goal in `vision-and-plan.md:243`).

### 6.2 Authoring + linguist-gate pipeline (unchanged from read-respond / cloze)
1. **content-author** writes ~6 coherent B1 passages (4–5 paragraphs, opinion-friendly topics: friluftsliv, kollektivtransport, matvaner, søndagsstengte butikker) into `content/reading/b1.json` with `primaryConceptId`, `conceptIds`, `writePrompt`, `targetStructure`, and **recite-target sentence indices** (which sentences are the recite scope, §1).
2. **norwegian-linguist (BLOCKING)** — the mandatory gate (`vision-and-plan.md:243`; memory: never seed staging without a linguist pass). Checks coherence, level-appropriate syntax, recite-sentence naturalness (must be *speakable* aloud, not just readable), æ/ø/å.
3. **finalize-deepen → seed** into `content/reading/b1.json`.
4. Audio: each recite-target sentence needs an MP3 (edge-tts nb-NO-PernilleNeural, the existing pipeline). ~3 recite sentences × 6 passages = ~18 new MP3s for B1 v1 — cheap. Missing audio degrades to text-mode recite (`ShadowingExercise.tsx:155`), so audio is not blocking.

**Real cost = the linguist pass** (~1–2 days for 6 B1 passages), same as cloze/read-respond warned. Code is ~2–3 days (read-respond's two-page component + the recite page slotted between, reusing `ShadowingExercise`).

---

## 7. Minimal shippable v1 + build checklist + open decisions

### v1 scope
**B1 only. All three steps (read → recite → write). ~6 authored linguist-gated passages. Standalone `/skriv` flow** (three pages: READ → RECITE → WRITE → result). Recite = minimal-honest (reuse `ShadowingExercise`, self-report grade). Write = read-respond's deterministic-floor + AI-when-up grading. No A1/A2/B2 at launch.

### Build checklist (ranked)
1. **Content kind + ExerciseType** — `ReadingPassage` type (read-respond §3) + `reciteTargetIndices: number[]` field added for the recite scope. New `'read-respond'` ExerciseType member; renderable (NOT in `NOT_YET_AVAILABLE_TYPES`).
2. **Engine: `recordProductionFromSurface`** (`repair-from-surface.ts`) — the correct-attempt sibling; `SurfaceKind += 'read-respond'`. **Architect sign-off (analysis-first).** The ONE engine change.
3. **Deterministic write grader** (`grade-read-respond.ts`) — pure, unit-tested (`length/structure/on-topic → {ok, tag?}`). Read-respond §6 item 3.
4. **Content loader** (`reading-loader.ts`) + seed `content/reading/b1.json` (≥6 passages, linguist-reviewed, with recite indices).
5. **Component `UnifiedReadReciteWrite`** (three steps):
   - **READ page** — passage on cream surface, muted opt-in English gloss, "Les ferdig →" → `recordExposure`.
   - **RECITE page** — **embed `ShadowingExercise`** per recite-target sentence; after attempt show word-colour assist + self-report buttons ("Jeg sa det" / "Det var vanskelig"); on tap write `speakingMinutesTotal` + `recordResult` recognition brick; non-mic fallback to read-aloud + self-report. "Videre →".
   - **WRITE page** — prompt + frame/textarea, live word count + deterministic checklist preview, "Sjekk svar" → grade; result = checklist + AI rettelser (when up) + optional self-report. No numeric score.
6. **Wiring** — `submitUnifiedPassage(...)` in `useSession.ts` folds the three bricks, calls `recordBlockProgress('lytt', …)` for read and `recordBlockProgress('snakk', …)` for recite+write, emits events, queues repairs on observed write-failures, `markLaneDone`.
7. **Scheduler** — schedulable when `primaryConceptId` is a B1 focus/weak/new concept and level matches (CEFR filter as cloze does); gate to a modest share of the `snakk` block so it complements roleplay/journal, not floods.
8. **Persistence** — reuse `writing_submissions` + a `surface:'read-respond'` + `passage_id` column (or sibling table); auth-only; Supabase migration, verify RLS.
9. **Quality gates** — render 375/768/1280/1920; `/baseline-ui` → `/fixing-accessibility` → `/fixing-motion-performance` → `/polish`. Norwegian-dominant, no emoji, Schibsted Grotesk, varied radii.
10. **Rule-8 live verification** before any "done": real B1 session, confirm (a) `speakingMinutesTotal` grew on recite, (b) error log grew + mastery moved on write, (c) `lytt`+`snakk` daily blocks advanced, (d) `productionGap` for the focus concept changed.

### Open decisions for the human
1. **Recite-as-its-own-step vs recite-optional?** Recommendation: **mandatory step in the flow** (it's the unification's point), but a learner can self-report "read aloud" without mic. Confirm recite is non-skippable for daily-block credit.
2. **`/shadow` percentage** — this spec drops the ASR percentage on recite as a Rule-8 honesty upgrade; `/shadow` still shows it (`ShadowingExercise.tsx:303`). **Note as adjacent issue; do not fix here** (Operating Rule 7). Flag for a later honesty pass.
3. **`speakingMinutesTotal` accrual rate** — reuse the listen-respond constant (~4–5s/sentence, `ListenRespondScreen.tsx:124`) or a recite-specific estimate? Recommend reuse for consistency.
4. **A1 recite** — does A1 recite one frame line, or skip recite (A1 = foundations, reading-heavy is weak fit)? Recommend: A1 deferred entirely in v1 (B1-first), revisit A1-minimal later.
5. **Daily-block mapping** — read→`lytt`, recite+write→`snakk` (recommended) vs a new unified block? Recommend reuse existing three blocks (no new daily-wall type).
6. **`recordProductionFromSurface` correct-attempt write path** — architect sign-off (carried from read-respond decision #5).
7. **Self-report scope** — recite/write self-report feeds `speakingMinutesTotal` + recognition attempt only; **never** a mastery brick on the strength of self-report alone (mastery comes from the deterministic write grade). Confirm.

---

## 8. Traceability to project decisions

- **Moat (CLAUDE.md):** diagnosis is fed by the WRITE step's real error-tags (§4.4); recite/read supply recognition signal. The flow strengthens Diagnosis + Remediation, doesn't dilute them.
- **North star (CLAUDE.md, production + speaking):** every passage ends in *written production* (write) and *spoken activation* (recite) — the read step never ships unwrapped. Recite directly grows `speakingMinutesTotal`, the speaking-first headline metric (`muntlig/architecture.md:120`).
- **Every AI path has a non-AI fallback (CLAUDE.md):** write grading's Tier-1 deterministic floor (AI-down-proof) + recite's self-report + text-mode (mic-down-proof) + read's exposure (no AI). The flow works fully with AI and mic both unavailable.
- **Rule 6 (no silent substitution):** 3 distinct bricks, write non-optional for credit; recite uses self-report not silent ASR-threshold-as-truth; no fake percentage.
- **Rule 8 (pipeline honesty):** every step's write is traced (§2.3, §3, §4.3) and gated by a live real-session verification (checklist #10).
- **Operating Rule 1 (depth not breadth):** unifies three *existing* thin surfaces; the only net-new is the `read-respond` type (already Rule-1-overridden in `vision-and-plan.md:206,255`) + the recite step *reusing* existing muntlig code. Minimal-honest recite (§5) explicitly refuses the breadth temptation (full speaking-in-loop).
- **Reuses `output/skriv-readwrite-design.md`** for the read→write half verbatim; **reuses `ShadowingExercise`/`speechMatchUtils`** for recite; **reuses `recordResult`/`recordExposure`/`recordBlockProgress`/`speakingMinutesTotal`** for the writes — one new engine helper total.
- **`per-level-progression-proposal.md`:** daily/weekly walls differentiated per development area (§4.1, §4.2); B1-first matches "B1 = production."

## Sources (carried from read-respond)
- `output/skriv-readwrite-design.md` (the read→write half this extends)
- CLAUDE.md (moat, north star, Operating Rules 1/6/7/8, non-AI fallback)
- `docs/vision-and-plan.md:204-255` (Wave 6, read-respond verdict, Snakk-block honesty)
- `docs/per-level-progression-proposal.md:20-25` (per-level development areas + brick→daily→weekly model)
- `src/components/muntlig/ShadowingExercise.tsx`, `ShadowingScreen.tsx`, `src/lib/speechMatchUtils.ts` (recitation + bag-of-words assist)
- `src/hooks/useFingerprint.ts:272,411,442` (`recordResult`, `recordExposure`, `recordBlockProgress`)
- `src/engine/repair-from-surface.ts`, `src/engine/scheduler.ts:422-448` (Snakk block)
- `src/components/muntlig/ListenRespondScreen.tsx:122`, `RoleplayScreen.tsx:553`, `conversation/page.tsx:294` (`speakingMinutesTotal` write precedent)
