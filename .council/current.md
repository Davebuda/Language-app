# Task Brief
**Task:** P1-12 — Conversation end: add summary state before returning to setup
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## What

`src/app/conversation/page.tsx` — when "Avslutt" is clicked, `persistSessionEnd()` is called and then phase is immediately set back to `'setup'`. There is no summary, no acknowledgement that the session was saved, and no moment for the user to know what they accomplished.

**One file to change:** `src/app/conversation/page.tsx`

---

## How

**Read the file first.**

### Step 1 — Extend the phase type

Find:
```ts
const [phase, setPhase] = useState<'setup' | 'chat'>('setup')
```

Change to:
```ts
const [phase, setPhase] = useState<'setup' | 'chat' | 'summary'>('setup')
```

### Step 2 — Change "Avslutt" to go to summary, not setup

Find the Avslutt button click handler (approximately line 405):
```tsx
onClick={() => { void persistSessionEnd(); setPhase('setup'); window.speechSynthesis?.cancel() }}
```

Change to:
```tsx
onClick={() => { void persistSessionEnd(); window.speechSynthesis?.cancel(); setPhase('summary') }}
```

### Step 3 — Add summary phase ref data

Near the top of the component, after the existing `useRef` declarations, add three refs to snapshot the session data at end time:
```tsx
const summaryTurnCountRef = useRef(0)
const summaryErrorCountRef = useRef(0)
const summaryTopicRef = useRef<string>('')
```

In the Avslutt handler, populate these refs BEFORE changing phase:
```tsx
onClick={() => {
  summaryTurnCountRef.current = turnIndexRef.current
  summaryErrorCountRef.current = errorCountRef.current
  summaryTopicRef.current = selectedTopic
  void persistSessionEnd()
  window.speechSynthesis?.cancel()
  setPhase('summary')
}}
```

### Step 4 — Add summary phase render block

In the AnimatePresence / phase conditional section, find where `phase === 'chat'` is rendered (approximately line 390). After that block's closing tag, add a new `phase === 'summary'` block:

```tsx
{phase === 'summary' && (
  <motion.div
    key="summary"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.25 }}
    className="flex flex-1 flex-col items-center justify-center gap-6 px-2"
  >
    <div className="nc-glass w-full max-w-sm p-6 text-center">
      <div className="nc-label mb-4">Samtale fullført</div>
      <p className="text-2xl font-bold text-nc-text">
        {TOPICS.find((t) => t.id === summaryTopicRef.current)?.emoji}{' '}
        {TOPICS.find((t) => t.id === summaryTopicRef.current)?.label ?? 'Samtale'}
      </p>
      <div className="mt-5 flex justify-center gap-8 text-sm text-nc-text-muted">
        <div className="text-center">
          <div className="text-2xl font-bold text-nc-text">{summaryTurnCountRef.current}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wider">utvekslinger</div>
        </div>
        {summaryErrorCountRef.current > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-nc-text">{summaryErrorCountRef.current}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wider">rettelser</div>
          </div>
        )}
      </div>
      {user && (
        <p className="mt-4 text-[12px] text-nc-text-dim">Fremgangen din er lagret.</p>
      )}
    </div>

    <div className="flex w-full max-w-sm flex-col gap-3">
      <button
        onClick={() => setPhase('setup')}
        className="nc-button-primary w-full py-3 text-sm font-medium"
      >
        Ny samtale
      </button>
      <button
        onClick={() => router.push('/dashboard')}
        className="w-full py-3 text-sm font-medium text-nc-text-dim transition-colors hover:text-nc-text"
      >
        Til dashboard
      </button>
    </div>
  </motion.div>
)}
```

**Note on `user`:** The conversation page already imports `user` from Supabase auth — check how it's accessed in the existing code and use the same variable. If `user` is a local state variable from a `useSupabaseUser` hook or similar, use it directly.

**Note on `TOPICS` and `selectedTopic`:** Both are already in scope in the component. Use them as-is.

---

## Model
sonnet

## Acceptance Criteria

1. Clicking "Avslutt" shows a summary screen (not immediate return to setup)
2. Summary shows: topic name + emoji, turn count ("N utvekslinger"), corrections count if > 0
3. Summary shows "Fremgangen din er lagret." if user is authenticated
4. "Ny samtale" button returns to setup phase
5. "Til dashboard" button navigates to `/dashboard`
6. No TypeScript errors introduced

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- `user` is not in scope in the component — note how auth is accessed
- `nc-button-primary` class does not exist (check globals.css)
- Any TypeScript error is introduced

## Playwright Checkpoint
yes

What to test:
- Navigate to `/conversation`, start a conversation, click Avslutt
- Verify summary screen appears with topic, turn count, buttons
- Verify "Til dashboard" navigates to /dashboard
- Verify "Ny samtale" returns to setup phase
