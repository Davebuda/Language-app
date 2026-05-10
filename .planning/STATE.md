# Project State

## Project Reference

**Project:** NorskCoach — diagnostic Norwegian language learning web app
**Core value:** Diagnosis + Scheduling + Remediation beats lesson-based apps for any motivated learner
**Current focus:** Phase 2 — Exercise Types + Real Content

## Current Position

Phase: 2 of 5 (Exercise Types + Real Content)
Plan: 0 of 6 in current phase
Status: Ready to execute
Last activity: 2026-05-10 — Phase 2 planned. 6 PLAN.md files across 3 waves. Research complete, plan checker passed (2 iterations). Wave 1: schema+seed; Wave 2: exercises+hooks+content; Wave 3: session UI+dashboard.

Progress: [██░░░░░░░░] 10%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: —
- Total execution time: 1 session

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Engine Skeleton | 1/1 | Complete |
| 2. Exercise Types | 0/6 | Planned |

## Accumulated Context

### Decisions

- Phase 1: Web app first (Next.js PWA), iOS native later — avoids $99/yr Apple Developer account
- Phase 1: Azure (Static Web Apps, Entra External ID, Blob Storage) + Supabase PostgreSQL — ~$0-12/yr total
- Phase 1: Auth from day one via Azure Entra External ID
- Phase 1: Annual budget ~$0-12/year (all free tiers)
- Phase 1: AI via WebLLM (browser WebGPU) in Phase 3 — zero per-user cost
- Phase 1: Stubs power everything in Phase 2 — no real AI needed until Phase 3

### Blockers/Concerns

- Semgrep hook fires on every file write (missing SEMGREP_APP_TOKEN) — noise only, not blocking. Fix: `semgrep login --force`
- NextJS workspace root warning (detects parent package-lock.json) — cosmetic, add `outputFileTracingRoot` to next.config.ts to silence

### Pending Todos

- Set up Azure Static Web Apps deployment
- Create Supabase project and add env vars to .env.local
- Configure Azure Entra External ID tenant

## Session Continuity

Last session: 2026-05-10
Stopped at: Phase 1 complete and committed. .planning/ bootstrapped. Ready to plan Phase 2.
Resume file: None
