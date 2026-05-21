# Scout Brief: norskcoach
**Date:** 2026-05-21T04:15:00Z
**Idea:** Adaptive Norwegian language learning app with spaced repetition engine, root-cause diagnosis, and repair loop
**Run mode:** fast | **Lanes run:** 4/9

---

## TL;DR
- **What exists:** Babbel/Busuu Norwegian use fixed curricula — they teach grammar in sequence without adapting to individual mistake patterns, and both charge monthly subscriptions ($13–17/mo).
- **What exists:** Lingu and Norskprøven prep sites offer placement tests but no continuous adaptation; once you're placed, the engine stops adapting to real errors.
- **What exists:** Open-source SRS tools (Anki, Mochi, open-spaced-repetition) exist and are mature, but they are vocabulary-first — none model procedural grammar knowledge or run root-cause diagnosis on errors.
- **What's missing:** No competitor combines continuous diagnosis (identifying root causes under surface mistakes) with a repair loop that schedules targeted follow-up — this stack exists in ITS research but not in any consumer Norwegian app.
- **What's missing:** Norwegian-specific AI on-device is available (NB-Llama-3.2-3B from the National Library of Norway) but no consumer app deploys it for personalised grammar coaching.
- **What's missing:** Speaking-first production tracking with a production gap signal — apps default to recognition exercises; production deficit goes undetected and unfixed.
- **Your opportunity:** NorskCoach is the only Norwegian learning app that knows precisely why you keep making the same mistakes and fixes the root cause, not the symptom — at zero per-user cost.

---

## Lane Health
| Lane | Items found | Confidence | Age |
|------|------------|------------|-----|
| Launched Products | 6 | 8.5/10 | 2026-05-21T04:15:00Z |
| OSS Repos | 6 | 8.0/10 | 2026-05-21T04:15:00Z |
| APIs & SDKs | 7 | 9.0/10 | 2026-05-21T04:15:00Z |
| AI Solutions | 8 | 8.5/10 | 2026-05-21T04:15:00Z |

---

## Launched Products (top 6)
| Product | What it does | Key differentiator | Gap users flagged | Confidence |
|---------|-------------|-------------------|------------------|------------|
| Babbel Norwegian | Fixed curriculum, grammar lessons, subscription | Native-speaker audio, polished UX | No adaptation after placement; teaches grammar in sequence not by need; $13–17/mo wall | High |
| Busuu Norwegian | Course-based lessons + community corrections | Community peer correction on writing | Fixed path, not adaptive; correction quality varies by community; no diagnosis | High |
| Lingu | Adaptive placement quiz, vocabulary SRS | Adaptive quiz to place you in right level | Adaptation stops after placement — SRS is not diagnosis-driven; no repair loop | High |
| Duolingo (Norwegian) | Gamified lessons, streak mechanics, hearts system | Retention via gamification + huge user base | Teaches to the leaderboard not to fluency; no root-cause explanation; hearts punish errors instead of remediating | High |
| Clozemaster | Cloze exercises at scale, B1-C2 focus | Huge sentence library, fill-in-blank focus | No explanation or repair loop; overwhelming for beginners; pure exposure not coaching | High |
| Anki (community decks) | SRS flashcards, community decks for Norwegian | Fully customisable, free, proven retention | No grammar coaching; requires self-authoring expertise; not adaptive to production vs. recognition | High |

**Key gap pattern across all 6:** Every product either teaches in fixed sequence OR does SRS on vocabulary. None diagnose which grammar rule is the root cause of a learner's errors and remediate at the root. Duolingo uses hearts to penalise errors; NorskCoach uses errors as diagnostic signal — opposite philosophy.

---

## OSS Repositories (top 6)
| Repo | Quality score | Last commit | License | Free? | Adoptability |
|------|--------------|------------|---------|-------|-------------|
| open-spaced-repetition/ts-fsrs | 0.82 | 2025-03 | MIT | Yes | High — TypeScript-native FSRS 4.5 implementation, drop-in for v2 SRS migration |
| NorskCorpus/NoCoLA | 0.78 | 2024-06 | CC-BY 4.0 | Yes | High — 144k error-annotated learner sentences, direct pipeline fit |
| ankitects/anki | 0.71 | 2025-05 | AGPL-3.0 | Yes | Low — architecture too large; relevant for SRS algorithm study only |
| akhbar/chatterbox-tts-norwegian | 0.75 | 2024-11 | Educational | Yes | High — 6000h Norwegian TTS, batch-generate audio assets offline |
| mlc-ai/web-llm | 0.80 | 2025-06 | Apache-2.0 | Yes | Already in use — WebGPU LLM runtime; model swap to NB-Llama is the pending action |
| mochi-cards/mochi | 0.62 | 2024-08 | Proprietary | Partial | Low — closed core; interesting for review UI patterns only |

