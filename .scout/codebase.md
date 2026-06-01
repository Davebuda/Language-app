Framework: Next.js (App Router) + React 19 + TypeScript strict + Tailwind
Type: adaptive language-learning app (Norwegian Bokmål) — "coach", not a course

What exists:
  - Adaptive engine (complete): diagnostic placement, mistake fingerprint (IndexedDB + Supabase), phase-adaptive EMA mastery, exponential decay (25-day half-life), scheduler (40/30/20/10 recipe), repair loop, weekly sprint
  - Content corpus (flat JSON, read server-side via src/lib/content-loader.ts):
      A1 = 198 sentences / 22 concepts (~9 per concept)
      A2 = 199 sentences / 22 concepts (~9 per concept)
      B1 = 360 sentences / 12 concepts (30 per concept)
      B2 = 360 sentences / 12 concepts (30 per concept)
      ~1,117 total; matches ~1,117 MP3 audio files (edge-tts nb-NO)
  - Exercise types DECLARED (src/types/session.ts:5): 10 — translation-to-norwegian, translation-to-english, sentence-transformation, fill-in-blank, word-order, listening-comprehension, dictation, reading-comprehension, free-writing, speed-round
  - Exercise components BUILT: 5 — Translation, FillInBlank, WordOrder, Listening, SpeedRound. The other 5 are type-only or modes.
  - Serving-at-level: filterSentencesByLevel (scheduler.ts:14) — A1 user never sees B1+
  - Per-user passed-question removal: passedSentenceIds (scheduler.ts:107, fingerprint) — already wired
  - Session size ~25 items/day (LEVEL_BLOCK_SIZES, session.ts:77)
  - AI hybrid: WebLLM (desktop, Llama-3.2-1B) / Groq (mobile) / template fallback; every AI path has non-AI fallback
  - Supabase content schema designed in .planning/ but NOT the runtime path (runtime is flat JSON)

Data model: Sentence { id, norwegian, english, conceptIds[], vocabularyClusters[], errorTagsDetectable[], cefrLevel, difficulty(1|2|3), exerciseTypes[], audioUrl }. Concept graph per level (getGraphForLevel). 17-tag error taxonomy.

Recent focus: Nordic Dense dark theme rollout, voice onboarding orb, landing page.

Obvious gaps:
  - A1/A2 corpus depth thin (~9/concept) — ambitious daily user exhausts fast since passed items are removed
  - Only 5 of 10 declared exercise types built; all are single-sentence; no multi-sentence / school-grade units
  - No vector/embedding layer; difficulty gating is concept-graph + CEFR + difficulty-tier(1-3) only
  - Storage decision pending: flat JSON vs Supabase at larger scale

Stack: Next.js App Router, React 19, TypeScript strict, Tailwind, shadcn/ui, Framer Motion, Zustand, Supabase (Postgres+Auth+RLS), IndexedDB (idb), WebLLM/Groq. Hard constraint: free-per-user; small EU VPS + Supabase EU.

Moat: root-cause diagnosis + scheduling + remediation. North star: make user PRODUCE/SPEAK Norwegian, build sentences confidently. Norwegian-dominates on learning surfaces.
