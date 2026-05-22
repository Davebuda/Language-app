# Task Brief
**Task:** Fix React #418 hydration mismatch on /dashboard (Phase 7 P1 follow-up)
**Date:** 2026-05-22T01:50
**Status:** APPROVED 2026-05-22T01:55 — commit cf1fcc3, Playwright PASS, report at `.council/reports/2026-05-22-0150-react418-fix.md`
**corrections:** 0

---

## What

Phase 7 smoke check (`.council/reports/2026-05-22-0115-phase7-smoke.md`) caught a `Minified React error #418` (hydration text-mismatch) on `/dashboard` at both 375px and 1280px breakpoints. The error is real on production — confirmed via Chrome DevTools earlier in this session against `https://pandoai.no/`.

Two confirmed sources in `src/app/dashboard/page.tsx`:
1. `todayFormatted()` (line 65–69) renders `new Date().toLocaleDateString('nb-NO', ...)` directly into JSX. Server-side rendering produces the date in the server's locale; client-side rendering produces it in the browser's locale. If the server runs in UTC and the client is in Europe/Oslo, the day name (or even the day number near midnight) can diverge.
2. `getStreak()` (line 12 of `src/lib/streak.ts`) returns `0` when `typeof window === 'undefined'`, then returns the localStorage value once mounted on the client. The dashboard renders `String(streak)` directly into a stats card, producing "0" on the server and (e.g.) "5" on the client.

Both are classic SSR-vs-CSR text divergences. Standard fix: gate dynamic values behind `useEffect` so the initial server render and initial client render produce identical HTML, then update on the client after mount.

**Files in scope:**
- `src/app/dashboard/page.tsx` — only file changed.

**Out of scope:**
- `src/lib/streak.ts` — keep its server-safe `return 0` guard; the fix lives in the consumer.
- Any other dashboard logic (scheduler, plan generation, level-up celebration, fingerprint sync). Do not touch.
- Other pages where #418 may also occur (e.g. landing) — separate task if reproduced.
- New helper extractions — inline the SSR-safe gate. Two `useState`/`useEffect` pairs is enough.
- New dependencies.

---

## How

### 1. Add SSR-safe state for the date string

Inside `DashboardPage` near the existing `useState` calls:

```ts
const [todayLabel, setTodayLabel] = useState('')
useEffect(() => {
  setTodayLabel(
    new Date().toLocaleDateString('nb-NO', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
  )
}, [])
```

Replace the `{todayFormatted()}` call site (line 206) with `{todayLabel}`. Initial server render emits an empty string; client first render also emits an empty string (matches → no hydration warning); a frame later the real date appears.

Delete the standalone `todayFormatted()` function — it's no longer referenced.

### 2. Add SSR-safe state for the streak

Inside `DashboardPage`:

```ts
const [streak, setStreak] = useState(0)
useEffect(() => {
  setStreak(getStreak())
}, [])
```

Replace the `const streak = getStreak()` line (78) with the state declaration above. The stats card at line 220 (`String(streak)`) continues to work unchanged. Initial server render emits "0"; client first render emits "0" too (matches); after the effect runs the real streak appears.

### 3. Verify

1. `npx tsc --noEmit` — zero errors.
2. `npm run dev` — start dev server, open `http://localhost:3000/dashboard`, open DevTools console. Confirm zero `Minified React error #418` (in production build) OR the unminified "Hydration failed because the server rendered text..." (in dev).
3. Refresh several times to make sure neither value flickers in a way that causes visible UI shift beyond the first paint.
4. `git diff HEAD --name-only` — exactly 1 file.

### 4. Commit

```
fix(dashboard): SSR-safe gate todayLabel + streak to clear React #418

Move new Date() localization and localStorage streak read into
useEffect so server and client first-render produce identical HTML.
Both values populate after hydration. Phase 7 P1 follow-up.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Model
sonnet — small, well-defined refactor from a complete spec.

---

## Acceptance Criteria

1. `npx tsc --noEmit` clean.
2. `git diff HEAD --name-only` returns exactly `src/app/dashboard/page.tsx`.
3. `todayFormatted()` function is deleted (replaced by inline state).
4. Both `todayLabel` and `streak` initialize to stable defaults that match SSR output (empty string and 0).
5. No `console.log` left behind.
6. No new dependencies.
7. Visit `/dashboard` in dev — console shows no React #418 (dev surfaces it as a full "Hydration failed because the server rendered text..." warning, not minified).
8. Commit message matches the template above.

---

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- A file outside the in-scope list needs modification to compile.
- The fix doesn't clear the hydration warning in dev (means there's a third mismatch source we missed — surface and stop for re-scoping).
- Removing `todayFormatted()` breaks something else (it shouldn't — grep confirms only one call site).
- TypeScript complains that `useState<string>('')` is too strict for `toLocaleDateString` return type (unlikely; surface if so).

---

## Playwright Checkpoint

**SMOKE** — after the implementer ships:
1. Navigate `https://pandoai.no/dashboard` (post-deploy) OR `http://localhost:3000/dashboard` (pre-deploy).
2. Capture `mcp__playwright__browser_console_messages` at `level: 'error'`.
3. Pass criteria: zero entries containing `Minified React error #418` or `Hydration failed`.
4. Capture screenshot at 1280px to confirm the dashboard still renders date and streak after mount.
