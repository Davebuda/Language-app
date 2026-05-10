# Norwegian Language Learning App — Brainstorm & System Design

## 1. The Core Vision

Build a Norwegian learning app that actually adapts to **the individual learner**, not the average user. Most apps (Duolingo, Babbel, Memrise) push everyone down the same path and hope it works. The result: people get stuck, stay stuck, and quit.

This app's whole reason for existing is the opposite — figure out *exactly* where you're weak, and beat that weakness until it's gone. Then move you forward. No grinding through stuff you already know. No skipping past stuff you secretly don't.

Levels follow the CEFR scale: A1 → A2 → B1 → B2. Phone-first (iOS to start). Designed to feel like a personal tutor in your pocket.

---

## 2. What Makes It Genuinely Different

Not "another language app." Specifically:

- **Mastery-based progression, not lesson-based.** You don't move to A2 because you finished a list of lessons. You move to A2 because you've actually mastered A1 grammar concepts. The app knows the difference.
- **Weakness-targeting engine.** Track every mistake by *grammar concept* — not just "wrong answer." If someone keeps blowing dative case, the app feeds them dative until it sticks, in varied formats so it's not just drilling.
- **Active transformation, not passive recognition.** Instead of just multiple choice, the learner actively rewrites sentences — change tense, swap pronouns, change subject, negate it. That's how grammar actually internalizes.
- **Local-first, no per-user API costs.** The core experience runs on the phone. No subscription required to keep the lights on. This makes the model sustainable.
- **Contextual, not isolated.** Sentences live inside mini-scenarios and short dialogues, so the language means something. Not just "the dog eats the apple" energy.

---

## 3. System Architecture (Conceptual Layers)

Five layers, each doing one job well.

### Layer 1 — Content Foundation
A structured Norwegian content library bundled with the app. Not just sentences — a **mesh** of:
- Sentences tagged by grammar concept(s), vocabulary level, and difficulty
- Audio recordings of native speakers for every sentence (for listening + pronunciation)
- Mini-dialogues and short stories that use grammar in context
- Topic clusters (food, transport, work, family, etc.) that mirror real-life situations
- Grammar explainers — short, visual, no walls of text

Content is generated/curated upfront (with AI assistance during development) and shipped with the app or downloaded once. Zero ongoing cost per user.

### Layer 2 — The Learner Profile
A live model of the user, stored locally on the phone:
- Mastery score per grammar concept (0–100)
- Mastery score per vocabulary cluster
- Recent mistake patterns (last N attempts, with what went wrong)
- Time-since-last-seen for every concept (for spaced repetition)
- Confidence intervals — how sure are we they really know it?

This profile is what makes everything personal. It's the brain.

### Layer 3 — The Adaptive Engine
The decision-maker. Every time the user opens the app, this layer asks:
- What's overdue for review (spaced repetition)?
- Where is this person currently weakest?
- What's the next concept they're ready to unlock?
- How do I mix these to make a 10–15 minute session that's challenging but not crushing?

It then assembles a session — say, 60% weak-spot drilling, 25% spaced review, 15% new material. Ratios shift based on the user.

### Layer 4 — Exercise Generation & Variety
Pulls from the content library and shapes it into different exercise formats (see Section 5). The same underlying sentence might appear as a translation, then a transformation, then a listening exercise — so the brain encounters the structure multiple ways without feeling repetitive.

### Layer 5 — Local AI Integration (The Differentiator)
Small local models (Ollama-style, Apple Intelligence on newer iPhones, or quantized Llama 3.2 1B / Phi-3 mini) running **on-device**. Used for:
- Generating fresh sentence variations on demand (so content never feels finite)
- Giving feedback on free-writing exercises ("you wrote *X*, but the verb should be in past tense because...")
- Light conversation practice — basic back-and-forth in Norwegian on a topic, with corrections
- Explaining mistakes in plain language ("You used *å* but it should be *og* because here you mean 'and' not 'to'")

All of this happens locally. **Zero API cost. Works offline.** The model is shipped (or downloaded once) with the app.

For users on older phones that can't run a local model, fall back to scripted feedback templates — still useful, just less flexible.

---

## 4. Content Foundation — Detail

The content isn't a flat list of sentences. It's a graph:

- **Grammar concepts** as nodes (present tense, definite articles, dative, modal verbs, V2 word order, etc.)
- **Vocabulary clusters** as nodes (food, family, time, weather, work)
- **Sentences** as edges that connect grammar + vocab
- **Dependencies** between concepts (you can't really learn dative until you've got definite articles down)

This structure lets the engine do smart things — like, if someone's struggling with V2 word order, pull sentences that emphasize V2 in vocab they already know, so the only new thing they're wrestling with is the word order.

Content sources during development:
- Generated with AI (Claude/GPT) and reviewed by a Norwegian speaker
- Adapted from CEFR-aligned textbooks and public-domain materials
- Native speaker audio (could use TTS initially, replace with real recordings as budget allows)

---

## 5. Exercise Types (The Variety Engine)

The same sentence/concept gets practiced through many lenses:

1. **Translation in both directions** (Norwegian → English, English → Norwegian)
2. **Sentence transformations** — change present to past, singular to plural, statement to question, active to passive, swap subjects/objects. *This is the key one for grammar mastery.*
3. **Fill-in-the-blank** with grammar focus (conjugate the verb, pick the right article)
4. **Word order arrangement** — drag tiles into Norwegian word order (V2 is brutal for English speakers)
5. **Listening comprehension** — hear a sentence, type or pick what it means
6. **Dictation** — hear it, write it (forces you to actually parse the sounds)
7. **Reading comprehension** — short paragraph + questions
8. **Free writing** with AI feedback — "describe your morning in 3 sentences," local model gives gentle corrections
9. **Conversational drills** — basic back-and-forth with the local model on a constrained topic
10. **Speed rounds** — quick recall of recently-learned vocab, gamified