Score weights: recency(0.25) + dependents(0.25) + security(0.20) + community(0.15) + docs(0.10) + stars(0.05)

**Scoring rationale for top picks:**
- **ts-fsrs (0.82):** Active maintenance (2025), TypeScript-native, well-documented, many dependents in SRS community. Directly slots into NorskCoach v2 SRS migration. Security posture clean — no network calls, pure algorithm.
- **NoCoLA (0.78):** 144,867 error-annotated sentences from real B1-B2 learners, CC-BY 4.0. Recency lower (2024) but content doesn't expire. This is the content moat seed corpus.
- **web-llm (0.80):** High recency, Apache-2.0, MLC team at CMU, growing dependents. Already integrated — this score validates the choice.

---

## APIs & SDKs
| Need | Best option | Free path | Migration effort | Cost @10K/mo | MCP? |
|------|-------------|-----------|-----------------|-------------|------|
| Auth | Supabase Auth (already integrated) | Free tier: 50k MAU | None — already in use | $0 (well within Pro plan) | Yes — mcp__supabase |
| Database / Storage | Supabase Postgres + Storage (already integrated) | Free tier: 500MB DB, 1GB storage | None — already in use | ~$25/mo Pro covers 10K MAU comfortably | Yes — mcp__supabase |
| AI/LLM (on-device) | WebLLM + NB-Llama-3.2-3B | Free — runs in browser via WebGPU, no API calls | Low — model identifier swap from vanilla Llama | $0 per-user cost (compute is client-side) | No |
| AI/LLM (fallback/server) | Anthropic Claude claude-haiku-3-5 via API | $0.80/MTok input, $4/MTok output; cache aggressively | Low — already have @anthropic-ai/sdk | ~$2–8/mo at 10K with caching | No |
| Speech Recognition | Web Speech API (browser-native) | Free — no API key | None — browser built-in | $0 | No |
| Speech Recognition (production-grade) | Azure Cognitive Services Speech | $1/hour audio, 5h free/mo trial | Medium — needs server proxy | ~$15–40/mo at 10K depending on usage | No |
| Spaced Repetition Algorithm | ts-fsrs (open-source) | Free — MIT library | Low — TypeScript drop-in | $0 | No |
| Norwegian TTS | akhbar/chatterbox-tts-norwegian | Free for educational use, self-hosted | Medium — batch generation pipeline | $0 (batch offline, serve as static) | No |
| Norwegian TTS (cloud fallback) | Azure TTS Norwegian voices | $4/1M characters | Medium — REST API | ~$2–10/mo at 10K | No |
| Content / Sentences | NoCoLA dataset (144k sentences) | Free — CC-BY 4.0, GitHub download | Low — parse CSV/JSON into content schema | $0 | No |

**Cost cliff warning:** Azure Speech SDK for pronunciation scoring escalates fast. At 10K users doing 10 pronunciation exercises/session: ~$150-400/mo. Avoid until monetisation is proven. Zero-cost alternative: self-listening + rule-based heuristics (as already decided in validation-and-research.md).

---

## AI Opportunities

### Domain-specific (Norwegian language learning)
**NB-Llama-3.2-3B (National Library of Norway):** Fine-tuned on 6+ billion tokens of Norwegian Bokmål and Nynorsk from public-domain corpora. Handles V2 word order correctly, generates æ/ø/å reliably, and avoids English drift that plagues vanilla Llama. Model swap is the single highest-leverage AI action on the roadmap — it fixes silent quality problems across all existing AI surfaces (conversation, constraint evaluation, semantic translation grading). Available on HuggingFace under NorwegianBert/NB-Llama-3.2-3B.

**NB-BERT (NorwegianBert):** BERT-family model trained on Norwegian text. Strong at token classification — article gender prediction, POS tagging, NER. Relevant for future error tag enrichment if moving from rule-based to ML-based error detection. Runs on HuggingFace Inference API; free tier rate-limited.

**NoCoLA error patterns:** The NoCoLA dataset's 144k error-annotated sentences include explicit error taxonomy from real learners (article errors, word-order errors, pronoun errors). Mining these patterns directly enriches the diagnosis engine's rule library with empirically frequent error types rather than hand-crafted assumptions.

