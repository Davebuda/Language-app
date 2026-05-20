# Validation & Research

The research findings that justify every engineering decision in NorskCoach. Read this when you wonder why a choice was made. The decisions live in `CLAUDE.md` and `docs/roadmap.md`; the reasoning lives here.

Two external research passes inform this document: one on zero-cost muntlig solutions (open-source TTS, pronunciation scoring options, content sources, branching strategies), and one on engine validation (model quality, SRS algorithms, decay curves, mastery formulas, cold-start reliability, fingerprint architecture, and competitive position).

---

## On the Local Model

**The decision:** Switch from vanilla Llama-3.2-3B to NB-Llama-3.2-3B.

**The reasoning:** Vanilla Llama-3.2-3B has known failure modes on Norwegian — English drift mid-sentence, V2 word-order violations, and fabricated compound words. The National Library of Norway has released NB-Llama-3.2-1B and NB-Llama-3.2-3B specifically fine-tuned on Norwegian Bokmål and Nynorsk from public-domain Norwegian corpora. Same architecture as the model already loaded, same runtime via web-llm. The swap is mechanically a model identifier change.

**The honest limits:** Even Norwegian-specialized models have reliability issues — red-teaming research shows roughly 50% failure rate on certain edge cases (slang, value-laden content). Validate output with at least one fluent Norwegian speaker before claiming the swap is done.

**Why this matters disproportionately:** Every AI feature already shipped — conversation, constraint evaluation, semantic translation grading — has been running on a degraded model. The cost of the swap is one config change; the benefit is fixing a silent quality problem across the whole AI surface.

---

## On Spaced Repetition

**The decision:** Keep the fixed ladder (1 → 3 → 7 → 14 → 30 days) for v1. Plan FSRS or ARTS-style adaptive scheduling for v2.

**The reasoning:** FSRS (Free Spaced Repetition Scheduler) and ARTS (Adaptive Response-Time Sequencing) outperform fixed ladders by capturing per-learner forgetting curves. Research shows 20–30% reduction in review load with maintained or improved retention.

But — and this is the critical nuance — grammar is procedural knowledge, not pure declarative recall. Spaced repetition for procedural skills reinforces *when to apply a rule*, not just *what the rule is*. The concept dependency graph (preventing dative practice before noun gender is solid) is more impactful for grammar learning than the spacing algorithm itself.

In other words: the fixed ladder is the smaller lever; the dependency graph is the bigger one. NorskCoach has the dependency graph. Migrate to FSRS later when there's usage data to tune against.

**The honest limit:** v1 fixed ladder is "adequate and defensible" per the research — not optimal. Plan the v2 migration; don't rush it.

---

## On The Decay Model

