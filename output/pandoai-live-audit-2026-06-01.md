# pandoai.no — Live Production Audit Log (raw, for further processing)

**Date:** 2026-06-01
**Auditor:** Claude Code (Playwright MCP behavioral + script-based signal extraction)
**Target:** https://pandoai.no (live Hetzner production)
**Mode:** Read-only. No mutations, no account creation, guest surfaces only.
**Method:** chrome-devtools MCP was unhealthy (1s timeouts) → pivoted to Playwright MCP. Lighthouse-style signals recovered via `page.evaluate` (meta/headings/alt/contrast/Norwegian-ratio). Perf timing via curl.
**Rubric source:** CLAUDE.md (moat, north star, Norwegian-dominance, Rule 6 honesty, Rule 8 pipeline honesty), docs/vision-and-plan.md (ship-ready items 1–12), global standards (perf/a11y/SEO).

**Status:** PARTIAL. Landing + onboarding + diagnostic + dashboard + session(start+repair) audited. NOT yet audited: full diagnostic completion, journal, conversation(Kari), roleplay, reading, /uke, /analytics, /profile, /progress, retired surfaces (/vocab, /recalibrate), shadow/drills/listen, Lighthouse perf trace, 4-width sweep on inner surfaces.

---

## Reachability / Perf (curl)
- HTTP 200, TTFB 0.166s, total 0.167s, landing HTML 17,842 bytes. Fast.
- `/` does not redirect (no forced auth).

## Auth boundary — KEY FINDING (positive)
- **/dashboard and the entire app are fully GUEST-reachable.** No auth wall. Guest mode = "Gjest", level A1, streak 0, honest "Gjestemodus — Logg inn bare når du vil synkronisere" banner → /login.
- Implication: the full moat (session, journal, conversation, roleplay, reading, /uke) is auditable without an account. Earlier blocking concern (magic-link account needed) is resolved.

---

## MOAT — behavioral verification (all 3 legs confirmed LIVE as guest)

### Leg 1 — Diagnosis (STRONGEST) ✅ CONFIRMED
- /onboarding 5-step flow. Steps 1–3 = honest explainers (engine memory, repair loop). Step 4 = real adaptive diagnostic (Q1/12, starts A2, "Svar naturlig — vi justerer fortløpende").
- Q1: "Form a question: 'You speak Norwegian.' → '___?'" → answered "Snakker du norsk?" (correct) → **level adapted A2 → B1 in real time** ("Ser ut til B1-nivå."). Options disabled post-answer (no double-submit). Inline explanation shown ("Yes/no questions invert subject and verb").
- English instruction + Norwegian options = correct by design (assessment-surface exemption). NOT a Norwegian-dominance violation.
- Did NOT complete to 5/5 (navigated away) → fingerprint not seeded → dashboard correctly showed A1 cold-start. Correct behavior.

### Leg 2 — Scheduling (STRONG) ✅ CONFIRMED
- /session generated a real personalized session: "1 / 28" items, lanes Lytt/Lær/Snakk, "AI ready" badge. Focus concepts (guest A1): Personal pronouns, Noun gender, å være.
- First item = listening-comprehension exercise.

### Leg 3 — Remediation (FOUNDATIONAL) ✅ CONFIRMED
- Wrong answer ("qqq feil svar") on listening item → repair card fired:
  - "Reparasjon" / "Nesten." heading
  - Concept tag: "Personal pronouns"
  - Explanation: "Check your pronoun: jeg/I, du/you, han/he..."
  - "Riktig svar: De har tre barn og bor på landet."
  - "Vis regelen for Personlige pronomen" + "Prøv igjen" buttons
- = explain → rule → retry loop, live, guest.

---

## ISSUES FOUND (severity-tagged)

### 🔴 P1 — Fabricated social proof (honesty / Anti-pattern "No lies")
- Landing shows "**4.9 ★ fra tidlige brukere**" + 5 fake avatar initials (D K M A S).
- Site is `noindex,nofollow` (pre-public) with no real user base. This rating is fabricated.
- Conflicts with CLAUDE.md Anti-pattern #2 (silent substitution) / ship-ready #11 ("No lies").
- Action: remove or replace with honest copy until real ratings exist.

### 🟠 P1 — Systemic low-contrast muted text (WCAG AA fail)
- Root cause: secondary copy uses dark/light foreground at very low opacity (0.28–0.48). Token-level, so almost certainly repeats on every surface.
- Confirmed fails on landing (true bg-gradient + alpha composited):
  - "Diagnostisk coaching som finner svakhetene…" (main value prop) — **3.24** (need 4.5), color rgba(10,18,6,0.48) on lime rgb(200,255,32)
  - "Speak Norwegian. Confidently." — 2.31
  - "Målrettet øving på nøyaktig det du mangler" — 2.57
  - "2 min · Gratis · Ingen konto" — **1.87** (9px, 0.28 opacity) — worst
  - "Trykk og snakk norsk. Bare samtale." — 2.85 (rgba(237,238,233,0.34) on rgb(21,23,24))
  - "Trykk for å starte" — 2.85
  - "**Allerede bruker? Se appen →**" — 2.85 — INTERACTIVE LINK, worst category
- NOTE: first-pass contrast script gave false 1.4 ratios by resolving the dark canvas instead of the lime gradient bg (getComputedStyle.backgroundColor misses background-image gradients). Corrected by parsing gradient end-color + alpha compositing. Re-use the corrected script for inner surfaces.
- Action: raise muted-foreground opacity / darken muted token to meet 4.5:1 (3:1 for ≥24px).

### 🟠 P2 — SEO gaps (may be intentional pre-launch via noindex)
- `robots: noindex, nofollow` on public landing — blocks all search indexing. Decision needed: intentional pre-launch, or growth blocker?
- `canonical: null` (global standard requires canonical).
- `og:image: null`, `og:url: null` (OG image 1200×630 required; social shares will look broken).
- `twitter:card: summary` — global standard = `summary_large_image`.
- `<title>`: bare "NorskCoach" (10 chars, no primary keyword). Standard wants unique <60 char keyword-bearing title. (Inner pages better: "Kom i gang — NorskCoach", "Økt — NorskCoach".)
- `og:description` in English on `lang=nb` page (minor inconsistency).

