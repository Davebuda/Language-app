# Task Brief
**Task:** Listen-and-respond — Muntlig Step 4
**Date:** 2026-05-21
**Status:** IN PROGRESS

---

## What
Build `/listen` — the listen-and-respond muntlig mode. Norwegian question plays (text + optional audio). Learner has a visible 5-second countdown to respond aloud. Transcript is evaluated against expected keywords. Pass/fail recorded to fingerprint.

**Files to create:**
- `src/app/listen/page.tsx`
- `src/components/muntlig/ListenRespondScreen.tsx`
- `src/components/muntlig/ListenRespondExercise.tsx`
- `src/lib/listenRespondContent.ts`

**Files to modify:**
- `src/app/dashboard/page.tsx` — add "Lytt og svar" ghost link to MUNTLIG card (alongside Skygging and Uttaleøvelser)

---

## How

### Content — `src/lib/listenRespondContent.ts`

```ts
export interface ListenRespondQuestion {
  id: string
  question: string         // Norwegian question (large T1 display)
  questionEnglish: string  // Translation shown as subtitle
  expectedKeywords: string[] // Words a valid answer should contain (normalised lowercase)
  hint: string             // Short English coaching tip
  audioUrl?: string        // optional — same pipeline as drills
}

export const LISTEN_RESPOND_QUESTIONS: ListenRespondQuestion[] = [
  { id: 'morning', question: 'Hva gjør du om morgenen?', questionEnglish: 'What do you do in the morning?',
    expectedKeywords: ['stå', 'opp', 'kaffe', 'frokost', 'spiser', 'drikker', 'dusjer'],
    hint: 'Describe your morning routine.' },
  { id: 'where-live', question: 'Hvor bor du?', questionEnglish: 'Where do you live?',
    expectedKeywords: ['bor', 'hus', 'leilighet', 'by', 'oslo', 'norge'],
    hint: 'Say where you live.' },
  { id: 'breakfast', question: 'Hva spiser du til frokost?', questionEnglish: 'What do you eat for breakfast?',
    expectedKeywords: ['spiser', 'brød', 'egg', 'havregrøt', 'frukt', 'yoghurt', 'frokost'],
    hint: 'Name something you eat in the morning.' },
  { id: 'name', question: 'Hva heter du?', questionEnglish: 'What is your name?',
    expectedKeywords: ['heter', 'navn', 'jeg', 'er'],
    hint: 'Say your name.' },
  { id: 'how-are-you', question: 'Hvordan har du det?', questionEnglish: 'How are you doing?',
    expectedKeywords: ['bra', 'fint', 'ok', 'godt', 'takk', 'dårlig'],
    hint: 'Describe how you feel.' },
  { id: 'job', question: 'Hva jobber du med?', questionEnglish: 'What do you do for work?',
    expectedKeywords: ['jobber', 'student', 'lærer', 'lege', 'ingeniør', 'kontor', 'skole'],
    hint: 'Name your job or say you are a student.' },
  { id: 'hobby', question: 'Hva liker du å gjøre på fritiden?', questionEnglish: 'What do you like to do in your free time?',
    expectedKeywords: ['liker', 'lese', 'løpe', 'spille', 'se', 'film', 'musikk', 'trene'],
    hint: 'Name something you enjoy.' },
]
```

**Pass logic:** `matchedKeywords.length >= 1` → pass. Even one relevant Norwegian word = addressed the question. This is generous by design — production under time pressure is hard.

**Match function:** use `normaliseWord` from `speechMatchUtils`. Check if any `expectedKeywords` appears anywhere in the normalised transcript tokens.

---

### `ListenRespondExercise.tsx`

State machine:
```
idle → listening → result
```

**Timer approach (simplified):** `useSpeechRecognition` sets `isListening=true` synchronously at `start()`, so the countdown starts immediately when `phase` transitions to `'listening'` in a `useEffect`. This is fine — the 5-second window is generous, and mic warm-up costs are negligible.

**`hasResolved` ref** — set true on first settlement (timer fires OR final transcript arrives). Guards double-processing race condition.

Phase behaviour:

**idle phase:**
- Question shown as `h2` (1.75rem+ bold, T1 dominant)
- English translation below as muted paragraph
- Audio play button IF `question.audioUrl`
- "Start lytting" button (primary); disabled if `!isSupported`
- Not-supported fallback: "Din nettleser støtter ikke talegjenkjenning. Prøv Chrome."
- Hint shown as `nc-label` below buttons

