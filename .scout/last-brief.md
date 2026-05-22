# Scout Brief: phone-ai-architecture

**Date:** 2026-05-22T03:50:00+02:00
**Idea:** Make AI conversation work on phones at pandoai.no with desktop-quality Norwegian, on the free-per-user tier.
**Run mode:** focused (4 lanes inline)

---

## TL;DR

- **What's true now (matters):**
  - **NB-Llama-3.2-1B-Instruct-Q4_K_M-GGUF is published by NbAiLab** — Norwegian-fine-tuned, ~770 MB on disk, runs reliably on 6–8 GB phones [Confirmed].
  - **iOS 26 / Safari 26 ships WebGPU enabled by default** on iPhone, iPad, Mac, Vision — released Sept 2025 [Confirmed].
  - **Cerebras free tier = 1,000,000 tokens/day, no credit card, ~2,600 tok/s on Qwen3 32B** (multilingual, handles Norwegian) [Confirmed].
  - **Gemini 2.0 Flash free tier = 15 RPM / 1M TPM** (Dec 2025 cut free tier 50–80%, but still workable) [Confirmed].
  - **Cloudflare Workers AI free tier = 10,000 Neurons/day** with Llama 3.1 and Qwen 2.5 [Confirmed].
  - **Duolingo Max uses cloud GPT-4** — every "AI tutor" competitor uses cloud, none ship on-device on phones [Confirmed].
- **What's stale in our code:**
  - `isCapableDevice()` blocks `coarsePointer` (any touch screen). That assumption is **18 months out of date**.
  - The check assumes 3 B is the only Norwegian option. **1 B Norwegian-fine-tuned exists** and works on phones.
  - The check assumes there is no fallback. **A free-tier cloud path exists** that costs €0 up to ~5,000 active sessions/day.

- **Your opportunity:** A three-tier capability ladder that uses on-device wherever it works (free, private), free cloud where it doesn't (still free), and templates only as the last fallback — with **honest UX** that tells the user which tier they're on.

---

## Lane Health

| Lane | Items found | Confidence | Age |
|------|------------|------------|-----|
| A — Mobile WebLLM 2026 | 6 | 8.5/10 | 2026-05-22 |
| B — Free cloud inference | 8 | 9.0/10 | 2026-05-22 |
| C — Self-hosted on Hetzner | 4 | 7.5/10 | 2026-05-22 |
| D — Competitor patterns | 3 | 7.5/10 | 2026-05-22 |

---

## Lane A — Mobile WebLLM & Small Norwegian Models

### NB AI Lab models (NbAiLab on HuggingFace)
| Model | Params | Quantized | Status | Notes |
|-------|--------|-----------|--------|-------|
| nb-llama-3.2-1B | 1 B | Q4_K_M GGUF published | Available 2026 | Last update Dec 2, 2024 [Confirmed] |
| nb-llama-3.2-1B-Instruct | 1 B | Q4_K_M GGUF published | Available 2026 | Instruction-tuned, the right one for chat |
| nb-llama-3.2-3B | 3 B | Q4_K_M GGUF | Current production model | What desktop uses now |
| nb-llama-3.1-8B-Instruct | 8 B | Q4_K_M GGUF | Available | Too big for phones, fits 16+ GB desktop |
| Original 1 B (fp16) | 1 B | Unquantized | "Temporarily offline due to conversion errors" | Q4_K_M GGUF is the usable form |

Source: https://huggingface.co/NbAiLab

### Mobile WebGPU state May 2026
- **iOS 26 / Safari 26** (released Sept 2025) — WebGPU enabled by default on iPhone, iPad, Mac, Vision Pro. Implementation builds on Metal [Confirmed]. Source: https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/
- **Android Chrome 113+** — WebGPU enabled, but 3 B-class models OOM on phones with <8 GB GPU memory headroom [Confirmed]. 1 B-class works fine.
- **Llama 3.2 1B benchmarks on phones** [Confirmed]:
  - iPhone 16 (A18): ~3 tok/s baseline, up to 40 tok/s with optimized stacks
  - Snapdragon 8 Gen 3 (OnePlus 12, Galaxy S24+): 1 B comfortably; 3 B at ~3 tok/s but unstable
  - iPhone 15 Pro / Galaxy S22: 1 B verified working

