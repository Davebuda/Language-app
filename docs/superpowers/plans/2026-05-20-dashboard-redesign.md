# Dashboard Redesign — Feature-First Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat 4-column mode grid and 5-row concept list with individually weighted feature cards (Speak, Write, Read) and a single concepts line, moving stats below features.

**Architecture:** All changes are confined to `src/app/dashboard/page.tsx`. No new components, no new files. The three feature cards are inline JSX. Helpers (topic suggestion, prompt teaser, text count) are computed values added to the existing component body.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Framer Motion, Zustand (fingerprint store)

---

## File Map

| File | Change |
|---|---|
| `src/app/dashboard/page.tsx` | Only file touched — remove MODES grid, add 3 feature cards, reorder sections, collapse concept list |

---

## Task 1: Update imports and remove MODES

**Files:**
- Modify: `src/app/dashboard/page.tsx` (lines 1–32)

- [ ] **Step 1: Replace icon imports and remove MODES constant**

In `src/app/dashboard/page.tsx`, replace the current imports block and MODES constant:

```tsx
// OLD — remove these icons
import { Bell, Play, MessageCircle, BookOpen, PenLine, RefreshCw } from 'lucide-react'

// NEW — replace with
import { Bell, Play, Mic, ArrowRight } from 'lucide-react'
```

Delete the entire `MODES` constant (lines 27–32):
```tsx
// DELETE THIS BLOCK ENTIRELY:
const MODES = [
  { id: 'conversation', href: '/conversation', label: 'Speak',       Icon: MessageCircle },
  { id: 'reading',      href: '/reading',      label: 'Read',        Icon: BookOpen },
  { id: 'journal',      href: '/journal',      label: 'Write',       Icon: PenLine },
  { id: 'recalibrate',  href: '/recalibrate',  label: 'Recalibrate', Icon: RefreshCw },
] as const
```

- [ ] **Step 2: Add constants for feature card data**

After the `PHASE_META` constant (after line 40), add:

```tsx
// Maps concept IDs to suggested conversation topics (Norwegian display labels)
const CONCEPT_TO_TOPIC: Record<string, string> = {
  'v2-word-order':        'daglig rutine',
  'present-tense-verbs':  'daglig rutine',
  'negation-placement':   'daglig rutine',
  'days-of-week':         'daglig rutine',
  'common-questions':     'daglig rutine',
  'noun-gender':          'mat og drikke',
  'indefinite-articles':  'mat og drikke',
  'basic-numbers':        'mat og drikke',
  'personal-pronouns':    'familie',
  'adjective-agreement':  'Norge',
  'prepositions-place':   'Norge',
  'past-tense-regular':   'Norge',
  'modal-verbs':          'jobb',
}

// Texts available per CEFR level (from SEED_TEXTS in reading/page.tsx)
const READING_TEXT_COUNTS: Record<string, number> = {
  A1: 2,
  A2: 2,
  B1: 0,
  B2: 0,
}

// Journal prompts (mirrors PROMPTS in WritingEditor — must stay in sync)
const DASHBOARD_PROMPTS = [
  'Beskriv din ideelle norske helg',
  'Hva liker du best med vinteren?',
  'Skriv om et sted du vil besøke i Norge',
  'Beskriv deg selv på norsk',
  'Hva er din favorittmat, og hvorfor?',
]
```

- [ ] **Step 3: Add helper functions and computed values inside the component**

Inside `DashboardPage()`, after the existing `speakingMins` line (~line 120), add:

```tsx
  // Speak card — suggest a topic based on the learner's weakest active concept
  const suggestedTopic = useMemo(() => {
    const target = activeConcepts.find(
      (c) => c.phase === 'practice' || c.phase === 'consolidation',
    )
    return target ? (CONCEPT_TO_TOPIC[target.id] ?? 'daglig rutine') : 'daglig rutine'
  }, [activeConcepts])

  // Read card — texts at learner's level
  const textsAtLevel = READING_TEXT_COUNTS[levelLabel] ?? 0

  // Write card — today's prompt teaser (first 38 chars + ellipsis)
  const todayPrompt = DASHBOARD_PROMPTS[new Date().getDay() % DASHBOARD_PROMPTS.length]
  const promptTeaser = todayPrompt.length > 38 ? todayPrompt.slice(0, 38) + '…' : todayPrompt
```

Note: `activeConcepts` is already computed earlier in the component via `useMemo`. `suggestedTopic` depends on it, so it must come after.

- [ ] **Step 4: Verify the file compiles**

