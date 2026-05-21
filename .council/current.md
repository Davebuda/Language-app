# Task Brief
**Task:** Dashboard — merge DailyLearningCard into Today's Session card
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## Council decision (logged)
Unified "Today" block: grammar sentence embedded as secondary section of the session card. DailyLearningCard removed from dashboard (stays for landing page). Eliminates content duplication; preserves scheduler signal; Norwegian sentence visible before the user clicks Start.

---

## What

**Modify:** `src/app/dashboard/page.tsx`
- Add a grammar sentence section at the bottom of the TODAY'S SESSION card
- Remove the standalone `<DailyLearningCard />` and its import from the dashboard
- `src/components/DailyLearningCard.tsx` is NOT deleted — still used on the landing page

---

## How

Read `src/app/dashboard/page.tsx` first.

### Step 1 — Add grammar data

At the top of the component body (after existing hooks), add:

```tsx
const dailyRule = getDailyRule()
```

Import at top of file:
```tsx
import { getDailyRule } from '@/lib/dailyContent'
```

### Step 2 — Extend the session card

Find the TODAY'S SESSION `motion.div` (className includes `nc-gradient-red`). After the composition badges block (`flex flex-wrap gap-2` with remediation/review/new chips), add inside the same div:

```tsx
{/* ── Grammar moment ── */}
<div className="mt-4 border-t border-white/15 pt-4">
  <p className="font-display text-[1.35rem] font-bold leading-tight text-white text-balance">
    {dailyRule.norwegianExample}
  </p>
  <p className="mt-1.5 text-[11px] text-white/55 leading-relaxed">
    {dailyRule.ruleExplanation}
  </p>
</div>
```

### Step 3 — Remove standalone DailyLearningCard from dashboard

1. Remove `import { DailyLearningCard } from '@/components/DailyLearningCard'`
2. Remove the `{/* ── Daily Learning Card ── */}` section block and `<DailyLearningCard />` element
3. DailyWordPack and ProgressReassuranceStrip stay in place

---

## Model
sonnet

## Acceptance Criteria

1. Norwegian sentence (`dailyRule.norwegianExample`) renders inside the red session card, below the composition badges
2. Rule explanation renders below the sentence in `text-white/55`
3. No standalone `<DailyLearningCard />` on the dashboard
4. `DailyLearningCard` import removed from dashboard
5. `src/components/DailyLearningCard.tsx` file NOT deleted
6. DailyWordPack and ProgressReassuranceStrip positions unchanged
7. No TypeScript errors

## Blocking Flags

Stop and write `BLOCKED: [reason]` if:
- The session card structure differs from what's described above
- Any TypeScript error is introduced
- `getDailyRule` import conflicts with something

## Playwright Checkpoint
yes

- Navigate to `/dashboard` — confirm Norwegian sentence visible inside the red session card
- Confirm no standalone DailyLearningCard between Lesestudio and DailyWordPack
- Confirm DailyWordPack and ProgressReassuranceStrip still render
- 0 console errors
- Take screenshot