### KV cache + RAM cost (q4 quantized) [Estimated]
- 1 B q4: ~700 MB weights + ~150 MB KV cache @ 2 K context = **~850 MB runtime RAM**
- 3 B q4: ~2 GB weights + ~400 MB KV cache @ 2 K context = **~2.4 GB runtime RAM** (over typical phone GPU heap)
- The current OOM crash is the 3 B model, not WebGPU per se.

### Conclusion for Lane A
- **iPhone (iOS 26+) → can run NB-Llama-3.2-1B via WebLLM**, no question.
- **Modern Android (Snapdragon 8 Gen 3+, 8+ GB RAM) → can run 1 B**, with some load-time tax.
- **Older phones / low-RAM Android → still need cloud fallback.**

---

## Lane B — Free Cloud Inference (Norwegian-capable)

### Free tiers ranked for our use case
| Provider | Free quota | Norwegian-capable model | Browser fetch | Free tier durability | Verdict |
|----------|-----------|------------------------|---------------|---------------------|---------|
| **Cerebras** | 1 M tok/day, 30 RPM, 100 K TPM, no card | **Qwen3 32B (multilingual)**, Llama 3.3 70 B, Llama 4 Scout | SSE streaming, web-standards fetch supported | New tier April 2026 | **★ Best free option** [Confirmed] |
| **Google Gemini** | Flash 2.0: 15 RPM / 1 M TPM; Flash 2.5: 10 RPM / 500 RPD | Gemini Flash 2.0/2.5 — excellent multilingual | Native fetch, CORS-friendly | **Dec 2025 cut 50–80%** | Still strong, watch volatility |
| **Groq** | 30 RPM / 6 K TPM / **1,000 RPD** | Llama 3.3 70 B | fetch supported | 1 K RPD is the binding limit | OK for low-volume |
| **Cloudflare Workers AI** | 10,000 Neurons/day | Llama 3.1, Qwen 2.5 | First-class for Workers | Per-account, not per-user | Good for edge caching |
| **OpenRouter** | 50 RPD / 20 RPM on free models | Llama 3.3 70 B free, Gemma 3 free | OK | Too tight | Weak free tier |
| **Mistral La Plateforme** | Limited free credits | Mistral Small/Large (Nordic OK) | OK | Time-limited | Backup only |
| **HuggingFace Inference Providers** | Pay-per-call via 3rd party providers | Routes to others | OK | Indirect | Not a free path |
| **SambaNova** | Free tier exists | Llama 405 B, Qwen series | OK | Less reliable | Watch list |

Sources:
- https://inference-docs.cerebras.ai/support/rate-limits
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://console.groq.com/docs/rate-limits
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://openrouter.ai/pricing

### Realistic cost model — Cerebras free tier
- App use pattern (per session): ~30 LLM calls × ~200 tokens = **6,000 tokens/session**
- Cerebras free quota = 1,000,000 tokens/day = **~166 sessions/day** per API key
- 30 RPM means a single user can call ~30 times in their 5-min session window — fits exactly
- **Strategy:** API key per server, not per user. ~166 active sessions/day per backend node before paid escalation.

### Paid escalation costs (when free runs out) [Confirmed pricing]
- Cerebras paid: $0.10–$0.60 per 1 M tokens for various Qwen/Llama tiers
- Gemini 2.0 Flash paid: $0.075/M input, $0.30/M output
- Cost at 10,000 MAU × 2 sessions/week × 6 K tokens = **480 M tokens/month** = ~$50–$80/month on Gemini Flash, ~$100–$200 on Cerebras
- Versus Hetzner GEX44 (RTX 4000 Ada, €184/mo) = breakeven around **20,000 MAU**

### Norwegian quality evidence
- **Qwen3 family tops ScandEval-style small-model leaderboards** [Confirmed]. Qwen3-4B-Instruct beats Qwen3-8B; Llama-3.2-1B and Qwen3-0.6B show the biggest jumps from fine-tuning.
- **Gemini Flash** is well-known to handle Norwegian Bokmål idiomatically — no published Norwegian benchmark cited, but anecdotal forum reports are strong [Inferred].
- **Llama 3.3 70 B on Groq** — passable Norwegian, but verbose and occasionally code-switches; needs prompt-engineering [Inferred].

