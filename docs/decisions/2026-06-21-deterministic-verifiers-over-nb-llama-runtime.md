# Re-arm gated AI corrections with deterministic verifiers, not an NB-Llama runtime swap

**Date:** 2026-06-21
**Status:** active

## Decision
Phase p4 ("NB-Llama deterministic AI verification, Lever 2") is reframed to **deterministic correction verifiers** — model-agnostic checks that gate AI corrections — rather than swapping a Norwegian fine-tuned model in at runtime. The first verifier beyond gender (verb-conjugation) shipped in `59b01f8`.

## Context
p6 suppressed most AI-driven mastery writes: only lexicon-confirmed **noun-gender** corrections move mastery (Lever 3, `verifyGenderCorrection`); repair explanations are template-only because the local 1B produces fluent gibberish; conversation/journal corrections for every other class are show-don't-grade. The project rule: *no unverified AI output may move mastery until a deterministic check exists.* p4 was meant to lift those suppressions, on the assumption NB-Llama would replace the weak runtime models.

## Why
Swapping NB-Llama in at runtime is not feasible:
- `nb-llama-3.1-8B` is **local-Ollama-only** (used by `scripts/generate-content.ts` for offline generation). The production runtime is **Groq (cloud) + WebLLM (client 1B)**.
- The Hetzner VPS is **CPU-only** — an 8B Q4 model runs at seconds/response, unusable interactively — and Groq does not host the Norwegian fine-tune. Running it would need new GPU infra.
- The 8B was already found **too weak** for structural tasks (`scripts/generate-content.ts:46`: "NB-Llama parrots V2 examples").

But the *other* half of the phase — "Lever 2: deterministic AI verification" — is real, model-agnostic, runtime-deployable, and exactly on-moat ("AI is never the headline; a non-AI check gates it"). The gender corrector proved the pattern: once a deterministic verifier confirms a correction, **which model produced it stops mattering**. So the valuable, buildable p4 is to extend that pattern class by class, re-arming each suppressed AI correction as its verifier ships.

## Rejected alternatives
- **Deploy NB-Llama on a GPU host** — real infra spend for a model already shown weak at 8B; not justified versus deterministic checks.
- **Trust a stronger cloud model's corrections directly** — violates the no-unverified-output rule; a fluent model still produces wrong-but-valid corrections (the "et jobb" class) that prose validators can't catch.
- **Keep everything suppressed** — leaves real, deterministically-checkable error classes (conjugation, agreement) unable to feed the moat.

## Consequences
- p4 is now "extend the deterministic-verifier pattern": gender (done) + verb-conjugation (done) → next adjective-agreement, V2/word-order, compound-word; plus a coherence gate (OOV via `pos-map`) to re-enable AI repair explanations.
- All verifiers share ONE gate (`confirmedRepair` in `gender-correction-gate.ts`) used by conversation + journal — a verifier-confirmed correction drives both the displayed tag and the mastery write from a single call (no second, divergent gate).
- NB-Llama remains the **offline content-generation** model (`scripts/generate-content.ts`) — that use is unaffected; only the runtime-correction premise is dropped.
- Verifiers are deterministic, OOV-safe, and false-negative-biased: they never assert a correction they can't prove, upholding the project rule.