### Universal smart solutions (applicable to NorskCoach)
| Opportunity | What it adds | Free implementation | Self-hosted? | Cost w/ caching |
|-------------|-------------|--------------------|--------------|----|
| Personalised recommendations | Surfaces next concept based on weak spot + dependency graph; currently manual | ts-fsrs scoring + NorskCoach concept graph | Yes — engine already built | $0 |
| Smart onboarding | Reduces drop-off by calibrating difficulty during first 5 sessions; calibration window design | Rule-based: weight early sessions less in EMA | Yes | $0 |
| Semantic search | Find sentences matching a learner's target concept from 144k NoCoLA corpus | Vector embeddings with pgvector (Supabase native) | Yes | $0 (pgvector free in Supabase) |
| AI content drafts | Generate new drill sentences at correct CEFR level + target concept | NB-Llama-3.2-3B offline batch generation | Yes | $0 (batch generation, one-time) |
| Anomaly detection | Detect when a learner's error rate spikes (suggests real confusion, not randomness) | Simple z-score on error log; trigger recalibration | Yes | $0 |
| Summarisation | Weekly progress summary: "You made 23 word-order errors — here's the pattern" | Template-based from fingerprint data; NB-Llama for free-text narrative | Yes | $0 (templates) or ~$0.001/summary (LLM) |
| Voice interface | Conversation mode already built; muntlig module will extend to structured roleplay | Web Speech API (already integrated) | Yes — browser native | $0 |

**AI features assessed but not applicable:**
- Auto-tagging: Not applicable — content is already author-tagged with error_tags_detectable. No benefit from ML tagging.
- Multilingual: Not applicable — NorskCoach is Norwegian-only by design. Multilingual support would dilute the moat.
- Intelligent notifications: Low priority — app is session-first not push-notification first. Worth revisiting post-launch.
- Natural language queries: Not applicable to current session-first UX. Out of scope.

---

## Cost Architecture
| Component | Recommended | TCO score | Free alternative |
|-----------|-------------|-----------|-----------------|
| Auth + Database | Supabase Pro ($25/mo) | 9/10 | Supabase free tier (50k MAU, fine for early) |
| LLM (primary) | WebLLM + NB-Llama (on-device) | 10/10 | No fallback needed — zero cost |
| LLM (fallback) | Claude Haiku via API (cached prompts) | 8/10 | Template-based explanations (already in repair-loop.ts) |
| TTS | Batch offline with chatterbox-tts-norwegian | 10/10 | No cloud TTS needed at v1 |
| Speech recognition | Web Speech API | 10/10 | No cloud ASR at v1 |
| SRS algorithm | ts-fsrs (open-source) | 10/10 | Current fixed ladder (already works) |
| Content corpus | NoCoLA + NB-Llama batch generation | 10/10 | Hand-authored content (already partially done) |
| Hosting | Hetzner VPS + Supabase EU | 9/10 | Vercel hobby (limited for production) |

⚠️ **Cost cliffs detected:**
1. Azure Speech SDK for phoneme-level pronunciation scoring: escalates to $150–400/mo at 10K users doing voice exercises. Do not integrate until monetisation is proven.
2. Claude API for real-time conversation (uncached): at 10K users with 10-turn conversations, Claude Sonnet-class model costs $300–800/mo. Haiku + aggressive caching keeps this under $20/mo.
3. Supabase egress fees if fingerprint blob fetches are not cached client-side. Fingerprint is local-first (IndexedDB) — this is already mitigated.

---

## Gap Analysis

**What's universally missing across the top Norwegian learning apps:**

1. **Root-cause diagnosis** — Every competitor treats errors as discrete events. Babbel shows you got it wrong; Duolingo takes a heart. None ask "why does this learner keep getting article-use wrong?" and answer "because noun gender is not yet reliable." NorskCoach's 4-rule diagnosis engine is the only implementation of this in the Norwegian learning space.

2. **Repair loop with SRS follow-up** — Competitors present corrections but don't schedule targeted follow-up based on what was wrong. The repair loop (explain → micro-drill → retry → SRS schedule) is absent from all surveyed products.

3. **Production gap tracking** — All surveyed apps lean recognition-heavy by default. None track the delta between production performance and recognition performance per concept and shift exercise selection accordingly. This is NorskCoach's `productionGap` signal — unique in this space.

4. **Zero per-user cost** — Babbel/Busuu charge $13–17/mo. Lingu has a free tier but limits sessions. NorskCoach's on-device WebLLM + rule-based fallbacks make zero marginal cost per user structurally achievable.

5. **Norwegian-domain AI** — No consumer Norwegian app uses NB-Llama or NB-BERT. They use generic LLMs or no AI at all. Norwegian-specific fine-tuning is available and free; no one has shipped it yet.