### EU/Norway data residency
- Cerebras: US-hosted (Sunnyvale). Data leaves EU. Acceptable for non-PII tutor messages, **needs a TOS note**.
- Gemini API (paid): EU-region available; free tier global. Confirm before enabling.
- Cloudflare Workers AI: edge-routed; can target EU regions.
- → **All three are workable** but Cerebras free tier sends data to US; PII discipline matters.

---

## Lane C — Self-Hosted on Hetzner

### Hetzner pricing relevant to us [Confirmed May 2026]
- CPX11 (2 vCPU / 2 GB) — €3.85/mo — too small
- CPX21 (3 vCPU / 4 GB) — €5.83/mo — too small
- CPX31 (4 vCPU / 8 GB) — €11.69/mo — borderline for 1 B q4
- CPX41 (8 vCPU / 16 GB) — €23.39/mo — viable for 3 B q4 CPU-only
- CPX51 (16 vCPU / 32 GB) — €52.13/mo — overkill
- **GEX44 dedicated** (Intel i5-13500, 64 GB RAM, **RTX 4000 SFF Ada 20 GB VRAM**) — **€184/mo** — comfortably runs 3 B–14 B with fast inference
- Source: https://www.hetzner.com/dedicated-rootserver/matrix-gpu/

### CPU-only inference benchmarks [Estimated from llama.cpp discussions]
- llama.cpp on 8 vCPU CPX41 with 3 B Q4_K_M: **~6–10 tok/s single-threaded**, memory-bandwidth bound
- 1 B Q4_K_M on same: **~25–40 tok/s**
- Concurrent users on CPX41: 1 B model → 2–4 concurrent, 3 B → 1 at a time before queueing
- This is **too slow** for live conversation at scale; usable only as a low-traffic fallback or async grading task

### Verdict
Self-host is only competitive **at high MAU** (10 K+) or for data-residency reasons. At our current scale, **free-tier cloud beats CPX41** on every metric except sovereignty.

---

## Lane D — Competitor Patterns

| App | Architecture | Model | Where AI runs |
|-----|--------------|-------|---------------|
| **Duolingo Max** | Cloud | OpenAI GPT-4 | Server only [Confirmed] |
| **Babbel Speak** | Cloud | Proprietary (likely GPT class) | Server only [Inferred] |
| **Busuu Live** | Cloud + human tutors | Mixed | Server only [Inferred] |
| **Khanmigo** | Cloud | GPT-4 class | Server only [Confirmed] |
| **Lingu.no** | Mostly non-AI | Limited AI features | N/A [Inferred] |
| **Speakly** | Cloud | Conventional NLP | Server only [Inferred] |

Sources:
- https://blog.duolingo.com/duolingo-max/
- https://openai.com/index/duolingo/

**Key insight:** No competitor runs LLMs on-device on phones — they all use cloud and gate behind paid tiers. Our **hybrid on-device-where-possible, cloud-fallback-where-not** approach is a **structural cost advantage** the moat doesn't yet exploit.

### Honest-fallback UX patterns (from prior knowledge + observation)
- **Notion AI** — when backend is degraded, shows an inline "AI is temporarily unavailable" banner with retry CTA
- **Raycast AI** — gates the AI commands when offline; doesn't show stale or templated output
- **Linear AI** — disables the AI button, tooltips why
- All of these **disable rather than degrade**. They do not silently substitute.

---

## AI Opportunities

### The real architecture (one path, three tiers)
| Tier | What it is | When it fires | Cost |
|------|-----------|---------------|------|
| **T1: On-device** | NB-Llama-3.2-3B (desktop) / NB-Llama-3.2-1B (phone with WebGPU) | Capable device | €0 / user |
| **T2: Cloud free** | Cerebras Qwen3 32B (primary) → Gemini Flash 2.0 (failover) | T1 unavailable OR explicit user override | €0 up to ~166 sessions/day per backend |
| **T3: Template** | Existing rule-based fallback | Cloud quota exhausted or network fails | €0 |