### 🟡 P2 — Session audio uses browser TTS, not the edge-tts MP3 corpus
- Session listening item played ("Spiller…") with **zero .mp3/audio resource requests** (network log + performance entries both empty). Norwegian TTS voice present (Microsoft Jon nb-NO).
- The 1,117 edge-tts MP3s (nb-NO-PernilleNeural) were NOT fetched for this session item.
- Either intended AudioPlayer TTS fallback or a broken MP3 path on the session surface. The quality intent (better-than-TTS audio) is not reaching the session loop.
- Ship-ready #9 ("≥1 surface plays real audio not TTS") may still hold via /shadow or /listen — NOT YET VERIFIED.
- Action: confirm whether session listening should use MP3; if so, the MP3 path is broken (silent fallback = Rule 6 smell).

### 🟡 P3 — Dashboard "12 oppgaver" vs session "1 / 28" mismatch
- Dashboard card promises "12 oppgaver · ca. 3 min"; actual session header shows "1 / 28".
- Possible honesty/expectation gap (or 28 includes repair sub-items / the 12 is stale copy). Verify the count source.

### 🟡 P3 — English grammar-explanation body on a learning surface
- Session repair explanation body fully English ("Check your pronoun: jeg/I…"). Chrome is ~90% Norwegian (Reparasjon, Nesten, Riktig svar, Prøv igjen, Vis regelen all NO).
- Likely intentional L1 scaffolding for low levels, but dents "Norwegian dominates" on a learning surface. Decision, not a hard fail.

### 🟢 Clean / passing
- Landing: exactly 1 H1, `lang=nb`, viewport set, 0 dead buttons/links, 0 unnamed buttons, 0 placeholder/debug leakage, 0 console errors/warnings.
- Onboarding: example concepts explicitly labeled "Eksempel · Illustrasjon" (honest, matches Wave 6.2 fake-demo-data removal).
- Dashboard: fully Norwegian incl. BottomNav (Hjem/Lær/Øv/Fremgang/Profil); honest guest banner.
- Diagnostic adaptation, session generation, repair loop all behaviorally real.

---

## DESIGN / UX observations (biggest folds)
- Aesthetic: bold lime (rgb(200,255,32)) + near-black editorial. Distinctive, memorable, on-brand. Schibsted Grotesk display.
- **Mobile-first framing on all widths:** at 768/1280/1920 the app renders as a centered ~360px mobile-width card on dark canvas (decorative floating dots). Desktop users see ~70% empty canvas. Intentional mobile-first PWA framing — NOT a bug, but a product decision worth confirming (no desktop-optimized layout).
- Minor polish: a stray decorative lime dot bleeds outside the card on the right edge at 768px.
- Landing carousel auto-advances (Bestill kaffe → Forstå kollegaene → Skriv jobbsøknad → Norskprøven). Good.

---

## Screenshots captured
`.claude/screenshots/pandoai-audit/`
- landing-375.png (full page)
- landing-768.png (full page — shows mobile-card framing + stray dot)
- landing-1280.png (viewport — desktop framing)

---

---

## LIVE SESSION TYPE-SWEEP (A1 guest, append 2026-06-01 pass 2)

Session structure: 3 phases (Lytt / Lær / Snakk), sub-counter per phase ("x / 5"). First phase = Lytt block (mixed types inside).

Items observed in one A1 guest session:
- Item 1/28 — **Listening** ("Lytt og skriv hva du hørte"), audio via TTS. Answered wrong → repair card.
- After repair "Prøv igjen" → counter grew **28 → 31**. **The repair loop appends retry/repair items to the session (F027 2× cap mechanic visible live).**
- Item 2/31 — **Fill-in-blank (production)**: "`___` er fra Norge." / "She is from Norway." (answer *Hun*). Typed correct → advanced.
- Item 3/31 — **Setningsomforming (sentence-transformation)** → renders honest banner "Setningsomforming kommer snart … Trykk for å hoppe over" + Fortsett. ✅ R0 phantom-honesty (Wave 6.6) confirmed live.
  - 🟡 **NEW P2 finding:** phantom/unavailable types are still being **SCHEDULED into live sessions**. Learner hits a dead skip-card mid-session (item 3 of an A1 session). Honesty preserved, but the slot is wasted and flow breaks. Scheduler should not select types it cannot render.
- Item 4/31 — **Listening** again, and it was the **SAME sentence as item 1** ("De har tre barn og bor på landet", tag Personal pronouns). ✅ Repair loop **re-tested the failed item within the same session** ("panel beating" mechanic live).

Remediation-quality notes (live):
- 🟡 Repair explanation is **concept-level, not error-specific**. I typed "Norge er et land"; explanation was the generic Personal-pronouns rule ("Check your pronoun: jeg/I…"). It teaches the concept, not the specific slip. (Engine Lane B to confirm from code.)
- Repair card chrome is Norwegian (Reparasjon, Nesten, Riktig svar, Prøv igjen, Vis regelen); explanation body English (L1 scaffolding — same flag as before).

Profile (/profile) findings:
- 🟠 **AI status = "Maler" / "Fallback"**: "AI er ikke tilgjengelig akkurat nå." — entire session audit ran on the TEMPLATE (non-AI) path. Good: guaranteed fallback works. Gap: AI path (WebLLM/Groq) UNTESTED live (likely no WebGPU in audit browser).
- 🟠 **Contradiction:** session header shows "AI ready" badge while profile says AI unavailable ("Maler"). Misleading to the user — reconcile the two indicators.
- "Øktstil" toggle present: Lytting og lesing / Balansert (default) / Produksjon → input vs production preference. Feeds scheduler exercise-type weighting.
- **No manual level switcher** anywhere — CEFR level is set ONLY by the diagnostic. Guest = A1, "0 av 22 konsepter mestret".
- Implication for this audit: to sample A2/B1/B2 questions live requires completing the diagnostic at higher placement (no shortcut). Corpus-level question quality per level is being assessed from JSON by the parallel content lane.

PARALLEL ANALYSIS LANES launched (background agents, results pending):
- Lane A — corpus depth per level + daily question capacity + exhaustion timeline + optimality verdict.
- Lane B — engine effectiveness: fingerprint precision, repair-loop "panel beating", progress tracking over time (file:line, critical).
- Lane C — exercise types × CEFR standards × north-star production fit (matrix + gaps).