**listening phase:**
- Pulsing dot + "Lytter…" in nc-red
- Animated countdown bar: 5s, depletes left-to-right using `scaleX` CSS transform driven by a `setInterval` (100ms ticks). NO layout properties — `transform` only.
- Interim transcript shown in italic muted text as it arrives
- "Hopp over" skip button (ghost style) — advances with `correct: false, skipped: true`
- On timer expiry: capture `transcript || interimTranscript`, call `resolveResult(captured)`
- On `isListening === false && transcript` (API gave final result before timer): call `resolveResult(transcript)` if `!hasResolved.current`

**result phase:**
- "Hva du sa" block (same as DrillExercise)
- Keyword match row: show `expectedKeywords` as chips — green if found in transcript, dim if not
- Pass/fail badge (same pattern as DrillExercise)
- "Prøv igjen" button if failed
- "Neste spørsmål" / "Avslutt" button (primary)

---

### `ListenRespondScreen.tsx`

Phases: `'selection' | 'exercising' | 'complete'`

**Selection screen:** List of questions as cards (same pattern as DrillsScreen).
- Show `question.question` as the card title
- Show `question.questionEnglish` as subtitle

**Exercise screen:** Renders `<ListenRespondExercise>` with current question + progress indicator

**Complete screen:** Same pattern as DrillsScreen completion — pass count, breakdown bar, "Prøv et annet spørsmål" + "Tilbake til dashboard"

**Fingerprint integration:**
```ts
const result: ExerciseResult = {
  sessionId: `listen-respond`,
  itemId: `listen-respond-${question.id}`,
  correct,        // matchedKeywords.length >= 1
  userAnswer: transcript,
  correctAnswer: question.expectedKeywords.join(', '),
  timeTakenSeconds: 5,
  conceptId: 'speaking-production',
  sentenceId: undefined,
  errorTag: correct ? undefined : 'listening-recognition',
}
recordResult(result)
```

**Speaking minutes increment** — on session complete (all questions answered), call this directly:
```ts
const { fingerprint, setFingerprint } = useFingerprintStore()
if (fingerprint) {
  const minutesSpoken = scores.length * (5 / 60)  // 5 seconds per question
  setFingerprint({
    ...fingerprint,
    speakingMinutesTotal: (fingerprint.speakingMinutesTotal ?? 0) + minutesSpoken,
    updatedAt: new Date().toISOString(),
  })
}
```
Note: `conceptId: 'speaking-production'` is not in the concept graph — same pattern as drills using `'pronunciation'`. Fine for v1; scheduler ignores unknown concept IDs.

---

### Route — `src/app/listen/page.tsx`

```tsx
import { ListenRespondScreen } from '@/components/muntlig/ListenRespondScreen'
export const metadata = { title: 'Lytt og svar — NorskCoach' }
export default function ListenPage() {
  return <main className="min-h-dvh"><ListenRespondScreen /></main>
}
```

---

### Dashboard link

In `src/app/dashboard/page.tsx`, inside the existing `<div className="mt-4 flex flex-wrap gap-2">` block, add a fourth ghost link after Uttaleøvelser:

```tsx
<Link
  href="/listen"
  aria-label="Øv på å lytte og svare"
  className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius)] border border-[var(--nc-border)] bg-transparent px-4 py-2.5 text-[13px] font-semibold text-[var(--nc-text-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--nc-text)]"
>
  Lytt og svar
</Link>
```

---

## Model
sonnet

## Acceptance Criteria

1. `/listen` route renders with a list of 7 question cards
2. Clicking a question → exercise phase with Norwegian question as T1 dominant element
3. "Start lytting" → countdown bar depletes over 5 seconds; "Lytter…" pulsing dot visible
4. Interim transcript appears while listening
5. After 5 seconds OR final transcript: result phase shows "Hva du sa" + keyword chips
6. Pass chip green, miss chip dim — at least 1 green chip = pass badge
7. recordResult called correctly; `correct` reflects keyword match
8. "Hopp over" button works — advances without crash
9. No-support fallback message visible when `!isSupported`
10. Dashboard MUNTLIG card has "Lytt og svar" link → `/listen`
11. TypeScript: 0 errors
12. 0 console errors on `/listen`

## Blocking Flags
Stop immediately and write `BLOCKED: [reason]` to this file if:
- TypeScript error cannot be resolved within 2 attempts
- The countdown bar uses `left`, `width`, or `max-width` CSS layout properties (must use `scaleX` transform on origin-left div)
- `speakingMinutesTotal` increment pattern is unclear — check how ShadowingExercise increments it and follow the same pattern

## Playwright Checkpoint
yes

- Navigate to `/listen` — confirm 7 question cards render
- Click first question — confirm Norwegian question is visible as large heading
- Confirm "Start lytting" button is present
- Confirm "Lytt og svar" link on `/dashboard` MUNTLIG card navigates to `/listen`
- 0 console errors
- Take screenshots: selection screen + exercise idle state
