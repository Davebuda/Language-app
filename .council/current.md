# Task Brief
**Task:** P1-5 + P1-6 — Fix SSR hydration flash and wrong concept graph on Progress/Profile
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## What

Three files need changes:
1. `src/app/progress/page.tsx` — add status guard (P1-5), fix a1-only graph (P1-6), fix hardcoded "A1" label
2. `src/app/profile/page.tsx` — add status guard for level/mastery stats (P1-5), fix a1-only graph (P1-6)
3. `src/components/journal/WritingEditor.tsx` — fix SSR hydration for SpeechRecognition (bonus — same pattern discovered in P1-4 session)

## Root Causes

**P1-5 (hydration flash):** Both pages read `fingerprint?.currentLevel ?? 'A1'`. On first render (SSR or before IndexedDB loads), `fingerprint` is null → shows "A1". After IndexedDB hydration, `fingerprint.currentLevel` may be "A2". User sees a flash from A1 to actual level.

**P1-6 (wrong graph):** `progress/page.tsx` and `profile/page.tsx` always import and use `a1-graph.json` — they never look at `fingerprint.currentLevel` to select the correct graph. An A2 user always sees the A1 concept list.

**WritingEditor SSR mismatch (bonus):** `const hasSpeechAPI = !!getSpeechCtor()` runs at module scope and differs between server (no `window`) and client (has `window.SpeechRecognition`). Server renders textarea, client renders voice buttons → React hydration error logged in Playwright P1-4 session.

## How

### Fix 1: `src/app/progress/page.tsx`

**Read the file first.**

At the top, change the graph imports from:
```ts
import conceptGraphJson from '@content/concepts/a1-graph.json'
const conceptGraph = conceptGraphJson as ConceptGraph
```
to:
```ts
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'
```

Change the store read from:
```ts
const { fingerprint } = useFingerprintStore()
```
to:
```ts
const { fingerprint, status } = useFingerprintStore()
```

After the store read, add the graph selection and level label:
```ts
const conceptGraph = (fingerprint?.currentLevel === 'A2' ? a2GraphJson : a1GraphJson) as ConceptGraph
const levelLabel = fingerprint?.currentLevel ?? 'A1'
```

Add a loading guard immediately after (before computing `masteredIds`):
```tsx
if (status === 'loading') {
  return (
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-6 pt-5">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/5" />
        <div className="h-4 w-64 animate-pulse rounded bg-white/5" />
      </main>
      <BottomNav active="progress" />
    </div>
  )
}
```

In the JSX, replace the hardcoded level label. Find this text:
```tsx
A1 — {masteredCount} of {totalCount} in maintenance or consolidation
```
Replace with:
```tsx
{levelLabel} — {masteredCount} of {totalCount} in maintenance or consolidation
```

### Fix 2: `src/app/profile/page.tsx`

**Read the file first.**

At the top, change the graph imports:
```ts
import conceptGraphJson from '@content/concepts/a1-graph.json'
const conceptGraph = conceptGraphJson as ConceptGraph
```
to:
```ts
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'
```

Change the store read from:
```ts
const { fingerprint, setFingerprint } = useFingerprintStore()
```
to:
```ts
const { fingerprint, setFingerprint, status } = useFingerprintStore()
```

After the store read, add the graph selection:
```ts
const conceptGraph = (fingerprint?.currentLevel === 'A2' ? a2GraphJson : a1GraphJson) as ConceptGraph
```

In the level stat display (grid of 3 stats), change the Nivå value from:
```tsx
{ label: 'Nivå', value: fingerprint?.currentLevel ?? 'A1', tone: 'text-[var(--nc-red)]' },
```
to:
```tsx
{ label: 'Nivå', value: status === 'loading' ? '–' : (fingerprint?.currentLevel ?? 'A1'), tone: 'text-[var(--nc-red)]' },
```

In the "Nåværende nivå" section, change:
```tsx
{LEVEL_LABELS[fingerprint?.currentLevel ?? 'A1']}
```
to:
```tsx
{status === 'loading' ? '–' : (LEVEL_LABELS[fingerprint?.currentLevel ?? 'A1'] ?? 'A1')}
```

### Fix 3: `src/components/journal/WritingEditor.tsx`

**Read the file first.**

Change the `hasSpeechAPI` from a module-level constant to a state variable with a useEffect:

Find:
```tsx
const hasSpeechAPI = !!getSpeechCtor()
const [inputMode, setInputMode] = useState<'voice' | 'text'>(hasSpeechAPI ? 'voice' : 'text')
```

Replace with:
```tsx
const [hasSpeechAPI, setHasSpeechAPI] = useState(false)
const [inputMode, setInputMode] = useState<'voice' | 'text'>('text')
```

After the existing `useRef` for `recognitionRef`, add a `useEffect`:
```tsx
useEffect(() => {
  const ctor = getSpeechCtor()
  if (ctor) {
    setHasSpeechAPI(true)
    setInputMode('voice')
  }
}, [])
```

This makes SSR and initial client render both start with `hasSpeechAPI = false` (text mode), then client updates after mount. No hydration mismatch.

## Model
sonnet

## Acceptance Criteria
1. `/progress` page renders a loading skeleton while `status === 'loading'`; once ready, shows correct level label and correct graph (A2 user sees A2 concepts)
2. `/profile` level stat shows `–` while loading, then actual level (no A1→A2 flash)
3. "Nåværende nivå" section shows `–` while loading, then actual level label
4. `/journal` no longer logs a React hydration error on load
5. No TypeScript errors introduced

## Blocking Flags
Stop immediately and write `BLOCKED: [reason]` to this file if:
- Any TypeScript error is introduced (especially from the `as ConceptGraph` cast changing)
- You cannot locate a specific line described — ask me to re-read the file

## Playwright Checkpoint
yes

What to test:
- Navigate to `/progress` — verify page loads without a blank flash; if fingerprint empty, shows skeleton then content
- Navigate to `/profile` — verify level stat shows correctly (no A1 flash)
- Navigate to `/journal` — verify no hydration error in console after page loads