**The decision:** Keep the floor of 35 (concepts don't decay to zero). Reduce the half-life from 46 days to ~25 days.

**The reasoning:** Decaying toward a floor (not zero) is research-supported. Duolingo's Half-Life Regression model uses the same principle — learners retain some latent knowledge even after long absences. A "rusty but recoverable" floor of 35 matches real learner behavior.

The half-life is the issue. Cambridge research on adaptive forgetting curves and applied research on language retention both show the steepest decay happens in the first month. A 46-day half-life is too slow — it lets concepts drift for too long before review surfaces them. Shortening to ~21–30 days catches forgetting earlier without over-reviewing.

**The honest limit:** Real forgetting curves vary per learner and per item. A fixed half-life of 25 days is a defensible default for v1. v2 should personalize per learner using something like Duolingo's HLR approach.

---

## On The Mastery Formula

**The decision:** Keep the phase-adaptive EMA with slip detection. Plan Bayesian Knowledge Tracing (BKT) for v2 if data justifies it.

**The reasoning:** BKT explicitly models four parameters per skill: p(initial-mastery), p(transit) — probability of learning after practice, p(slip) — probability of mistake when mastered, p(guess) — probability of correct without mastery. It's more principled than EMA and is the standard in intelligent tutoring systems.

The slip detection currently in NorskCoach (a wrong answer after 4-of-5 recent correct counts at 30% weight) is a hand-tuned approximation of BKT's p(slip) parameter. It captures the same insight: distinguish performance lapses from competence gaps.

For v1, the EMA approach is "good enough." Migrating to BKT in v2 buys interpretability and principled hyperparameter tuning. Not urgent.

**The honest limit:** EMA hyperparameters were chosen by intuition, not by fitting to real data. When there's usage data (after the event log is in place), retune them. BKT migration would naturally fall out of that exercise.

---

## On The Diagnostic Placement Test

**The decision:** Keep the 12-question adaptive test. Add a calibration window for the first 5 sessions.

**The reasoning:** 12 questions is on the low end for adaptive placement. Norskprøven (the official Norwegian test) uses 30–50+ questions across reading and listening. Oxford's adaptive vocabulary test uses 40. With well-calibrated IRT, 12 questions can place a learner within ±1 CEFR sublevel — but accuracy depends on item bank quality and the difficulty spread of the questions, not just the count.

Realistic accuracy with 12 questions: roughly 75–85% placement accuracy. The 15–25% misplacement rate will be corrected over the first few real sessions as actual performance data accumulates.

The calibration window addresses this directly. Flagging the first 5 sessions as "calibration mode" — gathering data aggressively, personalizing less aggressively — prevents the adaptive engine from over-fitting to a potentially-inaccurate placement.

**The honest limit:** A larger question bank and a longer diagnostic would improve placement accuracy, but at the cost of friction during onboarding. The 12-question + calibration-window combination is a reasonable balance.

---

## On Constrained-Response Practice

**The decision:** Keep it. The current phase-adaptive ratio is correct.

**The reasoning:** Swain's Output Hypothesis and Conti's EPI methodology both validate constrained production. Research shows that unconstrained free production lets learners avoid difficult structures — they rely on communication strategies that bypass the actual learning. Constraints force noticing of target structures.

Krashen's counter-argument (forced output raises affective filter) applies to high-stakes production. Low-stakes practice with gentle repair loops — which is what NorskCoach has — does not trigger the filter.

EPI methodology suggests 60–70% constrained practice early in concept introduction, dropping to lower ratios as mastery increases. NorskCoach's phase model already handles this naturally: intro/practice phases get heavier constraints; consolidation/maintenance phases get lighter. No change needed.

**The honest limit:** No specific research defines "optimal constraint ratio." The phase-adaptive approach is defensible but unproven. Worth measuring once event logging is in place.

---

## On The Input/Production Balance

**The decision:** Keep the user preference (input-heavy / balanced / production-heavy). Set per-level defaults: A1 input-heavy, A2/B1 balanced, B2 production-heavy.

**The reasoning:** SLA research is consistent: A1 learners need comprehensible input first to build mental models. Pushing production too early raises the affective filter and causes fossilization. B2 learners benefit more from production practice because the mental models are in place; what's missing is automaticity. A2–B1 is the crossover zone where balance serves best.

The user-overridable preference is smart — it lets anxious learners shift toward input even at B2, and confident learners shift toward production even at A1. The level-based defaults give a sensible starting point.

**The honest limit:** "Optimal ratios" are not precisely defined by research. The defaults are reasonable; let users tune them based on their own experience.

---

## On Cold-Start Adaptation

**The decision:** Add a calibration window of 5 sessions where the engine gathers data more aggressively and personalizes less aggressively.

**The reasoning:** BKT and IRT models require multiple observations to estimate parameters reliably. Diagnostic-seeded estimates have wide confidence intervals — the engine has data from one source (the test), not from multiple practice contexts. Production adaptive learning systems handle this with explicit warm-up periods. Duolingo combines placement with Half-Life Regression updates per interaction; most adaptive tutors weight early sessions less heavily.

The cold-start trace earlier confirmed the engine mechanically adapts from session one — but this research clarifies that "adapts" should mean "tentatively, with awareness that the data is thin." Hence the calibration flag.

**The honest limit:** The exact number of calibration sessions (5) is a guess. Tune based on usage data.

---

## On The JSON Blob Fingerprint

**The decision:** Keep the JSON blob for v1. Add anonymized event logging now.

**The reasoning:** Local-first privacy is a real architectural choice — the fingerprint stays in IndexedDB, syncs to Supabase as a single column, and is never cross-user queryable. This is defensible for v1 and aligns with the privacy-as-feature positioning.

But it's an analytics trap. There's no way to ask "how many users struggle with dative case?" or "is the repair loop accelerating learning compared to control?" Modern adaptive systems use dual storage: local JSON for fast user-facing operations, anonymized event logs for analytics.

The fix is cheap: a separate `learning_events_log` table with anonymized records (concept, correct/incorrect, timestamp, anonymous session id). No user id, no content. Write fire-and-forget. Nothing reads it back in v1 — it exists for future analytics and for proving (or disproving) the moat.

**The honest limit:** Local-first as a marketing position is genuinely strong. Be transparent if user-level data is ever needed for product improvement — never silently route around the privacy promise.

---

## On The Competitive Position

**The decision:** Continue building. The moat is real but unproven without data.

**The reasoning:** Existing Norwegian apps have surface overlap with NorskCoach but none combine the same elements:

- **Lingu** has adaptive placement but not continuous adaptation. No repair loop. No fingerprint.
- **Babbel/Busuu Norwegian** have fixed curricula. Paid. No diagnostic coaching.
- **Norskprøven prep sites** are test practice, not adaptive learning.
- **NoW (Norwegian on the Web), Skapago, similar** — content-heavy, not engine-driven.

NorskCoach's genuine differentiators:
- Continuous adaptive engine (not just placement)
- Repair loop with mistake fingerprinting and root-cause diagnosis
- Zero per-user cost (all competitors charge or use cloud APIs)
- Speaking-first with production-gap tracking

The feature surface (SRS, exercise types) is table stakes. Everyone has those. The moat is the diagnostic coaching intelligence — but it's an architectural bet until usage data proves the repair loop accelerates learning versus simpler approaches.

This is why event logging matters. Not as analytics polish — as the only way to ever prove the moat is real.

**The honest limit:** "Differentiated architecture" is not the same as "differentiated outcomes." Without data, this is a thesis, not a proof. Validate as soon as there are users.

---

## On Pronunciation Scoring At Zero Cost

**The decision:** Permanent zero-cost pronunciation feedback is impossible. Build self-listening, rule-based heuristics, and metacognitive prompts instead. Document this honestly to learners.

**The reasoning:** Phoneme-level pronunciation assessment requires Goodness-of-Pronunciation (GOP) algorithms, acoustic models trained on non-native speech, and server-side processing (Kaldi, Azure Speech SDK, Speechace — all paid or complex). Web Speech API transcribes intent, not phonetic accuracy. Mispronunciations get auto-corrected before the system sees them. There is no free, browser-based phoneme-level analysis library.

The viable zero-cost path: self-listening playback (learner hears native audio vs. their own recording), rule-based heuristics for predictable Norwegian errors English speakers make (kj/sj confusion, /y/-vs-/u/, dropped pitch accent, retroflexes), and metacognitive reflection prompts ("which words felt hard?"). Research is explicit that this is pedagogically valid: confidence is built through volume of practice with self-reflection, not through precision of feedback.

**The honest limit:** The app cannot promise pronunciation correctness feedback. The product framing must be about practice volume and self-monitoring, not about being graded on every phoneme.

---

## On Audio Generation At Zero Cost

**The decision:** Batch-generate audio with chatterbox-tts-norwegian (Norwegian-trained open-source TTS). Supplement with a small native-recorded corpus for canonical shadowing sentences.

**The reasoning:** Two production-ready open-source Norwegian TTS models exist: akhbar/chatterbox-tts-norwegian (6000 hours training, free for educational use) and akhbar/F5_Norwegian (National Library of Norway data, AFL-3.0 license). Both run server-side, not in-browser.

The right pattern is to batch-generate audio offline (hundreds of sentences rendered to static files) and serve them as ordinary static assets. Storage is cheap; no per-user cost; no model loading in the browser.

For shadowing specifically, where prosody matters most, pre-record 50–100 exemplar sentences with a human native speaker. Two to three hours of recording covers the high-value content. Use the small native corpus for canonical examples; use TTS-generated audio for the long tail.

**The honest limit:** TTS quality, even Norwegian-specialized, is roughly 85% of native quality. Prosody is the gap. For shadowing's pedagogical purpose (internalizing rhythm), this gap matters — hence the small hand-recorded native corpus on top.

---

## On Content Sourcing At Zero Cost

**The decision:** Use the NoCoLA dataset as the primary seed corpus. Supplement with NB-Llama batch generation for variety. Use Språkbanken and NTNU materials for curated additions.

**The reasoning:** The Norwegian Corpus of Language Acceptability (NoCoLA) contains 144,867 sentences from real B1–B2 learners, manually corrected by native speakers. Free, publicly available on GitHub.

This is enormous. It's not just content — it's error-annotated content. NoCoLA sentences slot directly into the error taxonomy and fingerprint pipeline. The app inherits a 144k-sentence native-corrected starting corpus rather than generating from scratch.

NB-Llama-3.2-3B, after the model swap, generates additional sentences with explicit CEFR constraints. Manual spot-check on 10%; accept the rest. Combined with NoCoLA, content scale becomes a non-issue.

**The honest limit:** NoCoLA is learner-written content with corrections — it's not necessarily the corpus of canonical native sentences. Pair it with curated native examples from NTNU and Språkbanken for the highest-quality drills.

---

## On Roleplay Branching

**The decision:** Semi-structured scripts with fuzzy matching and always-allow-progression. Not rigid scripts. Not AI-driven real-time branching.

**The reasoning:** Real implementations of speaking practice apps (Shadow on iOS, Natulang, others) avoid AI-driven real-time branching because of latency (1–3 seconds per turn kills conversational flow) and unpredictability (the model accepts nonsense or rejects valid responses). They use predefined response sets with fuzzy matching or visual-feedback patterns like karaoke-style highlighting.

The semi-structured approach handles three response types per branch:
- Primary expected responses (strict matching)
- Semantic equivalents (looser matching with token-set ratio)
- Fallback: accepts any reasonable response, surfaces the model answer, continues

Always-allow-progression is the key principle. Learners don't get stuck on a creative-but-valid response. The repair loop handles the deeper learning of what they fell short on.

Use the local AI for generating initial conversation trees offline, never for real-time branching decisions.

**The honest limit:** Pre-authored scripts feel less spontaneous than open AI conversation. The tradeoff is reliability and CEFR-vocabulary discipline. Open AI conversation is what `/conversation` is for; muntlig roleplay is structured practice.

---

## On Listen-and-Respond Timing

**The decision:** Visible 5-second JavaScript countdown wrapping the Web Speech API's uncustomizable timeouts.

**The reasoning:** Web Speech API has hardcoded timing constraints — 3-second silence triggers `onspeechend`, recognition auto-stops at 60 seconds. Neither is customizable. The fix is a JavaScript timer that controls recognition lifecycle independently of the API's internal timeouts.

A visible countdown (progress bar or numeric counter) creates productive pressure without surprise anxiety. The learner knows exactly how much time remains. Slow-device handling: show "Listening..." on mic activation, display interim transcripts, warn if `onstart` takes more than 500ms, provide a manual Skip button.

**The honest limit:** Browser audio permissions can fail silently. Microphone activation latency varies by device. Listen-and-respond will be a worse experience on older mobile browsers. Acceptable for v1.

---

## What The Research Did Not Resolve

Some questions remain genuinely open after both research passes:

1. **Will NB-Llama-3.2-3B's Norwegian be good enough in practice?** The research says it's the right model to use, but real-world output quality requires actual testing with a fluent speaker. Validate after the swap.
2. **What is the optimal calibration window length?** Five sessions is a defensible guess. Tune with data.
3. **What are the per-learner optimal decay half-lives?** v1 uses a global ~25 days. v2 would personalize via Duolingo-style HLR. Data-dependent.
4. **Will the moat (repair loop + fingerprint) actually accelerate learning vs. simpler approaches?** The architectural bet is unproven without usage data. Event logging is the path to evidence.

These four questions are not blockers. They are areas where future evidence will refine current decisions. Capture them as questions for the post-launch period when there are real users producing real signal.
