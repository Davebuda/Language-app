# Norwegian Language Learning App — Brainstorm v3

*The sharpest version. This is the document to take into Claude Code.*

---

## 1. The One-Line Positioning

**A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.**

That's the product. Everything in this document serves that line.

---

## 2. The Core Philosophy: Coach, Not Course

The user does not open this app for "Lesson 12." They open it for *today's exact problem*.

Most language apps are courses — a fixed curriculum, delivered the same way to everyone, with progress measured by completion. This app is the opposite: a **coach** that knows what the learner needs *today*, generates a personal syllabus on the fly, and only advances them when they can actually do the language.

This shift — from course to coach — changes everything about how the product feels and works.

---

## 3. The Real Moat (What Makes This Defensible)

Not AI conversation. Not gamification. The moat is three things working together:

1. **Diagnosis** — knowing precisely what the learner is failing at, including the *root cause* underneath surface mistakes.
2. **Scheduling** — generating a personal syllabus daily that mixes remediation, review, new material, and new vocabulary.
3. **Remediation** — running every wrong answer through a structured repair loop until the gap is closed.

If these three work, the app helps people improve faster than alternatives. AI is a *power tool* that makes the coaching feel intelligent, precise, and cheap to run — but AI is not the product.

---

## 4. The Repair Loop (The Core Mechanic)

This is the single most important mechanic in the app. Every wrong answer triggers it:

**Wrong answer → Explanation → Micro-drill → Retry → Scheduled review**

In detail:
1. **Wrong answer** — the user gets something wrong. The mistake is logged with its error tag.
2. **Explanation** — short, plain-language reason *why* it was wrong. ("You used *en* but *jente* is feminine, so it's *ei jente*.")
3. **Micro-drill** — 2–4 quick targeted exercises on the exact concept, in varied formats.
4. **Retry** — the original problem comes back, often in a slightly different form.
5. **Scheduled review** — that concept gets queued for spaced reappearance over the next days/weeks.

This loop is what makes the app feel like coaching. It's also what builds genuine mastery — because mistakes become learning moments, not just red Xs.

---

## 5. The Mistake Fingerprint (The Heart of Diagnosis)

Every learner has a unique **mistake fingerprint** — a live profile of their patterns, weaknesses, and quirks. This is what the engine reads from and writes to constantly. It's the most important data structure in the app.

It includes:
- **Mastery score per concept** (0–100), with confidence intervals
- **Decay over time** — mastery erodes if not practiced; the model knows "shaky" vs "forgotten"
- **Error pattern history** — what they get wrong, in what contexts, with what frequency
- **Root-cause links** — derived patterns: "articles failing because of underlying gender uncertainty"
- **Vocabulary mastery** by cluster, separate from grammar
- **Production vs. recognition gap** — can they *use* it, not just recognize it?

The fingerprint is stored locally on the device. It's the learner's data, and it never leaves the phone unless they choose to sync.

---

## 6. Root-Cause Diagnosis

A great human tutor doesn't just see a wrong answer — they see *why* it was wrong. Building this in is what makes the app feel intelligent without needing a big AI model.

Examples of root-cause logic:
- User fails articles AND adjective agreement → root cause: noun gender not memorized → remediate gender first
- User succeeds in writing exercises but fails the same content in listening → comprehension issue, not knowledge issue → serve more listening
- User does well on isolated drills but fails the same grammar in dialogue → can do mechanics but not application → more contextual practice
- User's recent errors cluster around fast-spoken audio → audio-processing weakness → slow down audio in next session, build up speed

These are codified rules over good data. No LLM required. This is a major part of the moat.

---

## 7. The Concept Graph (Dependency-Ordered Grammar)

Norwegian grammar isn't a flat list of topics. It's a graph with dependencies. The app teaches in dependency order:

- Can't really teach **definite articles** before **noun gender** is solid
- Can't teach **adjective agreement** before **gender + definite/indefinite**
- Can't teach **subordinate clause word order** before **main clause V2** is internalized
- Can't teach **modal verbs in past tense** before **past tense basics**

