# Scout Brief: norskcoach-skriv-ui

**Date:** 2026-06-02
**Idea:** Ship NorskCoach's newly-built read→recite→write `/skriv` module + the "brick→daily→weekly" progress model to the UI, informed by competitor + pattern research.
**Run mode:** deep (UX-pattern variant) · **Lanes run:** 4 (A journeys / B progress / C grading / D competitors)
**Caveat:** perplexity-cli + Exa MCP keys returned 401 in this run — all findings sourced via WebSearch/WebFetch. Confidence tagged accordingly; lean toward re-verifying [Estimated] claims before high-stakes decisions.

---

## TL;DR
- **What exists (engine):** read→recite→write engine, deterministic WRITE grader (4 outcomes + checklist), `recordProductionFromSurface` (guided=reduced weight), 6 B1 passages, `ShadowingExercise`, cloze passages live — all built/tested, NO UI.
- **What exists (market):** every competitor over-indexes on *recognition* (multiple-choice, token-recombination); AI tutors (Speak/Loora/Praktika) are speaking-only and *forgiving by design*; Busuu is the only one eliciting free output but routes it to unmoderated humans, async.
- **What exists (patterns):** "compare-don't-grade" self-report speaking (Speak/Speechling, no %); live password-checklist as honest analogue to a score; Strava Fitness-vs-Freshness as the one-input-two-meanings gold standard; Apple-rings closure + GitHub-heatmap as honest accumulation.
- **What's missing (market gap):** NO consumer Norwegian product ships an integrated read→produce unit with *honest, root-cause, in-loop* written feedback. The read→produce bridge is essentially unshipped.
- **What's missing (us):** UI for the 3-step journey; a per-level brick→daily→weekly representation; the honest WRITE grading surface.
- **Your opportunity:** Operationalize Swain's "pushed output" on one passage with honest, diagnostic, AI-down-proof feedback — the single biggest unmatched differentiator is **root-cause diagnosis tied to written output via the fingerprint+repair loop.**

---

## Lane Health
| Lane | Items found | Confidence | Age |
|------|------------|------------|-----|
| A — Read→Speak→Write journeys | 9 products + pedagogy | 7.5/10 (WebSearch-only) | 2026-06-02 |
| B — Honest progress compounding | 10 products | 7.5/10 (WebSearch-only) | 2026-06-02 |
| C — Honest grading UX | 6 patterns + pedagogy | 8/10 (WebSearch-only) | 2026-06-02 |
| D — Competitor landscape | 5 direct + 5 adjacent | 8/10 (WebSearch-only) | 2026-06-02 |

---

## KEY FINDINGS BY PROBLEM

### Problem A — the 3-step single-passage journey
**Winning principle: the passage is the persistent spine — one screen, three modes, NOT three pages.** Duolingo Stories proves a thin top progress bar + the artifact staying on screen is the single continuity device; Babbel's screen-per-exercise is exactly what reviewers fault as "disconnected pieces." [Confirmed]
- Thread continuity by **changing the same text in place** (Beelinguapp synced line-highlight, LingQ color-state-on-text), not swapping screens. [Confirmed]
- READ surface = **editorial-calm camp** (LingQ/Readlang): Norwegian text owns the screen, only quiet on-text interaction (tap-word gloss, opt-in English), no XP/animation inside the read. Reserve motion for *between-step transitions*; let visual chrome *escalate* read→recite→write (calm slab → record control → textarea) so escalation itself signals progression. [Confirmed]
- WRITE should be **scaffolded from the passage** (retell→summarize pedagogy ladder + graphic-organizer): pre-load 2–3 Norwegian prompt stubs / key-word chips pulled from the passage, not a cold blank box. [Confirmed]

### Problem A (speak step) — "Compare, don't grade"
Market validates a **no-percentage self-report** model: Speak shows native-model vs your-own-recording as two equal play buttons + karaoke word-highlight (no score); Speechling ships a credible speaking loop with zero automated scoring. **Adopt:** two equal play buttons (model | you) + a 3-way Norwegian self-report tap ("Ikke ennå" / "Nesten" / "Traff det") logged to the fingerprint. Honest (Rule 8) and matches the genre leader. [Confirmed]

### Problem B — honest brick→daily→weekly
**Core principle: ONE event log, change the LENS not the truth (Strava Fitness-vs-Freshness).** Same brick events feed a level-dependent axis/label, never a different reality. [Confirmed]
- Per-level wall = same widget, different numerator+label: A1/A2 = bricks counted ("Murstein"); **B1 = production meter ("Setninger bygd"** — clauses/sentences produced); B2 = coverage meter ("Ord du behersker"). Validated by Memrise "My Words" (coverage headline for advanced) + Anki maturity-vs-retention. [Confirmed]
- **Brick moment** must be immediate, *proportional* (a produced B1 clause = bigger brick than a recognition tap — Whoop-style weighting), *inspectable* (tap to see what counted + why), *truth-reversible* (a wrong answer adds NO brick). Steal Forest's "tree travels into the forest" + Apple's ~90%-full Gestalt closure animation. [Confirmed]
- **Weekly Sprint = re-framed trend + recalibration** (Apple weekly-summary model), an Oura-style *trend not verdict* for advanced — never a Duolingo guilt leaderboard. [Confirmed]
- **DARK PATTERNS TO FORBID:** loss-aversion guilt notifications, paywalled streak-freeze rescue, fake countdowns, vanity XP that doesn't map to mastery, social league as core loop, streak-as-master-metric, decay-theater without a real lapse. [Confirmed]

