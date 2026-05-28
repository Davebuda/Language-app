# Nerve Center — NorskCoach Integration

> Project-specific wiring for how nerve-center tools connect to NorskCoach's document-driven workflow.

## Trigger

Auto-loads alongside the global nerve-center when working in the Language-app directory. Triggers on: `"research norwegian"`, `"crawl for content"`, `"competitor analysis"`, `"build next phase"`, `"what should we work on"`.

## Core Principle: Documents Are The Authority

NorskCoach is document-first. No agent builds without reading the docs. No research is useful unless it deposits into the right doc. The flow is always:

```
DOCS → inform → DECISION → approve → BUILD → verify → UPDATE DOCS
```

Never:
```
BUILD → hope it aligns → check docs later
```

---

## Document Authority Chain (read in order)

| Priority | File | What it controls |
|---|---|---|
| 1 | `CLAUDE.md` | Moat, north star, 8 operating rules — override everything |
| 2 | `docs/roadmap.md` | Build sequence — what's next, what's locked, what's deferred |
| 3 | `.council/log.md` | Decision history — why things are the way they are |
| 4 | `.council/current.md` | Current task brief and next steps |
| 5 | `docs/validation-and-research.md` | Research findings that drive decisions |
| 6 | `.planning/STATE.md` | Honest state: what works, what's broken |
| 7 | `.claude/skills/*/SKILL.md` | Domain knowledge for the area being touched |

**Rule: Any agent that writes code MUST have read priorities 1-4 in its context before starting.**

---

## How Each Tool Connects

### Browser-Use (`bu`) — Competitor Research & Visual Reference

**Use for:**
- Analyzing competitor language apps (Duolingo, Babbel, Lingvist, Drops) for UX patterns
- Checking how top apps handle weekly progress, streaks, speaking practice
- Visual reference gathering for UI decisions
- Testing NorskCoach's own deployed app visually

**Output goes to:** `.council/research.md` or `docs/validation-and-research.md`

**Invocation pattern:**
```
bu "Visit [app] and document how they handle [feature]. 
Take screenshots. Note: interaction patterns, information density, 
feedback timing, progression signals."
```

**What to research for NorskCoach specifically:**
- How competitors show weekly progress (for Stream 5.5 Lanes on a Bar)
- Speaking practice UX in mobile-first apps (for muntlig module)
- Error feedback patterns that build confidence vs. shame
- Session length signals and "done for today" patterns
- How apps handle Norwegian-specific challenges (æ/ø/å input, compound words)

---

### Crawl4AI (`crwl`) — Norwegian Language Content Harvesting

**Use for:**
- Harvesting Norwegian sentence examples from open sources
- Crawling grammar reference sites for rule verification
- Collecting frequency lists, word families, collocations
- Finding authentic Norwegian text at appropriate CEFR levels
- Gathering NoCoLA-style grammatical acceptability data

**Output goes to:** `content/` directory (structured) or `docs/validation-and-research.md` (findings)

**Invocation pattern:**
```
crwl [url] --output-format markdown --word-count-threshold 50
```

**High-value crawl targets for NorskCoach:**
- Norwegian frequency dictionaries (top 5000 words by CEFR level)
- NDLA.no (Norwegian Digital Learning Arena) — authentic content
- Grammatikk.com — rule explanations to verify skill files against
- NRK easy-Norwegian articles — graded reading material
- University of Oslo CLARINO corpus resources
- Bokmålsordboka / Nynorskordboka for lexical data

**Content pipeline:**
1. Crawl raw content
2. Pass through `norwegian-linguist` agent for quality check
3. Pass through `content-validator` agent for format check
4. Deposit in `content/` with concept-graph tags
5. Update `docs/roadmap.md` if new content unlocks deferred features

---

### OpenHands — Phase Implementation

**Use for:**
- Implementing complete Stream phases (e.g., "Stream 5.5 Phase 3: Journal focus-bias")
- Multi-file refactors that touch engine + UI + tests
- Tasks where the spec is fully locked in `docs/roadmap.md`

**Mandatory pre-flight (build into the OpenHands task prompt):**
```
Before writing any code, read these files in order:
1. CLAUDE.md — project rules
2. docs/roadmap.md — find the exact phase spec
3. .council/log.md (last 50 lines) — recent decisions
4. The relevant .claude/skills/ file for the domain

Then implement ONLY what the phase spec says. No scope creep.
Run tests before submitting.
```

**Post-flight:**
- PR goes through `code-reviewer` (opus)
- Update `.council/log.md` with decision record
- Update `docs/roadmap.md` status

---

### Aider — Iterative Work Within Phases

