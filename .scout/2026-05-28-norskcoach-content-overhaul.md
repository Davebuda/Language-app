# Scout Brief: norskcoach-content-system-overhaul
**Date:** 2026-05-28
**Idea:** Scale NorskCoach's content to school-grade depth, add multi-sentence/objective-driven exercise types, and decide whether a vector/pgvector progression layer earns its place.
**Run mode:** deep | **Lanes run:** 6 consolidated (covering 1,2,3,4,5,6,8,9)
**Tooling caveat:** subagents' Perplexity MCP + WebFetch were permission-denied this run; lanes ran on WebSearch + GitHub MCP. Evidence is convergent; cost-tier numbers tagged [Estimated] need a 5-min confirmation pass before spend. Re-run with those tools enabled to tighten numbers.

---

## TL;DR
- **What exists:** Adaptive engine is complete and correct — concept-graph + CEFR + difficulty-tier(1-3) + per-user mistake fingerprint already own difficulty gating, level-serving (`filterSentencesByLevel`), and per-user passed-question removal (`passedSentenceIds`). Two of the six stated sub-goals are already built.
- **What exists:** ~1,117 tagged sentences + matching MP3s. Depth is uneven: ~9 sentences/concept at A1/A2 vs 30 at B1/B2.
- **What exists:** 5 of 10 declared exercise types are built — all single-sentence.
- **What's missing:** Corpus depth (esp. A1/A2) — an ambitious daily learner (~25 items/day, passed items removed) exhausts A1/A2 in days.
- **What's missing:** Discourse-level / "pushed-output" exercise types — NorskCoach is 100% single-sentence, the clearest pedagogical gap vs the production north star.
- **What's missing:** A scalable AI content-sourcing pipeline (no open corpus is pre-tagged by CEFR+concept — that tagging *is* the moat and must be produced).
- **Your opportunity:** Deepen the corpus via an AI-generation pipeline and add 2-3 production-driving multi-sentence exercise types. **Skip the vector layer for difficulty/progression** — it's a category error; invest that effort in ELO/IRT difficulty calibration once real user data exists.

---

## Decision 1 — Vector / pgvector layer for difficulty gating & progression: **NO** (HIGH confidence)
The headline question, and the answer is a clear, evidence-backed no.
- **Embedding cosine similarity measures topic/meaning, not grammatical difficulty.** "Jeg spiser fisk" and "Hadde jeg visst det, ville jeg ikke ha spist fisken" are semantically near-identical but A1 vs B2 — cosine would call them similar. [Confirmed — arxiv 2509.01606, 2409.20246]
- Real adaptive systems put difficulty in **IRT (Duolingo Birdbrain), knowledge tracing (BKT/DKT), prerequisite graphs, ELO/Glicko** — never in similarity search. Embeddings live in the *retrieval/recommendation* layer. [Confirmed — research.duolingo.com, e-mentor Glicko corr. 0.959]
- You *can* predict CEFR from embeddings, but only via a **supervised classifier trained on top** — that's a difficulty model, not similarity search, and you already have higher-quality human CEFR+tier labels.
- **Where vectors genuinely win (narrow, content-engineering only):** semantic near-duplicate dedup of AI-generated content (MinHash catches surface dups, misses paraphrases), and theme-based "more like this" retrieval. Both topic-not-difficulty, both nice-to-have.
- **Engineering reality:** at <100K rows (you have a few thousand) pgvector should run **indexless brute-force exact scan** (100% recall, no tuning). HNSW/IVFFlat is premature. Beware the post-filter LIMIT trap if ever added (filter by CEFR/tag as the *primary* query, similarity as secondary re-rank).
- **Invest instead:** ELO/Glicko or IRT item-difficulty calibration on top of existing tiers once user-response data accrues.

**Verdict:** Defer vectors entirely; if added later, scope strictly to offline content dedup, 384-dim, no index, on the existing Supabase.

---

## Decision 2 — New exercise types: build discourse-level "pushed output" (scope-gated, needs architect sign-off)
The market's loudest unmet need ("studied a year, still can't speak"; "tells you what's wrong, not why") is *exactly* NorskCoach's thesis. New types should double down on production, not chase Duolingo's breadth. SLA basis: Swain's Output Hypothesis — pushed output drives acquisition. Build-priority:

| Priority | Type | Why (production value) | Leverage on existing assets |
|---|---|---|---|
| **P0** | **Cloze passage** (multi-sentence gapped text, typed) | Active recall at discourse level; Clozemaster proved at scale | Extends fill-in-blank; group 3-5 concept-tagged sentences into a passage; spaCy picks blanks |
| **P0** | **Guided / parallel composition** (write a short text modeled on an example, scored vs target structures) | Highest-value free production per SLA; answers "can't write/speak" | Feeds repair loop + fingerprint; AI scores w/ non-AI rubric fallback |
| **P1** | **Objective-driven lesson unit** (CEFR can-do → model → controlled → guided → production assessment) | "School-grade" structure; backward-design standard | Wraps existing exercises into a sequence; one can-do per concept cluster |
| **P1** | **Dialogue/roleplay w/ 3 task objectives** | Convergent industry pattern for pushed oral output | Extends existing `/roleplay` + `/conversation` |
| **P2** | **Dictogloss / text reconstruction** | Pushed output + form-noticing; strong SLA evidence | Reuses existing 1,117 MP3s |
| **P2** | **Sentence builder (MARS-EARS substitution table)** | Controlled→free scaffolding between drills and free production | Chunk-tag sentences; many variants per table |

**Corpus insight:** generative types multiply corpus into exercises (one passage → many cloze items), so depth scales sub-linearly with authoring effort. Each new type must trace to production (north star) + feed the fingerprint (Rule 8) or be cut.

---

## Decision 3 — Corpus sourcing: hybrid pipeline, ~70-80% AI-generated
**No open corpus is pre-graded by both CEFR level and grammar concept** — that tagged structure is the moat; it must be produced, not downloaded.
- **Recommended split:** ~70-80% AI-generated (only path to tens of thousands of tagged sentences) · ~15-20% open corpora as seed/validation/frequency anchors · ~5-10% hand-authored (A1 anchors, edge cases).
- **Safe-to-ship sources (commercial OK w/ attribution):** Tatoeba **CC0 subset** (zero attribution), Språkbanken Eng-Nor Parallel **sbr-68 (CC-BY)**, **Norsk ordbank (CC-BY)** = morphology/inflection backbone for grammar tagging, **Læreplan A1-B2 curriculum (NLOD)** = official CEFR rubric to drive generation prompts.
- **Licensing traps — do NOT ship verbatim:** NonCommercial (Leipzig, old OpenSubtitles), ShareAlike-viral (Wikipedia, Wiktionary, UD Bokmaal treebank, hermitdave FrequencyWords), underlying copyright (OpenSubtitles dialogue — frequency stats only). UDPipe Norwegian models are CC BY-NC-SA (avoid).
- **Pipeline:** spec batch (level + concept + frequency-gated vocab window + surface constraints) → generate (Norwegian-tuned model) → automated gate (`validateNorwegianOutput` + vocab-window check + spaCy/ordbank parse check + **global MinHash dedup**) → ~5-10% stratified human spot-check → seed. Generation is cheap; **human review is the real cost** — invest in the automated gate. **Global dedup at corpus scale is the under-appreciated risk** (enforce uniqueness at generation time, not just per-session).

---

## Decision 4 — Storage & serving: take the corpus OUT of Postgres (highest-leverage cost move)
- Scaling **text** to tens of thousands of rows does NOT break Supabase free tier (~50K sentences ≈ 30-60 MB vs 500 MB). Vectors are the only thing that would.
- **Recommended:** ship the ~99%-static corpus as **code-split compressed JSON/SQLite** from the VPS/Cloudflare (50K sentences ≈ 3-5 MB brotli; client downloads only its CEFR slice). Reserve Supabase for small per-user state (fingerprint, passed IDs, SRS, events). Per-user passed-filtering = load the small `passed_sentence_ids` array, filter the local slice. This is the only architecture that keeps "free-per-user" true at scale.
- Audio → Cloudflare R2 (10 GB free, zero egress) or VPS/Nginx; Supabase Storage 1 GB will be exceeded across 4 levels.
- **First cost cliff is project auto-pause (~7 days idle), not size** — add a free uptime ping. Free→Pro is a flat +$25/mo.

---

