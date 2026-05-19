# Muntlig — Speaking Practice Architecture

The complete design for NorskCoach's speaking practice module. Zero per-user cost. Browser-based. Built on the existing adaptive engine.

This is the most literal embodiment of the speaking-first principle.

**Blocker:** cannot begin implementation until Phase A of the roadmap is complete (model swap to NB-Llama-3.2-3B). Content generation depends on the model producing valid Norwegian.

---

## What Muntlig Is

Four modes of structured speaking practice, sharing one pipeline. Errors flow into the same fingerprint as session and journal errors.

- **Shadowing** — native audio plays, learner repeats, app shows expected vs. heard with side-by-side playback. Trains prosody and muscle memory.
- **Scripted roleplay** — situational dialogues (café, directions, work small talk) with branching based on what the learner says. Feels conversational, behaves structured.
- **Pronunciation drills** — focused practice on Norwegian sounds that trip English speakers (kj/sj, ø, retroflexes, /y/, pitch accent). Micro-focused, high-rep.
- **Listen-and-respond** — Norwegian question played, 5-second response window. Trains comprehension + production under mild time pressure.

---

## The Pipeline (Shared Across All Four Modes)

```
USER speaks → Web Speech API (free, Chromium) → text
                                                  ↓
                          Fuzzy-match expected / NB-Llama error detection
                                                  ↓
                                      Update mistake fingerprint
                                                  ↓
                                      Engine picks next prompt
                                                  ↓
                          Pre-generated native audio (static file)
                                                  ↓
                                          USER listens → speaks
```

Every component is free. Audio is pre-generated, served as static files. No per-user API costs.

---

## The Three Solved Problems

### Audio at scale — batch-generated open-source TTS

**Primary:** Chatterbox-TTS-Norwegian (6,000 hours of training data, free, server-side). Run once on dev machine to generate the entire audio corpus. Compress, serve as static files from the VPS.

**Supplementary:** 50–100 hand-recorded sentences from one native speaker (2–3 hours) for the highest-value shadowing content where prosody matters most.

Browser TTS is fallback only — quality too variable for shadowing.

### Pronunciation feedback — confirmed impossible at zero cost; the honest workaround

Phoneme-level scoring requires server-side GOP algorithms and paid acoustic models. Web Speech API auto-corrects mispronunciations before they're visible. Accept this and design around it.

**Self-listening.** Learner records, app plays native + learner side by side. Research shows metacognitive reflection builds fluency without automated scoring.

**Metacognitive prompts.** After each shadowing/drill: "Which words felt hardest?" Brief free-text, no AI evaluation needed, persisted to event logs.

**Rule-based heuristics.** Lookup table of predictable errors English speakers make (kj/sj confusion, dropped pitch accent, retroflexes, /y/ → /u/, /ø/ → /e/). When Web Speech transcribes a different word than expected (fuzzy-match below threshold), flag as a likely pronunciation issue and surface the matching heuristic.

This is pedagogically sound, not a compromise. Every successful indie speaking app avoids phoneme scoring and wins on volume of practice + self-reflection.

### Content at scale — NoCoLA + NB-Llama + light review

**Seed corpus:** NoCoLA dataset — 144,867 Norwegian sentences from real B1–B2 learners, native-corrected, free on GitHub. Already learner-error-annotated, which is uniquely aligned with this app's engine.

**Variation:** NB-Llama-3.2-3B batch-generates additional level-tagged sentences with explicit CEFR constraints in prompts. Validated against rule-based checks (sentence length, vocabulary frequency from Språkbanken, grammar complexity).

**Review:** 10% manual spot-check. Discard obvious errors, accept the rest.

---

## Mode Implementation Notes

**Shadowing.** Audio plays → mic activates → user repeats → Web Speech transcribes → word-level match display (green/yellow/red) → side-by-side playback → metacognitive prompt → next. Engine picks sentences targeting concepts in the user's practice/consolidation phases.

**Scripted roleplay.** Pre-authored scenario trees with 3–5 expected response variants per branch point. Fuzzy-match user input against variants; >70% match proceeds, lower triggers gentle repair but always allows progression. NB-Llama generates scenario trees offline; not used for real-time branching (latency and unpredictability). Author 8–10 scenarios for v1.

**Pronunciation drills.** Target sound → word/phrase audio → user repeats → transcription compared to expected → if mismatch matches the heuristic for that sound, surface the specific tip. The engine surfaces drill suggestions based on patterns in the fingerprint.

**Listen-and-respond.** Question plays → visible 5-second countdown → mic auto-activates → Web Speech transcribes within window → NB-Llama evaluates whether response addressed the question semantically → mastery updates. Visible timer creates productive pressure without anxiety; the JavaScript timer pattern handles Web Speech's silence-timeout quirks cleanly.

---

## Integration with the Existing Engine

No new architecture. The muntlig module composes existing layers.

- **Fingerprint** receives errors and speaking-minutes increments from every muntlig interaction, identical to session and journal flows.
- **Engine** picks content for each mode by reading the fingerprint (weak concepts, weak phonetic patterns, due-for-review concepts).
- **AI module** is used for content generation (offline, batch) and lightweight semantic checks (listen-and-respond evaluation, error tagging).
- **Repair loop** fires on muntlig errors exactly like session errors — same explanation templates, same SRS scheduling.

Muntlig is a consumer of the engine, not a parallel system.

---

## Build Sequence Within Muntlig (Phase C of Roadmap)

**C1.** Audio generation pipeline. Stand up Chatterbox-TTS-Norwegian locally. Generate the first 200 sentences from NoCoLA across A1/A2 levels. Validate sound quality.

**C2.** Shadowing mode. Simplest of the four, lowest-risk proving ground. Wire fingerprint integration. Verify mastery and SRS update correctly from shadowing errors.

**C3.** Pronunciation drills. Adds the heuristic table. Reuses the shadowing pipeline.

**C4.** Listen-and-respond. Adds time-pressure UI and NB-Llama semantic evaluation.

**C5.** Scripted roleplay. The most complex — branching trees, fuzzy matching, scenario authoring. Last.

Each sub-mode is shippable on its own. Don't wait for all four.

---

## What Muntlig is NOT

- Not a replacement for human conversation practice. It's structured solo practice.
- Not pronunciation grading. It's pronunciation awareness through self-listening and heuristic flags.
- Not infinite-conversation AI tutoring. That's the conversation mode already shipped.

Muntlig is the structured side of the speaking-first principle. Conversation mode is the open side. Both feed the same fingerprint.