**Use for:**
- Fixing bugs found during verification
- Small adjustments after code review feedback
- Pair-programming through tricky engine logic
- Quick iterations on a single file or function

**Context setup:**
```
aider --read CLAUDE.md --read docs/roadmap.md --read .council/current.md
```

This ensures Aider always has the project context loaded as read-only reference.

---

### Tavily / Web Search — Decision Research

**Use for:**
- "Should we use X approach or Y?" — find evidence
- Best practices for adaptive learning algorithms
- SRS research (SuperMemo, FSRS, Anki algorithms)
- Norwegian pedagogy papers
- WebLLM / on-device AI developments

**Output goes to:** `docs/validation-and-research.md` with this format:
```markdown
## [Topic] — [Date]

**Question:** [What we needed to know]
**Finding:** [What we learned]
**Source:** [URL]
**Confidence:** [verified/likely/speculative]
**Impact on NorskCoach:** [How this changes or confirms our approach]
**Decision:** [What we're doing about it — or "no action, confirms current direction"]
```

---

### Obsidian MCP — Personal Knowledge Integration

**Use for:**
- Cross-referencing notes on Norwegian learning (Dave's own experience)
- Connecting product thinking notes to implementation
- Pulling research from Dave's vault into project docs

**Connection:** Read from vault → deposit relevant findings into `.council/research.md`

---

## Workflow: "What Should We Work On Next?"

When asked this, nerve-center runs:

1. **Read** `docs/roadmap.md` → find current stream + next unlocked phase
2. **Read** `.council/current.md` → check if there's an active task
3. **Read** `.planning/STATE.md` → check for blockers
4. **Check** GitHub issues (via MCP) → any P0/P1 bugs?
5. **Check** Sentry (via MCP) → any production errors?
6. **Report:** "Next up is [phase]. Blocker status: [none/X]. Want me to start?"

---

## Workflow: "Research [Topic] For NorskCoach"

1. **Classify:** Is this about competitors, language content, technical approach, or pedagogy?
2. **Route:**
   - Competitors → `browser-use` (visit apps, take screenshots, document patterns)
   - Language content → `crawl4ai` (harvest from Norwegian sources)
   - Technical → `tavily` search + `context7` docs
   - Pedagogy → `tavily` search for papers + `scientist` agent to analyze
3. **Deposit:** Write findings to `docs/validation-and-research.md`
4. **Connect:** Update `.council/research.md` if it affects an active decision
5. **Report:** Summarize finding + state whether it confirms or challenges current direction

---

## Workflow: "Build [Phase/Feature]"

1. **Verify spec exists:** Check `docs/roadmap.md` for the phase
2. **Check dependencies:** Are prerequisite phases shipped?
3. **Read context:** Load authority chain (priorities 1-7)
4. **Check architect:** Does this need architect approval? (if complex/architectural)
5. **Select agent:**
   - Full phase with clear spec → OpenHands
   - Iterative/exploratory → Aider
   - UI component → `frontend-developer` agent
   - Engine logic → direct implementation with `engine-tester` verification
6. **Build** with spec as primary input
7. **Verify:** Run tests, check against acceptance criteria in roadmap
8. **Update docs:** `.council/log.md` + roadmap status
9. **Never self-approve:** Code review is mandatory before merge

---

## Research Backlog (Persistent)

These are always valid research tasks that nerve-center can pick up during idle loops:

- [ ] Latest FSRS algorithm paper — does it improve our SRS scheduling?
- [ ] Norwegian TTS quality comparison (2026 models) — for muntlig module
- [ ] Competitor weekly-progress UX — screenshots of Duolingo/Babbel/Lingvist weekly views
- [ ] CEFR-tagged Norwegian content sources — expand content pipeline
- [ ] On-device model options beyond WebLLM — any new contenders?
- [ ] NoCoLA dataset quality check — is there a newer version?
- [ ] Best practices for confidence-building in language apps (pedagogy papers)
- [ ] Norwegian compound word frequency list — for word-building exercises

---

## Guard Rails

1. **No building without a locked spec.** If the phase spec in `docs/roadmap.md` is vague, research/clarify first.
2. **No silent content generation.** Norwegian content must pass through `norwegian-linguist` + `content-validator`.
3. **No engine changes without tests.** The 254-test suite is the safety net — keep it green.
4. **No scope creep.** "Fix X" means fix X. Don't refactor Y.
5. **Pipeline honesty.** Every surface claiming to feed the engine must be traced end-to-end.
6. **Research must land in docs.** Findings in agent memory or conversation are worthless — they must be written to the right markdown file.
