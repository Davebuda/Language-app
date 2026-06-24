# Dashboard: count-leads command card + always-visible layout + Bøyningsdrill at all levels

**Date:** 2026-06-24
**Status:** active
**Commits:** `345459e`, `0028d8d`, `a815be6` (deployed to pandoai.no, runtime HEAD `a815be6`)

## Decision
The home/dashboard leads with the production **count** (not the breaker) in a decluttered command card, shows **every** practice/status feature un-collapsed below it, and surfaces the Bøyningsdrill (`/ord`) as a daily lane at **all** levels.

## Context
A user-directed redesign pass (`/redesign-orchestrator`). Real users experienced the app as "a clutter of random Norwegian" — coherence/motivation is the core problem (Vision Contract §6). The shipped command card had grown to **five competing info-blocks** in its dark half (breaker-verdict block + "Dagens mål" kicker + objective title + a 4-chip diagnosis row + the count), which *was* the clutter on the home itself. Five fresh redesign directions (light editorial "Klinikk", coach-thread "Samtale", kinetic "Smie", instrument "Almanakk", evolved "Dirigenten 2.0") were explored as full HTML mockups (`.omc/redesign/dashboard/mockups/`) but the user judged the radical ones "off/worse than the current" and chose to **improve the current** instead.

## Why
- **Count leads, breaker is a chip:** the user explicitly picked the count-as-hero arrangement over breaker-as-hero (both were rendered side-by-side for comparison). The breaker stays visible as a tight "Fanget · {label}" chip with an honest decline, so the moat is still surfaced without competing with the hero number.
- **Declutter = subtract + settle hierarchy:** blocks 1/3/4 said "what you're working on" three different ways. Folding diagnosis to one line + dropping the objective title + replacing the 4-chip row with the breaker chip removes the redundancy that read as clutter — a near-objective fix, low taste-risk.
- **Everything visible (reverses T1.1):** T1.1 ("dashboard-as-conductor") had collapsed the practice menu behind one "Mer øving og status" tap so the home was one prescribed action. The user directed the opposite here — show all features, and make the *layout/design* carry the coherence instead of hiding things. Varied surfaces (cream lane list / cream Muntlig tiles / dark Notatboka / cream stat strip / dark week overview) keep it scannable as "today's plan" rather than a flat menu of doors.
- **Cream is a main canvas color:** the user confirmed cream/white (`#F0F1EC`) is co-equal with the dark base in the dark/lime/cream blocking system, and rejected an all-dark exploration as "ugly". The redesign pulls cream into the lead (the "Fikset" chip) and uses it as a primary surface below.
- **`/ord` at all levels:** the conjugation drill draws from a fixed everyday-verb pool (irregular-first), which is foundational — not genuinely B2-specific — so gating it to B2 hid a useful, working lane. Surfacing it everywhere is honest because the content is the same functional drill at every level (no silent below-level substitution); only the "B2" *label* was dishonest below B2, so it was genericized.

## Rejected alternatives
- **Breaker-as-hero** (big "Kjønn" headline, count demoted) — rendered and offered; user chose count-leads.
- **The five radical directions** (Klinikk light-editorial / Samtale coach-thread / Smie kinetic forge / Almanakk instrument / Dirigenten 2.0) — explored as full mockups; user found A "interesting" but the set "off/worse than the current". Kept on disk as exploration, not shipped.
- **Keep the T1.1 collapse** — rejected by user direction (they want everything seen, not hidden).
- **Keep `/ord` B2-only** — rejected; user wants it discoverable at all levels.

## Consequences
- The dashboard is longer (no collapse) — coherence now depends on the *layout* design holding up, not on hiding surfaces. If it starts to feel like a menu again, fix it with hierarchy/surface-contrast, not by re-collapsing.
- `coreLanes` denominator is 5→6 at all levels (the Bøyningsdrill counts toward daily completion everywhere).
- The diagnosis *depth* (focus dimension + affected concepts + confidence) is reduced to one folded line on the home — the full picture lives at `/progress` ("Se hele bildet ›"). The moat signal is preserved, not deleted.
- `ProductionWall` gains `fixedLabels`; `LaneTrackRow` gains `recommended`. Both optional → no other callers affected.
- The T1.1 "conductor / one-prescribed-action" principle is now scoped to the command card itself (one CTA), not the whole page.
