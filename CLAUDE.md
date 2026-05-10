# Norwegian Coach — Project Context for Claude Code

## What We're Building

A diagnostic Norwegian language learning app for iOS. Not a course — a coach. The app generates a personal syllabus daily based on each learner's mistake fingerprint, teaches grammar in dependency order via a concept graph, and runs every wrong answer through a repair loop. Local-first, on-device AI.

**One-line positioning:** A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.

## Read These Docs First

Before doing anything substantial, read these in order. They are the source of truth. If anything in your reasoning conflicts with them, the docs win:

1. `docs/brainstorm-v3.md` — the full product vision, philosophy, and architecture
2. `docs/ai-layer-spec.md` — the on-device AI architecture and model decisions
3. `docs/skills-and-subagents-plan.md` — Claude Code scaffolding plan for this project
4. `docs/claude-code-environment-prep.md` — environment, tools, project structure

Earlier brainstorm versions (v1, v2) are historical. Use v3.

## The Moat (What Makes This Defensible)

Three things working together:
1. **Diagnosis** — knowing precisely what the learner is failing at, including root causes underneath surface mistakes
2. **Scheduling** — generating a personal syllabus daily that mixes remediation, review, new material, and new vocabulary
3. **Remediation** — running every wrong answer through a structured repair loop until the gap is closed

AI is a power tool that supports the coaching. AI is **never** the headline.

## Architecture (Five Layers)

1. **Content Foundation** — sentences, audio, scenarios, concept graph. Bundled or downloaded once.
2. **Mistake Fingerprint** — per-user profile (mastery scores with confidence, decay over time, error history, root-cause patterns). Lives on the device.
3. **Adaptive Engine** — diagnoses weaknesses, applies the daily session recipe, decides what to teach.
4. **Exercise Variety + Repair Loop** — multiple exercise types; every wrong answer triggers explain → micro-drill → retry → schedule review.
5. **Local AI** — small on-device model (Gemma 3n E4B via MLX Swift) for explanations, sentence variations, conversation. Zero API cost.

## Tech Stack

- **Platform:** iOS 18+ (deferred Android to Phase 4)
- **Language:** Swift 6 / SwiftUI
- **Storage:** SQLite via GRDB.swift
- **Local AI:** MLX Swift, Gemma 3n E4B (E2B fallback for older devices)
- **Content pipeline:** Python 3.12 with `uv`, AI-assisted generation via Claude API
- **Testing:** XCTest (iOS), pytest (pipeline)

## Coding Conventions

- **Swift:** standard Apple style, prefer value types and structs, async/await over completion handlers, actors for shared mutable state
- **Python:** type hints everywhere, ruff for linting and formatting
- **Commits:** conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`)
- **PRs:** one concept per PR, no mixing unrelated changes

## Critical Principles

- **Build the brain before the body.** Engine, fingerprint, and data structures come before content volume or UI polish.
- **Local-first.** No per-user API costs in the core experience. The fingerprint stays on the device, never synced without explicit user opt-in.
- **Privacy is a product advantage.** Design and code accordingly.
- **The repair loop is the single most important user-facing mechanic.** Every wrong answer triggers it.
- **Coach, not course.** The app generates today's session for this learner — never delivers "Lesson 12."
- **Mastery before progression.** Levels (A1, A2, B1, B2) are earned through demonstrated mastery of concepts, not lesson completion.
- **AI is a tool, not the product.** Every AI-powered feature must have a non-AI fallback so the app stays useful when the model isn't available.

## Current Phase

**Phase 1A — Engine Skeleton.**

Goals:
- Define the mistake fingerprint data structure
- Build the concept graph for A1 + A2 grammar with dependencies
- Define the error taxonomy
- Build the session scheduler (daily session recipe)
- Build root-cause diagnosis rules
- Build the repair loop
- Build the AI layer's interfaces as stubs (real model integration is Phase 2)
- Build all fallback implementations
- Test with synthetic content (50–100 sentences) — does the engine actually adapt?

Out of scope right now: UI polish, real content authoring at scale, real AI integration, conversation mode.

## When in Doubt

Re-read `docs/brainstorm-v3.md`. Every architectural decision should trace back to one of its principles.

If something feels like it doesn't fit the vision, raise it as an open question rather than working around it. The docs are not sacred — they evolve — but they evolve through explicit discussion, not silent drift.

## Skills and Subagents

This project uses custom skills (`.claude/skills/`) and subagents (`.claude/agents/`) — see `docs/skills-and-subagents-plan.md` for the full plan. They are built as needed during each phase, not all upfront.

For the current phase, the priority skills to build first are:
- `error-taxonomy`
- `mistake-fingerprint`
- `concept-graph`
- `repair-loop`
- `session-recipe`
- `swift-conventions`
- `sqlite-schema`
- `norwegian-grammar`

## How to Start a Session

When opening Claude Code on this project:
1. Confirm you've read the relevant docs (or read them now if you haven't)
2. Check the current phase and what's in scope
3. Discuss before coding — especially for new architectural decisions

Don't ask the user to re-explain the vision. The vision is in the docs.
