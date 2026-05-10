# Requirements — NorskCoach

**Project:** Diagnostic Norwegian language learning web app
**Core value:** A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.

---

## Project-Wide Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-P-01 | The app is a coach not a course — generates a personal daily syllabus per learner, never "Lesson 12" | MUST |
| REQ-P-02 | Core moat: Diagnosis + Scheduling + Remediation working together as a system | MUST |
| REQ-P-03 | Local-first: mistake fingerprint lives in IndexedDB on the device, never synced without explicit user opt-in | MUST |
| REQ-P-04 | Zero per-user cost in core experience — no API calls per session | MUST |
| REQ-P-05 | CEFR A1→B2 progression aligned with Norskprøven | MUST |
| REQ-P-06 | Every wrong answer runs through the repair loop (explain → micro-drill → retry → schedule review) | MUST |
| REQ-P-07 | Auth from day one via Azure Entra External ID | MUST |
| REQ-P-08 | Supabase PostgreSQL for content storage | MUST |
| REQ-P-09 | Azure Static Web Apps hosting | MUST |
| REQ-P-10 | On-device AI via WebLLM (Phase 3) — stubs in Phase 2, real model in Phase 3 | SHOULD |

---

## Phase 1: Engine Skeleton
**Status:** ✅ Complete

| ID | Requirement | Status |
|----|-------------|--------|
| REQ-01 | MistakeFingerprint data model with mastery scoring, exponential decay, confidence intervals | ✅ Done |
| REQ-02 | Error taxonomy — 17 tags across grammar/vocab/comprehension | ✅ Done |
| REQ-03 | Concept graph — 22 A1 Norwegian grammar concepts with prerequisites | ✅ Done |
| REQ-04 | Session scheduler — 40/30/20/10 recipe (remediation/review/new/interleaving) | ✅ Done |
| REQ-05 | Root-cause diagnosis rules (4 codified tutor patterns) | ✅ Done |
| REQ-06 | Repair loop — explain → micro-drill → retry → schedule review | ✅ Done |
| REQ-07 | AI service interface + stub implementation (all fallbacks working) | ✅ Done |
| REQ-08 | IndexedDB storage for local fingerprint persistence | ✅ Done |
| REQ-09 | Dark editorial landing page with waitlist capture | ✅ Done |

---

## Phase 2: Exercise Types + Real Content
**Status:** Ready to plan

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-10 | Supabase schema deployed — sentences, vocab_items, vocab_clusters, scenarios, waitlist tables with RLS | MUST |
| REQ-11 | TranslationExercise component — Norwegian↔English with keyboard input and answer validation | MUST |
| REQ-12 | FillInBlankExercise component — cloze deletion with grammar-focused blanks | MUST |
| REQ-13 | WordOrderExercise component — drag-and-drop tiles for V2 word order practice | MUST |
| REQ-14 | ListeningExercise component — audio playback + typed/multiple-choice answer | MUST |
| REQ-15 | SpeedRound component — rapid vocab recall with timer | SHOULD |
| REQ-16 | SessionScreen — runs through session items sequentially, shows progress, handles exercise completion | MUST |
| REQ-17 | Repair loop UI — ExplanationCard (shows why wrong), micro-drill sequence, retry flow | MUST |
| REQ-18 | Hooks layer — useFingerprint, useSession, useExercise bridging engine to components | MUST |
| REQ-19 | A1 content seed — 500+ sentences across all 22 A1 concepts, tagged, seeded into Supabase | MUST |
| REQ-20 | Dashboard / home screen — today's session CTA, concept mastery map, streak display | MUST |
| REQ-21 | Azure Blob Storage integration for audio URLs (sentences reference audio files) | SHOULD |

---

## Phase 3: AI Layer
**Status:** Not started

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-22 | WebLLM integration — load Gemma 3n or equivalent in browser via WebGPU | MUST |
| REQ-23 | Real mistake explanations replacing stub templates | MUST |
| REQ-24 | On-demand sentence generation for variety | SHOULD |
| REQ-25 | Free-writing exercises with AI error detection | SHOULD |
| REQ-26 | Writing reviewer — holistic feedback on free-text submissions | SHOULD |

---

## Phase 4: Production + B1/B2 Content
**Status:** Not started

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-27 | Speaking prompts with browser speech API | SHOULD |
| REQ-28 | Conversation mode with local AI | COULD |
| REQ-29 | B1/B2 concept graph and content corpus | MUST |
| REQ-30 | Norskprøven alignment — content mapped to test format | SHOULD |

---

## Phase 5: Scale + Mobile
**Status:** Not started

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-31 | Cross-device sync via Supabase (opt-in) | SHOULD |
| REQ-32 | iOS app wrapper (Capacitor or React Native) | COULD |
| REQ-33 | Other language support (engine is language-agnostic) | COULD |
