# Skills & Subagents Plan — Norwegian App Project

*The specialized capabilities to build into Claude Code for this project. Pair with environment-prep doc and brainstorm v3.*

---

## 1. The Mental Model

Claude Code has three layers of context/automation that matter for this project:

- **CLAUDE.md** — always-on. Read every session. Keep it for things that apply *every* time (project overview, core principles, current phase).
- **Skills** — on-demand knowledge. Loaded only when the topic comes up. Keep specialized reference material here (Norwegian grammar rules, the error taxonomy, the repair loop pattern). Saves context tokens until needed.
- **Subagents** — isolated workers. Spawned for specific tasks, run in their own context window, return only a summary. Use these when work would otherwise pollute the main session (testing, reviews, content generation, debugging).

**Rule of thumb:**
- If you're tired of repeating yourself → Skill.
- If a task would generate a flood of file reads, logs, or analysis you won't reference again → Subagent.
- If something must apply to *every* session → CLAUDE.md.

Files live in `.claude/skills/` and `.claude/agents/` at the project root.

---

## 2. Skills to Build

Listed in priority order. Each has a one-line purpose, a description (the auto-trigger hint), and a sketch of contents.

### Tier 1 — Build during Phase 1A (engine skeleton)

#### 2.1 `norwegian-grammar`
**Purpose:** Reference on Norwegian grammar so Claude doesn't invent rules.
**Description:** "Reference for Norwegian grammar rules — noun gender (en/ei/et), V2 word order, definite/indefinite articles, adjective agreement, verb conjugation patterns, tense formation, subordinate clause word order, modal verbs, common edge cases. Use whenever generating, reviewing, or writing logic about Norwegian sentences."
**Contents:**
- Gender system (en, ei, et) with examples and patterns
- Definite vs indefinite forms, plural rules
- V2 word order (the critical one for English speakers)
- Subordinate clause word order
- Verb tense formation (present, preterite, perfect, future)
- Modal verbs and their patterns
- Adjective agreement with gender and definiteness
- Common irregulars worth knowing
- Bokmål vs Nynorsk note (probably going Bokmål)

#### 2.2 `error-taxonomy`
**Purpose:** Canonical mistake tag list so every exercise tags errors consistently.
**Description:** "The full error taxonomy used to tag every mistake the learner makes. Use when writing exercise scoring code, adding new exercise types, modifying the mistake fingerprint, or analyzing learner errors."
**Contents:**
- Full grammar error list (word order, tense, gender, articles, adjective agreement, pronouns, prepositions, modals, negation, compounds)
- Vocabulary error categories (wrong word same category, wrong word different category, spelling)
- Comprehension error categories (listening, reading, meaning)
- Tagging rules: what counts as which tag
- Examples of each tag in context
- Anti-patterns: tags to avoid combining, tags that need disambiguation

