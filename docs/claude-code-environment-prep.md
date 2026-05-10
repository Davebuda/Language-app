# Claude Code Environment Prep — Norwegian App Project

*Everything to install, configure, and prepare before opening Claude Code on day one. Pair this with brainstorm v3.*

---

## 1. Hardware & OS

You're building a native iOS app with on-device AI. This narrows hardware significantly.

**Required:**
- **Mac with Apple Silicon (M1, M2, M3, or M4).** Required for iOS development *and* strongly preferred for testing local AI models. Intel Macs technically work but local model performance will be poor.
- **macOS 14 (Sonoma) or later.** Apple Intelligence requires macOS 15+ on M-series chips.
- **At least 16GB RAM.** 32GB strongly recommended — Xcode + iOS Simulator + a local AI model + Claude Code all running together is heavy.
- **At least 100GB free disk space.** Xcode alone is ~40GB. Add models, simulators, content files, audio.

**iPhone for real-device testing:**
- iPhone 15 Pro or later if you want Apple Intelligence on-device testing (older iPhones can run smaller Llama/Phi models via MLX, but not Apple's own foundation models).
- Worth borrowing or buying a recent iPhone before Phase 2 (the AI layer).

---

## 2. Core Development Tools

Install in this order.

### 2.1 Xcode (the iOS development environment)
- Install from the Mac App Store (latest version, Xcode 16+)
- Open it once after install to accept the license and download additional components
- Inside Xcode: Settings → Platforms → install the latest iOS Simulator runtime

### 2.2 Command Line Tools
- After Xcode opens, run `xcode-select --install` in Terminal
- Verify: `xcode-select -p` should print a path

### 2.3 Homebrew (package manager for everything else)
- Install: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- Verify: `brew --version`

### 2.4 Git + GitHub
- Git comes with Xcode Command Line Tools
- Set up your identity: `git config --global user.name "Your Name"` and `git config --global user.email "your@email"`
- Create a GitHub account if you don't have one
- Set up SSH key: `ssh-keygen -t ed25519 -C "your@email"`, add the public key to GitHub
- Create a private repo for the project (suggested: `norwegian-coach` or whatever you'd prefer)

### 2.5 Python (for the content authoring pipeline)
- Install with Homebrew: `brew install python@3.12`
- Verify: `python3 --version`
- Install `uv` for fast package management: `brew install uv`

### 2.6 Node.js (optional but recommended)
- Install with Homebrew: `brew install node`
- Useful for misc tooling, MCP servers, and if you build any web-based authoring UI later

---

## 3. Claude Code Setup

### 3.1 Subscription
- You need a **Claude Pro** ($20/month), **Max**, **Team**, or **Console (API)** account. Free tier doesn't include Claude Code.
- Pro is fine to start. Upgrade to Max if you find yourself hitting limits.

### 3.2 Install Claude Code (native installer — recommended)
- macOS install: curl-based native installer adds the `claude` command to your PATH and auto-updates in the background
- Run the install command from the official docs at https://docs.claude.com/en/docs/claude-code/overview
- Verify: `claude --version`
- First run: type `claude` in any directory, follow browser auth prompts

### 3.3 Run the health check
- `claude doctor` — verifies your setup, flags issues. Run this after install.

### 3.4 Recommended Claude Code settings
Once installed, you can customize via `/config` inside Claude Code. Worth setting up:
- Default editor (VS Code, Cursor, Xcode — your call)
- Permissions for which directories Claude Code can access
- Auto-update channel

---

## 4. MCP Servers (Claude Code's Tool Connectors)

MCP servers extend Claude Code's capabilities. For this project, set up these:

### 4.1 GitHub MCP (essential)
Lets Claude Code create issues, manage PRs, review code without leaving the terminal.
```
claude mcp add github -- npx -y @modelcontextprotocol/server-github
```
You'll need a GitHub Personal Access Token with repo permissions.

### 4.2 Filesystem MCP (default)
Comes built-in. Gives Claude Code access to your project files.

### 4.3 SQLite MCP (recommended for this project)
You'll be inspecting and querying SQLite databases (the content DB, the mistake fingerprint store). An MCP that can read SQLite saves a ton of friction.
- Search for a current SQLite MCP server when you're ready (the ecosystem moves fast)

### 4.4 Custom MCP servers (later, optional)
Once the project matures, you might build a custom MCP for:
- Querying the concept graph
- Validating content against the error taxonomy
- Triggering the content authoring pipeline

These are not day-one needs. Mention them now so they're on the roadmap.

---

## 5. Local AI Testing Tools (For You, Not the App)

You'll need to test which local models work best for Norwegian *during development*, before committing to one for the app.

### 5.1 Ollama
- Install: `brew install ollama`
- Run: `ollama serve` (in one terminal), then `ollama pull llama3.2:3b` (in another)
- Test Norwegian capability with several models: `llama3.2:1b`, `llama3.2:3b`, `phi3:mini`, `qwen2.5:3b`
- This is your testing ground for which model performs well enough on Norwegian to ship.

### 5.2 MLX (Apple's ML framework, for the actual app)
- Install with Python: `pip install mlx mlx-lm`
- Used for converting and running models efficiently on Apple Silicon
- The iOS app will use the Swift counterpart (MLX Swift)

### 5.3 llama.cpp (alternative model runtime)
- `brew install llama.cpp`
- Useful for benchmarking and as a fallback runtime option

---

## 6. Project Structure (Mono-repo Recommended)

Suggested layout. Create this structure on day one:

```
norwegian-coach/
├── README.md                        # Project intro
├── CLAUDE.md                        # Claude Code project context (see Section 7)
├── docs/
│   ├── brainstorm-v3.md             # The product vision
│   ├── architecture.md              # Technical architecture
│   ├── error-taxonomy.md            # The full mistake tag list
│   ├── concept-graph.md             # Grammar concept dependencies
│   └── decisions/                   # ADRs (architecture decision records)
├── ios/
│   └── NorwegianCoach/              # Xcode project
│       ├── App/                     # SwiftUI app entry, navigation
│       ├── Engine/                  # Adaptive engine, scheduler, repair loop
│       ├── Fingerprint/             # Mistake fingerprint logic
│       ├── Content/                 # Content loading, querying
│       ├── Exercises/               # Exercise type implementations
│       ├── AI/                      # Local AI integration (MLX, Apple FM)
│       ├── Storage/                 # SQLite layer
│       └── UI/                      # Views, components
├── content-pipeline/                # Python tools for authoring content
│   ├── pyproject.toml
│   ├── src/
│   │   ├── generate.py              # AI-assisted sentence generation
│   │   ├── tag.py                   # Concept/error/scenario tagging
│   │   ├── validate.py              # Content QC
│   │   ├── tts.py                   # Audio generation pipeline
│   │   └── export.py                # Build the SQLite seed for the app
│   └── tests/
├── content/                         # The actual content data (source of truth)
│   ├── concepts/                    # Concept graph definitions (JSON/YAML)
│   ├── sentences/                   # Tagged sentences
│   ├── scenarios/                   # Scenario clusters
│   └── audio/                       # Generated/recorded audio files
└── scripts/
    ├── seed-db.sh                   # Build the SQLite content DB for the app
    └── run-pipeline.sh              # Full content pipeline run
```

**Why mono-repo:** the iOS app and the content pipeline are tightly coupled — content schema changes need to update both. One repo, one source of truth, easier for Claude Code to reason across.

---

## 7. The CLAUDE.md File (Project Context for Claude Code)

This is critical. Claude Code reads `CLAUDE.md` automatically and uses it as context for every session. Without it, you're re-explaining the project every time.

Draft to put at the project root:

```markdown
# Norwegian Coach — Project Context for Claude Code

## What We're Building
A diagnostic Norwegian language learning app for iOS. Not a course — a coach. The app generates a personal syllabus daily based on each learner's mistake fingerprint, teaches grammar in dependency order via a concept graph, and runs every wrong answer through a repair loop. Local-first, on-device AI.

**One-line positioning:** A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.

**Read first:** `docs/brainstorm-v3.md` — the full product vision.

## The Moat
Diagnosis + Scheduling + Remediation. AI is a power tool that supports the coaching, never the product itself.

## Architecture
Five layers:
1. Content foundation (sentences, audio, scenarios — bundled with the app)
2. Mistake fingerprint (per-user profile, lives on device)
3. Adaptive engine (diagnoses, schedules, applies the daily session recipe)
4. Exercise variety + repair loop (every wrong answer triggers explain → micro-drill → retry → schedule review)
5. Local AI (small on-device models — explanations, variations, conversation)

## Tech Stack
- **iOS:** Swift 6 / SwiftUI, iOS 17+ minimum (iOS 18+ for Apple Intelligence features)
- **Storage:** SQLite (GRDB.swift wrapper recommended)
- **Local AI:** MLX Swift for custom models, Apple Foundation Models for AI on supported devices
- **Content pipeline:** Python 3.12 with `uv`, AI-assisted via Claude API
- **Testing:** XCTest for iOS, pytest for the pipeline

## Coding Conventions
- Swift: standard Apple style, prefer value types and structs, async/await over completion handlers
- Python: type hints on everything, ruff for linting, format with `ruff format`
- Commit messages: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- One concept per PR — don't mix unrelated changes

## Critical Principles
- Build the brain before the body — engine and data structures before content volume
- Local-first — no per-user API costs in the core experience
- Mistake fingerprint stays on the device, never synced without explicit user opt-in
- Privacy is a product advantage — design and code accordingly
- The repair loop is the single most important user-facing mechanic

## Current Phase
Phase 1A — Engine Skeleton. We are NOT writing UI polish, NOT generating production content, NOT integrating AI yet. Goal: prove the engine adapts.

## When in Doubt
Re-read brainstorm v3. Every decision should trace back to one of its principles.
```

You can refine this once development starts, but having it on day one means Claude Code has the full picture from your first session.

---

## 8. Custom Tools You'll Need to Build

Listed by priority. Don't build them all at once — build when needed.

### Tier 1 — Build during Phase 1A (engine skeleton)
- **Concept graph editor/validator** — JSON or YAML files defining concepts and their dependencies. A simple Python validator that ensures the graph has no cycles, every concept has prerequisites resolved, etc.
- **Mistake fingerprint inspector** — a debug view inside the iOS app that shows the current fingerprint state. Critical for development, can be hidden in production.
- **Engine simulator (Python)** — simulate a learner going through sessions, watch the engine adapt. Lets you iterate on the engine logic without running the full iOS app.

### Tier 2 — Build during Phase 1B (content + exercises)
- **Content authoring CLI** — `python -m content_pipeline add-sentence` style commands. Tags sentences with concepts, scenarios, error types.
- **AI-assisted tagger** — feeds a sentence to Claude API, gets suggested tags, you confirm or correct.
- **Content validator** — runs over all sentences. Checks: every sentence has audio, every concept has minimum N sentences, no orphaned scenarios, etc.
- **TTS pipeline** — generates audio for new sentences. Multiple voice options. Saves audio files into `content/audio/`.
- **DB seeding script** — exports content into the SQLite database the app ships with.

### Tier 3 — Build during Phase 2 (AI layer)
- **Model evaluation harness** — runs a battery of Norwegian tasks (translation, grammar correction, conversation) against multiple local models. Helps pick the right one.
- **Prompt template manager** — manages the prompts used with the local model for explanations, variations, etc.

### Tier 4 — Later
- **Mistake clustering rule editor** — visual or config-based way to add new root-cause diagnosis rules without touching Swift.
- **Custom MCP servers** for the project (concept graph queries, content validation as a tool).

---

## 9. Day One Setup Checklist

Print this. Check items off.

**Hardware/OS**
- [ ] Mac with Apple Silicon, macOS 14+, 16GB+ RAM, 100GB+ free
- [ ] iPhone available for testing (recent model preferred)

**Core tools**
- [ ] Xcode installed and opened once
- [ ] Command Line Tools installed (`xcode-select -p` works)
- [ ] Homebrew installed (`brew --version` works)
- [ ] Git configured with name + email
- [ ] GitHub account ready, SSH key added, private repo created
- [ ] Python 3.12 + uv installed
- [ ] Node.js installed (optional)

**Claude Code**
- [ ] Claude Pro (or higher) subscription active
- [ ] Claude Code installed via native installer
- [ ] `claude --version` works
- [ ] `claude doctor` passes
- [ ] Logged in via browser auth

**MCP servers**
- [ ] GitHub MCP added with PAT
- [ ] (Optional) SQLite MCP added

**Local AI testing**
- [ ] Ollama installed, `ollama serve` runs
- [ ] At least 2-3 models pulled for testing (`llama3.2:3b`, `phi3:mini`, `qwen2.5:3b`)
- [ ] (Later) MLX installed via pip

**Project**
- [ ] Repo cloned locally
- [ ] Project structure scaffolded (Section 6)
- [ ] `CLAUDE.md` at project root (Section 7)
- [ ] `brainstorm-v3.md` copied to `docs/`
- [ ] First Xcode project created in `ios/NorwegianCoach/`
- [ ] First commit pushed to GitHub

When all boxes are checked, you're ready to start Phase 1A.

---

## 10. The First Claude Code Session

When everything's set up, open Claude Code in the project directory and start with something like:

> "Read CLAUDE.md and docs/brainstorm-v3.md. Then propose the data model for the mistake fingerprint and the concept graph. Don't write code yet — let's discuss the data structures first."

This grounds Claude in your vision before any code is written. Discuss, refine, *then* code.

---

## 11. Things to Know That Will Save You Pain

- **Claude Code asks for permission before changes** — get familiar with the permission prompts. You can pre-approve directories in config.
- **Use `/clear` between unrelated tasks** — keeps context clean and saves tokens.
- **Use `/compact` for long sessions** — summarizes context when sessions get heavy.
- **CLAUDE.md is read every session** — keep it current. When architecture changes, update it.
- **Plan Mode** — for big tasks, use Plan Mode to see what Claude will do before it does it.
- **Don't let Claude touch content/audio without checking** — generated audio files are expensive to regenerate; protect them.
- **Test on simulator first, device later** — Apple Intelligence and MLX behavior differ between simulator and real device.

---

## 12. Estimated Setup Time

If everything goes smoothly: **half a day** to a full day.

Realistically (because something always breaks): **1–2 days** including troubleshooting Xcode, model downloads, and getting auth flowing.

Do this setup *before* you start coding. Don't try to set up while building — you'll lose the flow constantly.

---

## 13. Open Decisions Before You Start

Things to decide (at least loosely) before opening Claude Code:

- **Repo name** — `norwegian-coach`? `norsk-coach`? Something else?
- **App name** — same question, separately. The app's user-facing name can be different from the repo.
- **Bundle ID** — `com.yourname.norwegiancoach` or similar (used in App Store later)
- **Minimum iOS version** — iOS 17 (broader reach) vs iOS 18 (Apple Intelligence available)
- **Initial Claude Pro vs Max** — start with Pro, upgrade if needed
- **Public or private repo** — recommend private until v1 ships

Don't agonize. These can change. Just pick something so you can move.

---

You're now equipped. Run through the checklist, then we open Claude Code and start building the engine.
