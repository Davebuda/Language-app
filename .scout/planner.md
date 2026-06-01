Project: NorskCoach
Category: adaptive-language-learning (Norwegian Bokmål)
Detected needs: deep CEFR-tagged corpus sourcing, AI content generation + linguist review at scale, corpus storage/serving at scale (JSON vs Supabase pgvector), new school-grade multi-sentence exercise types, vector embeddings for difficulty gating & progression, cost control under free-per-user constraint
Audience: self-directed Norwegian learners (A1-B2), Norskprøven-adjacent
Stack: Next.js App Router, React 19, TS strict, Tailwind, shadcn, Framer Motion, Zustand, Supabase (Postgres+Auth+RLS), IndexedDB, WebLLM/Groq
Existing features: adaptive engine, fingerprint, scheduler, repair loop, weekly sprint, level-filtering, passed-question removal, 5 exercise components, ~1,117 sentences + audio
Run mode: deep
Lanes: 1 products, 2 OSS, 3 features, 4 APIs (content sources + embeddings), 5 AI (generation + embeddings), 6 patterns (vector/CEFR), 8 cost (pgvector/AI/storage), 9 packages — consolidated into 6 parallel research agents