#### 2.3 `concept-graph`
**Purpose:** Spec for the grammar concept dependency graph.
**Description:** "How the concept graph is structured, how concepts depend on each other, how to add or modify nodes, validation rules for the graph. Use when modifying scheduler logic, adding new concepts, or working with progression."
**Contents:**
- Graph data structure (JSON/YAML format)
- Naming conventions for concepts
- Dependency rules (what's a hard prerequisite vs a soft one)
- CEFR level assignment per concept
- How to validate (no cycles, all prereqs resolved)
- Example: full A1 graph

#### 2.4 `mistake-fingerprint`
**Purpose:** Spec for the per-learner data model.
**Description:** "The mistake fingerprint data model: mastery scores, confidence intervals, decay formulas, error pattern tracking. Use when modifying fingerprint storage, scoring logic, or any code that reads from or writes to the learner profile."
**Contents:**
- Full data schema
- Mastery score calculation (formula + examples)
- Confidence interval logic (more attempts + more days = higher confidence)
- Decay function over time
- Error pattern aggregation rules
- Privacy boundaries (what stays local, what could sync if user opts in)
- Update rules — when to recalculate

#### 2.5 `repair-loop`
**Purpose:** The pattern for handling wrong answers.
**Description:** "The repair loop pattern: wrong answer → explanation → micro-drill → retry → scheduled review. Use when implementing or modifying any exercise type, the scoring system, or the session flow."
**Contents:**
- The five-step pattern with clear interface points
- How to pick the explanation (template vs AI-generated)
- How to pick the micro-drill (concept + format)
- How retry differs from the original (slight variation, not identical)
- How to queue the scheduled review (spaced repetition integration)
- Edge cases: repeated failures, learner skipping, partial correctness

#### 2.6 `session-recipe`
**Purpose:** The daily session composition rules.
**Description:** "Rules for how the engine composes each daily session: target ratio of remediation, review, new material, interleaving, plus the always-include-new-vocab rule. Use when modifying the scheduler or session generator."
**Contents:**
- Target ratios (~40/30/20/10) with rationale
- The new-vocab requirement (always at least N new words)
- Length calibration (default 10–15 minutes)
- How ratios shift based on learner state (heavy remediation mode, exam prep mode)
- Interleaving rules (don't put 5 of the same concept in a row)

#### 2.7 `swift-conventions`
**Purpose:** Project-specific Swift patterns.
**Description:** "Swift coding conventions for this project: module boundaries, async/await usage, GRDB patterns for SQLite, naming, testing approach. Use when writing or reviewing Swift code."
**Contents:**
- Module boundaries (Engine, Fingerprint, Content, Exercises, AI, Storage, UI)
- Prefer value types and structs
- Async/await over completion handlers
- GRDB.swift patterns for SQLite access
- Naming conventions (no Hungarian, follow Apple style)
- Testing patterns (XCTest, what to test vs what not to)
- Concurrency: actors vs MainActor

#### 2.8 `sqlite-schema`
**Purpose:** Content DB schema and query patterns.
**Description:** "The SQLite schema for the content database (sentences, concepts, scenarios, audio refs) and the fingerprint database (mastery, errors, history). Use when writing storage code, queries, or migrations."
**Contents:**
- Tables and columns for content
- Tables and columns for fingerprint
- Indexes for the queries the engine actually runs
- Migration approach (when schema changes)
- Common query patterns with examples

---

### Tier 2 — Build during Phase 1B (content + exercises)

#### 2.9 `cefr-norskprøven`
**Purpose:** Map CEFR levels to Norwegian-specific Norskprøven structure.
**Description:** "CEFR level definitions and Norskprøven mapping. Which grammar concepts and vocabulary belong to A1, A2, B1, B2. Use when assigning levels to content, planning curriculum, or building progression milestones."
**Contents:**
- CEFR level definitions
- Norskprøven structure
- Concept-by-concept level assignment
- Vocabulary expectations per level
- Common can-do statements per level

#### 2.10 `content-authoring-standards`
**Purpose:** Quality bar for sentences and exercises.
**Description:** "Standards for sentence quality: scenario-fit, single-concept focus, level-appropriate vocab, audio requirements, naturalness. Use when generating or reviewing content."
**Contents:**
- The single-concept rule (introduce one new thing at a time)
- Scenario-fit checklist (would someone actually say this?)
- Vocab level matching
- Audio requirements (every sentence has it)
- Naturalness over textbook-correctness when in conflict
- Anti-patterns ("the dog eats the apple" energy)

---

### Tier 3 — Build during Phase 2+ (AI layer)

#### 2.11 `mlx-integration`
**Purpose:** MLX Swift patterns for on-device models.
**Description:** "How to integrate MLX Swift in this project: model loading, inference, memory management, fallback when model unavailable. Use when working on the AI layer."
**Contents:**
- MLX Swift setup
- Model loading patterns
- Inference best practices
- Memory management on device
- Fallback to scripted templates when model unavailable
- How to swap models without breaking callers

#### 2.12 `tts-pipeline`
**Purpose:** Audio generation standards.
**Description:** "How to generate Norwegian TTS audio: voice selection, text preprocessing, file naming conventions, quality checks. Use when generating new audio for sentences."
**Contents:**
- Approved TTS providers/voices (start TTS, plan for native recordings later)
- Text preprocessing (handle abbreviations, numbers)
- File naming (`<sentence_id>_<voice>.mp3`)
- Quality checks (length sanity, format validation)
- Storage layout in `content/audio/`

---

## 3. Subagents to Build

Subagents do work in isolated contexts. Each has a name, description (the trigger hint), restricted tool access, model choice, and a system prompt.

### Tier 1 — Build during Phase 1A

#### 3.1 `engine-tester`
**Purpose:** Run simulated learner sessions and report whether the engine adapts correctly.
**When invoked:** After changes to the scheduler, repair loop, or fingerprint logic.
**Tools:** `Bash`, `Read` (for inspecting simulator output)
**Model:** `sonnet`
**Skills injected:** `mistake-fingerprint`, `session-recipe`, `repair-loop`
**Sketch:**
> You are the engine-tester. You run the Python engine simulator (`content-pipeline/src/simulator.py`) with synthetic learner profiles and verify the engine adapts as expected.
>
> When invoked:
> 1. Run the simulator with at least 3 profiles: a beginner, an intermediate learner with specific weak spots, and a learner near level transition.
> 2. Inspect the session outputs.
> 3. Verify session ratios match the recipe, repair loops trigger correctly, mastery scores update sensibly.
> 4. Report findings with concrete examples. Flag any divergence from expected behavior.

#### 3.2 `ios-architect`
**Purpose:** Review Swift code for architecture compliance.
**When invoked:** After significant Swift changes, before merging to main.
**Tools:** `Read`, `Grep`, `Glob`
**Model:** `sonnet`
**Skills injected:** `swift-conventions`
**Sketch:**
> You are the iOS architect. You review Swift code for compliance with the project's architecture: module boundaries, value types, async/await usage, GRDB patterns, no UI logic in Engine, no Engine logic in UI.
>
> When invoked:
> 1. Run `git diff` to see recent Swift changes.
> 2. Check each modified file against `swift-conventions`.
> 3. Report issues organized as Critical (must fix), Warnings, Suggestions.
> 4. Quote specific lines. Do not edit code yourself — flag and explain.

#### 3.3 `fingerprint-debugger`
**Purpose:** Explain what the engine is doing and why, given a fingerprint state.
**When invoked:** When debugging engine behavior, or when a learner reports something unexpected.
**Tools:** `Read`, `Bash` (for querying the fingerprint DB)
**Model:** `sonnet`
**Skills injected:** `mistake-fingerprint`, `session-recipe`, `repair-loop`
**Sketch:**
> You are the fingerprint debugger. Given a fingerprint state (or a path to one), you explain what the engine would do next and why.
>
> When invoked:
> 1. Read the fingerprint state.
> 2. Trace through the scheduler logic.
> 3. Predict the next session composition.
> 4. Explain in plain language what the learner's strengths and weaknesses are.
> 5. Highlight any anomalies (decayed concepts, stuck spots, ready-to-advance signals).

---

### Tier 2 — Build during Phase 1B

#### 3.4 `norwegian-linguist`
**Purpose:** Reviews Norwegian content for correctness and naturalness.
**When invoked:** After generating new sentences, before adding them to the corpus.
**Tools:** `Read`
**Model:** `sonnet`
**Skills injected:** `norwegian-grammar`, `cefr-norskprøven`
**Sketch:**
> You are a Norwegian linguistic reviewer. You check Norwegian sentences for grammatical correctness, naturalness, and level appropriateness.
>
> When invoked with a list of sentences:
> 1. Check each for grammar errors.
> 2. Flag awkward or unnatural phrasing.
> 3. Verify the level tag matches the actual difficulty.
> 4. Verify the concept tag is genuinely the dominant new concept in the sentence.
> 5. Return a structured report: pass / flag / rewrite-suggested per sentence.

#### 3.5 `content-author`
**Purpose:** Generates batches of tagged sentences.
**When invoked:** When the corpus needs more sentences for a specific concept, scenario, or level.
**Tools:** `Read`, `Write` (limited to `content/sentences/`)
**Model:** `sonnet` or `opus`
**Skills injected:** `norwegian-grammar`, `error-taxonomy`, `content-authoring-standards`, `cefr-norskprøven`
**Sketch:**
> You are a content author. You generate Norwegian sentences for a given concept, scenario, and level, applying full tagging.
>
> When invoked with parameters (concept, scenario, level, count):
> 1. Generate N sentences that meet the standards (single-concept focus, scenario-fit, level-appropriate).
> 2. Tag each with concept(s), scenario, level, error types it can detect.
> 3. Write to the staging area (not directly to the live corpus).
> 4. Report what was generated and flag any sentences you're uncertain about.
> 5. Recommend running `norwegian-linguist` next.

#### 3.6 `content-validator`
**Purpose:** Validates the entire content corpus for completeness and consistency.
**When invoked:** Before any content release, after bulk edits.
**Tools:** `Read`, `Bash`
**Model:** `haiku`
**Skills injected:** `error-taxonomy`, `content-authoring-standards`
**Sketch:**
> You are the content validator. You run mechanical checks across the entire content corpus.
>
> When invoked:
> 1. Verify every sentence has audio.
> 2. Verify every concept has at least N sentences across difficulty levels.
> 3. Verify no orphaned scenarios.
> 4. Verify every tag is in the canonical taxonomy.
> 5. Verify level tags match the assigned CEFR concepts.
> 6. Report all failures grouped by type.

#### 3.7 `doc-keeper`
**Purpose:** Keeps docs in sync with code.
**When invoked:** After significant architecture or schema changes.
**Tools:** `Read`, `Write` (limited to `docs/`)
**Model:** `haiku` or `sonnet`
**Sketch:**
> You are the doc keeper. You maintain consistency between the codebase and the docs in `docs/`.
>
> When invoked:
> 1. Compare `docs/architecture.md` and other docs against the current code state.
> 2. Update docs to reflect reality.
> 3. Flag anything where the code seems to have drifted from the brainstorm vision.

---

### Tier 3 — Build during Phase 2+

#### 3.8 `mlx-model-evaluator`
**Purpose:** Tests local models on Norwegian tasks and reports which performs best.
**When invoked:** During AI model selection, when considering a model swap.
**Tools:** `Bash`, `Read`, `Write` (limited to evaluation reports)
**Model:** `sonnet`
**Skills injected:** `mlx-integration`, `norwegian-grammar`
**Sketch:**
> You are the model evaluator. You run a defined battery of Norwegian tasks against multiple local models and report results.
>
> When invoked:
> 1. Run the eval harness against the requested models.
> 2. Score each on grammar correction, sentence variation, simple conversation, mistake explanation quality.
> 3. Report winner per category and overall recommendation.
> 4. Note any concerning failures (hallucinated grammar, wrong language responses).

---

## 4. How They Work Together — Real Workflow Examples

### Example A: Adding a new exercise type
1. Main Claude session reads `error-taxonomy`, `repair-loop`, `swift-conventions` skills as you describe the exercise.
2. You and Claude design and implement the exercise in Swift.
3. Invoke `ios-architect` subagent → reviews the implementation.
4. You fix issues, re-invoke if needed.
5. Invoke `engine-tester` subagent → simulates sessions including the new exercise.
6. Merge.

### Example B: Adding 100 new dative-case sentences
1. Main session with `concept-graph` skill loaded — you confirm dative is the right concept.
2. Invoke `content-author` subagent with parameters (concept=dative, scenario=ordering food, level=A2, count=100).
3. Subagent generates and tags, writes to staging.
4. Invoke `norwegian-linguist` subagent → reviews for correctness.
5. Fix or accept rewrite suggestions.
6. Invoke `content-validator` subagent → confirms tagging completeness, audio queue is correct.
7. Promote to live corpus.

### Example C: Debugging "the engine keeps showing me articles when I keep getting articles right"
1. Invoke `fingerprint-debugger` subagent with the user's fingerprint state.
2. Subagent reports: "Articles confidence is 92%, but adjective agreement confidence is 30% and the cluster rule treats them together. Engine is correctly drilling adjectives while occasionally re-checking articles."
3. You decide whether to refine the cluster rule or accept the behavior.
4. If refining: main session with `mistake-fingerprint` skill loaded, make the change.
5. Invoke `engine-tester` subagent to verify the fix didn't break anything else.

---

## 5. Build Order

Don't create everything upfront. Build skills/subagents *as you need them*, but here's the order that aligns with the project phases:

**Day one of Phase 1A:**
- Skills: `concept-graph`, `mistake-fingerprint`, `session-recipe`, `repair-loop`, `error-taxonomy`, `swift-conventions`, `sqlite-schema`, `norwegian-grammar`
- Subagents: (none yet — wait until you have something to test)

**Mid Phase 1A (when first engine logic exists):**
- Subagents: `engine-tester`, `ios-architect`, `fingerprint-debugger`

**Start of Phase 1B (when starting content work):**
- Skills: `cefr-norskprøven`, `content-authoring-standards`
- Subagents: `content-author`, `norwegian-linguist`, `content-validator`

**Anytime during Phase 1B:**
- Subagent: `doc-keeper`

**Phase 2 (AI layer):**
- Skills: `mlx-integration`, `tts-pipeline`
- Subagent: `mlx-model-evaluator`

---

## 6. File Structure for Skills and Subagents

```
.claude/
├── skills/
│   ├── norwegian-grammar/
│   │   └── SKILL.md
│   ├── error-taxonomy/
│   │   └── SKILL.md
│   ├── concept-graph/
│   │   ├── SKILL.md
│   │   └── examples/
│   │       └── a1-graph.yaml
│   ├── mistake-fingerprint/
│   │   └── SKILL.md
│   ├── repair-loop/
│   │   └── SKILL.md
│   ├── session-recipe/
│   │   └── SKILL.md
│   ├── swift-conventions/
│   │   └── SKILL.md
│   └── sqlite-schema/
│       └── SKILL.md
└── agents/
    ├── engine-tester.md
    ├── ios-architect.md
    ├── fingerprint-debugger.md
    ├── norwegian-linguist.md
    ├── content-author.md
    ├── content-validator.md
    └── doc-keeper.md
```

Skills are directories so they can include supporting files (examples, templates). Subagents are single markdown files.

---

## 7. Templates

### Skill Template
```markdown
---
name: skill-name
description: One-paragraph description that tells Claude when to use this skill. Include the keywords and contexts that should trigger it.
---

# Skill Name

[Body content — the actual reference material, instructions, examples. This loads only when the skill is invoked, so be thorough without being precious about length.]
```

### Subagent Template
```markdown
---
name: agent-name
description: When to invoke this agent. Be specific about the trigger conditions so Claude delegates appropriately.
tools: Read, Grep, Bash
model: sonnet
skills:
  - relevant-skill-1
  - relevant-skill-2
---

You are the [role]. [Description of expertise and stance.]

When invoked:
1. [Step]
2. [Step]
3. [Step]

[Output format expectations.]
[Constraints on what NOT to do.]
```

---

## 8. Things to Watch For

- **Don't over-skill.** If something only comes up twice, don't make a skill for it. Skills are for repeated reference.
- **Subagents lose continuity.** They start fresh each time. Don't expect them to remember previous invocations unless you explicitly persist state.
- **Tool restrictions matter.** A reviewer subagent should be Read-only. A content-author should not have access to delete files. Lock down access to match the role.
- **Model choice is a real cost lever.** Use `haiku` for mechanical work (validation, doc updates), `sonnet` for most reasoning, `opus` only for complex generation or multi-step planning.
- **Keep CLAUDE.md lean.** Move reference material into skills as it grows. Every line in CLAUDE.md costs context every session.

---

## 9. The Bigger Picture

The skills and subagents together turn Claude Code from a chat interface into a development team for this project:

- **Skills** are the team's institutional knowledge (how Norwegian works, how the architecture works).
- **Subagents** are the team's specialists (the linguist, the iOS architect, the QA engineer, the content author).
- **You + the main Claude session** are the project lead — directing, deciding, integrating.

Build this scaffolding in parallel with the actual codebase, and by the time the app is real, you have a system that can grow with it.
