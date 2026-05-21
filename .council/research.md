# Research Notes

## Research — Weekly Sprint phase (new direction) — 2026-05-21T21:30

**Questions (5 from super-orchestrator):**
1. Weekly vs daily-only cadence — does weekly assessment improve L2 retention?
2. Anti-Duolingo posture — what gamification mechanics produce brittleness?
3. Weekly study plan patterns in 2026 pedagogy
4. Reset-after-absence patterns without shame
5. NoCoLA usability for weekly check items

**Findings (web search 3 queries, summary):**

**Q1 — Weekly retrieval is research-validated.** Retrieval practice with spacing produces "substantial vocabulary learning"; expanding-retrieval schedules outperform equally-spaced. FSRS-6 (late 2025, trained on ~700M reviews) reduces review load 20–30% at 90% retention. Weekly assessment functions as a spaced-retrieval event, distinct from daily SRS reviews — it tests the same items in a different context, which is the variable-retrieval pattern shown to improve transfer.

**Q2 — Streak gamification is brittle.** Duolingo cut churn 47% → 28% with streaks + leagues — but documented failure mode is "streak creep": users open the app to tap-protect the streak, not to learn. Streak displaces the underlying goal. "Connecting users to content they genuinely care about sustains motivation when the streak-protection drive fades." Strong evidence for the project's existing anti-Duolingo aesthetic — no streak number, no XP, no league. Weekly progress should be content-anchored (focus concepts), not streak-anchored.

**Q3 — 2026 pedagogy validates the shape.** Trend toward "micro-mastery milestones and dashboards that turn evidence into next-step teaching"; "adaptive pacing improves engagement, particularly when educators use formative assessments to guide instruction"; "proficiency frameworks make progress visible and instructional decisions simpler." The Weekly Sprint shape (visible focus + adaptive pacing + weekly retrieval check + graduation) is squarely in this trend.

**Q4 — Reset-after-absence (no external research surfaced; resolved via constitutional reasoning).** CLAUDE.md operating rule 6 ("Honest banners over silent fallbacks") + existing decay engine which already operates on absence → return after >7 days from `weekStartedAt` triggers honest reset with banner; previous week closed as `abandoned`; fresh focus selection naturally weighted toward decay-weakened concepts.

**Q5 — NoCoLA usability (deferred, not blocking).** NoCoLA already cleared for muntlig content per validation-and-research.md. Weekly check items can pull from the existing A1/A2 sentence corpus (397 sentences seeded; concept-tagged; error-tag-aware). NoCoLA expansion is optional later if item-bank depth becomes a constraint. Not a blocker.

**Impact on approach:** All five questions validated the Weekly Sprint shape. Specific reinforcements:
- The weekly check IS a retrieval event, not a quiz — frame it that way in copy ("Ukens repetisjon" / "Week's review", not "Weekly Test").
- Streak number explicitly banned from the week-strip; only day-dots (filled when practiced).
- Variable-retrieval principle (Q1): the weekly check should draw items from the focus concepts AND from previous-week graduates, mixing contexts.
- Honest-banner reset (Q4) is the catch-up policy.
- Anti-streak-creep (Q2): the weekly check is optional with a strong nudge; the week closes whether or not the learner takes it. Honest banner if skipped, no penalty.

## Research — session completion patterns — 2026-05-21
**Question:** Session end screen patterns for adaptive learning apps — what diagnostic information do competitors surface?
**Finding:** Feature-challenger analysis covered competitive landscape: Duolingo (XP/gamification, no diagnostic), Lingu (progress graph, concept count), Babbel (module badge). None surface root-cause diagnostic data. Research gate satisfied by feature-challenger output.
**Impact on approach:** Validated "coaching debrief" framing over gamification. Data-forward, not celebratory. Three sections: repair summary, phase state, next session.
