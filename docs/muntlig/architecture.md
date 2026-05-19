# Muntlig Module — Architecture

The full zero-cost speaking-practice system. This document is the spec for when the muntlig module is built. Every decision here is research-backed; see `docs/validation-and-research.md` for the underlying findings.

The muntlig module is the embodiment of the speaking-first principle. It is the next major build after the UI transformation converges, and it must not start until NB-Llama-3.2-3B is in place — there is no point generating Norwegian content with a model that produces bad Norwegian.

## The Four Modes

Four distinct surfaces, each training a different facet of speaking ability. They share the same audio, transcription, scoring, and content infrastructure, so the cost of building all four is not four times the cost of building one.

**Shadowing**
Native audio plays a sentence. The learner repeats it aloud. The app compares their transcript against the expected text and surfaces what they got and what they missed. Trains sound production, listening comprehension, and prosody — the rhythm of Norwegian.

**Scripted Roleplay Scenarios**
The learner picks a situation (ordering coffee, asking directions, introducing yourself at work). The app voices a character, the learner responds, the conversation progresses through pre-authored branches with fuzzy matching on the learner's spoken responses. Trains sentence formulation under context and conversational rhythm.

**Pronunciation Drills**
Focused practice on specific Norwegian sounds that trip up English speakers — kj, sj, ø, the rolled r, retroflexes (rd/rt/rn), pitch accent on two-syllable words. The learner targets one sound type per drill, hears native examples, produces minimal-pair words and short phrases. Trains targeted phonetics.

**Listen-and-Respond**
The app plays a Norwegian question. The learner has a fixed window (5 seconds) to respond aloud. Their response is transcribed and evaluated for whether it addresses the question. Trains real-time comprehension and the ability to produce under mild time pressure — the freezing-up problem that kills confidence in real conversations.

## The Audio Pipeline

The hardest problem at zero cost, solved with batch generation plus a small hand-recorded corpus.

**Generation Strategy**
Use chatterbox-tts-norwegian (open-source Norwegian TTS, trained on 6000 hours of Bokmål, Nynorsk, and dialects) to batch-generate the audio corpus offline. The model runs server-side (or on the dev machine) — it is not used in the browser. Generated audio is stored as compressed .wav or .mp3 files and served as static assets from the VPS or Supabase Storage.

This pattern is critical: there is no per-user audio generation cost, no API call latency, no model loading in the browser. Audio is a static asset like an image.

**The Small Native Corpus**
For shadowing specifically — where prosody matters most — pre-record 50–100 exemplar sentences with a human native Norwegian speaker. Two to three hours of recording covers the high-value content. Use this corpus for the shadowing canonical examples; use TTS-generated audio for the long tail of drill content where authenticity matters less than coverage.

**Audio Library Structure**
Every audio file is keyed to a sentence record (which already exists in the content database). Sentence records gain an `audio_url` field. Pronunciation drills and shadowing share the same audio asset for any given sentence. Listen-and-respond uses question-type sentences with their own audio.

## The Pronunciation Approach

Phoneme-level pronunciation scoring is impossible at zero cost. This is settled — confirmed by external research with sources in `docs/validation-and-research.md`. Web Speech API transcribes intent, not phonetic accuracy; mispronunciations get auto-corrected before the system sees them.

The muntlig module accepts this and builds something pedagogically valid instead. Three layers compose:

**Layer 1 — Self-Listening**
After every shadowing attempt and most drill exercises, the learner can play back the native audio and their own recording side by side. They hear the difference themselves. Research shows metacognitive self-comparison builds fluency even without automated scoring; it transfers to real-conversation self-monitoring.

This is the primary feedback mechanism, not a fallback.

**Layer 2 — Rule-Based Heuristics**
The app maintains a lookup table of predictable Norwegian pronunciation errors English speakers make: confusing /y/ with /u/, dropping pitch accent, mispronouncing retroflexes, English-style r where Norwegian r is rolled, vowel substitutions for ø and æ. When the Web Speech API transcribes a different word from what was expected (Levenshtein distance, word substitution), the heuristic table maps the substitution pattern to a likely pronunciation error and surfaces it.

This catches only severe mispronunciations, but it adds a layer of automated feedback for the obvious cases.

**Layer 3 — Metacognitive Prompts**
After shadowing, the app asks brief reflection questions: "Which words felt hardest?" "Where did the rhythm feel different?" Free-text answer, no AI evaluation. These prompts persist to the event log and strengthen the learner's self-monitoring skills, which transfer to real conversation. Research-supported.

## The Content Strategy

Three sources, combined.

**Seed Corpus — NoCoLA Dataset**
The Norwegian Corpus of Language Acceptability contains 144,867 sentences written by B1–B2 Norwegian learners and corrected by native speakers. Free, publicly available, designed for linguistic acceptability research. This becomes the muntlig module's primary content source.

Critical advantage: NoCoLA sentences are already annotated with learner errors, which means they slot directly into the existing error taxonomy and fingerprint pipeline. The app gets level-appropriate, error-rich, native-corrected Norwegian content without authoring any of it.

**Generation — NB-Llama (after the model swap)**
For variety and gaps in the NoCoLA corpus (specific scenarios, specific grammar concepts, specific vocabulary clusters), NB-Llama-3.2-3B batch-generates additional sentences with explicit CEFR constraints. Manual spot-check on 10% of generated content; accept the rest. This adds infinite variety on demand.