## AI models — a fix worth flagging regardless of this project
- **Your current AI paths use base Llama models that don't natively support Norwegian** (Groq base Llama-3.1-8B; WebLLM base Llama-3.2-1B). [Confirmed — HF model cards] Drop-in Norwegian-tuned replacements at identical footprints, free: **NB-Llama-3.1-8B-Instruct** (Ollama/server, Q4_K_M GGUF) and **NB-Llama-3.2-1B-Instruct** (WebLLM client). Highest-value AI quality upgrade available; keep `validateNorwegianOutput` + template fallback.
- One-time corpus authoring: GPT-4o / Gemini 2.5 Pro + human spot-check; or self-hosted NB-Llama/NorMistral-11B overnight. NorEval shows even strong models struggle with Norwegian — **never ship unvalidated Bokmål.**
- Embeddings (only if/when needed): **NB-SBERT-base** (768-dim, Apache-2.0, CPU, $0) or multilingual-e5-small (384-dim, lightest). Via `@huggingface/transformers` offline batch → pgvector. No API bill.
- CEFR auto-classification (to keep `filterSentencesByLevel` honest for generated content): feasible via **LIX readability + NB-BERT/NB-SBERT features** — and LIX gives the required non-AI fallback.

---

## OSS to adopt (on-stack, permissive, maintained)
| Tool | License | Use | Verdict |
|---|---|---|---|
| **ts-fsrs** | MIT | Per-sentence review-interval math (SOTA SRS) | Pilot as reversible swap for the fixed ladder; keep concept-level scheduler |
| **spaCy `nb_core_news_lg`** | MIT | Offline batch → POS/lemma/dep → drives cloze blank-selection + concept auto-tagging | Adopt (offline only; no runtime dep) |
| **pgvector** | PostgreSQL | Only if semantic dedup feature lands | Already in Supabase; indexless at this scale |
| **@huggingface/transformers** | Apache-2.0 | Self-hosted embeddings (multilingual-e5-small) offline | Adopt only with the dedup feature |
| **nodehun + dictionary-nb** | MIT | In-process Norwegian spell-check for content CI | Adopt for the validation gate |
| LanguageTool (self-host) | LGPL | Advisory grammar check | Optional; weak Bokmål — advisory only |
| spaCy/Stanza over **UDPipe** | — | UDPipe Norwegian models are CC BY-NC-SA | Avoid UDPipe; use spaCy |
| LibreLingo | AGPL | Borrow course/exercise *schema* ideas | Patterns only, never vendor code |

No maintained TS-native or Norwegian-aware cloze/CEFR library exists — those stay bespoke (spaCy-fed).

---

## Cost Architecture
| Stage | Architecture | Monthly |
|---|---|---|
| Launch (0-500) | Free Supabase + uptime ping + static corpus on VPS/CDN + on-device/free AI | **€0** |
| Growth (1K-5K) | Supabase Pro + static corpus + R2 audio + Gemini-free gen | **~$25** |
| Scale (10K+) | Pro + maybe Small compute (+$15, only if vectors) + paid LLM failover | **~$120** |
| Corpus build | Gemini Flash free (€0) or paid ~$4 + self-host embeddings (€0) + Claude Haiku QA ~$5 | **~$0-10 one-time** |

⚠️ Cliffs: Supabase auto-pause (uptime ping), 500 MB disk (keep corpus out of Postgres + 384-dim if vectors), 5 GB egress (static asset), Gemini free-tier cuts (Cerebras/Groq failover).

---

## Recommended path (depth-first, breadth gated)
1. **Phase A (depth, low risk):** AI sourcing pipeline + automated gate; deepen A1/A2 to match B1/B2 (≥30/concept, target higher); take corpus out of Postgres (static code-split asset); add global dedup. Swap to NB-Llama models.
2. **Phase B (breadth, gated):** P0 exercise types — cloze passage + guided composition — each traced to production + fingerprint before ship. Then objective-driven units (P1).
3. **Phase C (defer):** vectors only if measured paraphrase redundancy appears; ELO/IRT difficulty calibration once real user data exists.

---

## Conflicts Found
⚡ Gemini free-tier RPD — sources disagree post-Dec-2025 cuts (1,500/day vs 250-500/day). Treat 1,500 as a ceiling; have Cerebras/Groq failover.

---

## Scoring Appendix
Lanes: products+features, content-sourcing, AI+embeddings, vector-verdict, cost, OSS+packages. Confidence: vector verdict HIGH (convergent), pedagogy HIGH, licensing HIGH (per-source checked), cost tiers MEDIUM (live-pricing tools were blocked — re-verify before spend). Full provenance in lane files + archived copy.
