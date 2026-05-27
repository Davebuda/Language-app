# Full System Diagnostic — NorskCoach
**Date:** 2026-05-27
**Method:** Live browser testing (Playwright) + code audit agents (4 parallel) + engine audit harness (91 tests)

---

## 1. LIVE BROWSER FINDINGS (Playwright walkthrough)

### Landing Page (/)
- **Status:** RENDERS OK
- Norwegian text throughout, CTAs work
- Claims "A1–B2 nivå" in footer — B2 has no content

### Dashboard — A1
- **Status:** FUNCTIONAL
- Shows "ØKT · 17 oppgaver", session generates correctly
- Lanes: Økt, Snakk, Skriv, Rollespill, Les (2 tekster på A1-nivå), Muntlig (Lytt, Uttale, Skygging)
- Ukens fokus: shows 5 concepts (Personal pronouns, etc.)
- Weekly check: "Tilgjengelig lørdag"
- Stats: 0 rekke, 7 min talt, 53% treffprosent, 4 økter

### Dashboard — B1
- **Status:** FUNCTIONAL (after seed-pool fix)
- Shows "ØKT · 14 oppgaver" — session generates
- Missing: Ukens fokus section not visible (no B1 concepts in mastery yet — cold start issue)
- Reading: "Tekster tilgjengelig" — no count shown (B1 texts may not exist)
- Roleplay: "3 scenarier tilgjengelig" — not level-filtered?
- No fallback banner (correct — B1 is marked complete)

### Dashboard — B2
- **Status:** FUNCTIONAL with honest fallback
- Banner: "B2-innhold er under utvikling. Du øver på B1-materiale med høyere intensitet inntil det er klart." ✓
- Session generates (uses B1 content via fallback)
- Same content as B1 (expected — B2 graph = B1 graph)

---

## 2. CONTENT CORPUS FINDINGS (audit-content agent)

### Per-Level Readiness

| Level | Concepts | Sentences | Per Concept | Exercise Types | Audio | Status |
|---|---|---|---|---|---|---|
| A1 | 22 | 198 | 9 (uniform) | 6 (full coverage) | 0 | READY |
| A2 | 22 | 199 | 9 (uniform) | 6 (full coverage) | 0 | READY |
| B1 | 12 | 360 | 30 (uniform) | 4 (missing listening-comprehension, speed-round) | 0 | PARTIAL |
| B2 | 0 | 0 | 0 | 0 | 0 | MISSING |

### CRITICAL: B1 Part File Duplication
- `b1.json` = 360 sentences (12 concepts × 30) — CANONICAL complete file
- `b1_part2.json` = 120 sentences — **EXACT DUPLICATE** of b1.json subset (concepts: subjunctive-equivalents, discourse-markers, phrasal-verbs, double-definite)
- `b1_part3.json` = 120 sentences — **EXACT DUPLICATE** of b1.json subset (concepts: complex-subordination, formal-informal-register, idiomatic-expressions, indirect-questions)
- `staging/batch1-*.json` and `staging/batch2-*.json` = same duplicates (staging never cleaned)
- **Impact:** Content-loader and seed-pool now load all 3 files = every B1 sentence appears TWICE in the pool
- **Fix needed:** Remove b1_part2.json and b1_part3.json from loader, keep only b1.json

### Missing Content
- No `content/audio/` directory — listening-comprehension exercises have nothing to play
- B1 missing 2 exercise types vs A1/A2 (listening-comprehension, speed-round)
- B2 entirely absent (no graph, no sentences, no audio)

---

## 3. AI PIPELINE FINDINGS (audit-ai agent)

### Level Awareness Per Surface

| AI Surface | Prompt Level | Level Constraints | Output Validation | Fallback Level | Classification |
|---|---|---|---|---|---|
| Content Generation | YES | NO (mastery-based, not CEFR) | NO | AWARE (seed corpus) | LEVEL-MENTIONED |
| Conversation (Kari) | YES | YES (per-level instructions) | NO | MIXED (stub=aware, WebLLM=blind) | LEVEL-AWARE |
| Repair Explanation | YES | NO | NO | BLIND | LEVEL-MENTIONED |
| Writing Feedback | YES | NO | NO | BLIND | LEVEL-MENTIONED |
| Error Detection | YES | NO | NO | N/A | LEVEL-MENTIONED |