**Curated Sources — Språkbanken and NTNU**
The National Library of Norway's text corpora and NTNU's free Norwegian course materials provide additional high-quality CEFR-tagged content. Use these for specific scenario authoring and for the small native-recorded corpus.

## The Roleplay Branching Strategy

Semi-structured scripts with fuzzy matching and always-allow-progression. Not rigid scripts. Not AI-driven real-time branching.

**Structure**
Each scenario is a tree of branch points. At each branch point, the app voices a character line and waits for the learner's response. Each branch point has:

- A primary set of expected responses (strict matching)
- A wider set of semantic equivalents (looser matching)
- A fallback path that accepts any reasonable response and continues, optionally surfacing the model answer as a teaching moment

**Matching**
Token-based fuzzy matching on the learner's transcribed response. Levenshtein distance and token-set ratio combined. Match score above ~70% advances. Match score below triggers a gentle repair: "Try saying it like this: [model answer]" and the learner can retry or skip.

**Why Not AI-Driven Branching**
The validation research was clear: routing every conversation turn through the local model adds 1–3 seconds of latency, makes branching unpredictable, and harms the practiced-vocabulary discipline the scenarios are designed for. Use the AI for generating the initial trees offline, not for real-time decisions.

**Always-Allow-Progression**
A learner who says something semantically reasonable but unexpected does not get stuck. The fallback path takes them forward with a "that works, here's another way to say it" interjection. The goal is confidence-building, not gatekeeping. The repair loop already handles the deeper learning of where they fell short.

## The Timing Implementation (Listen-and-Respond)

Web Speech API has built-in timeout issues. The default 3-second silence timeout and 60-second auto-stop are uncustomizable. The muntlig module wraps these constraints in a visible JavaScript countdown.

**Pattern**
1. The character voices the question.
2. The app starts a 5-second timer with a visible progress bar or count.
3. Recognition is started in continuous mode with interim results.
4. On the first final transcript before the timer ends, recognition stops and the response is processed.
5. On timer expiry without a final transcript, recognition stops and the timeout path runs (the app gently re-prompts or moves on).

**Slow Device Handling**
- Display "Listening..." immediately when the mic activates.
- Show interim transcripts as the learner speaks — builds confidence the system is working.
- If recognition onstart takes more than 500ms, display "Microphone warming up..." to set expectations.
- Provide a manual "Skip" button always available as an escape hatch.

**Visible Pressure, Not Anxiety**
The countdown is visible. Learners know exactly how much time remains. This creates productive pressure — the kind that simulates real conversation — without surprise anxiety from a hidden timer.

## Integration With Existing Systems

The muntlig module is not a standalone feature. It feeds the same pipeline as everything else.

**Fingerprint**
Every muntlig attempt — shadowing, scripted roleplay turn, drill, listen-and-respond — produces a recordResult call against the fingerprint. Mastery updates. Errors are tagged with the standard taxonomy. The SRS scheduler picks up muntlig-failed concepts for future spaced review just like session-failed concepts.

**Speaking Minutes**
Every minute of microphone-active recording in any muntlig mode increments speakingMinutesTotal on the fingerprint. This is the headline metric of the speaking-first principle and surfaces on the dashboard.

**Repair Loop**
A wrong shadowing match, a missed scenario branch, a failed listen-and-respond — these all trigger the repair loop the same way a wrong session answer does. The learner sees the explanation, runs the micro-drills, retries. The repair loop is universal across surfaces.

**Constraint System**
The constraint system that operates in conversation and journal also applies in scripted roleplay: "in your response, try to use the perfect tense," "include the word gjerne." The engine selects constraints from concepts in practice or consolidation phase, same logic as elsewhere.

## What This Module Is Not

To prevent scope creep:

- It is not a pronunciation scoring system. It is a speaking practice system with self-listening and heuristic flagging.
- It is not a free-form AI conversation tutor. That is `/conversation`, which already exists. Muntlig is structured practice; conversation is open practice. They coexist.
- It is not a content authoring platform. The content pipeline (NoCoLA + NB-Llama generation + curated sources) is separate dev tooling.
- It is not a recording studio. Audio is generated and stored as static assets; the app plays them and records the learner, nothing more.

## Build Order Within The Module

When muntlig becomes the active build:

1. **Audio infrastructure** — batch generation pipeline, storage layout, hand-recorded native corpus for the canonical shadowing sentences.
2. **Shadowing first** — the simplest mode, proves the audio pipeline and the self-listening UX. Single sentence, listen, repeat, compare. Closes the loop end-to-end.
3. **Pronunciation drills** — reuses the audio pipeline, adds the heuristic table and sound-pair targeting.
4. **Listen-and-respond** — adds the timer and the response-evaluation path.
5. **Scripted roleplay** — most complex, builds on everything else. Authored scenario trees, fuzzy matching, fallback paths.

Each mode ships and verifies before the next starts. Same discipline as the engine and UI phases: depth, not breadth.

## The Honest Limits

This module will not give learners perfect pronunciation feedback. It will not catch every mistake. Web Speech API will sometimes mishear them; the heuristics will sometimes flag false positives; the scripted scenarios will sometimes feel stilted.

What it will do: provide hundreds of hours of structured, repeatable, low-stakes speaking practice with authentic Norwegian audio, self-monitoring feedback, and integration with a fingerprint that knows what each learner is working on. Research is explicit that this is how confidence is actually built — through volume of practice with self-reflection, not through precision of feedback.

The moat of NorskCoach was never going to be pronunciation scoring. The moat is the diagnostic coaching intelligence around production practice. Muntlig is where that intelligence becomes audible.
