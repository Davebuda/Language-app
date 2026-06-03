# Conversation (Kari) never uses the local 1B WebLLM — route to Groq/template

**Date:** 2026-06-03
**Status:** active

## Decision
Free-form conversation (`conversationTurn`) is routed exclusively through the server path
(`ServerAIService`), which returns Groq-8B output when reachable and a deterministic
Norwegian template otherwise. It never routes through the local 1B WebLLM model.

## Context
The 2026-06-03 live audit of pandoai.no caught Kari emitting garbled non-Norwegian —
*"Hei, det er fint at du væresa daglig rutine! Hvapondparticles men ekstrem foretakker du
på en dag?"* — that the `validateNorwegianOutput` gate **silently passed** (0 console errors).
Root cause: the gate is a coarse whole-string heuristic (char-set, >18-char compound, >25%
English function words, ≥1 Norwegian marker). The garbage defeats all four: non-words are
<18 chars and use valid letters, the English leak ("particles") is glued inside a token, and
real Norwegian function words (det/er/at/du/men/på/en) satisfy the marker check. Distinguishing
"foretakker" (non-word) from "foretrekker" (real) needs a dictionary, not a heuristic.

## Why
- The Llama-3.2-1B (WebLLM) is **too weak for free-form Norwegian conversation**; no post-hoc
  heuristic gate can reliably catch its garbage (whack-a-mole). The robust fix is upstream:
  don't let the 1B speak freely.
- `ServerAIService.conversationTurn` is **already safe**: Groq-8B via `/api/ai` when reachable,
  else a deterministic Norwegian template (`result ?? template`). It never produces garbage.
- `GROQ_API_KEY` is set server-side; `callServerAI` POSTs to same-origin `/api/ai` regardless of
  client init, and degrades to template offline. So routing to the server is safe in all states.
- Aligns with Option C: the core experience never depends on a flaky AI path; deterministic
  fallback is always present.

## Rejected alternatives
- **Harden the validity gate, keep the 1B** — fundamentally can't catch mixed real-Norwegian +
  short-non-word output without a dictionary; risks *masking* (Rule 6), not fixing.
- **Template-only conversation (no LLM)** — safe and fully offline, but loses the stronger Groq-8B
  conversation quality where it's available. Kept as the fallback, not the only path.

## Consequences
- One-line routing change: `HybridAIService.conversationTurn` → `this.server` (was `this.active`).
  `src/ai/index.ts`.
- The local 1B is still used for `explainMistake`/`generateContent` (short, structured, gated) —
  only free-form conversation is removed from it.
- **Follow-up (High-1, not in this change):** the AI-status badge ("Lokal AI") is a global async-
  initialized value and can now mislead on the conversation surface (which uses Groq/template).
  Needs a per-surface/source-accurate indicator + fixing the none→webllm init race.
