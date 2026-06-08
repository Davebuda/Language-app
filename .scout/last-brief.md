# Scout Brief: nb-llama-1b-swap (Lever 2, Wave 0.5)

**Date:** 2026-06-08
**Idea:** Replace generic Llama-3.2-1B-Instruct with a Norwegian-fine-tuned ~1B model across NorskCoach's desktop (WebLLM) + server (mobile) AI paths.
**Run mode:** deep (adapted) | **Lanes run:** 4 (provenance · WebLLM-compile · server-serving · integration-delta)
**Note:** Perplexity MCP returned 401 this run; lanes sourced directly from HuggingFace `config.json`, official MLC/WebLLM docs + source, Groq docs, and the repo's own `src/ai/` — primary sources, stronger evidence than synthesis.

---

## TL;DR
- **The model:** `NbAiLab/nb-llama-3.2-1B-Instruct` is the **only** viable candidate — the lone available Norwegian-Bokmål, instruct-tuned, ~1B model with a commercial-usable license. Identical Llama-3 architecture / chat-template / ~400MB footprint as today's model → genuine drop-in. NorMistral (7B, Apache-2.0, cleaner license) and Borealis (Gemma-3, newer, not safety-aligned, 1B not confirmed public) are the alternates; both change arch/template.
- **Desktop swap is CHEAP:** because nb-llama-1B is byte-for-byte the same arch as the model WebLLM already ships, MLC's prebuilt `.wasm` is **reusable** — no `mlc_llm compile`, no GPU build. Just `convert_weight` + `gen_config` (2 commands), host ~400MB MLC weights on HF, register a `ModelRecord` pointing `model_lib` at the stock `v0_2_84` Llama-3.2-1B wasm. Same ~0.88GB VRAM, no budget regression. **Hours, not days.**
- **Server swap is also cheap — but NOT via Groq:** Groq hosts zero Norwegian models and only accepts LoRA adapters on its own 2 base models (enterprise-only) — **dead end** for a full continued-pretrain. The path is **self-host nb-llama-1B via Ollama** on the existing Hetzner box (Ollama pulls the official Q4_K_M GGUF directly; OpenAI-compatible `/v1` endpoint matches the code's existing fetch shape). €0 extra if the box has ~2GB spare, else CX33 @ €6.49/mo. ~3 lines changed in `route.ts`.
- **Integration is two tiny seams:** desktop = `MODEL_ID` + a new `appConfig` in `src/ai/webllm.ts:15`; server = promote hardcoded `GROQ_URL` to `AI_BASE_URL` env + `AI_MODEL` in `src/app/api/ai/route.ts:18-20`. `validateNorwegianOutput` needs **no** change (a Norwegian model passes it *more* easily) and the deterministic fallback is **provably untouched** (keys on `isReady()`/`null`, never on the model id).
- **⚠️ The catch (load-bearing):** a 1B Norwegian fine-tune is a **modest** quality bump, **not** a step-change. NB itself frames the 1B as an "adaptation probe" and publishes **no** head-to-head proof it beats generic Llama-3.2-1B; the reliable Norwegian gains live at **3B–12B**. Real correction quality remains the job of the deterministic corrector (Lever 3) + a bigger server model — not this swap.
- **Your opportunity:** the swap is genuinely low-cost / low-risk and closes a real parity gap (mobile gets *generic* Llama today), **but it does not move the moat by itself.** It's an infra enabler, correctly sequenced as Wave 0.5 — its value is unlocking the bigger-model + corrector work, not the 1B output quality on its own.

---

## Decision-grade verdict per lane

### Lane A — Provenance & license
- **Pick:** `NbAiLab/nb-llama-3.2-1B-Instruct` (Llama 3.2 Community License — commercial OK, 700M-MAU clause irrelevant; Llama-3 chat template = zero prompt rewrite; 128K nominal ctx). [Confirmed]
- True ~1B exists (NB ships 1B / 8B / 70B — no 3B Norwegian variant). Server-path upgrade option = `nb-llama-3.1-8B-Instruct`. [Confirmed]
- NorwAI **disqualified** (Nordic-only license); NorskGPT **disqualified** (CC-BY-NC). NorMistral = Apache-2.0 but 7B-min. [Confirmed]
- **Honest quality answer:** expect modest Bokmål gains at 1B; **verify on ScandEval's live Norwegian leaderboard before shipping** — there is no published proof the fine-tune beats generic Llama-3.2-1B. [Confirmed absence of data]

### Lane B — WebLLM / MLC compile (desktop)
- nb-llama-1B `config.json` = identical Llama-3.2-1B topology → **reuse the prebuilt wasm, skip compile.** `convert_weight` + `gen_config` at `q4f16_1` only. [Confirmed]
- Stay at 1B for client (3B ≈ 2.5× footprint, blows integrated-GPU budget). NB has no 3B Norwegian anyway. [Confirmed]
- **#1 risk:** model-lib ↔ runtime version pinning — reusing the **stock prebuilt** wasm (not self-compiled) sidesteps the open self-compile loader bug (#633). Pin `@mlc-ai/web-llm`, bump the wasm URL deliberately on upgrade. [Confirmed]

### Lane C — Server serving (mobile)
- **Groq = dead end** for a custom Norwegian model (LoRA-adapter-only, enterprise, 2 bases). [Confirmed]
- **Recommended:** Ollama on the Hetzner VPS (localhost-bound), `/api/ai` gets a provider switch — local Ollama → existing Groq generic → existing template/null "Repetisjon" (mirrors the desktop degradation ladder). Cache by recipe slot; single-flight to avoid CPU contention. [Confirmed model availability / Inferred latency: 1B q4 ≈ 2–3s for short JSON at low concurrency]
- **Cost:** €0 extra or **CX33 €6.49/mo**. Do **not** cross the €25 CPX42 cliff for 3B. [Confirmed pricing]
- **Sequencing:** worth doing, but it's a content-parity upgrade not a correctness fix → **fast-follow once mobile users exist**; ship desktop first. [Inferred]

### Lane D — Integration delta (code)
- **Desktop seam:** `src/ai/webllm.ts:15` `MODEL_ID` + add `appConfig`/`model_list` (no appConfig exists today; the current id resolves via WebLLM's built-in registry — a custom model needs the explicit record). Worker host is generic, untouched. Chat-format code uses OpenAI-style `messages` → WebLLM applies the model's baked-in template → no message-format change. [Confirmed file:line]
- **Server seam:** `src/app/api/ai/route.ts:18-20` — `GROQ_MODEL` already env-overridable; only `GROQ_URL` is hardcoded. Ollama's `/v1/chat/completions` is the same OpenAI shape `groqComplete()` already speaks → promote URL to `AI_BASE_URL` env, set `AI_MODEL`, tolerate keyless self-host. ~3 lines. [Confirmed]
- **Validation untouched** (`validate.ts:146` — pure string heuristics, model-agnostic; do NOT loosen). **Fallback provably isolated** (`webllm.ts` + `route.ts` fallbacks key on `isReady()`/`null`, never on model id). [Confirmed]

---

## Open decisions needing sign-off before any code
1. **Is Lever 2 worth running before Lever 3 at all?** The research weakens the original sequencing assumption: a deterministic gender corrector (Lever 3) is dictionary-based and **independent of which LLM generates content** — Lever 2 may not actually gate it. The recourse program already flagged this as a Council question.
2. **Verify-before-build gate:** Lane A says run a ScandEval 1B-vs-1B Norwegian check before committing the swap, so we don't ship an unproven "upgrade."
3. **Desktop-only vs both paths now:** Lane C recommends desktop-first, server as a fast-follow tied to real mobile users (which is Lever 4, the parallel ops lane).
4. **License posture:** accept the Llama 3.2 Community License (same class as today) vs hold out for Apache-2.0 NorMistral at the future 7B server tier.

---

## Brainstorming Fuel
1. **Minimal desktop swap + eval gate** → convert nb-llama-1B, register the ModelRecord, but ScandEval-verify before flipping the default. Low cost, honest. → buildable today (2 CLI cmds + HF upload + ~10 LOC).
2. **Re-sequence: jump to Lever 3 (deterministic gender corrector) now** → if gender correction doesn't need a new model, the bigger moat win (re-arming the gated-off conversation+journal corrections) doesn't have to wait on Lever 2 at all.
3. **Config-seam refactor only** → land the `AI_BASE_URL`/`AI_MODEL` env seam + `.env.local.example` docs as a no-behavior-change prep commit, decoupling "make the swap possible" from "decide the model."

---

## Sources
Consolidated in the four lane files. Key: huggingface.co/NbAiLab/nb-llama-3.2-1B-Instruct (+ `/config.json`, GGUF sibling), llm.mlc.ai/docs/compilation, github.com/mlc-ai/mlc-llm/blob/main/docs/deploy/webllm.rst, github.com/mlc-ai/web-llm/issues/633, console.groq.com/docs/models + /lora, hetzner.com/cloud, ScandEval/NorEval (arXiv 2304.00906 / 2504.07749), repo `src/ai/*`.
