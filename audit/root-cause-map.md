# NorskCoach — Root-Cause Map (Phase 4)

> Issues grouped by underlying cause, not symptom. Each cluster names the shared mechanism, member issues, and the one structural fix that resolves the cluster.

## Cluster 1 — `notes` field overloaded as both annotation and answer key
**Mechanism:** the corpus author used `Sentence.notes` for two incompatible purposes — an internal authoring comment AND the fill-in-blank answer key — and the grader reads it verbatim. At B2 the annotation form won.
- **Members:** A-01 (Critical).
- **Structural fix:** introduce a dedicated `blank_answer` (or reuse `accepted_answers`) field; migrate B2's 182 rows extracting the leading token; add a CI gate rejecting annotation-shaped `notes`. Grader logic is already correct given a clean field.

## Cluster 2 — Grader can't resolve client-generated / cached content ids
**Mechanism:** `gradeAnswer` (server action) resolves sentence ids only against local JSON or Supabase. AI-generated / auto-cloze content lives in the client cache only → `null` → silent freeze/drop. The grader and the content resolver disagree on what content exists.
- **Members:** S-01 (High), G-04 (Low, the Supabase mapping omits accepted_answers — same boundary, different direction).
- **Structural fix:** pass the already-resolved cached `Sentence` to the grader (grade client-side against cache, or POST the sentence payload) instead of re-resolving by id; ensure the Supabase path maps `accepted_answers`/`accepted_orders`.

## Cluster 3 — AI-graded exercises lack recourse / evidence-quality parity
**Mechanism:** translation got the near-miss recourse (0a99780) but its siblings that use the same exact-match EN grader (speed-round) and the same empty-input path (timeout) did not. Exact-match + sparse alternatives + no recourse = correct answers marked wrong.
- **Members:** G-02 (High, speed-round no recourse), S-02 (Medium, timeout-as-wrong), G-03 (Medium, ~6% accepted_answers coverage), G-05 (Medium, single-order word-order).
- **Structural fix:** extend the recourse/self-attest affordance to every exact-match-graded surface; OR exclude EN-grading at levels with no accepted_answers; populate accepted_answers/acceptedOrders at B1/B2; treat timeouts as low-confidence evidence (no SRS reset).

## Cluster 4 — Pipeline-honesty / Rule-6 gaps (UI asserts more than the engine recorded)
**Mechanism:** several surfaces show a positive/authoritative state that the engine did not actually record — a skip counts as correct, a swallowed repair still advances, a displayed "corrected version" asserts corrections the mastery gate rejected.
- **Members:** S-03 (repair cap silent swallow), S-04 (skip=correct), AI-01 (journal corrected-text shows unverified corrections), R-02 (reading silent below-level substitution).
- **Structural fix:** carry an explicit `skipped`/`deferred`/`unverified` flag through results and display; never let a UI claim exceed the recorded truth (the project's standing Rule 8).

## Cluster 5 — Write-before-navigate / non-reactive state snapshots (persistence races)
**Mechanism:** an async persistence write is not awaited before the consumer reads, or a one-time non-reactive store snapshot is taken before hydration.
- **Members:** D-01 (Medium, onboarding seed not awaited → level reset), D-02 (Low, conversation A1 flash), AI-02 (Low, convSource flicker).
- **Structural fix:** await the seed write (or make bootstrap skip the reload when the store already holds the user's fp); read reactive selectors, not `getState()` snapshots.

## Cluster 6 — Soft-stall state-machine dead-ends
**Mechanism:** the deliberate removal of auto-skip (good, Rule 6) left no per-item honest skip — an unresolvable item or an ungradeable retry has no forward exit except abandoning the session.
- **Members:** S-05 (infinite skeleton), S-01 (generated-retry freeze, also Cluster 2).
- **Structural fix:** an honest per-item "vi hopper over denne — ingen innhold" skip that advances without a positive write.

## Cluster 7 — Discoverability / promise drift (orphan routes)
**Mechanism:** built surfaces never wired into navigation; docs claim links that don't exist.
- **Members:** R-01 (High, muntlig), R-04 (Low, analytics), R-07 (Low, /ord), and the doc claim in CLAUDE.md.
- **Structural fix:** add a dashboard Muntlig section (or BottomNav entry) linking listen/drills/shadow; link or retire analytics; reconcile CLAUDE.md.

## Cluster 8 — Unguarded dev/ops surface in production
**Mechanism:** dev-only tooling and weak abuse controls ship to prod.
- **Members:** E-01 (Medium, /eval drives Groq spend), AI-04 (Low, soft rate limiter).
- **Structural fix:** `NODE_ENV` guard / route exclusion for `/eval`; durable rate limiting if abuse matters.

## Cluster 9 — Accessibility (interactive non-buttons, missing names)
**Mechanism:** click handlers on `<span>`/icon-only controls without role/keyboard/aria.
- **Members:** R-05 (Medium), R-03 (Low, also cosmetic).
- **Structural fix:** real `<button>`s + `aria-label` + keyboard handlers; axe/Lighthouse gate.

## Cluster 10 — Cosmetic affordances not wired to logic
**Mechanism:** interactive styling promising behavior that resolves to a placeholder.
- **Members:** R-03 (reading word-tap → "kommer snart" on every word), R-06 (login copy references a mechanism not used).
- **Structural fix:** gate the affordance behind real behavior or remove it; fix stale copy.

---
### Cluster → severity heat
| Cluster | Top severity | # issues |
|---|---|---|
| 1 `notes` overload | **Critical** | 1 |
| 2 grader↔generated content | High | 2 |
| 3 AI-grade recourse parity | High | 4 |
| 7 orphan routes | High | 3 |
| 4 pipeline-honesty | Medium | 4 |
| 5 persistence races | Medium | 3 |
| 6 soft-stall dead-ends | Medium | 2 |
| 8 unguarded ops | Medium | 2 |
| 9 accessibility | Medium | 2 |
| 10 cosmetic dead affordance | Low | 2 |