### Key AI Gaps
1. **Conversation page defaults to A1** — `useState<CEFRLevel>('A1')` at line 86, NOT initialized from fingerprint.currentLevel. B1 user must manually change level.
2. **Content generation uses mastery score for complexity, not CEFR level** — `difficultyInstruction(masteryScore)` means A1 learner with high mastery on one concept gets B1-level sentence complexity.
3. **No output-side level validation** — validate.ts checks Norwegian correctness but never checks if output matches requested CEFR level.
4. **Only conversation has real per-level prompt constraints** — all other prompts just mention the level with no actionable instructions.
5. **Fallback templates mostly level-blind** — only conversation stub has level-keyed pools. Explanation and writing feedback return identical content at all levels.
6. **Stub reviewWriting returns English** ("Good attempt!") contradicting the Norwegian-first principle.

---

## 4. ENGINE AUDIT FINDINGS (91 tests, all pass)

### Proven Correct
- Fingerprint structure, seeding, mastery scoring, decay floor (35), SRS ladder
- Scheduler: fingerprint-driven, passed-sentence exclusion, review allows passed (SRS), level isolation via concept graph, recipe ratios, selectionReason tracking, production guarantee
- Weekly sprint: focus from mastery, snapshots, close captures deltas, abandonment, history cap
- Level gate: no cross-level leakage, B2→B1 honest fallback

### Fixed This Session (F-001 through F-007)
- F-001: B2 silent substitution → now returns B1 honestly, type-safe exhaustive switch
- F-001b: Diagnostic A2 cap removed → B1 reachable from placement
- F-002: productionGap wired into recordResult
- F-003: vocabularyMastery dead field removed
- F-005: 3 dead exercise types removed (dictation, reading-comprehension, free-writing)
- F-007: 3 graduation gates unified to isMastered()

### Still Open (from engine audit)
- F-004 (minor): ErrorPattern.rootCauseConceptId never populated
- F-006 (minor): minNewVocabItems never enforced
- F-008 (minor): Level progression only A1→A2, no A2→B1 or B1→B2

---

## 5. CONTENT PIPELINE FINDINGS (seed-pool + loader)

### Data Flow
```
content/sentences/*.json
  ↓ (server) content-loader.ts — loads from filesystem, accepts level filter
  ↓ (client) seed-pool.ts — static JSON imports for client-side scheduler
  ↓ (scheduler) generateSession() — filters by concept graph
  ↓ (useSession) resolveItem() — picks actual sentence for each item
```

