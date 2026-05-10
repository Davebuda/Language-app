# Roadmap: NorskCoach

## Overview

NorskCoach is a diagnostic Norwegian language learning web app that acts as a personal coach, not a course. It generates a personalized daily syllabus from each learner's mistake fingerprint, teaches grammar in dependency order via a concept graph, and runs every wrong answer through a structured repair loop. Local-first, built on Next.js/Supabase/Azure, with on-device AI via WebLLM in Phase 3.

## Phases

- [x] **Phase 1: Engine Skeleton** — Core adaptive engine, data models, AI stubs, landing page
- [ ] **Phase 2: Exercise Types + Real Content** — Exercise UI, session flow, A1 content corpus
- [ ] **Phase 3: AI Layer** — WebLLM integration for on-device explanations and generation
- [ ] **Phase 4: Production + B1/B2 Content** — Speaking, conversation, expanded content
- [ ] **Phase 5: Scale + Mobile** — Cross-device sync, mobile app, other languages

## Phase Details

### Phase 1: Engine Skeleton
**Goal**: Prove the adaptive engine works — fingerprint scoring, session scheduling, repair loop, all with stubs and synthetic content
**Depends on**: Nothing (first phase)
**Requirements**: REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06, REQ-07, REQ-08, REQ-09
**Success Criteria** (what must be TRUE):
  1. MistakeFingerprint stores mastery scores with decay and confidence intervals
  2. Session scheduler produces sessions following the 40/30/20/10 recipe
  3. Repair loop generates explanation + micro-drills + retry for any wrong answer
  4. 22 A1 concept nodes exist in the graph with correct prerequisites
  5. AI stub service implements all interfaces with template fallbacks
**Plans**: 1 plan (direct build — Phase 1A)

Plans:
- [x] 01-01: Engine skeleton, types, concept graph, AI stubs, landing page

### Phase 2: Exercise Types + Real Content
**Goal**: Build the exercise layer with full UI and populate the A1 content corpus so real learners can complete adaptive sessions
**Depends on**: Phase 1
**Requirements**: REQ-10, REQ-11, REQ-12, REQ-13, REQ-14, REQ-15, REQ-16, REQ-17, REQ-18, REQ-19, REQ-20, REQ-21
**Success Criteria** (what must be TRUE):
  1. A learner can open the app, start a session, and complete 10+ exercises across 3+ exercise types
  2. Wrong answers trigger the repair loop — explanation shows, micro-drills run, retry appears
  3. Session completion updates the fingerprint — mastery scores change based on results
  4. Dashboard shows today's session CTA with the learner's primary weak concept
  5. Supabase has 500+ tagged A1 sentences queryable by concept, level, and scenario
  6. All 5 exercise types render correctly on mobile and desktop
**Plans**: 6 plans

Plans:
- [ ] 02-01-PLAN.md — Supabase schema + RLS + Vitest scaffold + seed pipeline
- [ ] 02-02-PLAN.md — Exercise components (Translation, FillInBlank, WordOrder dnd-kit, Listening howler, SpeedRound) + ExerciseCard
- [ ] 02-03-PLAN.md — Session flow UI (SessionScreen) + Repair loop UI (ExplanationCard) + /app/session route
- [ ] 02-04-PLAN.md — Hooks layer (useFingerprint, useSession, useExercise) + Zustand stores
- [ ] 02-05-PLAN.md — Dashboard (SessionCTA, ConceptMasteryMap, StreakDisplay) + /app/dashboard route
- [ ] 02-06-PLAN.md — A1 content seed: 500+ sentences across all 22 concepts in content/sentences/

### Phase 3: AI Layer
**Goal**: Integrate WebLLM for on-device AI — real mistake explanations, sentence generation, error detection
**Depends on**: Phase 2
**Requirements**: REQ-22, REQ-23, REQ-24, REQ-25, REQ-26
**Success Criteria** (what must be TRUE):
  1. AI model loads in browser via WebGPU on Chrome/Edge 113+
  2. Mistake explanations are AI-generated (not template) when model is available
  3. Free-writing exercises detect grammar errors via the local model
  4. App falls back to stubs gracefully when model unavailable
**Plans**: TBD

### Phase 4: Production + B1/B2 Content
**Goal**: Expand to speaking/conversation and full B1/B2 curriculum aligned with Norskprøven
**Depends on**: Phase 3
**Requirements**: REQ-27, REQ-28, REQ-29, REQ-30
**Success Criteria** (what must be TRUE):
  1. Learner can complete a full A1→B1 progression path end-to-end
  2. Content is aligned with Norskprøven A2/B1 test format
**Plans**: TBD

### Phase 5: Scale + Mobile
**Goal**: Cross-device sync, mobile app wrapper, multi-language engine
**Depends on**: Phase 4
**Requirements**: REQ-31, REQ-32, REQ-33
**Success Criteria** (what must be TRUE):
  1. Progress syncs across devices with user opt-in
  2. iOS app installable via App Store or TestFlight
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Engine Skeleton | 1/1 | Complete | 2026-05-10 |
| 2. Exercise Types + Real Content | 0/6 | Planned | - |
| 3. AI Layer | 0/TBD | Not started | - |
| 4. Production + B1/B2 | 0/TBD | Not started | - |
| 5. Scale + Mobile | 0/TBD | Not started | - |