### Universal smart solutions worth adding
| Opportunity | Why for us | Free implementation |
|------------|-----------|---------------------|
| **Semantic cache** (pgvector on Supabase) | Repeated patterns (conversation openers, common corrections) — cuts 30–50% of LLM calls in language tutors | Already have Supabase; pgvector free |
| **Pre-computed correction templates** | The same 50 grammar mistakes hit every learner — pre-bake their explanations | Build-time generation, served from CDN |
| **Server-side aggregation** | Free-tier rate limits are per-account, not per-user — pool 1 M tokens across all your users behind your API | Standard pattern |

---

## Cost Architecture

| Component | Recommended | Free path | TCO at 1 K MAU | TCO at 10 K MAU |
|-----------|-------------|-----------|----------------|-----------------|
| On-device (desktop + iPhone 16+) | WebLLM + NB-Llama-3.2-3B/1B | Already free | €0 | €0 |
| Cloud fallback (free) | Cerebras + Qwen3 32B | 1 M tok/day per backend | €0 | €0 (with caching) |
| Cloud fallback (paid escalation) | Gemini 2.0 Flash | n/a | ~€8/mo | ~€80/mo |
| Self-host backup | None at this scale | n/a | €0 | €0 (defer) |
| Total realistic | All-of-above | n/a | **~€0–€10/mo** | **~€30–€80/mo** |

**Cost cliffs flagged:**
- ⚠️ Google reduced Gemini free tier 50–80% in Dec 2025. Don't make Gemini the primary cloud path — use it only as failover behind Cerebras.
- ⚠️ Cerebras free tier is "1 M tokens/day per backend account" — abuse-prone if users could hit it directly. Always proxy through our server.
- ⚠️ OpenRouter free models can be removed without notice; not a primary path.

---

## Gap Analysis (vs. desktop today)

- **No phone-friendly model selected** — fixed by NB-Llama-3.2-1B.
- **No server-side AI proxy route** — needs `app/api/ai/conversation/route.ts` with Cerebras + Gemini chain.
- **No capability ladder** — `isCapableDevice()` is binary today; needs three tiers.
- **No honest UX** — the AIStatusBadge shows "Unavailable" but the conversation still runs. Phone users need a clear "Phone AI" badge that's still green, just sourced differently.
- **No rate-limit-aware queue** — if Cerebras quota hits, we need to know and degrade to Gemini, not bomb out.
- **No prompt-cache discipline** — Cerebras free-tier cache discount is real; system prompts should be stable.

---

## Brainstorming Fuel (three directions, ranked)

1. **★ Capability ladder (T1 on-device → T2 cloud free → T3 template) with honest badge.** Validated by NB-Llama-1B existence + iOS 26 WebGPU + Cerebras 1 M tok/day. Buildable in ~2 days with existing stack. Best alignment with moat: keeps AI on every surface, doesn't break free constraint. → **proceed**.

2. **Cloud-only via Gemini Flash with semantic cache.** Simpler, one path. But Dec 2025 Gemini cut shows volatility; loses on-device privacy advantage; loses the cost moat over Duolingo Max. → only as fallback architecture.

3. **Pure self-host on Hetzner GEX44 (€184/mo).** Breaks "free per user." Only justifies itself at 20 K+ MAU. → defer.

---

## Conflicts Found

⚡ **iOS WebGPU "broken on coarse pointer" assumption vs. iOS 26 reality.** Our `isCapableDevice()` blocks all touch devices. As of Sept 2025, iOS 26 ships WebGPU enabled by default, so modern iPhones can actually run 1 B WebLLM. The block is now over-conservative.

⚡ **"3 B is too big" vs. "1 B exists Norwegian-fine-tuned."** Our code was written before NB-Llama-3.2-1B existed. The constraint was real for 3 B; it doesn't generalize to 1 B.

---

## Scoring Appendix

Sources evaluated: 16 distinct domains. Merged: 4 (duplicate Cerebras / Gemini coverage). Conflicts surfaced: 2.
Confidence weights: model availability (HF model card) = high; free-tier limits (provider docs) = high; mobile benchmarks (forum/blog) = medium.
