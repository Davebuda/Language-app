# Council Decision Log

## 2026-05-21 BRAINSTORM — sequence conflict: P1-7 vs session completion elevation

**Options considered:**
1. Follow P1 order — do P1-7 (recalibration trigger banner) first
   - Affects: users who hit recalibration modal without warning (rare flow, multi-session depth)
   - Moat trace: none — UX politeness fix
2. Elevate session completion (P1-13 + feature-challenger spec)
   - Affects: every user who completes any session (highest-frequency touchpoint)
   - Moat trace: strong — repair loop summary, phase indicators, SRS preview make the diagnostic intelligence visible for the first time

**Chosen:** Option 2 — session completion elevation.
**Why:** Feature-challenger analysis (same session) established that the session complete screen is the single highest-leverage improvement: it makes the moat visible. P1-7 affects a rarely-reached recalibration flow. Session completion affects every user after every session. The feature-challenger output IS the analysis-first step per CLAUDE.md rule 2. User invoking /council after that analysis is the approval signal.

## 2026-05-21 RESTRUCTURE — session completion elevated above P1-7 through P1-12
**What changed:** Session completion build added as next task, before remaining P1 items.
**Why:** Feature-challenger analysis elevated it based on frequency (every session) and moat visibility (repair loop, phase, SRS all invisible at highest-stakes moment).