The adaptive engine picks exercise types based on what the user needs *and* what keeps them engaged. If someone just did 10 fill-in-the-blanks, switch it up.

---

## 6. The Progression System

Forget "Unit 4, Lesson 3." That's lesson-based thinking and it's the problem.

Instead:
- Each grammar concept has a mastery threshold (e.g., 85% accuracy across the last 20 attempts, spread over at least 3 different days)
- Concepts have prerequisites — the system won't push you toward subjunctive if you haven't nailed present tense
- "Levels" (A1, A2, B1, B2) are achieved when you've mastered the bundle of concepts that define that level per CEFR
- The user sees a clear visual map: which concepts are mastered, in progress, locked, weak. Real transparency.

The motivational hook: progress feels *earned* and *real*, not just "you finished today's lesson, here's a streak."

---

## 7. Local AI — How It Actually Plugs In

This is where it gets interesting. The local model is an **assistant to the engine**, not the engine itself. The engine still decides what to teach. The local AI just makes the experience feel alive.

Specific roles:
- **On-the-fly sentence variation** — engine says "give me a dative sentence using kitchen vocab the user already knows," model generates 3 options
- **Mistake explanation** — when the user gets something wrong, model writes a one-sentence "why" in plain English (or in their native language)
- **Free-writing review** — user writes 2 sentences, model spots errors and suggests fixes
- **Conversation mode** — user picks a scenario (ordering coffee, asking for directions), model plays the other side, stays at the user's level, corrects gently

Model choice considerations:
- **Apple Intelligence** on supported iPhones — built-in, free, fast, but limited capability
- **Llama 3.2 1B/3B** quantized — runs on most modern phones, ~1-2GB download
- **Phi-3 mini** — small, surprisingly capable for structured tasks
- For Norwegian specifically, may need to test which models handle it well — Norwegian is a smaller language, model quality varies

Fallback path: if the model can't run or fails, scripted templates and pre-generated content keep the app functional.

---

## 8. User Experience — A Day in the Life

User opens the app in the morning. The home screen shows:
- "Today's session: 12 minutes" (engine has calibrated the length)
- A small visual: today's focus is **dative case** (because they've been struggling) plus **review of irregular verbs**
- Streak count, optional

They tap start. Session flows:
1. 2 quick warm-up review items (spaced repetition)
2. 4 dative-focused exercises in varied formats (transformation, listening, translation)
3. 1 short dialogue snippet introducing dative in context
4. 2 free-writing prompts using dative, with local model feedback
5. 1 quick "you've got this" recap showing what they nailed

Session ends. Profile updates. Next time they open the app, the engine has already adjusted — maybe dative is closer to mastery, maybe a new weakness emerged in word order from their writing.

Over weeks: the user feels themselves getting *less stuck* — which is the thing Duolingo doesn't deliver.

---

## 9. Tech Stack Direction (Rough)

This is preliminary — to be refined when we hit Claude Code:

- **Frontend:** Native iOS first (Swift / SwiftUI) for performance, Apple Intelligence integration, and best on-device ML. Android later.
- **Local storage:** SQLite for the learner profile and content index. Audio files bundled or downloaded once.
- **Local AI runtime:** Either Apple's MLX framework, Core ML for converted models, or llama.cpp wrapped in Swift. Test which gives best Norwegian results.
- **Content pipeline (dev side):** Scripts to generate, validate, and tag sentences. Likely Python + Claude/GPT API for generation (one-time cost, not per-user).
- **No backend required for MVP.** Maybe a thin sync server later for cross-device progress, but not day one.

---

## 10. Phased Build Plan

Don't try to build everything at once. Phases:

**Phase 1 — Core MVP (the proof of concept)**
- A1 + A2 content (grammar concepts + ~500-1000 sentences with audio)
- Learner profile + adaptive engine + spaced repetition
- 4-5 exercise types (translation, transformation, fill-in-blank, listening, word order)
- No local AI yet — just smart sequencing of pre-built content
- Goal: prove the *adaptive* part actually works and feels different

**Phase 2 — The AI Layer**
- Integrate local model for mistake explanations and sentence variation
- Add free-writing exercises with model feedback
- Polish UX

**Phase 3 — Conversation & B1/B2**
- Add conversation mode with local model
- Expand content to B1, B2
- Dialogue scenarios

**Phase 4 — Scale & Polish**
- Android version
- More languages? (the engine is language-agnostic — could be a platform)
- Optional cloud features (sync, social)

---

## 11. Open Questions / Things to Decide

Things we'll need to figure out before/during build:

- Which specific local model performs best on Norwegian tasks? (Needs testing.)
- TTS quality — start with synthesized voices or invest in native speaker recordings?
- How much content needs to be in v1 to feel substantial without delaying launch?
- Free vs. paid model — pure free, freemium, one-time purchase, subscription?
- How do we measure if the personalization is *actually* working better than Duolingo? (Need real metrics.)
- Onboarding — placement test to bootstrap the learner profile, or learn from scratch?

---

## 12. The Big Picture

What we're really building isn't a Norwegian app. It's an **adaptive language-learning engine** that happens to launch with Norwegian. If the engine works, it could be ported to any language. That's the long game.

But the immediate goal is solving *your* problem first: getting from A1/A2 to B2 faster than the classroom did, and faster than any existing app would. Build the thing you wish existed.

When we move to Claude Code, this document is the source of truth. Every architectural decision should trace back to one of these principles. If something we're about to code doesn't make the app *more adaptive, more local, or more contextual*, it doesn't belong.

Let's build it.
