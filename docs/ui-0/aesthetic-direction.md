# NorskCoach — Aesthetic Direction

**One-sentence direction:**
Precise dark intelligence — near-black warm canvas, one red accent that earns attention, glass surfaces that recede, typography that steps aside so Norwegian itself takes center stage.

---

## What this means in practice

### What it is
- **Dark-first, always.** Base is `#120E0E` — a warm charcoal, not a cold blue-black. The warmth matters: it reads as focused-study, not technical-terminal.
- **One accent. Not two, not five.** `#DC2626` red is the only saturated color in the system. It fires for CTAs, mastery indicators, active states, error repair markers. Everything else is neutral glass.
- **Glass recedes — never decorates.** Card surfaces are barely-there frosted film. The background gradient bleeds through them — the gradient is the page, the cards are structure, not decoration. If a glass treatment is ever in question, the answer is *less glass, not more*. Frosted blur as decoration is slop.
- **Typography teaches — this is the primary test.** Norwegian text in exercises must be the most prominent element on screen. Display size, full weight, no competing visual noise. The learner should feel the language, not the app. For every screen in UI-2: if the Norwegian text is not the most prominent thing on screen, the screen fails. Fix the screen, not the principle.

### What it is not
- Not Duolingo-green. Not gamified. Not friendly-mascot energy.
- Not crypto-dark (no neon, no harsh contrast, no blue glow).
- Not Scandinavian-minimalism cliché (no unnecessary whitespace theater, no thin-weight everything).
- Not warm/linen/editorial — that was the prior "Warm Precision" direction. Ember replaced it. The switch is complete.

### The "earns attention" rule for the accent
Red appears when something matters to the learner's progress:
- The CTA that starts a session
- The active nav item
- A concept in repair
- A mastery milestone

Red does **not** appear on decorative dots, ambient gradients, section dividers, or supportive text labels. If red appears there, it's wrong.

---

## Named palette

| Token (resolved) | Value | Role |
|---|---|---|
| `--nc-bg` | `#120E0E` | Page canvas |
| `--nc-dark` | `#0A0707` | Deep inset surfaces |
| `--nc-red` | `#DC2626` | Primary brand accent (the only one) |
| `--nc-green` | `#4ade80` | Success / mastery indicator |
| `--nc-text` | `#EDE8E3` | Primary text |
| `--nc-text-muted` | `rgba(237,232,227,0.58)` | Supporting text |
| `--nc-text-dim` | `rgba(237,232,227,0.36)` | Disabled / label text |
| `--nc-border` | `rgba(255,255,255,0.10)` | Default border |
| Glass | `rgba(255,255,255,0.05–0.09)` + blur | All card surfaces |

---

## Typography (not resolved yet — for UI-1)

Banned by CLAUDE.md: Inter, Roboto, Space Grotesk, system-ui, Geist. The current font vars (`--font-display`, `--font-body`) need a typeface decision. Norwegian text in exercises should render in a serif or semi-formal sans that signals learning, not UI chrome.

This is deferred to UI-1; token contract must be clean first.

---

## Anti-patterns to enforce

1. No inline hardcoded hex in component JSX. All color references must go through the token contract.
2. No `text-nc-violet` after the token rename. Old violet utilities must be removed.
3. No `var(--nc-violet)` references after the rename. CSS vars too.
4. No decorative orbit/topography patterns. They were deprecated — the DEPRECATED stubs in globals.css are correct, but all references in components must be removed.
5. No competing gradient layers — one `nc-gradient-page` root wrapper per page. No nested gradients inside cards.
