# AI Layer Spec — The Local Model That Powers Everything

*The decision, the architecture, and the build plan for the on-device AI in the Norwegian app. Pair with brainstorm v3 and the skills/subagents plan. Ship to Claude Code.*

---

## 1. The Decision (Short Version)

**Primary model: Gemma 3n E4B (instruction-tuned, 4-bit quantized).**
**Fallback for older iPhones: Gemma 3n E2B.**
**Runtime: MLX Swift.**
**Comparison candidate to test against: Qwen 2.5 / 3 4B.**

One model powers everything — mistake explanations, sentence variations, free-writing feedback, error detection, and the conversation tutor. Different system prompts, same engine.

Why these choices, in detail below.

---

## 2. Why Gemma 3n E4B

Five reasons, in order of importance:

**Built for mobile from the architecture up.** Gemma 3n is Google DeepMind's mobile-first model family. It uses Per-Layer Embedding caching and selective parameter activation — so the E4B variant has 8B raw parameters but runs with the memory footprint of a ~4B model (roughly 3 GB after 4-bit quantization). This isn't a desktop model squeezed onto a phone; it's designed for the constraints we have.

**140+ language training, including Germanic.** Gemma 3n was trained on data spanning 140+ languages. Real-world testing on iPhone shows Gemma handling Dutch well — Dutch and Norwegian are close cousins (Germanic family, similar grammatical complexity, similar resource profile in training data). The probability of strong Norwegian performance is high. We still verify with testing, but the prior is good.

**MLX Swift native, battle-tested.** Multiple production iOS apps already ship Gemma 3n via MLX Swift. The plumbing exists, the quantizations exist, the issues are known. We don't need to be the team that figures out if it works at all.

**Apache 2.0 licensed.** Free for commercial use. No royalties, no usage caps, no licensing risk for the project's future commercial path.

**Smooth upgrade path to Gemma 4.** Google shipped Gemma 4 (also with E2B and E4B variants) in April 2026. Architecturally similar. When Gemma 4 has more iOS production miles, swap in. We don't need to bet on Gemma 4 yet, but we don't get locked out either.

---

## 3. Why MLX Swift (Not MediaPipe, Not llama.cpp)

**MLX Swift is Apple's own framework**, written specifically for Apple Silicon. It runs on the GPU via Metal, uses unified memory directly, and benchmarks faster than the alternatives on iOS for our exact use case.

