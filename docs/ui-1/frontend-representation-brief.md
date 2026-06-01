# NorskCoach — Frontend Representation Brief
**Date:** 2026-06-01
**Scope:** Make the *existing* adaptive engine visible, legible, and motivating. **Representation only — no new learning features.**
**Status:** Research-backed design brief. NOT an implementation order. Any build is gated (see §6).
**Inputs:** 4 parallel research lanes (competitor UX, learning science, Scandinavian/mobile patterns, current-UI inventory). Citations inline.

---

## 0. The one idea this brief is built around

> **NorskCoach should be the coach that shows its reasoning — calmly.**

Every competitor (Duolingo, Babbel, Busuu, Mondly, Khan) **adapts silently and presents simply.** None tells the learner *why* a given exercise was chosen. NorskCoach already computes a `selectionReason` for every item (`weak_concept | review_due | decaying | new_material | interleaving | weekly_focus | repair_target | cold_start`) and a root-cause diagnosis — the exact thing the market hides and partly paywalls (Duolingo Max's "Explain My Answer"). **Surfacing that reasoning, in plain Norwegian, one line at a time, is the single differentiated frontend move.**

The discipline (the transparency paradox): explain the **immediate, local decision** — never the whole algorithm. Local "why this, now" explanations scored 81–87% comprehension vs ~55% for full-model explanations ([Wang 2024, BJET](https://bera-journals.onlinelibrary.wiley.com/doi/10.1111/bjet.13466); [arXiv 2601.13973](https://arxiv.org/pdf/2601.13973)).

This idea also satisfies the project's hard rails: it deepens the existing moat (diagnosis/scheduling/remediation) rather than adding surface, and it makes the engine's invisible work honest and visible (Operating Rules 1, 8).

---

## 1. Strategic recommendations — the 10 representation problems

Each: **pattern → evidence → fit → what it replaces.**

### 1. Daily sprint representation
**Pattern:** A pre-session **agenda card** — "Dagens økt" shows the 3-block shape (Lytt N · Lær N · Snakk N), the 1–3 focus concepts being targeted, and a one-line *why* per block. One screen, then "Start økt".
**Evidence:** No competitor previews session composition — they front-load only a daily-time goal ([Duolingo path](https://blog.duolingo.com/new-duolingo-home-screen-design/)). Khan's Mastery Challenge previews *structure* (6 Q / 3 skills) and that legibility is well-liked ([KA](https://support.khanacademy.org/hc/en-us/articles/360037494231)). Local rationale aids trust without overload (§0).
**Fit:** The scheduler's intelligence is the moat; showing the agenda is the cheapest proof it's real.
**Replaces:** Today launch is *just a button* — `SessionScreen` calls `startNewSession()` on mount and drops you into item 1. The only hint is the hero subtitle "{N} oppgaver · ca. {min} min." The scheduler's work is invisible at the moment it matters most.

### 2. Fingerprint visibility
**Pattern:** A single **"Din profil hos coachen"** home for diagnosis — a controllable, current-state map: each weak concept shown as *state + trend + next action* ("Substantivkjønn — på vei opp · 3 repetisjoner igjen"), never a static trait label. Tappable straight into remediation.
**Evidence:** Open Learner Models improve self-regulation **when framed as a navigable map of next actions, not a verdict** ([OLM review](https://www.sciencedirect.com/science/article/abs/pii/S0360131520300774)). Weakness-as-controllable + a clickable fix is the motivating frame; weakness-as-trait is the discouraging one (self-efficacy literature, [PMC12176877](https://pmc.ncbi.nlm.nih.gov/articles/PMC12176877/)).
**Fit:** Diagnosis is the strongest moat leg but is currently the *least* visible.
**Replaces:** The fingerprint is fragmented across 4 surfaces (dashboard Fokus, profile weak-3 + raw error tags, progress, session-complete). The SRS review queue is **never shown as a list**. Error tags render **raw/untranslated on Profile** but nicely labelled on session-complete — an inconsistency. The literal product moat has no legible home.

### 3. Weekly rhythm clarity
**Pattern:** Make the week a visible **cycle**: focus announced at week-open → day dots fill as you practice → mid-week reveal → Saturday `/uke` check → graduation/close. A compact week-strip on the dashboard (days + focus chips + "3 av 7 dager") and a real cycle frame on `/uke`.
**Evidence:** Goal-gradient effect — show progress against the **near** sub-goal (the week), not the A1→B2 horizon ([goal-gradient](https://learningloop.io/plays/psychology/goal-gradient-effect)). A renewable weekly cycle avoids the catastrophic-loss dynamic of an ever-growing streak ([streak-creep critique](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)).
**Fit:** The Weekly Sprint engine (`weekly-sprint.ts`) is fully built; it's the healthiest motivator NorskCoach has.
**Replaces:** `/uke` is a **generic quiz with a score screen** — no day-of-week, no focus list, no cycle. The rich day-by-day model exists only in **`WeekStrip.tsx`, which is orphaned and never rendered.** The weekly model is invisible to the user.

### 4. Multi-modality navigation
**Pattern:** **Session loop primary; everything else is a hub-of-cards.** A 4–5 item tab bar (Hjem · Økt · Muntlig · Profil) + dashboard cards for the rest, each tagged with the *same fingerprint signal* ("Øver: verbtider"). Add a single "Anbefalt nå" smart entry that routes to the surface the engine wants next.
**Evidence:** Material caps bottom nav at 3–5 destinations; overflow → hub, not a 6th tab ([Material](https://m2.material.io/components/bottom-navigation)). Autonomy (SDT) — let the learner choose the surface — sustains intrinsic motivation ([SDT](https://en.wikipedia.org/wiki/Self-determination_theory)).
**Fit:** 10 surfaces is a genuine richness; the job is ordering, not hiding.
**Replaces:** **Two parallel nav systems** today — BottomNav (Lær→/session, Øv→/conversation) and dashboard lanes (Økt→/session, Snakk→/conversation) use *different labels for the same destinations.* No tab is visually elevated as primary.

### 5. Progress & motivation
**Pattern:** Lead with **competence feedback** (visible mastery growth, concepts moved up this week), near-goal framing, and the Weekly Sprint. Keep a streak only as a *gentle, forgiving* habit cue — never the headline. No XP, no leagues.
**Evidence:** Overjustification effect — task-contingent rewards undermine intrinsic motivation (Deci/Koestner/Ryan, 128 studies, [SDT](https://en.wikipedia.org/wiki/Self-determination_theory)). Duolingo admits users "optimized for crowns instead of learning." Duolingo's own data: engagement minutes correlated with *written* but not *oral* gains ([Plonsky et al.](https://benjamins.com/catalog/jsls.00021.plo)).
**Fit:** Janteloven/anti-hype culture (§ visual) rejects loud gamification; honest progress *is* the Norwegian reward.
**Replaces:** Dashboard stat strip (Rekke/Min talt/Treff) is fine but generic; the hero "Tips" tile is **static hardcoded V2-content** that contradicts the adaptive positioning — cut it.

### 6. Repair-loop visibility
**Pattern:** Keep the inline `ExplanationCard` (it's the best card in the app) and make the **moat visible inside it**: show the *cause tag* in plain Norwegian ("Årsak: kjønn på substantiv") and the *scheduled follow-up* ("Du ser denne igjen om 3 dager"). Add a lightweight **"Reparert denne uka"** history on the fingerprint home.
**Evidence:** Corrective feedback works (Li 2010 meta-analysis, **d≈0.64**, maintained over time); **explicit metalinguistic** feedback helps most for rule-based features (articles, conditionals); **immediate** feedback wins in text/computer-mediated contexts ([Li 2010](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-9922.2010.00561.x); [CF timing review](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1026174/full)). Deep "why wrong" is **paywalled** everywhere (Duolingo Max); NorskCoach does it free *and* with root cause.
**Fit:** This is the sharpest moat-aligned advantage — the one thing the market both hides and charges for.
**Replaces:** The repair card is strong but treats the diagnosis as internal; the *root-cause* and *SRS schedule* (the proof the engine is coaching, not quizzing) aren't foregrounded.

### 7. Level progression clarity
**Pattern:** A real **graduation moment** — a full-screen, earned, calm celebration: "Du har fullført A1" + a Busuu-style summary of what you can now do + the new level's first focus. Show progress as **% to next level** (near goal), tied to *demonstrated mastery*, not lessons done.
**Evidence:** Busuu's CEFR certificate makes level-up a concrete, motivating artifact ([Busuu certification](https://www.busuu.com/en/languages/certification)); Duolingo's lack of an explicit CEFR moment is a known soft spot. Earned-by-mastery satisfies pipeline-honesty (no XP-for-time).
**Fit:** The mastery-gated ladder (every concept ≥ threshold) makes graduation genuinely *earned* — celebrate that honestly.
**Replaces:** Today the biggest moment in the product is a **4-second auto-dismissing toast** on the dashboard, easily missed. Severely under-weighted.

### 8. AI transparency
**Pattern:** Keep the AI mode **contextual and plain**, not a persistent technical badge. On surfaces where AI matters, a quiet line: "Forklart av AI" vs "Standardforklaring." In Profile, the existing Lokal/Sky/Maler section explains mode in plain language — keep that as the single detailed home.
**Evidence:** Plain-language (klarspråk) is a Norwegian civic standard ([Designsystemet](https://designsystemet.no/en/fundamentals/introduction/about-the-design-system/)); predictions + a brief rationale raise trust over raw output, but over-explanation overloads (§0). Duolingo Max acknowledges AI explanations can be wrong — labelling source sets honest expectations.
**Fit:** Honest banners over silent fallbacks (Rule 6) — labelling template vs AI is the honest version.
**Replaces:** `AIStatusBadge` appears on dashboard + session header somewhat decoratively; the meaning ("why does quality vary?") isn't conveyed where it matters.

### 9. Mobile-first interactions
**Pattern:** Bottom-center **sticky primary CTA** in the thumb zone (~100–150px from bottom); ≥44px touch targets even within dense cards; **mic in the thumb zone with a waveform/pulse recording state** + in-context permission priming; **inline audio with replay + slow** (not a music-style mini-player); **tap-to-place fallback for word-order** (drag fights scroll on 375px); body learning text **≥16px** with a contrast audit over glass.
**Evidence:** Thumb-zone tap accuracy ~96% natural vs ~61% stretch ([thumb zone](https://parachutedesign.ca/blog/thumb-zone-ux/)); ≥44px targets (Material/Apple/NN/g); drag-and-drop is imprecise on touch and conflicts with scroll ([NN/g drag](https://www.nngroup.com/articles/drag-drop/)); language players foreground phrase-repeat/slow ([JALT CALL](https://www.castledown.com/journals/jaltcall/article/view/jaltcall.v20n2.1159)); mic permission in-context ([ElevenLabs](https://ui.elevenlabs.io/docs/components/live-waveform)).
**Fit:** Mobile is the primary device and the speaking surfaces (the north star) live or die on mic UX.
**Replaces:** The app is a 375px column already (good). Gaps: no confirmed thumb-zone CTA discipline, word-order uses raw drag (`split(' ')`), and the dense 7–9px label system risks sub-44px targets and sub-16px learning text.

### 10. Onboarding & first-day experience
**Pattern:** Frame the diagnostic as **"en 5-minutters test for å finne dine svake punkter"** (estimate, not exam) and deliver first success *inside* it; replace fabricated intro demos with the learner's *own* emerging result. Learn-by-doing, not a tutorial.
**Evidence:** Duolingo/Busuu frame placement as a quick ~5-min adaptive estimate and reach first-success in ~5 min ([Duolingo onboarding](https://www.junoschool.org/article/duolingo-onboarding-experience/)); Busuu uses the same IRT/CAT engine class NorskCoach does ([Busuu Tech](https://tech.busuu.com/the-busuu-placement-test-part-i-computerised-adaptive-testing-cat-e6e77177889b)).
**Fit:** The diagnostic already uses honest placement framing and the assessment-surface English-instructions rule.
**Replaces / FIXES (honesty defects):** Intro slides show **fabricated demo numbers** (fake concepts "V2-regelen · Svakt 41%", hardcoded "Klar/Aktiv/1 minne" strip) presented as if real — a slop/honesty-rule violation. There's also a **mojibake bug** (`'02 / LÃ¦ringsminne'`). These must be fixed regardless of redesign.

---

## 2. Information architecture

**Primary structure (mobile, 375px):**
- **Tab bar (4):** `Hjem` · `Økt` · `Muntlig` · `Profil` — odd/even kept ≤5, Lucide stroke icons + text labels. (Resolves the dual-nav conflict; `Øv`/`Fremgang` fold into Hjem/Profil.)
- **Hjem (hub):** week-strip → **"Anbefalt nå"** smart entry → session agenda card → hub-of-cards for the other surfaces (journal, reading, conversation, roleplay), each tagged with its current fingerprint signal.
- **Muntlig:** the three speaking modes (shadow/drills/listen) + roleplay as a card hub (preserve the existing pattern).
- **Profil:** identity, level + graduation history, the AI-mode detailed home, session-style toggle.

**Where the engine data lives (consolidated, not scattered):**
- **Diagnosis (fingerprint):** one home — promote from fragments to a dedicated, legible "coachen ser" surface reachable from Hjem and Profil.
- **Weekly:** dashboard week-strip (glance) + `/uke` (the Saturday check, reframed as cycle close).
- **Progress:** keep as the deep analytics view (mastery, phases, `WeeklyTrajectory`).
- **SRS queue:** a single inviting "Klar til repetisjon" affordance — **never a raw due-count badge** ([backlog anxiety](https://migaku.com/blog/language-fun/spaced-repetition-in-2026-how-it-actually-works)).

**Desktop:** same column, widened to a two-pane reading width only on analytics/progress; learning surfaces stay phone-width (immersion + the existing constraint).

---

## 3. Interaction patterns

- **Launch a sprint:** Hjem → agenda card (shape + focus + why) → sticky bottom "Start økt" → block-by-block, each item carries a one-line `selectionReason` in plain Norwegian.
- **Repair:** wrong answer → inline `ExplanationCard` slides in (immediate, text-CMC) → explicit cause tag + correct answer + optional rule → "Prøv igjen" → on retry, a quiet "Planlagt repetisjon om 3 dager" confirms the SRS write.
- **Weekly check:** Saturday → `/uke` opens framed as "Lukk uka" → retrieval items → close screen shows focus-concept deltas + promote/demote + next week's focus.
- **Level-up:** mastery gate passes → full-screen earned celebration (calm, one accent, no confetti spam) → "what you can now do" + new focus → into first A2 session. Replaces the 4s toast.

---

## 4. Visual design principles

- **Anti-hype, plain language (Janteloven + klarspråk).** No "Amazing! Crushing it!" Quiet, factual: "Du tar igjen substantivkjønn — 3 av 4 riktig denne uka." Microcopy is a first-class deliverable ([Vipps](https://medium.com/bakken-b%C3%A6ck/orange-vibes-for-a-bright-future-how-we-redesigned-norways-1-app-ab9452579fb4); [Markly/Janteloven](https://markly.no/en/blog/marketing-norway-localization-guide)).
- **One confident accent.** Keep lime `#C8FF20` as the single signal for primary action + mastery progress; neutral/dark + cream as canvas. Hierarchy by subtraction and weight, not color proliferation.
- **Named mastery, humane decay.** Adopt Khan's legible named levels (map existing phases: intro→*Ny*, practice→*Øver*, consolidation→*Befestner*, maintenance→*Mestret*) — translate the jargon. Surface decay as **"trenger en oppfriskning,"** never "you lost mastery" (the most-hated Khan mechanic; NorskCoach's floor-of-35 decay is the humane answer).
- **Near-goal progress.** Always show progress to the *nearest* sub-goal (concept rep count, week, next CEFR band) — never only the A1→B2 bar (goal-gradient).
- **Feedback states:** success = quiet confirmation; error = the repair card (red accent, supportive); repair = visible cause + schedule. No punitive language.
- **Icons & motion:** Lucide/SVG stroke only — **no emoji as UI icons**; recording state = waveform/pulse, not 🎤. Keep Framer Motion at the existing 0.18–0.24s restraint; honor `prefers-reduced-motion`.
- **Readability floor (hard):** learning Norwegian text ≥16px, 35–45 char measure, and **audit 4.5:1 contrast over every glass/translucent surface** — density comes from chrome economy, never from shrinking learning text or tap targets below the floor.

---

## 5. Prioritized implementation roadmap (3 waves)

Ranked by: learner-clarity impact × north-star alignment × mobile-necessity, against implementation cost.

### Wave 1 — Make the engine visible + fix honesty defects *(highest impact, low–medium cost, no engine dependency)*
1. **Session agenda card** (Problem 1) — the signature differentiator; pure UI over existing scheduler output.
2. **Repair card: surface cause tag + SRS schedule** (Problem 6) — small change to the strongest card; biggest moat-proof per effort.
3. **Honesty fixes (Problem 10):** remove fabricated onboarding demo data, fix the `LÃ¦ringsminne` mojibake, delete the static dashboard "Tips" tile. *These are Operating-Rule-6 violations — do regardless.*
4. **Level-up celebration** (Problem 7) — replace the 4s toast with an earned full-screen moment.

### Wave 2 — Consolidate the moat surfaces *(medium cost)*
5. **Fingerprint home** (Problem 2) — one legible, controllable, next-action diagnosis surface; translate error tags consistently.
6. **Weekly rhythm** (Problem 3) — revive a real week-strip + reframe `/uke` as the cycle close; retire orphaned `WeekStrip.tsx` or rebuild it into the live page.
7. **Nav consolidation** (Problem 4) — resolve the dual-nav conflict; tab bar + hub-of-cards + "Anbefalt nå."

### Wave 3 — Polish, motivation, mobile hardening *(medium cost, partly dependent on visual system)*
8. **Progress visualization** (Problem 5) — break the monotonous bar-stack; per-concept trend; near-goal framing.
9. **Level color/theme system** (Problem 7 cont.) across A1–B2.
10. **AI transparency polish** (Problem 8) — contextual plain-language source labels.
11. **Mobile interaction hardening** (Problem 9) — thumb-zone CTA discipline, mic waveform + in-context permission, inline audio replay/slow, **tap-to-place word-order fallback**, ≥16px + glass-contrast audit.

Every built surface must pass the project gate: render at 375/768/1280/1920 → `/baseline-ui` → `/fixing-accessibility` → `/fixing-motion-performance` → `/polish`.

---

## 6. GATE — read before building anything

This brief is a **document**; producing it is safe. **Implementation is blocked** until two prior decisions are settled:

1. **Audit Gap A/B sequencing (open).** A frontend that better "represents content depth" while the **mobile AI content-supply path silently repeats passed sentences** (`ServerAIService.generateContent` returns `null`; no `generate` action in `/api/ai`) would be polishing a surface over a known honesty defect. Resolve Gap B (honest exhaustion banner or working server generation) and decide Gap A (pushed-output exercise types) sequencing first.
2. **Architect sign-off on wave ordering.** Per Operating Rule 2, this is a reversible architectural choice — take Wave 1 to the `architect` subagent before writing code.

**Cross-cutting honesty note:** Wave 1 item 3 (onboarding fabricated demo data, mojibake, static "Tips" tile) are *current* defects, not redesign work. They can be fixed independently and immediately without waiting on the gate.

---

## Appendix — strongest evidence pillars (build confidently) vs directional (hold loosely)
**Strong:** testing/spacing effect; overjustification effect; SDT; goal-gradient + endowed-progress; corrective-feedback d≈0.64; immediate feedback in text-CMC; thumb-zone + ≥44px targets; drag-conflicts-scroll on mobile.
**Directional (don't over-index):** growth-mindset *interventions* (small/heterogeneous effects); CF *timing* in general; streaks' long-term harm (theory + qualitative, not RCT); exact transparency-overload thresholds.
**Tooling caveat:** Perplexity MCP/CLI returned 401 (no key) this run; citations are WebSearch/WebFetch-sourced. Re-run with Perplexity enabled to deepen primary-source effect sizes.