---

---

## LANE A RESULT — Corpus depth & daily capacity (code analysis, file:line cited)

**Corpus totals (grown since the 2026-05-28 scout's ~1,117):** A1=880, A2=760, B1=370, B2=360 = **2,370 sentences**.

| Level | Concepts | Sentences/concept | Session size | Notes |
|---|---|---|---|---|
| A1 | ~22 | ~40 | 25 | lytt5/lær15/snakk5 |
| A2 | ~19 | ~40 | 25 | lytt6/lær13/snakk6 |
| B1 | 12 | **30** | 25 | lytt7/lær11/snakk7 |
| B2 | 12 | **30** | 25 | lytt8/lær9/snakk8 |

- **Session = 25 items at every level** (`src/types/session.ts:78-83`). Recipe 40/30/20/10 applies to the lær block only (`session.ts:58-63`, `scheduler.ts:130-135`). Calibration 30/30/30/10 for first 5 sessions (`useSession.ts:213-220`). Target ~18 min (750s, `session.ts:63`).
- **~16 items/session permanently consume corpus** (remediation+new+interleaving+snakk; review & lytt allow passed sentences). Focus window = 5 concepts (`scheduler.ts:122`), MAX_CONCEPT_REPEATS=2 (`scheduler.ts:201`).
- **Focus-concept exhaustion (1 session/day):** A1/A2 ~12 days, B1/B2 ~9 days. At 2/day: ~5-6 days. At 3/day: ~3-4 days. Then `isReviewFallback` "Repetisjon" fires (`useSession.ts:177`) — honest but suboptimal.
- **Binding constraint = corpus DEPTH, not session volume.** Specifically B1/B2 at only 30/concept, plus server-side AI top-up not wired (`ServerAIService.generateContent` returns null → mobile can't generate fresh).
- **Verdict:** 25 items/~18 min is pedagogically correct (within the 15-20 min evidence window) — do NOT shorten. The fix is (a) raise B1/B2 to ≥50/concept to match deepened A1/A2, and (b) wire `/api/ai` `generate` for AI top-up.

🔴 **Cross-check with live finding:** dashboard advertises "12 oppgaver · ca. 3 min" but the engine produces 25 items / ~18 min (and grows further via repair). Materially misleading. Upgrade the earlier P3 mismatch to **P2 honesty gap**.

---

---

## LANE B RESULT — Engine effectiveness (CRITICAL; the moat's real state)

**Headline:** the mechanical engine (mastery EMA, decay, SRS, weekly sprint) is real, traced, and matches its claims. **The diagnostic intelligence — the actual moat — is the weakest leg in production.**

### Fingerprint / Diagnosis
- ✅ Phase-adaptive EMA real (α 0.40/0.25/0.15/0.08, `fingerprint.ts:61-66,112-115`); slip detection (≥4/5 correct → wrong weighted 0.30, `:69-73,114`); decay half-life 25d floor 35 (`:35-47`); geometric-mean confidence (`:49-58`). All match claims.
- 🔴 **P0 — Error tag is AUTHORED, not DIAGNOSED.** Wrong-answer tag = `sentence.errorTagsDetectable[0]`, the first tag the content author attached — regardless of the learner's actual error (`FillInBlankExercise.tsx:178`, `TranslationExercise.tsx:90`). Fail an article on a sentence tagged `[word-order, article-use]` → logged as word-order. The fingerprint records what the sentence *could* test, not what the learner *did* wrong. **This is the central gap vs the "root-cause diagnosis" moat.** Confirmed live: wrong listening answer → generic "Personal pronouns" explanation.
- 🔴 **P0 — `computeProductionGap` is DEAD CODE.** Zero runtime callers (`fingerprint.ts:274`; only tests/docs reference it). `recordResult` never computes it; current bootstrap `seedInitialMastery` never sets it → `productionGap = {}` forever. Therefore diagnosis rule 2 (`diagnosis.ts:42-56`) can NEVER fire, and the scheduler production/recognition pool switch (`scheduler.ts:58-59,174`) always reads 0. Directly damages the **north star (production)**. Project's own audit flags it (`tests/audit/generate-report.ts:73-76`), unfixed.
- 🟠 Only ~1.5 of 4 advertised root-cause rules reliably operate on real data (rule 1 article+adj→gender is genuine; rules 3-4 inherit the authored-tag flaw; rule 2 dead).
- 🟡 Doc drift: mistake-fingerprint SKILL.md says rawScore = simple accuracy, code is EMA (`fingerprint.ts:115`).

### Remediation / "panel beating"
- ✅ Write is real & traceable (Rule 8 holds for sessions): wrong → `updateConceptMastery(...,false)` lowers EMA, **SRS resets to 0**, nextReviewAt +1d, error logged, persisted IndexedDB+Supabase (`useFingerprint.ts:282,296-303,348-349`; `fingerprint.ts:122`). SRS ladder [1,3,7,14,30] correct (`:17`). Repair injects 2 drills + retry, loop-safe, retry reuses original failed sentence (`repair-loop.ts:93-142`, `useSession.ts:335,350-353`). Non-session surfaces feed the same path (`repair-from-surface.ts:29-67`) — parity real.
- 🟠 **P1 — Retry does NOT gate graduation.** `continueAfterRepair` advances unconditionally whether or not the retry was answered (`useSession.ts:365-366`); the retry is just one more EMA tick. "Beaten into mastery" is really "beaten into the *schedule*." Fail the retry → session still advances, only consequence is another SRS reset.
- 🟡 Explanation can target the WRONG rule (keyed on the authored tag, Blind Spot 1). AI upgrade opportunistic, template fallback (`repair-loop.ts:6-43`, `useSession.ts:309-322`).
- 🟡 Slip down-weighting (0.30) can mask a real backslide on a near-mastered concept (SRS resets but the score the scheduler reads stays high). `recordExposure` adds 0.3 attempts with no correctness (`useFingerprint.ts:410`) → passive reading nudges toward the mastery attempt-gate.

### Progress over time
- ✅ Weekly sprint engine is the strongest leg: retention-gated graduation (demotes if weekly check <50, `weekly-sprint.ts:121,130-175`), history cap 26 (`:37`). WeeklyTrajectory chart legible + accessible (`WeeklyTrajectory.tsx:71-168`). Progress page phase distribution clear (`progress/page.tsx:92-155`).
- 🟠 **P1 — Analytics "retention" (Bevaring) is really RECENCY.** `avgRetention = decayedScore/rawScore` (`analytics/page.tsx:61-72`); since decay is a deterministic function of `lastAttemptAt`, active learner always ~100%, absent one decays. Presented as learning-quality, actually a recency signal. Misleading.
- 🟠 **No per-concept-over-time trend.** You get this-week phase distribution + aggregate weekly bars, but not "noun-gender over 8 weeks." The data exists (`weekStartSnapshots`/`focusOutcomes`) but isn't surfaced — which is exactly what would PROVE the diagnosis→remediation moat works. Progress shows activity, not improvement-on-weaknesses.
- 🟡 Trajectory needs a completed week (`progress/page.tsx:158`) → blank first 7 days; abandoned weeks read as regression.

### Single biggest lever for the vision
Make wrong-answer tagging reflect the ACTUAL error (or narrow `errorTagsDetectable` to one tag/sentence), AND wire `computeProductionGap` into `recordResult`. Until then the moat's diagnosis leg is half-built in production.

---

---

## LANE C RESULT — Exercise types × CEFR × north-star

**11 declared types** (`session.ts:5-16`); **7 real renderers, 4 honest phantoms** (sentence-transformation, dictation, reading-comprehension, free-writing).

Per-level corpus by type (sentences):
| Type | Mode | A1 | A2 | B1 | B2 | North-star |
|---|---|---|---|---|---|---|
| translation-to-norwegian | PRODUCTION | 759 | 657 | 147 | **82** | STRONGEST — best type |
| fill-in-blank | prod (free) / recog (MC) | 121 | 103 | 150 | 126 | B1/B2 workhorse; MC mode = recognition creep |
| word-order | PRODUCTION (scaffolded) | 99 | 114 | 41 | 36 | good A1/A2, thin B1/B2 |
| cloze-passage | PRODUCTION (discourse) | 3p | 2p | **0** | **0** | strongest per-gap signal, A1/A2-only |
| listening-comprehension | prod (partial) | 99 | 114 | **1** | **0** | error always `listening-recognition` |
| translation-to-english | RECOGNITION | 99 | 114 | 34 | 116 | review-only; mismatched tags |
| speed-round | RECOGNITION (timed) | 99 | 114 | **1** | **0** | weak; dishonest error tag |

**Critical gaps:**
1. 🔴 **B1/B2 exercise-type collapse** — listening + speed-round 1/0 sentences; cloze 0; translation-to-norwegian thins 759→82. B2 learner gets recognition-heavy sessions (translation-to-english + FIB) → contradicts the production north star. (R1/Wave 6.7 re-tagging is the approved fix — tagging gap, not content gap.)
2. 🔴 **Speaking is entirely OUTSIDE the session loop.** The "snakk" block exercises are typed (translation/word-order), not spoken — a learner can finish the whole session without producing one spoken word. The 6 muntlig surfaces aren't in the ExerciseType union or scheduler. Largest gap vs north-star "speaking confidence."
3. 🟠 **No mechanic-level CEFR difficulty scaling** — identical interaction at A1 and B2 (no gloss removal, no scaffolding reduction). word-order tiles give too much scaffolding at B2.
4. 🟠 **Error-signal quality asymmetry** (reinforces Lane B): listening→always `listening-recognition`; speed-round→`spelling` on an English-output task; translation-to-english→grammar tags on English answers. (`ListeningExercise.tsx:101`, `SpeedRound.tsx:64`, `WordOrderExercise.tsx:68`.)
5. 🟠 **FIB MC recognition creep** — when distractors present, FIB is pick-from-4 but the scheduler's production guarantee (`scheduler.ts:331`) counts any FIB as production.
6. 🟠 **No multi-sentence/discourse production above A2** (cloze embryonic). B1/B2 need multi-clause production; none in the loop.

---

## SYNTHESIS — does the exercise system meet the vision?

**The moat (CLAUDE.md):** diagnosis + scheduling + remediation.
- Scheduling ✅ real & strong (recipe, SRS, weekly bias, level filter, passed-removal).
- Remediation ✅ wired & traceable, but retry doesn't gate graduation (beaten into the schedule, not into proven mastery).
- Diagnosis ⚠️ **the weakest leg in production** — error tags are authored-positional not observed; `computeProductionGap` is dead code; ~1.5/4 root-cause rules truly operate. The headline differentiator ("root-cause diagnosis no competitor does") is half-built live.

**North star (production + speaking):**
- Production: partially served (translation-to-norwegian + FIB-free + word-order + cloze), but thins to recognition at B2, and `productionGap` being dead means the production-bias scheduler never fires.
- Speaking: ❌ **not in the session loop at all** — only on separate muntlig surfaces.

**Questions per day / drive-results (Lane A):** 25 items/~18 min is pedagogically right. Binding constraint is corpus depth (B1/B2 30/concept; focus exhaustion 9-12 days) + un-wired AI top-up — NOT session length.

**Questions meet each level's standard (Lane C):** A1/A2 well-covered and level-filtered correctly. B1/B2 suffer type collapse + thin production corpus + no difficulty-scaling of mechanics → higher levels drift recognition-ward, against the vision.

### Ranked fixes (by vision-leverage)
1. 🔴 **Fix wrong-answer tagging to reflect the ACTUAL error** (or 1 tag/sentence) — restores the diagnosis moat. (Lane B, Blind Spot 1)
2. 🔴 **Wire `computeProductionGap` into `recordResult`** — activates diagnosis rule 2 + the production-bias scheduler (north star). (Lane B, Blind Spot 2)
3. 🔴 **R1 re-tag B1/B2 + deepen B1/B2 corpus to ≥50/concept** — fixes the higher-level type collapse + exhaustion. (Lane A + C)
4. 🟠 **Bring a speaking-production type into the session loop** (or honestly stop calling the typed block "snakk"). (Lane C)
5. 🟠 **Gate repair graduation on a passed retry.** (Lane B)
6. 🟠 **Add a per-concept-over-time progress view; relabel "Bevaring" (it's recency, not retention).** (Lane B)
7. 🟠 **Fix dashboard "12 oppgaver · ca. 3 min" → ~25 items / ~18 min.** (Lane A + live)
8. 🟠 **Remove fabricated "4.9 ★"; fix muted-text contrast token; SEO (noindex/canonical/og:image).** (live)
9. 🟡 **Stop scheduling phantom types into sessions; reconcile "AI ready" vs "Maler".** (live)

---

---

## SURFACE SWEEP (live, guest, 2026-06-01 pass 3) — document-only

| Surface | URL | Verdict | Notes |
|---|---|---|---|
| Vocab (retired) | /vocab | ✅ honest | "Kommer i V2" banner, V2 labels. ⚠️ verify "Varsle meg når det er klart" button actually captures anything (possible dead button). |
| Recalibrate (retired) | /recalibrate | ✅ honest | Redirects to /uke correctly. |
| Weekly check | /uke | ✅ works | "Ukens repetisjon" 0/6, opens with PRODUCTION task ("Oversett til norsk: My name is Lars…"). Assessment surface → English instruction OK. |
| Journal | /journal | ✅ production | Free Norwegian writing, Snakk/Skriv toggle, word counter, "AI gir respons når klar". ⚠️ guest prompt "hva du liker å spise" looks generic, not obviously focus-biased — verify focus-bias for real users. AI correction is AI-dependent (Maler fallback now). |
| Conversation (Kari) | /conversation | ✅ UI / ⚠️ AI-dep | 6 topics, per-conversation level selector A1-B2, Rettelser/Fokus-biased badges. REQUIRES AI; app in "Maler" fallback → AI chat path UNTESTED (likely degraded without AI). |
| Roleplay | /roleplay | ✅ real, thin | 3 voice scenarios (kaffe/veibeskrivelse/intro) w/ speech recognition + mini-feedback. Real speaking, but only 3, A1-level. This is where speaking actually lives (NOT the session loop). |
| Reading | /reading | ✅ thin | Lesestudio, 4 texts (A1/A2 only; no B1/B2 filter). Recognition-only; comprehension scoring is a known stub; logs exposure (`recordExposure` → inflates attemptCount, Lane B). |
| Analytics | /analytics | 🔒 auth-gated | "Logg inn for å se analysen din" — not guest-auditable. Code covered by Lane B (retention=recency issue). |
| Progress | /progress | ✅ strong | Phase distribution (Øving 1 / Intro 4 / Låst 17 = 22 A1 concepts) + per-concept % + FULL prerequisite dependency graph ("Trenger Noun gender"). ✅ **PIPELINE HONESTY CONFIRMED LIVE:** my failed session items moved Personal pronouns to 48% here (session→fingerprint→progress write traced live). Lane B gap stands: snapshot only, no per-concept-over-time trend (weekly trajectory is auth-gated). |

Cross-cutting from sweep:
- Norwegian-dominance ✅ across ALL learning surfaces (vocab/uke/journal/conversation/roleplay/reading/progress) — Norwegian primary, English only as scenario subtitles or assessment instructions (by design).
- BottomNav consistent Norwegian (Hjem/Lær/Øv/Fremgang/Profil) on every surface.
- 🟠 **AI-dependent surfaces (conversation, journal correction) run degraded in "Maler" fallback** — the AI path (WebLLM/Groq) was never active in this audit. Needs a separate AI-path audit on a WebGPU-capable browser or with GROQ_API_KEY active.
- Speaking production exists ONLY on /roleplay (3 scenarios) + conversation (AI-dep) — confirms Lane C: speaking is outside the core session loop.

---

---

## MUNTLIG SURFACES + AUDIO PIPELINE (live, 2026-06-01 pass 3)

| Surface | URL | Verdict | Notes |
|---|---|---|---|
| Shadowing | /shadow | ✅ real, ⚠️ mode | "Uttalelab" — opened in "Tekst-modus — les setningen høyt" (read aloud + record), did NOT fetch MP3. Confirm whether an audio listen-mode exists & why it didn't engage (may be intentional default). Speech recognition + word-match. |
| Listen & respond | /listen | ✅ production | "Lytt og svar" — 8 timed questions (text NO + EN), 5s spoken response, speech recognition, "Fingeravtrykk" badge. Genuine oral production. |
| Pronunciation drills | /drills | ✅ real audio | "Uttaleøvelser" — 4 sound groups (kj/sj/ø/retroflex), strong pedagogical descriptions, heuristic feedback, fingerprint. **Confirmed plays REAL MP3** (see below). |

### AUDIO PIPELINE — verified status (CORRECTS earlier P2 overclaim)
- ✅ **MP3 hosting works on production.** Curl tests: `drill-kjope.mp3` → HTTP 200 audio/mpeg 10.8KB; sample sentence `5a7195fa…mp3` → 200/12KB; the EXACT session sentence `67a0d496…` ("De har tre barn og bor på landet") → 200/16.7KB. Path `/audio/sentences/{id}.mp3` (`src/lib/audio-utils.ts:5`).
- ✅ **/drills plays real MP3 live** — clicking "Lytt" fetched `https://pandoai.no/audio/sentences/drill-kjope.mp3` (11.1KB) via Howler; TTS not speaking. **Ship-ready #9 ("≥1 surface plays real audio not TTS") HOLDS.**
- ⚠️ **P2 (revised) — the SESSION listening loop uses TTS, not the MP3.** The failed session item's sentence (`67a0d496…`, tagged `listening-comprehension`) HAS a working MP3, yet the session played browser TTS and fetched no audio (network + performance both empty; Norwegian TTS voice present). So the core daily loop bypasses the nb-NO-PernilleNeural MP3s for robotic TTS. Infrastructure is fine — the session audio path doesn't call it. (Root cause deferred to fix pass; candidates: session sentence object missing audioUrl, or session AudioPlayer defaulting to TTS.)
- NOTE (honesty): earlier in this log I wrote "audio isn't loading anywhere / session uses TTS not MP3" implying a broken pipeline. That was too strong — verified here that the pipeline works and the gap is specific to the session listening surface. Verify-don't-assume correction logged.

---

---

## PERFORMANCE (live landing, browser timing — Lighthouse unavailable)

- TTFB ~37ms (warm) / ~166ms (cold curl); FCP **~184ms**; CLS **0**; DCL 56ms; load 72ms. Landing HTML ~18KB.
- ✅ Excellent on measurable metrics: near-instant FCP, zero layout shift, tiny payload.
- ⚠️ GAPS (not captured): formal Lighthouse score (chrome-devtools MCP hung), LCP (deprecated buffered API), and cold-load JS byte budget (resources read as cached on repeat nav). A real Lighthouse mobile/desktop run is still owed.

---

## SCOUT LANE (competitive + pedagogical opinion per feature/exercise) — running
Launched a scout research pass to judge each feature and exercise against competitors (Duolingo, Babbel, Busuu, Clozemaster, Memrise, Pimsleur, Speechling, LingQ + Norwegian-specific Lingu/Skapago/Norskprøven prep) and SLA evidence. **Verdicts live in a SEPARATE doc** (not merged here): `.scout/2026-06-01-feature-exercise-verdicts.md`.

---

---

## EXERCISE × LEVEL MATRIX (consolidated: live Playwright sweep + corpus/scheduler code lanes)

Sources: live guest sweep of every surface (this session) + Lane A (corpus/scheduler counts, `session.ts`/`scheduler.ts`/`useSession.ts`) + Lane C (per-type tagging). Counts are sentences tagged for that type per level; a sentence carries multiple `exercise_types`, so column sums exceed the per-level sentence totals.

### Per-type sentence counts by level (corpus)
| Exercise type | Mode | A1 | A2 | B1 | B2 |
|---|---|---|---|---|---|
| translation-to-norwegian | PRODUCTION | 759 | 657 | 147 | **82** |
| translation-to-english | recognition | 99 | 114 | 34 | 116 |
| fill-in-blank (free/MC) | prod / recog | 121 | 103 | 150 | 126 |
| word-order | production (scaffolded) | 99 | 114 | 41 | 36 |
| listening-comprehension | prod (partial) | 99 | 114 | **1** | **0** |
| speed-round | recognition (timed) | 99 | 114 | **1** | **0** |
| cloze-passage | PRODUCTION (discourse) | 3 passages | 2 passages | **0** | **0** |
| sentence-transformation / dictation / reading-comprehension / free-writing | PHANTOM | 0 | 0 | 0 | 0 |

### Per-level summary
| Level | Sentences | Concepts | Graph+corpus present? | Session size | Daily unique-consuming items | Focus-concept exhaustion @1 session/day | Available REAL types (with corpus) |
|---|---|---|---|---|---|---|---|
| A1 | 880 | ~22 | ✅ yes | 25 (lytt5/lær15/snakk5) | ~16 | ~12 days | translation×2, fill-in-blank, word-order, listening, speed-round, cloze(3) |
| A2 | 760 | ~19 | ✅ yes | 25 (lytt6/lær13/snakk6) | ~16 | ~12 days | translation×2, fill-in-blank, word-order, listening, speed-round, cloze(2) |
| B1 | 370 | 12 | ✅ yes | 25 (lytt7/lær11/snakk7) | ~16 | ~9 days | translation×2, fill-in-blank, word-order; ⚠️ listening/speed-round ≈0; cloze 0 |
| B2 | 360 | 12 | ✅ yes (NOT missing) | 25 (lytt8/lær9/snakk8) | ~16 | ~9 days | translation-to-english, fill-in-blank, word-order(36); ⚠️ translation-to-norwegian thin(82); listening/speed-round/cloze = 0 |

**B2 graph/content gap note (user asked):** the B2 concept graph + 360-sentence corpus **DO exist** (not missing). The real B2 gap is **exercise-type collapse**: listening-comprehension, speed-round, and cloze have **0** usable sentences, and translation-to-norwegian (the top production type) has only **82**. So B2 sessions skew to translation-to-english (recognition) + fill-in-blank — recognition-heavy, against the production north star. The `lytt`/`snakk` blocks at B2 (8 items each) draw from near-empty listening/speaking pools → likely fall back to typed types or `isReviewFallback`. Fix = R1 re-tagging (Wave 6.7) + corpus deepening, NOT a new graph.

### Surface inventory + level-awareness (live-verified)
| Surface | URL | Content source | # items (guest/live) | Level-aware? | Notes |
|---|---|---|---|---|---|
| Session loop | /session | corpus (typed types) | 25/session (grows via repair) | ✅ YES | `filterSentencesByLevel` (`scheduler.ts:14-23`); level set by diagnostic, no manual switch. A1 guest served A1 content (verified). |
| Conversation (Kari) | /conversation | AI-generated | 6 topics | ✅ YES (manual A1/A2/B1/B2 selector) | Per-conversation level picker observed. AI-dependent (degraded in Maler fallback). |
| Weekly check | /uke | corpus, concept-driven | 6 items | ✅ via concepts | Driven by fingerprint focus concepts (level-bound). |
| Journal | /journal | prompt + free text | 1 prompt/day | 🟡 partial | Focus/fingerprint-biased, not CEFR-gated; guest prompt looked generic. |
| Reading | /reading | 4 fixed texts | 4 texts | 🟡 partial (A1/A2 ONLY) | Filter exposes only Alle/A1/A2 — **no B1/B2 texts**. Recognition-only; no comprehension scoring. |
| Listen & respond | /listen | 8 fixed questions | 8 | ❌ NO | Fixed conversational Qs (Hva heter du? etc.), not corpus/level-filtered. |
| Shadowing | /shadow | fixed sentence set | 5 (1/5 observed) | ❌ NO (level-agnostic) | Opened in text-mode; fixed sentences, not level-selected. |
| Pronunciation drills | /drills | 20 fixed drill words | 4 groups × 5 | ❌ N/A by design | Phonetic (kj/sj/ø/retroflex), CEFR-agnostic. Plays real MP3. |
| Roleplay | /roleplay | 3 fixed scenarios | 3 | ❌ NO | Fixed A1-ish scenarios, no level control. |

**Level-awareness verdict:** only **Session, Conversation, and /uke** are genuinely level-aware; **Reading** is partial (A1/A2 only); **Journal** is focus- not level-driven; **Listen, Shadow, Drills, Roleplay** serve fixed, level-agnostic content. So outside the core session loop, CEFR adaptivity largely disappears — a B2 learner gets the same 3 roleplays / 8 listen Qs / 4 reading texts as an A1 learner.

### Daily unique-item capacity (Lane A)
- Every level: **25 items/session**, ~16 of which permanently consume corpus (remediation+new+interleaving+snakk; review & lytt allow passed sentences).
- AI top-up exists (`useSession.ts:155-161`) but server path returns null → **no fresh generation on mobile**; desktop WebGPU only. So per-day unique capacity is effectively bounded by static corpus until exhaustion, then `isReviewFallback` "Repetisjon".
- Practical ceiling before repeats dominate: A1/A2 ~12 days, B1/B2 ~9 days at 1 session/day (halves at 2/day).

---

---

## PART 2 — DAILY CAPACITY & REALISM (per level)

**Throughput basis (honest):** the app designs a session at **25 items / 750s target = ~30s/item** (`session.ts:63`, verified live: guest session showed 25-28 items, grew to 31 via repair). Realistic phone pace including reading the prompt + feedback + occasional repair: recognition items ~12-20s, production/typed items ~30-60s, listening ~30-45s, cloze passage ~60-120s. Live timing of a full session was NOT stopwatch-measured (would require hearing audio / many slow clicks) — figures below are computed from the configured pace + standard per-item timing.

### Items realistically completable per day (phone)
| Window | Items (recognition-heavy) | Items (production-heavy) | In app terms |
|---|---|---|---|
| 10–15 min | ~25–35 | ~15–22 | ≈ 1 designed session (25 items) |
| 25–30 min | ~50–65 | ~32–45 | ≈ 2 sessions |

Note: a session caps at 25 base items but **grows with repair** (each wrong answer injects up to 2 drills + 1 retry, capped ~2×), so error-prone learners hit fewer *unique* items per minute.

### Supply vs. consumption (engine: ~16 corpus-consuming items/session; focus window = 5 concepts; MAX_CONCEPT_REPEATS=2)
| Level | Total sentences | Focus-window pool (5 concepts) | Whole-level unique sessions (÷~16) | Focus-window sessions before repeat | Production-type supply (transl-to-NO) |
|---|---|---|---|---|---|
| A1 | 880 | ~200 (5×40) | ~55 | ~12 | 759 — deep |
| A2 | 760 | ~200 (5×40) | ~47 | ~12 | 657 — deep |
| B1 | 370 | ~150 (5×30) | ~23 | ~9 | 147 — moderate |
| B2 | 360 | ~150 (5×30) | ~22 | ~9 | **82 — shallow** |

### Days at "normal usage" (1 session/day ≈ 10–15 min) until…
| Level | Focus concepts exhaust (repeats appear in current focus) | Whole-level fresh content exhausts | AI generation needed | On PHONE? |
|---|---|---|---|---|
| A1 | ~12 days | ~55 days (~8 weeks) | ~when focus exhausts (~day 12) | ❌ AI top-up returns null on server → no mobile generation; falls to "Repetisjon" review-fallback instead |
| A2 | ~12 days | ~47 days (~7 weeks) | ~day 12 | ❌ same |
| B1 | ~9 days | ~23 days (~3 weeks) | ~day 9 | ❌ same |
| B2 | ~9 days | ~22 days (~3 weeks), but PRODUCTION supply (82 transl-to-NO) exhausts in **~5–9 days** | ~day 5–9 | ❌ same |
*(Halve all day-counts at 25–30 min/day = 2 sessions.)*

### 🔴 Phone-specific killer
On mobile the supposed infinite-supply escape valve **does not exist**: `ServerAIService.generateContent` returns null and there is no `/api/ai` `generate` action, so once a focus concept's pool empties, the learner gets the honest "Repetisjon" fallback — **never fresh AI-generated items**. The static corpus is a HARD ceiling on phone (which is the primary device). Desktop WebGPU/WebLLM can top up; phone cannot.

### Per-level verdict
| Level | Verdict | Reasoning |
|---|---|---|
| **A1** | 🟢→🟡 **SUFFICIENT (casual) / THIN (daily power user)** | ~8 weeks whole-level runway at 1/day is fine for casual; but a focus concept repeats in ~2 weeks, and at 2 sessions/day the whole level thins in ~4 weeks. Deep production corpus (759) is the saving grace. |
| **A2** | 🟢→🟡 **SUFFICIENT / THIN** | Same shape as A1, slightly less total. |
| **B1** | 🟡 **THIN** | ~3-week whole-level runway, focus repeats in ~9 days, only ~1.5 production types with real depth. A committed learner outruns supply within a month. |
| **B2** | 🔴 **BRITTLE** | Whole level ~22 sessions but PRODUCTION supply (transl-to-NO = 82) exhausts in ~1 week; listening/speed-round/cloze = 0; recognition types fill the gap → drifts off the production north star fast. No mobile AI top-up to rescue it. |

### Verdict on "enough to drive results?"
- **A1/A2: yes for the first 1–2 months** of daily use, then leans on review (which is pedagogically fine for retention, but stops introducing new production). Spaced review ≠ exhaustion problem; the issue is *new production volume* for ambitious learners.
- **B1: borderline** — enough to start, not to sustain a daily learner to mastery without the corpus deepening (target ≥50/concept) the scout/Lane A both recommend.
- **B2: not yet** — the level is selectable and graphed, but production supply is too shallow to drive production fluency (the north star) for more than ~a week of daily use. Highest-priority supply fix.

**Binding levers (both already in the log):** (1) deepen B1/B2 corpus to ≥50/concept (esp. translation-to-norwegian + cloze), (2) wire server-side AI generation so mobile gets top-up. Until then, mobile capacity is corpus-bound and B2 is brittle.

---

---

## PART 3 — LEVEL STANDARDS & EXERCISE QUALITY (vs CEFR descriptors)

**Method:** corpus content sampled per level (longest + typical sentences, length/difficulty distribution) + the live mechanic/level-awareness facts from the Playwright sweep + Lane C type analysis. Content judgment is corpus-based (sentences live in JSON); mechanic judgment is live-verified.

### Evidence — content scales cleanly with level (this is a STRENGTH)
| Level | Avg words | Avg chars | Difficulty dist | Sample (typical → hardest) |
|---|---|---|---|---|
| A1 | 4.5 | 21 | d1 570 / d2 194 / d3 116 | "De spiller et spill" → "Legen undersøker pasienten og skriver ut en resept." |
| A2 | 6.2 | 31 | d1 415 / d2 265 / d3 80 | "Jeg går til skolen og så hjem." → "Hvis du glemmer passet ditt, slipper du ikke inn på flyplassen." |
| B1 | 9.7 | 49 | d1 216 / d2 130 / d3 24 | "Vi ble lei oss fordi vi hadde mistet billettene." → "Han forklarte at han ikke kunne komme fordi han var syk, men at han ville prøve å delta på neste møte." |
| B2 | 13.9 | 83 | **d3 360 (100%)** | "Vet du hva, jeg skjønte egentlig ikke hva han mente…" → "Jeg tillater meg å henstille til avdelingslederne om å videreformidle denne informasjonen…" |

✅ **Content alignment is excellent.** Grammar/register/length progress correctly: A1 present-tense SVO; A2 past/conditional/indirect speech; B1 multi-clause subordination + past-perfect; B2 formal register, advanced passive, nuance, and even 2-sentence text-cohesion items. A linguist-grade gradient. Whoever built the corpus nailed the CEFR sentence calibration.

### The core finding — MECHANIC does not scale with content
CEFR expects the *task* to get harder with level (A1: recognize/produce short phrases → B2: inference, long-text comprehension, extended/argumentative production, mixed question types). NorskCoach reuses the **same single-sentence mechanics at every level**:
- A B2 sentence ("Det ble ikke tatt noen endelig beslutning…") is delivered as the *same* translate-this-sentence / fill-one-gap interaction as an A1 "Jeg skriver i boken." The sentence is B2; the cognitive task is A1-grade.
- No long-text reading + inference, no extended/argumentative writing, no mixed question types, no discourse production in the session loop. Cloze (the only discourse type) is 0 at B1/B2.
- `word-order` at B2 = rearranging ~14 tiles: tedious and over-scaffolded (tiles can be brute-forced without真 production).
- B2 is **100% difficulty-3** — no easy on-ramp within the level; a learner crossing into B2 hits maximal difficulty with no graded entry.

### Per-type × per-level quality (level-relevant? too easy/hard/misaligned? production/recognition)
| Type | A1 | A2 | B1 | B2 |
|---|---|---|---|---|
| translation-to-norwegian | ✅ ideal (short production) | ✅ ideal | ✅ relevant but mechanic flat | 🟡 content B2, task under-spec; supply thin (82) |
| translation-to-english | 🟡 recognition, OK as review | 🟡 review | 🟡 low-res signal | 🟡 fills B2 gap but recognition-only — wrong emphasis at B2 |
| fill-in-blank | ✅ great (targets the form) | ✅ great | ✅ best B1/B2 signal (rich grammar tags) | ✅ relevant, but MC mode = recognition creep |
| word-order | ✅ good scaffold | ✅ good | 🟡 thin (41), scaffold heavy | 🔴 over-scaffolded for 14-word B2 sentences; misaligned |
| listening-comprehension | ✅ relevant | ✅ relevant | 🔴 ≈0 corpus | 🔴 0 corpus — absent |
| speed-round | 🟡 vocab fluency | 🟡 | 🔴 ≈0 | 🔴 0; and recognition — wrong for B2 |
| cloze-passage | ✅ strong (but 3) | ✅ (2) | 🔴 0 — absent where it matters MOST | 🔴 0 — the type B2 most needs |

### Production vs recognition by level
- A1/A2: healthy production/recognition mix; production types deep. ✅
- B1: production present (translation-NO 147, FIB 150) but discourse/extended production absent. 🟡
- B2: production supply shallow (translation-NO 82) + the gap-fillers (translation-to-english 116, FIB MC) are recognition → **B2 effectively drifts recognition-heavy, the exact opposite of what B2 + the production north star demand.** 🔴

### Best-served / underserved
- **Best served: A1** (then A2) — content AND mechanic both fit the level, corpus deep, all types populated. The app is genuinely well-built for beginners.
- **Underserved: B1** — content good, but production-type depth thin and mechanic starting to lag CEFR (B1 wants connected/extended output).
- **Most misaligned: B2** — content is genuinely B2-grade, but the exercise *system* can't test B2 competence: single-sentence mechanics, no inference/long-text/extended-production, recognition-heavy gap-fillers, listening/cloze empty, and 100%-d3 with no on-ramp. B2 is the widest gap between content quality and pedagogical delivery.

### Verdict
NorskCoach's **content quality is level-appropriate and genuinely well-calibrated across A1–B2** — a real strength. The weakness is **mechanical/pedagogical scaling**: the exercise toolkit is built for A1/A2 (recognize + produce single sentences) and is reused unchanged at B1/B2, where CEFR demands discourse, inference, and extended production. The fix is not better sentences (those are good) — it's **level-scaled task types at B1/B2** (cloze passages, long-text + inference, guided/extended composition) plus retiring over-scaffolded mechanics (word-order) at the top levels. This matches the scout verdict (cloze at B1/B2 = highest-leverage) and Lane C (no mechanic-level CEFR scaling).

---

## REMAINING WORK (next audit pass)
1. Complete diagnostic 5/5 → confirm fingerprint seeds + dashboard updates level.
2. Run session to completion → confirm "Prøv igjen" retry + SRS scheduling + session-end summary.
3. Verify real MP3 audio on /shadow + /listen (ship-ready #9 elsewhere).
4. Audit journal (focus prompts + AI correction write), conversation/Kari (error correction), roleplay (speech), reading.
5. /uke weekly check, /analytics, /profile, /progress.
6. Retired-surface honesty: /vocab ("Kommer i versjon 2"), /recalibrate (→/uke redirect).
7. Lighthouse perf trace (chrome-devtools when healthy) for LCP/CLS/perf score mobile+desktop.
8. Run corrected contrast script on every inner surface (token issue likely global).
9. 4-width responsive sweep on inner surfaces.

## DOC-SYNC candidates (after full pass)
- vision-and-plan.md: ship-ready #9 (audio) needs caveat — session uses TTS; #11 (No lies) violated by fabricated 4.9★.
- CLAUDE.md Current State: note guest-reachability of full app; note session-audio TTS path.
- New decision items: noindex go/no-go, muted-contrast token fix, fabricated-rating removal.
