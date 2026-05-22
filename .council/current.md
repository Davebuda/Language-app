# Task Brief
**Task:** Stream 5 — Weekly Sprint — Phase 6: Dashboard WeekStrip
**Date:** 2026-05-22T01:10
**Status:** IN PROGRESS
**corrections:** 0

---

## What

Add a `WeekStrip` component on the dashboard that surfaces the current `weeklyFocus` concepts plus a CTA linking to `/uke`. This is the first learner-facing surface of the Weekly Sprint — the engine has been silently producing focus and history since Phase 5a; now learners actually see it.

Aesthetic posture: minimalist. **No streak number, no XP, no league.** Per Council decision (anti-Duolingo), use day-dots only (filled when practiced this week — derived from `lastSessionAt` and `weekStartedAt`). Norwegian dominates.

**Files in scope:**
- NEW `src/components/dashboard/WeekStrip.tsx` — the component.
- `src/app/dashboard/page.tsx` — render `<WeekStrip fingerprint={fingerprint} />` in the appropriate slot.

**Out of scope:**
- Any other file. This is intentionally narrow — UI surface + dashboard fold-in only.
- Tests for the component (presentation logic; Playwright smoke in Phase 7).
- New shadcn primitives.
- New dependencies.

---

## How

### 1. `src/components/dashboard/WeekStrip.tsx`

A `'use client'` component, ≤120 lines.

Signature:

```ts
interface WeekStripProps {
  fingerprint: MistakeFingerprint;
}

export function WeekStrip({ fingerprint }: WeekStripProps) { ... }
```

Logic for picking the active graph (same pattern used elsewhere on dashboard):

```ts
const graph = fingerprint.currentLevel === 'A2' ? a2Graph : a1Graph;
```

States the component must handle:

| State | When | Render |
|---|---|---|
| `inactive` | `fingerprint.weekStartedAt === null` | Hide the strip entirely (return `null`). The engine opens the week on the next session start; no need to nag. |
| `empty` | `weeklyFocus.length === 0` (degenerate — engine didn't find eligible focus) | Subtle empty card: "Ukens fokus åpnes snart." — no CTA. |
| `active` | `weekStartedAt` is non-null AND `weeklyFocus.length > 0` | Full strip: header + chips + CTA. |

### 2. Visual structure (active state)

Mobile-first (375px). Reuses existing `nc-*` tokens. Schibsted Grotesk dominates.

```tsx
<section className="nc-panel p-5 mb-4">
  <header className="flex items-center justify-between gap-3 mb-3">
    <div>
      <h2 className="text-xl font-display font-bold text-balance">Denne ukens fokus</h2>
      <p className="text-sm text-nc-text-muted mt-0.5">{daysActiveLabel}</p>
    </div>
    <DayDots fingerprint={fingerprint} />
  </header>

  <ul className="flex flex-wrap gap-2 mb-4">
    {focusConcepts.map((concept) => (
      <li key={concept.id} className="rounded-[0.75rem] bg-[var(--nc-card-soft)] px-3 py-2 text-sm">
        <span className="font-medium text-[var(--nc-text)]">{concept.label}</span>
      </li>
    ))}
  </ul>

  <Link
    href="/uke"
    className="inline-flex items-center gap-2 rounded-[0.9rem] bg-[var(--nc-teal)] px-4 py-2.5 text-sm font-semibold text-[var(--nc-bg)]"
  >
    Ta ukens repetisjon
    <ArrowRight size={16} />
  </Link>
</section>
```

(Adjust class names to match existing dashboard cards — read `DailyLearningCard.tsx` and the dashboard's other panels for the exact patterns. Don't introduce new design tokens.)

### 3. `DayDots` sub-component (inline)

7 dots representing days of the current week (Mon–Sun in Norwegian convention). Today's dot is outlined; past days that had activity are filled.

Activity heuristic: if `fingerprint.lastSessionAt` falls in the current calendar day, today's dot is filled. For previous days within the current week, we DON'T have per-day attendance data right now (only `lastSessionAt`), so all past days within the week show as outlined. Future days show as outlined.

```tsx
function DayDots({ fingerprint }: { fingerprint: MistakeFingerprint }) {
  const dotStates = computeDayDots(fingerprint);
  return (
    <div className="flex items-center gap-1.5">
      {dotStates.map((s, idx) => (
        <span
          key={idx}
          className={`size-1.5 rounded-full ${s === 'filled' ? 'bg-[var(--nc-teal)]' : s === 'today' ? 'ring-2 ring-[var(--nc-teal)]/60 bg-transparent' : 'bg-[var(--nc-border)]'}`}
          aria-label={['mandag','tirsdag','onsdag','torsdag','fredag','lørdag','søndag'][idx]}
        />
      ))}
    </div>
  );
}

function computeDayDots(fp: MistakeFingerprint): Array<'filled' | 'today' | 'pending'> {
  if (!fp.weekStartedAt) return ['pending','pending','pending','pending','pending','pending','pending'];
  const weekStart = new Date(fp.weekStartedAt);
  const today = new Date();
  // Norwegian week starts Monday. Compute weekday index 0..6 from weekStart, but actually
  // we want to show the calendar week the learner is currently in. For simplicity in v1,
  // count days since weekStart.
  const daysSince = Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
  const lastSessionDay = fp.lastSessionAt
    ? Math.floor((new Date(fp.lastSessionAt).getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))
    : -1;
  return Array.from({ length: 7 }, (_, idx) => {
    if (idx === daysSince) return 'today';
    if (idx === lastSessionDay && lastSessionDay >= 0 && lastSessionDay < daysSince) return 'filled';
    return 'pending';
  });
}
```

**Phase boundary note:** the day-dots are visually honest about what data we have — only `lastSessionAt` is tracked, so only one past day can ever be "filled" until per-day attendance is added (v2). That's acceptable; this is not pipeline-dishonest because the dots are clearly minimal.

### 4. `daysActiveLabel`

Short helper inside the component:

```ts
function daysActiveLabel(fp: MistakeFingerprint): string {
  if (!fp.weekStartedAt) return '';
  const weekStart = new Date(fp.weekStartedAt);
  const elapsed = Math.floor((Date.now() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
  if (elapsed === 0) return 'Uka startet i dag';
  if (elapsed === 1) return '1 dag inn i uka';
  return `${elapsed} dager inn i uka`;
}
```

### 5. Dashboard fold-in — `src/app/dashboard/page.tsx`

Find the existing layout (it has `DailyLearningCard`, `DailyWordPack`, `ProgressReassuranceStrip`, etc.). Insert `<WeekStrip fingerprint={fingerprint} />` after `LevelBadge`/welcome row but BEFORE the existing daily cards — the weekly target should land first in the visual hierarchy, daily content after.

Import:

```ts
import { WeekStrip } from '@/components/dashboard/WeekStrip';
```

Render conditionally:

```tsx
{fingerprint ? <WeekStrip fingerprint={fingerprint} /> : null}
```

(The strip itself handles its own internal states; the outer guard is just for the fingerprint not being loaded.)

### 6. Verify

1. `npx tsc --noEmit` — zero errors.
2. `npm test` — 155/155 still pass (no new tests this phase).
3. `git diff HEAD --name-only` — exactly 2 files.
4. Commit: `feat(weekly): Stream 5 Phase 6 — dashboard WeekStrip`.

---

## Model
sonnet — UI scaffolding from a complete spec.

---

## Acceptance Criteria

1. `npx tsc --noEmit` clean.
2. `npm test` 155/155 still pass (no regressions from the dashboard import).
3. `git diff HEAD --name-only` matches the 2-file in-scope list.
4. The component returns `null` when `weekStartedAt === null` (silent inactive state, no nag).
5. The CTA links to `/uke`.
6. No new dependencies installed.
7. Aesthetic: Schibsted Grotesk dominant in the header; Norwegian text; no streak numbers; no gradient backgrounds; uses existing `nc-*` tokens.
8. Commit message follows convention.

---

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- You must touch a file outside the in-scope list to make this compile.
- A shadcn primitive is required for the layout — surface and stop.
- The dashboard page already has a different strip in the intended slot that would conflict.
- TypeScript can't reconcile the `WeekStripProps.fingerprint` type with the dashboard's `useFingerprintStore` shape.

---

## Playwright Checkpoint

**SMOKE** — implementer does NOT run Playwright. Phase 7 audit will run `/baseline-ui` + `/audit` against the new surface plus the existing dashboard. For now, confirm `npx tsc --noEmit` passes and the dashboard imports the component cleanly.