```bash
cd "C:\Users\daveb\Documents\GitHub\Language-app" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. If `MessageCircle`, `BookOpen`, `PenLine`, `RefreshCw` still appear in JSX below, TypeScript will error — those will be removed in Task 2.

---

## Task 2: Replace mode grid with Speak card

**Files:**
- Modify: `src/app/dashboard/page.tsx` — remove mode grid JSX, add Speak card

- [ ] **Step 1: Delete the mode grid JSX block**

Find and delete this entire block in the JSX (currently after the stats grid):

```tsx
{/* ── Practice modes ── */}
<div className="grid grid-cols-4 gap-2.5">
  {MODES.map((mode) => (
    <Link
      key={mode.id}
      href={mode.href}
      className="nc-glass-cream flex flex-col items-center gap-2 px-2 py-3"
    >
      <mode.Icon size={18} className="text-[var(--nc-text-muted)]" />
      <span className="text-[11px] font-semibold leading-none text-[var(--nc-text-muted)]">
        {mode.label}
      </span>
    </Link>
  ))}
</div>
```

- [ ] **Step 2: Add the Speak card in its place (immediately after Today's Session card)**

Insert this block directly after the closing `</motion.div>` of the Today's Session card (after the `{/* ── Stats ── */}` comment is fine — Speak goes between Session and Stats):

```tsx
        {/* ── Speak — Muntlig ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="nc-glass-elevated p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="nc-label mb-2 text-[var(--nc-text-dim)]">MUNTLIG</div>
              <div className="font-display text-[1.2rem] font-bold leading-tight text-[var(--nc-text)]">
                Snakk med Kari
              </div>
              <p className="mt-1 text-[12px] text-[var(--nc-text-muted)]">
                Foreslått tema:{' '}
                <span className="font-semibold text-[var(--nc-text)]">{suggestedTopic}</span>
              </p>
              {speakingMins > 0 && (
                <p className="mt-1 text-[11px] text-[var(--nc-text-dim)]">
                  {speakingMins} min snakket totalt
                </p>
              )}
            </div>
            <div className="nc-glass flex size-11 shrink-0 items-center justify-center rounded-full">
              <Mic size={18} className="text-[var(--nc-text-muted)]" />
            </div>
          </div>
          <Link
            href="/conversation"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius)] border border-[var(--nc-border-strong)] bg-[rgba(255,255,255,0.06)] px-4 py-2.5 text-[13px] font-bold text-[var(--nc-text)] hover:bg-[rgba(255,255,255,0.10)] transition-colors"
          >
            <Play size={13} />
            Start samtale
          </Link>
        </motion.div>
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/dashboard`. The Speak card should appear between Today's Session and the stats row. Confirm the mic icon and "Snakk med Kari" heading are visible.

---

## Task 3: Add Write and Read cards

**Files:**
- Modify: `src/app/dashboard/page.tsx` — add Write and Read cards after Speak card

- [ ] **Step 1: Add Write card immediately after the Speak card closing tag**

```tsx
        {/* ── Write — Skrivejournal ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10 }}
          className="nc-glass p-4"
        >
          <div className="nc-label mb-2 text-[var(--nc-text-dim)]">SKRIVEJOURNAL</div>
          <p className="text-[13px] italic text-[var(--nc-text-muted)]">
            &ldquo;{promptTeaser}&rdquo;
          </p>
          <Link
            href="/journal"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--nc-text)] hover:text-[var(--nc-text-muted)] transition-colors"
          >
            Skriv i dag <ArrowRight size={12} />
          </Link>
        </motion.div>
```

- [ ] **Step 2: Add Read card immediately after the Write card closing tag**

```tsx
        {/* ── Read — Lesestudio ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="nc-glass p-4"
        >
          <div className="nc-label mb-2 text-[var(--nc-text-dim)]">LESESTUDIO</div>
          <p className="text-[13px] text-[var(--nc-text-muted)]">
            {textsAtLevel > 0
              ? `${textsAtLevel} tekster på ditt ${levelLabel}-nivå`
              : 'Tekster tilgjengelig for lesing'}
          </p>
          <Link
            href="/reading"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--nc-text)] hover:text-[var(--nc-text-muted)] transition-colors"
          >
            Bla gjennom <ArrowRight size={12} />
          </Link>
        </motion.div>
```

- [ ] **Step 3: Verify the order in browser**

Reload `http://localhost:3000/dashboard`. Expected order: Session → Speak → Write → Read → Stats → Concept list. Confirm all three feature cards render without errors.

---

## Task 4: Move stats below features and collapse concept list

**Files:**
- Modify: `src/app/dashboard/page.tsx` — reorder stats, replace concept list

- [ ] **Step 1: Move the stats grid to after the Read card**

The stats block currently sits between Today's Session and the old mode grid. Cut it from its current position and paste it directly after the Read card closing `</motion.div>`.

The stats block to move:

```tsx
        {/* ── Stats — compact 4-column ── */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: 'streak',      value: String(streak),       color: 'var(--nc-red)' },
            { label: 'mins spoken', value: String(speakingMins), color: 'var(--nc-text)' },
            { label: 'accuracy',    value: `${accuracy}%`,       color: 'var(--nc-green)' },
            { label: 'sessions',    value: String(fingerprint?.totalSessionsCompleted ?? 0), color: 'var(--nc-text-muted)' },
          ].map((s) => (
            <div
              key={s.label}
              className="nc-glass-cream px-2.5 py-2 text-center"
            >
              <div
                className="font-display tabular-nums text-[1.25rem] font-bold leading-none tracking-tight"
                style={{ color: s.color }}
              >
                {s.value}
              </div>
              <div className="mt-1 text-[9px] font-medium leading-tight text-[var(--nc-text-dim)]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
```

Note the padding change: `py-3` → `py-2` and font size `text-[1.5rem]` → `text-[1.25rem]` to de-emphasise.

- [ ] **Step 2: Replace the Currently Learning block with a single compact line**

Find the entire `{/* ── Currently learning ── */}` block (the `<div>` containing the section heading, View all link, empty state, and the `.map()` over `activeConcepts`). Replace the whole thing with:

```tsx
        {/* ── Concepts in focus ── */}
        {activeConcepts.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="size-2 shrink-0 rounded-full"
                style={{ background: activeConcepts[0]?.color ?? 'var(--nc-text-dim)' }}
              />
              <span className="truncate text-[12px] text-[var(--nc-text-muted)]">
                {activeConcepts.length} concepts in focus
                {activeConcepts[0] &&
                  ` — ${activeConcepts[0].label}${activeConcepts.length > 1 ? ` +${activeConcepts.length - 1}` : ''}`}
              </span>
            </div>
            <Link
              href="/progress"
              className="shrink-0 text-[11px] font-semibold text-[var(--nc-text-dim)] hover:text-[var(--nc-text)] transition-colors"
            >
              View all →
            </Link>
          </div>
        )}
```

- [ ] **Step 3: Remove unused imports**

Check `PHASE_META` — it was used only by the concept list rows. Now that the list is gone, `PHASE_META` is unused. Delete it entirely (the `const PHASE_META = { ... }` block).

Also verify `Badge` import from `@/components/ui/badge` — it was used by the concept rows. If no longer used, remove it:

```tsx
// Remove this line if Badge is not used elsewhere:
import { Badge } from '@/components/ui/badge'
```

- [ ] **Step 4: Run TypeScript check**

```bash
cd "C:\Users\daveb\Documents\GitHub\Language-app" && npx tsc --noEmit 2>&1
```

Expected: 0 errors. Fix any remaining "unused variable" or "not found" errors before committing.

- [ ] **Step 5: Verify full dashboard in browser at mobile width**

Open `http://localhost:3000/dashboard`. Check the complete order:
1. Header (greeting + level + bell)
2. Today's Session card (red gradient)
3. Speak card (glass-elevated, mic icon, topic suggestion)
4. Write card (glass, italic prompt)
5. Read card (glass, text count)
6. Stats row (4 small chips, de-emphasised)
7. Concepts in focus (single line with count + View all)
8. Recalibration banner (only if >7 days since last session)

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\daveb\Documents\GitHub\Language-app" && git add src/app/dashboard/page.tsx && git commit -m "feat(dashboard): feature-first layout — Speak, Write, Read cards

Replaces 4-column mode icon grid with individually weighted feature
cards. Speak (Muntlig) gets glass-elevated card with mic, topic
suggestion from fingerprint, and speaking minutes. Write surfaces
today's rotating prompt. Read shows text count at learner level.
Stats row moved below features and de-emphasised. Currently Learning
list collapsed to single concepts-in-focus line.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

### Spec coverage
- ✅ Speak card — full width, elevated glass, mic, speaking minutes, topic suggestion
- ✅ Write card — prompt teaser from rotating prompts
- ✅ Read card — text count at level
- ✅ Stats moved below features, de-emphasised
- ✅ Concept list → single compact line
- ✅ Recalibrate removed from feature row (existing conditional banner unchanged)
- ✅ Today's Session card position unchanged

### Placeholder scan
- No TBD, TODO, or vague steps — all code blocks are complete
- `READING_TEXT_COUNTS` hardcoded from known SEED_TEXTS counts (A1:2, A2:2) — intentional, noted in spec

### Type consistency
- `activeConcepts` shape: `{ id, label, phase, score, color }[]` — used correctly in `suggestedTopic` memo and concept line
- `levelLabel` is `string` (`fingerprint?.currentLevel ?? 'A1'`) — used correctly as key into `READING_TEXT_COUNTS`
- `speakingMins` is `number` — used correctly in Speak card conditional
- `promptTeaser` is `string` — rendered directly in Write card