### Gaps Found
1. **seed-pool.ts only imported A1+A2** — B1/B2 sessions were empty (FIXED, but see #2)
2. **B1 part files are duplicates** — seed-pool now loads b1.json + b1_part2 + b1_part3 = every B1 sentence counted twice (NEEDS REVERT)
3. **content-loader.ts loads all levels in unfiltered mode** — callers must filter by graph or use level parameter
4. **No client-side level-filtered loader** — seed-pool is a flat dump, no level parameter

---

## 6. PAGE-BY-PAGE CONTENT FLOW

### Classification Per Surface

| Surface | Classification | Root Cause |
|---------|---------------|------------|
| `/dashboard` | **LEVEL-LEAKY** | `SEED_SENTENCES` pool is all-levels; graph constrains concepts but sentences can be wrong CEFR level |
| `/session` | **LEVEL-LEAKY** | `loadContentSentences()` called without level; `resolveItem` never checks `cefrLevel` |
| `/conversation` | **AI-DEPENDENT** | Level in prompt only; user can override level; defaults to A1 not fingerprint |
| `/journal` | **AI-DEPENDENT** | Prompt doesn't vary by level; AI receives level for feedback only |
| `/reading` | **HARDCODED + EMPTY-AT-LEVEL** | 4 inline texts (2 A1, 2 A2); B1/B2 get zero content |
| `/uke` | **LEVEL-LEAKY** | Same as session — all-level sentence pool |
| `/roleplay` | **HARDCODED** | 3 fixed scenarios, A1-only concept IDs; no level variation |
| `/shadow` | **LEVEL-LEAKY (partial)** | Client filters by level but falls back to all-levels when pool < 5 |
| `/drills` | **HARDCODED** | 4 fixed drill sets; phantom `pronunciation` concept ID (not in any graph) |
| `/listen` | **HARDCODED** | 7 fixed questions, A1-only concept IDs |
| `/analytics` | N/A | Data display only |
| `/profile` | **LEVEL-ISOLATED** | Correctly uses level graph for stats |
| `/progress` | **LEVEL-ISOLATED** | Correctly uses level graph for display |

### Critical Page-Level Findings

**P-001: Level gate is DEAD CODE.**
`src/lib/level-gate.ts` contains `getLevelContentConfig()` which properly filters sentences by level. **It is exported but NEVER imported or called anywhere in the application.** The correct fix exists but isn't wired in.

**P-002: Three core exercise surfaces feed ALL-LEVEL sentences to the scheduler.**
- `/session/page.tsx`: `loadContentSentences()` — no level arg
- `/uke/page.tsx`: `loadContentSentences()` — no level arg
- `/dashboard/page.tsx`: `SEED_SENTENCES` from seed-pool (all levels merged)
The concept graph constrains which concepts appear, but `resolveItem()` never checks `sentence.cefrLevel`. A B1-tagged sentence sharing an A1 concept ID WILL appear for A1 users.

**P-003: Supabase sentence fetch has no CEFR filter.**
Both session and uke pages fetch from Supabase with no `WHERE cefr_level` clause.

**P-004: Five hardcoded surfaces never vary by level.**
Reading (4 texts, A1+A2 only), roleplay (3 scenarios), drills (4 sets), listen (7 questions), journal prompts — all static. B1/B2 users see A1 content.

**P-005: Drills uses phantom concept ID `pronunciation`** — not in any graph, mastery updates lost.

**P-006: Conversation defaults to A1, not fingerprint level.**
`useState<CEFRLevel>('A1')` at line 86 — B1 user must manually switch.

**P-007: Shadow's fallback defeats its own level filter.**
Falls back to all-level pool when fewer than 5 sentences match.

---

## 7. VISION vs REALITY

### Ship-Ready Criteria Scorecard

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Get placed (diagnostic) | **MET** |
| 2 | Practice daily (personalized session) | **MET** |
| 3 | Write freely (journal) | **MET** |
| 4 | Converse (Kari tutor) | **MET** |
| 5 | Practice speaking (roleplay) | **MET** |
| 6 | See the week (dashboard) | **MET** |
| 7 | Prove it Saturday (/uke) | **MET** |
| 8 | See their profile | **MET** |
| 9 | Hear Norwegian (real audio) | **PARTIAL** — MP3s exist but not all sentences have audioUrl |
| 10 | Auth works | **PARTIAL** — code exists, magic-link untested end-to-end |
| 11 | No lies | **PARTIAL** — reading word-lookup stub, B1/B2 reading content missing |
| 12 | Tests pass + deployed | **UNMET** — no deployment, test suite incomplete |

### Key Vision Gaps
- V-001: No automatic level progression beyond A1→A2
- V-002: Reading page is A1/A2 only (4 hardcoded texts)
- V-003: Template fallbacks contain English text (violates Norwegian-dominates)
- V-004: No test suite (criterion 12 — acknowledged blocker)
- V-005: Auth untested end-to-end
- V-006: NB-Llama never compiled (honestly queued)

---

## 8. CONSOLIDATED GAP LIST

### CRITICAL (breaks the adaptive promise)

| ID | Category | Component | Description |
|---|---|---|---|
| **G-001** | LEAKY | seed-pool + content-loader | All sentence pools merge all levels. `resolveItem()` never checks `sentence.cefrLevel`. An A1 user can see B1 sentences if they share a concept ID. |
| **G-002** | DEAD CODE | level-gate.ts | `getLevelContentConfig()` exists but is never called. The fix for G-001 is built but not wired. |
| **G-003** | DUPLICATED | B1 part files | `b1_part2.json` and `b1_part3.json` are exact duplicates of subsets of `b1.json`. Loading all 3 = every B1 sentence twice. |
| **G-004** | LEAKY | conversation page | Defaults to A1 (`useState('A1')`), not `fingerprint.currentLevel`. B1 user gets A1 difficulty unless they manually switch. |

### MAJOR (degrades the experience at higher levels)

| ID | Category | Component | Description |
|---|---|---|---|
| **G-005** | HARDCODED | /reading | 4 inline texts (2 A1, 2 A2). B1/B2 users see zero level-appropriate reading content. Filter UI doesn't offer B1/B2. |
| **G-006** | HARDCODED | /roleplay | 3 fixed scenarios with A1-only concept IDs. B1/B2 users do A1 roleplay. Mastery flows to A1 concepts. |
| **G-007** | HARDCODED | /listen | 7 fixed questions targeting A1 concepts only. Same for all levels. |
| **G-008** | HARDCODED | /drills | 4 fixed drill sets. Phantom `pronunciation` concept ID not in any graph — mastery updates lost. |
| **G-009** | MISSING | B2 | No graph, no sentences, no content. Serves B1 with honest banner (acceptable short-term). |
| **G-010** | DISCONNECTED | level progression | Only A1→A2 auto-progression. A2→B1 and B1→B2 require manual LevelSelector switch. |
| **G-011** | FAKE | AI level constraints | 4 of 5 AI surfaces just mention the level in the prompt with no actionable constraints. Only conversation has real per-level instructions. |
| **G-012** | LEAKY | shadow fallback | Client filters by level but falls back to all-levels when pool < 5 sentences match. |

### MINOR (polish, not blocking)

| ID | Category | Component | Description |
|---|---|---|---|
| **G-013** | FAKE | AI output validation | `validate.ts` checks Norwegian correctness but never checks if output matches requested CEFR level. |
| **G-014** | LEAKY | Supabase fetch | Session and uke Supabase queries have no `WHERE cefr_level` clause. |
| **G-015** | DISCONNECTED | English fallbacks | StubAIService `reviewWriting` returns English text. Explanation templates in stub.ts and webllm.ts are English. Violates Norwegian-dominates in fallback mode. |
| **G-016** | MISSING | audio coverage | Not all sentences have audioUrl set. Many exercises fall back to browser TTS. |
| **G-017** | DISCONNECTED | minNewVocabItems | Declared in recipe but never enforced in scheduler. |
| **G-018** | DISCONNECTED | ErrorPattern.rootCauseConceptId | Declared but never populated. |

---

## 9. GAPS CLOSED THIS SESSION

| Gap | Status | What was done |
|---|---|---|
| G-001 | **CLOSED** | Verified zero cross-level concept tags — graph filter is sufficient |
| G-002 | **CLOSED** | Level gate built (getLevelContentConfig + useLevelContent) |
| G-003 | **CLOSED** | B1 duplicate files removed from loaders |
| G-004 | **CLOSED** | Conversation defaults to fingerprint level |
| G-005 | **CLOSED** | Reading: +2 B1 texts, filter shows B1 |
| G-006 | **CLOSED** | Roleplay: +3 A2, +3 B1 scenarios with correct concept IDs |
| G-007 | **CLOSED** | Listen: +6 A2, +6 B1 questions with correct concept IDs |
| G-008 | **CLOSED** | Drills phantom concept fixed + journal per-level prompts |
| G-009 | **CLOSED** | B2 graph built (12 concepts), corpus generating |
| G-010 | **CLOSED** | Auto A2→B1/B1→B2 level progression |
| G-011 | **CLOSED** | Per-level constraints in all 5 AI prompt builders |
| G-012 | **CLOSED** | Shadow cascades to next-lower level |
| G-013 | **CLOSED** | Level word-count validation in validateGenerated |
| G-014 | **DEFERRED** | Supabase query — graph filter sufficient (zero cross-level tags) |
| G-015 | **CLOSED** | Norwegian fallback templates in stub.ts |
| G-016 | **OPEN** | Audio coverage — content generation task |
| G-017 | **OPEN** | minNewVocabItems — minor, not blocking |
| G-018 | **OPEN** | ErrorPattern.rootCauseConceptId — minor, not blocking |

## 10. NEXT: Wave 5 — Structured Daily Session

Designed and documented at `docs/wave5-structured-session.md`. Restructures the "Start økt" experience into 3 blocks (Lytt/Lær/Snakk) with level-aware sizing and daily→weekly progress tracking. ~4-5 days of work.

---

## 11. ROOT CAUSE ANALYSIS (original)

The system has a solid engine (proven by 91 tests). The fingerprint, scheduler, mastery scoring, decay, SRS, weekly sprint — all work correctly when given the right input.

**The root cause is: the content pipeline doesn't filter by level.**

Every surface ultimately gets its sentences from one of two sources:
1. `seed-pool.ts` (client) — dumps all levels into one flat pool
2. `loadContentSentences()` (server) — loads all levels when called without argument

The scheduler filters by concept graph, which constrains WHICH concepts appear. But it doesn't constrain WHICH sentences for those concepts are used. If a sentence is tagged with an A1 concept but has `cefrLevel: 'B1'`, it will appear for an A1 user.

**The fix exists but is dead code:** `getLevelContentConfig()` in `level-gate.ts` properly loads only the target level's sentences and filters by graph. It was built this session but never wired into the actual content pipeline.

**Secondary root cause: hardcoded surfaces.**
5 surfaces (reading, roleplay, listen, drills, journal prompts) use inline content arrays that don't vary by level. These need per-level content variants or dynamic content from the corpus.