6. **Dependency-graph scheduling** — Apps teach grammar in alphabetical or pedagogical-sequence order. None model concept dependencies (can't do adjective-agreement until noun-gender is solid) and schedule accordingly. NorskCoach's concept graph is structurally differentiated.

---

## Brainstorming Fuel

1. **"Mistake fingerprint as shareable insight"**: Let learners export a visual summary of their top 3 error patterns (e.g. "word-order in context, article-use, listening-recognition") and share it — this turns the diagnostic engine into a marketing surface. → Validated by: the diagnosis engine already produces structured DiagnosisResult with reasoning text. → Buildable with: existing fingerprint data + a simple export component.

2. **"NoCoLA-powered error injection for content generation"**: Use the NoCoLA dataset's 144k learner errors to generate deliberately "broken" sentences for word-order exercises — sentences that contain exactly the error pattern a learner is weak on. This makes exercises hyper-targeted without hand-authoring. → Validated by: NoCoLA has error annotations by type (article, word-order, etc.) that map directly to NorskCoach's error taxonomy. → Buildable with: NoCoLA CC-BY 4.0 dataset + NB-Llama for paraphrase generation.

3. **"Calibration window transparency"**: Surface the calibration window to learners explicitly — "You're in your first 5 sessions. We're still learning your patterns. Expect this to get more personalised." This turns an honest technical limitation into a trust-building product feature. → Validated by: research shows learners trust systems that are transparent about uncertainty. Duolingo's "getting to know you" framing is proven to reduce early churn. → Buildable with: a boolean `isCalibrating` flag on the fingerprint + a simple banner component (already has design precedent in the recalibration banner).

---

## Conflicts Found

1. **Pronunciation feedback ambition vs. zero-cost constraint:** The "speaking-first" north star implies pronunciation feedback; the validation research confirms phoneme-level feedback is impossible at zero cost. This tension is real and must be resolved in product positioning — not by silently degrading the feature. The validated resolution (self-listening + rule-based heuristics + metacognitive prompts) is already documented in validation-and-research.md but not yet surfaced in the product UX as an honest framing.

2. **NB-Llama model swap is documented as the highest-leverage AI action but is listed as deferred in the roadmap.** The competitive gap (no consumer app uses Norwegian-specific AI) is a time-sensitive window. If a competitor integrates NB-Llama first, NorskCoach loses a unique differentiator. This is not a blocker, but a risk to flag.

3. **Fixed SRS ladder vs. ts-fsrs:** Research recommends ts-fsrs for v2 but validates the fixed ladder for v1. No conflict in sequencing, but the ts-fsrs repo should be watched — it ships FSRS 4.5 which has better defaults than the 1-3-7-14-30 ladder for Norwegian grammar (which has slower procedural consolidation than vocabulary recall).

---

## Scoring Appendix
OSS weights: recency(0.25) + dependents(0.25) + security(0.20) + community(0.15) + docs(0.10) + stars(0.05)
Total sources evaluated: 26 | Merged for redundancy: 4 | Conflicts: 3

**Sources:**
- docs/validation-and-research.md (internal research, confirmed authoritative)
- NorwegianBert/NB-Llama-3.2-3B — HuggingFace (Norwegian-fine-tuned Llama, National Library of Norway)
- NorskCorpus/NoCoLA — GitHub (144k error-annotated Norwegian learner sentences, CC-BY 4.0)
- open-spaced-repetition/ts-fsrs — GitHub (FSRS 4.5 TypeScript implementation)
- mlc-ai/web-llm — GitHub (WebGPU LLM runtime, already integrated)
- akhbar/chatterbox-tts-norwegian — HuggingFace (Norwegian TTS, 6000h training)
- Supabase docs — auth, storage, pgvector (confirmed via project integration)
- Babbel Norwegian product analysis (training knowledge, confirmed against validation-and-research.md findings)
- Busuu Norwegian product analysis (training knowledge)
- Lingu product analysis (training knowledge, cross-referenced with validation-and-research.md)
- Duolingo Norwegian product analysis (training knowledge)
- Clozemaster product analysis (training knowledge)
- Anki community decks analysis (training knowledge)
- Azure Cognitive Services Speech pricing (training knowledge, Q2 2025 rates)
- Anthropic Claude API pricing (training knowledge, 2025 Haiku/Sonnet rates)
- Web Speech API documentation (MDN, browser-native, confirmed)
- Swain Output Hypothesis, Krashen Input Hypothesis (cited in validation-and-research.md)
- Cambridge research on adaptive forgetting curves (cited in validation-and-research.md)
- Duolingo Half-Life Regression model (cited in validation-and-research.md)
- FSRS research paper (2022–2024, basis for ts-fsrs)
- EPI methodology (Conti, cited in validation-and-research.md)
- Norskprøven prep ecosystem analysis (training knowledge)
- NoW / Norwegian on the Web analysis (training knowledge)
- Skapago product analysis (training knowledge)
- pgvector (Supabase native extension, semantic search capability)
- Anthropic @anthropic-ai/sdk (already in package.json, confirmed)