### Problem C — honest WRITE grading (no fake %)
**The honest analogue to a score is the live password-requirements checklist** (discrete verifiable criteria flipping muted→checked), NOT the continuous strength bar. Wix proved progress-framing (vs gating) raised outcomes +26%. [Confirmed]
- Checklist: **beside** the textarea (Norwegian keeps the dominant column), below on mobile; unmet = neutral "not yet" (NEVER red-before-submit); partial = honest count "2 av 3" (never %); ~150ms Framer flip, `aria-live="polite"`. [Confirmed]
- **AI-up vs AI-down:** deterministic grader is the always-on **floor** presented as trustworthy ("Grunnsjekk"/"Sjekket"); AI corrections are an *additive, amber-badged* layer ("AI-tilbakemelding") on the **same card** — AI-down is a *subset, not a damaged version*. Warm amber, never red; copy it as a normal mode ("Grunnsjekk i dag — rettelsene dine er registrert"). [Confirmed]
- **Four outcomes → three emotional registers, none with a number:** PASS = calm green "dette teller"; STRUCTURE-MISSING = amber "nesten — bruk en *fordi*-setning" → micro-drill (the repair loop); TOO-SHORT/OFF-TOPIC = neutral "ikke ferdig", no credit AND no penalty. [Confirmed]
- **Free vs guided credit (scaffold-fade pedagogy):** name the mode honestly — "Med støtte" (guided, dashed/muted, reduced weight) vs "Fritt" (free, solid/foreground, full credit). Make the weight difference *legible*, not secret; show the scaffold visibly *retiring* ("try it free now to earn full credit"). Transparency, not points trickery. [Confirmed]

### Problem D — competitive positioning
Every surveyed product fails at production in a distinct way (Babbel/Memrise cap ~A2 recognition; AI tutors speaking-only + forgiving → "false sense of progress"; Busuu's correction unmoderated/async; Lingu needs paid humans). Academic spine = **Swain's Output Hypothesis** (input alone → weak production; output drives acquisition via noticing/hypothesis-testing/reflection). Balanced grammar+pronunciation feedback = **37% faster accuracy gains** than pronunciation-only. [Confirmed]

---

## Brainstorming Fuel (directions for the downstream layout + design steps)
1. **"One passage, persistent spine"** — `/skriv` as a single surface where the B1 passage docks/shrinks as you advance read→recite→write; thin 3-segment stepper is the only continuity chrome → validated by Duolingo Stories + Beelinguapp change-in-place → buildable with Framer `AnimatePresence` + a sticky glass passage card.
2. **"Compare, don't grade" recite** — two equal play buttons (model | you) + 3-way Norwegian self-report, zero %, logged as the production signal → validated by Speak + Speechling → reuses existing `ShadowingExercise`.
3. **"Checklist that climbs, never a score"** — live deterministic criteria beside the textarea flipping muted→checked, count not %, amber-additive AI layer → validated by password-checklist + Wix +26% + graceful-degradation lit → buildable with shadcn + Framer + `aria-live`.
4. **"One log, level-lens wall"** — brick→daily→weekly where B1 reads as a *production meter* and B2 as a *coverage meter* from the same brick log → validated by Strava Fitness/Freshness + Memrise My Words → buildable as a derived aggregation over fingerprint events.
5. **"The brick travels"** — proportional, inspectable brick-lay micro-animation (brick flies action→wall, sized to real weight, none on a wrong answer) → validated by Forest + Apple rings + GitHub heatmap → buildable with Framer layout animation.

---

## Honesty hard-rails carried from research (every direction must hold these)
- No fake/derived percentage anywhere (speaking OR writing). Self-report + binary criteria only.
- Unmet criterion = neutral "not yet", never red-before-attempt.
- AI-down = a normal, additive-subset mode in warm amber — never an error state.
- Every brick traces to a real fingerprint/SRS write; a wrong answer lays no brick.
- Guided/scaffolded output is honestly tagged + visibly worth less than free production.
- A passage never "counts" without the production (write) step (3 bricks, not 1).

---

## Gap Analysis (consistent across competitors, 2+ sources each)
- No automated, trustworthy, **root-cause** written-output feedback exists in the Norwegian space. (Lane D, 3+ sources)
- The **read→produce bridge** (read a passage → produce spoken + written response about it) is essentially unshipped. (Lane D)
- AI tutors' **forgiveness** creates documented "false sense of progress" at B1→B2 — honesty is a category-differentiating stance. (Lane D, 2 sources)

---

## Scoring Appendix
Lanes: 4/9 (UX-pattern-targeted variant). Products/patterns evaluated: ~30. Pedagogy anchors: Swain Output Hypothesis, Gradual Release / scaffold-fade, retell→summarize ladder. Conflicts: 0 material. Research tool degradation: perplexity + Exa keys 401 (WebSearch/WebFetch fallback used throughout).
