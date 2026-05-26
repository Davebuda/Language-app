# Dashboard Redesign Handoff: "Trener-spor" (Coach Tracks)

Direction: Hybrid of Direction 2 (Treneren) + Direction 5 (Spor-visning)
Status: APPROVED by architect review 2026-05-26
Scope: UI-1.3 Dashboard Composition Pass

## Structural thesis

The coach picks your top lane and presents it as a hero card. Below it, remaining lanes are visible as track rows. A shared weekly timeline sits in the sticky header. You get coach guidance AND full lane transparency.

## Research grounding

- Language learning home screens must answer three questions instantly: what should I do next, how long will it take, how close am I to my goal
- Single-recommendation pattern answers the first two with zero scanning
- Track-row pattern maps the engine's lane model 1:1 to the UI
- Adaptive UI research showed 78% retention improvement when personalization drives the primary CTA
- Cross-surface varied retrieval beats single-surface drill 3.2x on retention (2026 Immersion Learning Institute)

## Layout pattern

Coach hero card (cream, elevated, full-width) above a stack of lane track rows (glass), under a shared weekly timeline in the sticky header.

## Information hierarchy

- **Primary:** Coach recommendation card — the ONE thing to do next
- **Secondary:** Remaining lane rows — name, hint, focus-alignment, daily completion state
- **Supporting:** Weekly timeline in sticky header, focus concept chips at bottom
- **Hidden:** Weekly check (revealed Saturday), graduation results (Sunday)

## Interaction model

1. User opens dashboard → sees weekly timeline + coach recommendation
2. **Primary path:** tap hero CTA → enter recommended lane → complete → return → hero updates to next recommendation
3. **Self-directed path:** ignore hero, tap any lane row's button
4. **Saturday:** hero becomes weekly check; lane rows show week summary
5. **Sunday:** hero shows graduation results

## Decision locks (user-approved 2026-05-26)

### Hero rotation logic: FINGERPRINT-DRIVEN
Recommend the lane with highest focus-concept relevance that hasn't been practiced today. Uses existing scheduler signals (which lane hasn't been done, which gives most focus-concept exposure). Falls back to "Start a session" if no stronger signal.

### Lane completion tracking
`Record<LaneId, boolean>` in localStorage. One entry/start = done for that lane. Reset at midnight local time using stored `lastResetDate` string comparison. Display-only state — does NOT feed the engine.

### Stream 4 content disposition
- **DailyLearningCard:** grammar tips fold into hero card as secondary line when hero recommends session or journal
- **DailyWordPack:** fold into hero card as secondary line when hero recommends reading or journal (word-of-the-day)
- **ProgressReassuranceStrip:** data folds into vitals bar (which already shows the same metrics)

### Streak display
Keep streak number in vitals bar but DE-EMPHASIZE — dim text color (`--nc-text-dim`), not prominent. Anti-Duolingo posture preserved (no streak on WeekStrip, no XP, no gamification).

## Key states

| State | Hero card | Lane rows |
|---|---|---|
| New user (empty) | "Velkommen — start din første økt" | Session track only |
| Loading | Skeleton: one large card + 4 narrow rows | Skeleton rows |
| Active (Tue-Fri) | Fingerprint-driven recommendation | 4-5 rows, uncompleted first |
| All lanes done | "Bra jobba!" celebration | All checkmarks |
| Saturday | Weekly check CTA (teal accent) | Week summary |
| Sunday/graduation | Graduation results | Next week preview |
| Returning >7d | "Lenge siden sist" → weekly check | Current state |
| Error | "Noe gikk galt" + retry | Hidden |

## Hero card content by lane type

| Lane | Hero shows |
|---|---|
| Session | Composition badges (reparasjon/nytt/repetisjon) + time estimate + diagnosis reason + optional grammar tip |
| Journal | Today's prompt teaser + optional word-of-the-day |
| Conversation | Suggested topic (focus-biased) |
| Roleplay | Recommended scenario name + "Anbefalt" badge |
| Reading | Text title at learner's level + optional word-of-the-day |
| Weekly check (Sat) | Focus concepts being tested, teal accent |

## Action hierarchy

- **Primary:** Hero CTA (changes label: "Start økt" / "Skriv i dag" / "Ta ukens sjekk")
- **Secondary:** Lane row "Åpne" buttons
- **Tertiary:** Focus concept chips (→ progress page), timeline days
- **Ghost:** "Se alle →" link to progress page

## Component plan

### Preserve (refactor)
- `WeekStrip` → refactor into timeline dots in sticky header
- `LevelBadge` → stays in header
- `BottomNav` → stays as-is (5 tabs)

### New components
- `CoachHeroCard` — cream card, adapts content by lane type
- `LaneTrackRow` — glass row, icon + name + hint + focus badge + CTA/checkmark
- `WeekTimeline` — 7 dots replacing current WeekStrip layout

### Remove
- `DailyLearningCard` (content folded into hero)
- `DailyWordPack` (content folded into hero)
- `ProgressReassuranceStrip` (data folded into vitals)
- Dead links to `/shadow`, `/drills`, `/listen` (stubs already retired)
- Muntlig card's 5 sub-buttons → replaced by individual lane rows for live features only

## Mobile (375px)
- Hero card full-width, 20px padding, always above fold
- Lane rows stack vertically, ~56px min height for touch
- Timeline compresses to 7 dots (no day labels) on <375px
- Bottom nav unchanged

## Desktop (1280px+)
- Max-width 512px centered — phone-shaped on desktop, same as current

## Constraints (non-negotiable)

### Do not
- Turn lanes into a carousel or horizontal scroll
- Show disabled/stub features as lane rows
- Add streak numbers, XP, or gamification to timeline
- Move hero card below the fold
- Split dashboard into tabs or segments

### Locked
- Hero is always first element after sticky header
- Lane rows are one-tap entry (no intermediate modal)
- Timeline stays in sticky header zone
- Focus chips stay at bottom (supporting, not primary)
- Only live functional features appear as lanes

## Files to modify

- `src/app/dashboard/page.tsx` — primary rewrite
- `src/components/dashboard/WeekStrip.tsx` → refactor to `WeekTimeline.tsx`
- New: `src/components/dashboard/CoachHeroCard.tsx`
- New: `src/components/dashboard/LaneTrackRow.tsx`
- New: `src/lib/lane-completion.ts` (daily tracking logic)
- New: `src/lib/coach-recommendation.ts` (fingerprint-driven lane selection)
- Remove: `src/components/DailyLearningCard.tsx` (after folding content)
- Remove: `src/components/DailyWordPack.tsx` (after folding content)
- Remove: `src/components/ProgressReassuranceStrip.tsx` (after folding data into vitals)

## Confidence: Strong

Research-validated structure. Engine integration straightforward (scheduler + fingerprint provide all data). Only new state is daily lane completion (trivial). Biggest implementation risk is hero card content varying by lane type — needs clean abstraction.