Every concept has prerequisites. The engine never pushes a learner forward on a concept whose prerequisites are shaky. This is structural, not optional.

The graph also organizes content: when teaching a concept, the engine pulls sentences that *only* introduce that one new concept on top of stuff the learner already knows — minimizing cognitive load.

---

## 8. The Daily Session Recipe

Every session must contain certain ingredients so the learner always feels growth and never feels stuck:

- **New vocabulary** — at least a few new words every day, regardless of how heavy the remediation is. Growth has to be visible daily.
- **Weak-spot remediation** — targeted practice on what the fingerprint says is weakest (~40%)
- **Spaced review** — concepts going shaky get refreshed (~30%)
- **New material** — when the learner is ready, introduce the next concept in the graph (~20%)
- **Interleaving** — mixed practice so the brain has to actually parse, not pattern-match (~10%)

Default session length: 10–15 minutes. Better to come back daily than burn out.

Critical principle: **interleaving over pure drilling.** Pounding one weakness for 10 minutes straight is exhausting and backfires. Mix it.

---

## 9. System Architecture (Five Layers)

### Layer 1 — Content Foundation
- Sentences tagged by grammar concept(s), vocabulary cluster, scenario, difficulty
- Native-speaker audio (TTS first, real recordings later)
- Mini-dialogues and short stories that put grammar in real-life contexts
- Topic clusters (food, transport, work, family) mirroring real Norwegian life
- Short, visual grammar explainers
- All bundled or downloaded once. Zero ongoing cost.

### Layer 2 — The Mistake Fingerprint
The learner profile (Section 5). Lives on the device.

### Layer 3 — The Adaptive Engine
The personal syllabus generator. Reads the fingerprint, applies the concept graph, runs root-cause diagnosis, and assembles each daily session using the recipe in Section 8.

### Layer 4 — Exercise Variety + Repair Loop
The remediation layer. Multiple exercise types (Section 10). Every wrong answer triggers the repair loop (Section 4).

### Layer 5 — Local AI (A Power Tool)
Small on-device models (Apple Intelligence, Llama 3.2, Phi-3 mini) that *enhance* the coaching:
- Generate fresh sentence variations on demand (so content never feels finite)
- Write plain-language explanations of mistakes during the repair loop
- Review free-writing exercises and surface errors
- Run light conversation practice in Phase 3

Zero API cost. Works offline. Added *after* the non-AI engine is proven valuable.

---

## 10. Exercise Types

Same set, prioritized by what builds production ability:

1. Translation in both directions
2. **Sentence transformations** — change tense, swap pronouns, negate, change subject. Key for grammar mastery.
3. Fill-in-the-blank with grammar focus
4. Word order arrangement (drag tiles) — V2 word order practice
5. Listening comprehension
6. Dictation — hear it, write it
7. Reading comprehension
8. **Free writing with feedback** — production task; recognition alone won't create fluency
9. **Speaking prompts** (Phase 2+) — record yourself, get feedback
10. Conversation drills (Phase 3, with local AI)
11. Speed rounds for vocab recall

Every exercise is tagged with which concepts it teaches and which error types it can detect. Every mistake feeds the fingerprint.

---

## 11. The Error Taxonomy

Every mistake gets tagged consistently. Without this, the engine has no real data. Starting taxonomy:

**Grammar**
- Word order (especially V2 violations)
- Verb tense (present, past, perfect, future)
- Verb conjugation
- Noun gender (en/ei/et)
- Article use (definite/indefinite, single/plural)
- Adjective agreement
- Pronoun choice and case
- Preposition selection
- Modal verb usage
- Negation placement
- Compound word formation