**MediaPipe (Google's option)** also works on iOS but it's LiteRT — built primarily for Android NPUs and translated to Metal for iOS. That extra translation step costs performance and the iOS model selection on MediaPipe is smaller.

**llama.cpp via Swift bindings** works and is more universal across model formats (GGUF), but it's slower than MLX on Apple Silicon and the Swift wrappers are community-maintained rather than Apple-supported.

For an iOS-first app on Apple Silicon, MLX Swift is the obvious choice. Decision closed.

If we ever ship Android (Phase 4), MediaPipe becomes the equivalent answer there.

---

## 4. Why a Smaller Model Is Actually the Right Call

We're not trying to build ChatGPT. We're building a Norwegian coach. The tasks the model has to do are well-defined:

- Explain a single grammar mistake in plain language (50-token output)
- Generate a Norwegian sentence with constraints (15-token output)
- Identify errors in a Norwegian sentence and tag them (structured JSON output)
- Hold a basic conversation in Norwegian at a controlled level (50-100 token outputs, multiple turns)
- Review 1-3 sentences of free writing and flag errors (structured output)

None of these need GPT-4-level reasoning. They need solid Norwegian competence and reliable instruction following. Gemma 3n E4B is way past the threshold for these tasks. Going bigger costs us battery, RAM, latency, and download size — without buying us anything the user notices.

The honest framing: **constrain the model with great prompts and structured outputs; don't need a giant model to do small jobs.**

---

## 5. The Unified Architecture (One Model, Many Tasks)

The AI layer is a single Swift module: `AI/`. Inside it, one shared model serves all tasks. The structure:

```
ios/NorwegianCoach/AI/
├── ModelService.swift         // Singleton: load, unload, infer
├── DeviceCapability.swift     // Detect chip + RAM, pick variant
├── PromptLibrary.swift        // All prompt templates, versioned
├── Tasks/
│   ├── MistakeExplainer.swift     // Task 1
│   ├── SentenceGenerator.swift    // Task 2
│   ├── ErrorDetector.swift        // Task 3
│   ├── ConversationManager.swift  // Task 4 (multi-turn)
│   └── WritingReviewer.swift      // Task 5
├── Fallbacks/
│   ├── TemplateExplainer.swift    // Fallback for Task 1
│   ├── PreGeneratedPool.swift     // Fallback for Task 2
│   └── RuleBasedDetector.swift    // Fallback for Task 3 (basic)
└── Types/
    ├── Explanation.swift
    ├── Feedback.swift
    ├── TaggedError.swift
    └── ConversationTurn.swift
```

**ModelService** holds the loaded model and exposes `infer(prompt:, params:)`. It handles:
- Loading the model on first use (not on app launch — too slow)
- Unloading when memory is tight
- Queueing concurrent calls (one inference at a time)
- KV-cache reuse for multi-turn conversation
- Streaming output for conversation, batch output for everything else

**Each Task class** wraps a specific use case with its own prompt template, generation parameters, and output parser. They depend on `ModelService` but don't know about each other. Adding a new AI feature later means adding a new Task — no changes elsewhere.

**Fallbacks** are concrete classes that implement the same protocol as the Task classes. If the model isn't available (low RAM device, model failed to load, inference timed out), the Task falls back automatically. The user gets a degraded but still functional experience.

**The PromptLibrary** is the single source of truth for prompts. Versioned. When a prompt changes, log the version with each interaction so we can correlate quality changes to prompt changes.

---

## 6. Each Task in Detail

### 6.1 Mistake Explainer

**Job:** Given a wrong answer and a correct answer plus the concept being practiced, write a one or two sentence explanation in plain language.

**Trigger:** Step 2 of the repair loop (every wrong answer).

**Prompt template (paraphrased):**
```
You are a Norwegian language tutor. The student is at level {level}.
They wrote: "{wrong}"
The correct version is: "{correct}"
The grammar concept being practiced: {concept}
The error type: {error_tag}

Write a one-sentence explanation of why their answer is wrong, in English.
Be specific about the rule. Be kind. Don't be condescending.
```

**Generation parameters:** temperature 0.2, max tokens 80, structured output (just text).

**Why these parameters:** low temperature for consistency. Short output because anything longer than 1-2 sentences breaks the repair loop's flow.

**Fallback:** A template library keyed on `(error_tag, concept)`. Pre-written explanations covering the common cases. Less personal but still clear.

**Latency target:** under 1 second on iPhone 15 Pro. The user is staring at the wrong-answer screen waiting for it.

### 6.2 Sentence Generator

**Job:** Given a concept, scenario, and level, generate a fresh Norwegian sentence the engine can use as an exercise.

**Trigger:** When the engine wants variety beyond pre-authored content.

**Prompt template:**
```
Generate one Norwegian sentence at level {level}.
The sentence must demonstrate the grammar concept: {concept}.
The sentence should fit the scenario: {scenario}.
Vocabulary should stay within the {level} word list.
Output only the sentence, nothing else.
```

**Generation parameters:** temperature 0.7 (we want variation), max tokens 30.

**Validation step:** After generation, run the ErrorDetector on the sentence. If it has errors, regenerate. If it passes 3 attempts and still has issues, fall back to pre-authored content.

**Fallback:** Pre-generated content pool. The engine never *needs* to generate live — it just gets richer variety when the model is available.

**Latency target:** under 2 seconds (generation can happen during the brief "loading next exercise" moment).

### 6.3 Error Detector

**Job:** Given a Norwegian sentence written by the user, identify all grammatical errors and tag them according to the error taxonomy.

**Trigger:** After every free-writing input and every conversation turn.

**Prompt template:**
```
The user is learning Norwegian. They wrote: "{sentence}"
Their level is {level}.

Identify any grammatical errors. For each error, output:
{
  "tag": "<one of: word_order, verb_tense, noun_gender, article, adjective_agreement, pronoun, preposition, modal, negation, compound, vocabulary, spelling>",
  "wrong": "<the wrong portion>",
  "correct": "<what it should be>",
  "brief_why": "<short reason in English>"
}

If no errors, output: []
Output only the JSON array. No prose.
```

**Generation parameters:** temperature 0.1, max tokens 250, JSON-mode if available.

**Critical:** The output must be parsed into typed Swift structs. If parsing fails, log it (we want to fix the prompt) and treat as "no errors detected" rather than crash.

**Fallback:** A simple rule-based checker for the most common errors (gender mismatches via dictionary, V2 word order via pattern matching). Catches less than the model but never misses obvious things.

**Latency target:** under 1.5 seconds.

### 6.4 Conversation Manager (The Tutor)

This is the big one. Detailed in Section 7.

### 6.5 Writing Reviewer

**Job:** Given a 1-3 sentence free-writing submission, review it holistically — errors, naturalness, vocabulary appropriateness — and return structured feedback.

**Trigger:** End of free-writing exercises.

**Prompt template:**
```
The user is learning Norwegian at level {level}. They wrote:
"{user_text}"

The prompt was: "{writing_prompt}"

Review the writing. Output JSON:
{
  "errors": [<error objects same as ErrorDetector output>],
  "praise": "<one short sentence in English about what they did well>",
  "suggestion": "<one short sentence in English with the most impactful improvement>"
}
```

**Generation parameters:** temperature 0.3, max tokens 400.

**Why two outputs (errors + praise + suggestion):** The repair loop handles the errors mechanically. The praise and suggestion give the user qualitative feedback that feels coach-like. Neither is necessary, both make the experience better.

**Fallback:** Run only the rule-based ErrorDetector. Skip praise and suggestion if no model available. Still useful, just less coach-y.

**Latency target:** under 3 seconds (user just finished writing, slight delay is acceptable).

---

## 7. Conversation Mode in Detail

The most architecturally interesting feature, and the one that needs the most care.

### 7.1 What It Is

The user picks a scenario ("ordering coffee at a café in Oslo," "asking for directions," "introducing yourself at work"). The app puts them into a back-and-forth Norwegian conversation with a character. The character speaks at the user's level, gently corrects their mistakes by rephrasing what they meant, and stays in character. After the conversation ends, the app logs every error the user made against their mistake fingerprint.

### 7.2 What It Is Not

- It's not unconstrained chat. The scenarios are bounded so the model can't drift.
- It's not a replacement for human conversation. It's a low-stakes practice space.
- It's not pretending to be ChatGPT. Responses are short, focused, role-locked.

### 7.3 The Architecture

```
ConversationManager
├── State
│   ├── scenario: Scenario
│   ├── level: CEFRLevel
│   ├── history: [Message]
│   └── kvCache: ModelKVCache?  (for fast continuation)
├── Methods
│   ├── start(scenario, level) -> opening message
│   ├── send(userMessage) -> assistantMessage (streaming)
│   ├── end() -> ConversationSummary
│   └── reset()
└── Parallel
    └── ErrorDetector running on each user message in background
```

When the conversation starts, ConversationManager:
1. Builds the system prompt from the scenario and level
2. Calls ModelService for an opening line
3. Returns it to the UI to display

When the user sends a message:
1. Append user's message to history
2. Fire two concurrent tasks:
   - **Foreground:** Generate assistant response with full history + system prompt, stream tokens to UI
   - **Background:** Run ErrorDetector on user's message, get tagged errors, push to MistakeFingerprint
3. Append assistant's full response to history
4. Wait for ErrorDetector to finish (usually done before assistant response anyway)

When the conversation ends:
1. Generate a summary using a different prompt: "List the concepts the user practiced and how well they did. Output JSON."
2. Update mastery scores in the fingerprint based on summary + accumulated errors
3. Show a brief "you practiced X, struggled with Y, did great on Z" screen

### 7.4 The System Prompt for the Tutor

This is the most important piece. Sample structure:

```
You are {character_role} in {scenario_setting}. The user is a Norwegian learner at level {level}.

CONSTRAINTS:
- Speak only Norwegian (Bokmål).
- Use only vocabulary at level {level} or below. Approved word list will be your training; if unsure, prefer common words.
- Keep your responses to {max_words_per_response} words or fewer.
- Stay in character as {character_role}. Don't break frame.
- If the user makes a grammatical mistake, do not correct them directly. Instead, naturally rephrase what they meant in your next reply, using the correct form. Continue the conversation.
- If the user uses English, respond in Norwegian and gently encourage them to try in Norwegian.
- Do not teach grammar inside the conversation. Just have the conversation.
- Keep questions short. Don't lecture.

SCENARIO CONTEXT:
{scenario_setup}

Begin the conversation.
```

Per-level configuration:
- **A1:** max 8 words per response, vocab from top 500
- **A2:** max 12 words per response, vocab from top 1000
- **B1:** max 20 words per response, vocab from top 2000
- **B2:** max 30 words per response, full grammar, idioms allowed

### 7.5 Scenarios as Content

Scenarios are content, not code. They live in the content database with fields:
- `id`
- `title` (English)
- `setting` (e.g., "café in Oslo, mid-afternoon")
- `character_role` (e.g., "barista named Kari")
- `character_personality` (e.g., "friendly but busy")
- `opening_line` (pre-written, in case the model is unavailable; otherwise model-generated)
- `target_concepts` (which grammar this scenario exercises)
- `target_vocab` (which vocab clusters)
- `level_range` (which CEFR levels it works for)
- `success_criteria` (what counts as the user "completing" the scenario)

This means scenarios are added through the content authoring pipeline like sentences. The `content-author` subagent generates them, the `norwegian-linguist` subagent reviews them, the `content-validator` subagent confirms they're complete.

### 7.6 Catching Errors During Conversation

The model in conversation mode is in *character*. We don't ask it to also be a grammar checker — that would split its attention and degrade both jobs.

Instead, error detection runs as a **separate inference call** in parallel. Same model, different prompt, fresh context. It just sees: "This user wrote X. Find errors. Output JSON."

This means each user turn triggers two inference calls. On a recent iPhone, both finish before the user reads the response. On older devices, the error detection might lag a turn behind — that's fine, it just queues.

The errors get tagged and pushed into MistakeFingerprint. From the fingerprint's perspective, conversation errors look the same as exercise errors. The engine doesn't care where they came from.

### 7.7 What Happens When The User Says Something Off-Script

Edge cases the system prompt + scenario design needs to handle:

- **User goes way off-topic:** Character gently steers back. "Det høres interessant ut, men kan jeg få bestillingen din først?" (Sounds interesting, but can I take your order first?)
- **User uses English:** Character responds in Norwegian, encourages trying in Norwegian. "Prøv å si det på norsk?"
- **User asks for help/translation:** This is fine. Character can give a hint in simple Norwegian or repeat slowly. Not a teacher mode, but helpful.
- **User says something inappropriate:** Standard refusal patterns. Models are trained on this. Worst case the conversation ends gracefully.
- **User goes silent:** Timeout after N seconds, character prompts gently. "Hva tenker du?"

These are all handled by the system prompt design plus model capability. We don't need separate code paths.

### 7.8 Performance Targets

- **First-token latency:** under 800ms on iPhone 15 Pro for assistant response
- **Sustained generation:** 20+ tokens/sec on iPhone 15 Pro
- **Memory:** under 4 GB total app memory during conversation
- **Battery:** under 5% drain per 15-minute conversation

These are based on real-world measurements of Gemma 3n E4B on similar hardware. Older devices fall back to E2B (smaller, faster, slightly less capable) or to scripted dialogues.

---

## 8. Device Tiering

Not all iPhones can run a 3 GB model well. We need explicit tiers.

| Device class | Capability | What we ship |
|---|---|---|
| iPhone 15 Pro / 16 / 17, M-series iPad | Full | Gemma 3n E4B, all features |
| iPhone 14 Pro, 15 (non-Pro) | Tight | Gemma 3n E2B, all features |
| iPhone 13, 14 (non-Pro) | Limited | Gemma 3n E2B, conversation may be slower |
| iPhone 12 and older, SE | Fallback | No model. All features fall back to templates and rule-based. |
| Apple Intelligence-capable (iPhone 15 Pro+ on iOS 18+) | Optional | Apple Foundation Models for the simplest tasks (mistake explanations) when battery is low |

`DeviceCapability.swift` detects the device on first launch and writes the tier to user defaults. The user can override (e.g., choose smaller model to save battery), but the default is automatic.

---

## 9. Model Loading and Storage

**The model isn't bundled in the app binary** — it's too big (3 GB pushes us into App Store size limits and is wasteful for users on slower devices who'd never use AI features).

**On first launch:**
1. App boots, AI features are disabled with a "Set up AI" banner
2. User taps the banner
3. App shows: "Download the AI model? About 2.5 GB. Uses Wi-Fi by default."
4. Download with progress UI
5. Verify checksum
6. Mark AI features available

**On subsequent launches:**
1. Model file exists in app's documents directory
2. ModelService loads it on first AI feature invocation (lazy)
3. Subsequent calls are instant (model stays in memory)

**Memory management:**
- After 5 minutes of no AI calls, unload the model to free RAM
- App background → unload immediately
- Foreground + AI call → reload (takes 2-3 seconds, show subtle loading state)

**Updates:**
- Model versions are tracked. New version → app shows update prompt, downloads in background, swaps on next session.

---

## 10. The Testing Protocol (Before Committing to Gemma 3n)

We don't ship the model we picked from a benchmark. We ship the model that passes our Norwegian battery.

The `mlx-model-evaluator` subagent runs this on Mac during dev:

**Battery components:**

1. **Translation quality (50 sentences):** Norwegian → English and back. Compare to reference translations. Score on accuracy and naturalness.

2. **Grammar correction (30 sentences):** Pre-prepared sentences with known errors. Does the model spot them? Does it correctly tag the error type per our taxonomy?

3. **Sentence generation (10 prompts):** Concept + scenario + level. Generate. Run our validator. Does the output meet the constraints?

4. **Conversation simulation (5 scenarios):** Scripted user inputs. Does the model stay in character, stay at the level, gently correct mistakes?

5. **Mistake explanation (20 cases):** Wrong/correct pair + concept. Does the explanation make sense? Is it at the right level of language for the user?

6. **Norwegian-specific quirks (15 cases):** Compound words (sammensetninger), V2 word order edge cases, ei vs en (feminine forms), sin/sitt/seg reflexive pronouns. The hard parts.

**Models to test:**
- Gemma 3n E4B (it, 4-bit)
- Gemma 3n E2B (it, 4-bit)
- Gemma 4 E4B (it, 4-bit) — if stable
- Qwen 2.5 4B
- Qwen 3 4B (if available)

**Testing happens twice:**
- Phase 1 of testing: on Mac via Ollama (fast iteration, no app overhead)
- Phase 2 of testing: on actual iPhone via MLX Swift (real performance, real thermals)

**Decision criteria:**
- Pass rate over 85% on the battery
- Conversation feel test (subjective, by you, the actual learner)
- Latency on iPhone 15 Pro under targets
- No catastrophic failures (responding in English, hallucinating Norwegian, stuck loops)

If Gemma 3n passes, ship it. If it fails any criterion, fall back to the next candidate.

---

## 11. How This Integrates With The Rest of The System

The AI layer is one of the five system layers from brainstorm v3. It plugs in cleanly:

**Engine → AI:**
- Engine asks AI for a sentence variation when it wants variety
- Engine asks AI for an explanation when triggering the repair loop
- Engine never *requires* AI — every call has a fallback

**AI → Mistake Fingerprint:**
- ErrorDetector pushes tagged errors to the fingerprint
- ConversationManager pushes session summary to the fingerprint
- WritingReviewer pushes feedback errors to the fingerprint

**AI → UI:**
- ConversationManager streams tokens for the typing-effect chat UI
- Other tasks return complete responses (no streaming needed)

**AI → Storage:**
- Model file lives in `~/Library/AI/`
- Conversation history is ephemeral by default (optional save)
- AI never writes to the content database (read-only consumer)

**The fingerprint is the integration point.** All AI tasks ultimately flow into the fingerprint, which the engine reads to make decisions. The AI doesn't decide pedagogy — it's a tool the engine uses, then reports results to the fingerprint.

---

## 12. What This Means For Build Order

Even though AI is officially Phase 2 in brainstorm v3, **some prep starts now** because model evaluation has a long lead time (need to test, convert, optimize before integration).

**Phase 1A (engine skeleton, no AI integrated):**
- Stub `ModelService` with a test double that returns hardcoded responses
- Build all Task classes against the stub
- Build all Fallback classes (these are the "no model" experience)
- Run engine simulator using only fallbacks — verify the experience is still acceptable

**Phase 1B (content + exercises, still no AI):**
- Continue building features against the stub
- Start the model evaluation in parallel (Mac-only, doesn't block iOS work)
- Pick the model

**Phase 2 (AI layer turns on):**
- Replace the ModelService stub with the real MLX Swift integration
- Integrate the chosen model (download flow, loading, inference)
- Tasks already exist — they just start hitting a real model
- Tune prompts based on real outputs
- Write the conversation system prompt and scenario library

**Phase 3 (conversation mode):**
- ConversationManager already exists from Phase 1A as a stub
- Now it gets a real backing
- Build the conversation UI
- Author scenario content
- Real-device testing

This means **the AI layer's interface is built before the AI exists**. By the time we have a working model, the rest of the app is already designed to consume it. No retrofitting.

---

## 13. Open Questions That Stay Open Until Testing

Don't pretend these are answered. They're not. They get answered when we run the battery.

- Will Gemma 3n E4B's Norwegian be natural enough, or stilted?
- Can the model reliably stay at A1 vocabulary, or does it drift?
- Does error detection find subtle errors (like compound word formation) or only obvious ones?
- How does the model handle Bokmål vs Nynorsk? (We're going Bokmål, but does it know to stay there?)
- What's the actual battery cost during a 15-minute conversation? (Will users tolerate it?)
- Does conversation feel like a real exchange, or like a chatbot pretending?

These are the tests we run before committing. The spec gives us a structure to plug the answers into; testing produces the answers.

---

## 14. The One-Paragraph Summary For Claude Code

We're shipping Gemma 3n E4B (instruction-tuned, 4-bit quantized) via MLX Swift, on iPhone 14 Pro and newer; older devices get Gemma 3n E2B. The model powers five distinct AI tasks (mistake explanation, sentence generation, error detection, free-writing review, conversation tutor) through one shared `ModelService`, with each task having its own prompt template, parameters, and fallback. Every task has a non-AI fallback so the app stays useful on devices without the model. Conversation mode is multi-turn with parallel error detection feeding the mistake fingerprint. Build the AI layer's interface in Phase 1A as stubs and fallbacks, drop in the real model in Phase 2, light up conversation in Phase 3. Test the model on a Norwegian-specific battery before committing. Apache 2.0 means no licensing risk. Ship.

---

This is the spec. Ready for Claude Code.
