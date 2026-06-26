# Adopt the /frontend-pipeline tooling + premium component registries for UI work

**Date:** 2026-06-26
**Status:** active

## Decision
UI/frontend work on NorskCoach now runs through a reusable tooling pipeline — **HARVEST → FLOOR → GENERATE → RENDER → GATE** — and `components.json` is wired with premium shadcn registries so real top-tier components can be pulled and composed (not invented from scratch or shipped as defaults).

## Context
Generated UI kept coming out as generic "AI slop" / "the same thing tweaked" despite a large skill/MCP toolset. Root causes: no generation-time quality gate, blank-start generation, no visual loop, and registry components either ignored or shipped verbatim. A user directive ("stop anything below a certain aesthetic bar; compose from real best-in-class sources, never reshuffle the same blocks") forced the change.

## Why
- A **hard acceptance gate** (`aesthetic-floor`, global skill) blocks any surface below a top-tier bar (10 craft criteria + reference anchors + the "name-on-it vs tweaked-template" killer question). Its distinctiveness criterion specifically fails a reshuffle-of-existing-blocks.
- A **generation discipline** (`design-taste-frontend`, global skill) enforces anti-slop rules at the moment of generation.
- **Wired registries** (`components.json`): `@aceternity` (`ui.aceternity.com/registry/{name}.json`), `@magicui` (`magicui.design/r/{name}.json`), `@originui` (`originui.com/r/{name}.json`) — so the shadcn MCP / `npx shadcn add` can pull real components; the pipeline composes their *craft signatures* (spotlight, border-beam, number-ticker, bento depth) re-tokened to the project, not their skins.
- Spec/run trail: `~/.claude/skills/frontend-pipeline/SKILL.md`, `~/.claude/skills/aesthetic-floor/SKILL.md`, `~/.claude/design-references/anti-slop-playbook.md`; per-project install record at `.omc/frontend-tooling.md`.

## Rejected alternatives
- **More design skills / micro-fixers** — rejected: skill saturation (178 already) is part of the cause; post-hoc tweak skills don't fix generation-time slop.
- **Token-only recomposition** (recompose existing `--nc-*` blocks without a real component harvest) — rejected after a first attempt produced three dashboard directions the user rejected as "the same thing tweaked" (trail: `.omc/redesign/dashboard-antislop-proof/`). HARVEST is now a mandatory, non-skippable stage.
- **21st.dev Magic MCP** as the harvest source — deferred: it returns "Missing API key" (no key configured). Chose the free public-registry path instead; a key at 21st.dev/magic/console would re-enable it later.

## Consequences
- Brand DNA for this app is locked to **Schibsted Grotesk + lime `#C8FF20`**; everything else (incl. the dark/cream blocking) is composable, not a ceiling (`.omc/frontend-tooling.md`).
- A dashboard exploration produced via the pipeline PASSED the floor (19/20) — `.omc/frontend/dashboard/VERDICT.md` + `dashboard-v1.html`. **It is a non-destructive mockup only — NOT ported to `src/` and NOT deployed.** Any port is a separate gated build through `audit:gate` AUDIT-CLEAN + Operating Rule 9 (reconcile-before-deploy).
- No application/runtime code changed by this decision. The only repo change is the additive `registries` block in `components.json` (does not affect existing components or the build).