**Vocabulary**
- Wrong word, right meaning category (false friends, near-synonyms)
- Wrong word, wrong category (didn't know it)
- Spelling

**Comprehension**
- Listening recognition
- Reading parsing
- Misunderstood meaning despite recognizing words

---

## 12. Real-Life Scenarios From Day One

Sentences live inside scenario clusters that matter:
- Ordering food and drinks
- Getting around (transport, directions)
- Talking about your day
- Meeting new people
- Work and study contexts
- Health and the body
- Shopping
- Norwegian culture and small talk

Every grammar concept gets practiced inside scenarios someone might actually use. This is how language sticks.

---

## 13. Norskprøven Alignment

Concrete real-world hook: align the app's content and progression with **Norskprøven**, the Norwegian proficiency test that matters for residency, work, and citizenship in Norway.

This gives the app a tangible goal beyond vague "fluency": *get the user to A2, B1, or B2 Norskprøven readiness*. That's measurable, meaningful, and a real reason to keep using the app.

The CEFR levels (A1 → A2 → B1 → B2) align directly with Norskprøven's structure.

---

## 14. Tone & Experience Principles

The app helps; it doesn't punish.

- **Precise, not aggressive.** The repair loop should feel like a tutor patiently helping, not a system tracking failures.
- **Show progress on weaknesses, not just streaks.** "Dative case: 30% mastered last week → 65% now." That's motivating.
- **Short sessions by default.** 10–15 minutes.
- **No fake gamification.** Streaks fine; cartoonish guilt-tripping no.
- **Honest about effort.** V2 word order is genuinely hard for English speakers — the app says so and shows that struggling is normal.
- **Daily growth visible.** New vocabulary every day. Always something to show for showing up.

---

## 15. Build Order

Build the brain before the body. Don't ship A1 content until the engine works.

**Phase 1A — The Engine Skeleton**
- Define the mistake fingerprint data structure
- Build the concept graph for A1 + A2 grammar with dependencies
- Define the error taxonomy
- Build the session scheduler that applies the daily recipe
- Build root-cause diagnosis rules
- Build the repair loop
- Test with a tiny content sample (50–100 sentences) — does it actually adapt?

**Phase 1B — Exercise Types + Real Content**
- Build 4–5 exercise types
- Author A1 content (~500 sentences with audio, properly tagged, organized into scenarios)
- Test with real learners — does the engine make people improve faster than a non-adaptive baseline? This is the validation.

**Phase 2 — The AI Layer**
- Add local model for plain-language mistake explanations in the repair loop
- Free-writing exercises with model feedback
- On-the-fly sentence variation

**Phase 3 — Production & B1/B2**
- Speaking prompts with feedback
- Conversation mode with local AI
- Expand content to B1, B2 with Norskprøven alignment

**Phase 4 — Scale**
- Android
- Optional cloud sync
- Other languages (the engine is language-agnostic by design)

---

## 16. The Content Authoring Pipeline

Easy to underestimate, kills projects when it's slow.

Need:
- A simple internal tool for adding sentences with concept tags, scenario tags, difficulty
- AI-assisted generation that suggests tags and variations, reviewed by a Norwegian speaker
- Validation rules — every sentence has audio, every concept has minimum N sentences across difficulty levels
- Version control on content

---

## 17. Open Questions

- Which local model performs best on Norwegian? (Needs testing — Norwegian is smaller, model quality varies)
- TTS quality v1 vs. real recordings — what's good enough?
- How much A1 content does v1 need to feel substantial?
- Free, freemium, one-time purchase, or subscription?
- **The success metric:** time to mastery on a defined concept set, tested against learners using Duolingo or similar
- Onboarding — placement test to bootstrap the fingerprint, or learn from scratch?

---

## 18. Strategic Framing (For Later)

This isn't really a Norwegian app. It's an **adaptive language-learning engine** that happens to launch with Norwegian. If the engine works, it ports to any language. That's the platform play.

For v1: stay focused. Ship the Norwegian app. Prove the engine.

---

## 19. The Bet

**Diagnosis + scheduling + remediation, done well, beats lesson-based apps for any motivated learner.**

The app should be a diagnostic language coach, not a chatbot. AI should power the coaching, not define the product. Every mistake should run through the repair loop. Every day should bring visible growth. The mistake fingerprint should evolve with the learner so the app always knows what they need next.

If we can prove that with v1 — even with limited content, even with minimal AI — we have something real. Everything else builds on top.

Let's build it.
