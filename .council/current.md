# Task Brief
**Task:** Muntlig Step 5 — Scripted Roleplay
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21T11:32

---

## What

Three new files. No changes to any existing file except a route link on the dashboard (already has a "Start samtale" button under MUNTLIG — the `/roleplay` route needs to exist so the "Skygging" / "Uttaleøvelser" / "Lytt og svar" / "Skripted samtale" entry on the dashboard resolves).

### Files to create:
1. `src/lib/roleplayContent.ts` — scenario definitions (3 scenarios, branching turns)
2. `src/components/muntlig/RoleplayScreen.tsx` — full UI (selection → conversation → complete)
3. `src/app/roleplay/page.tsx` — server component page wrapper

---

## How

### Content structure (`src/lib/roleplayContent.ts`)

```ts
export interface RoleplayTurn {
  id: string
  character: string          // Norwegian line spoken by the character
  characterEnglish: string   // English subtitle
  expectedKeywords: string[] // normalised lowercase — any one match = pass at default threshold
  hint: string               // coaching tip shown on fallback
  modelAnswer: string        // "Try saying: ..." shown on retry
}

export interface RoleplayScenario {
  id: string
  title: string              // Norwegian
  titleEnglish: string
  setting: string            // English context sentence shown before start
  characterName: string
  turns: RoleplayTurn[]
}
```

Three scenarios. Exact content:

**Scenario 1 — "Bestille kaffe" (Ordering coffee)**
- characterName: "Barista"
- setting: "You're at a café in Oslo. The barista greets you."
- turns (4):
  1. `{ id: 'greet', character: 'Hei! Hva kan jeg hjelpe deg med?', characterEnglish: 'Hi! What can I help you with?', expectedKeywords: ['kaffe','latte','cappuccino','espresso','vil','ha','gjerne'], hint: 'Order something to drink.', modelAnswer: 'Jeg vil gjerne ha en kaffe, takk.' }`
  2. `{ id: 'size', character: 'Stor eller liten?', characterEnglish: 'Large or small?', expectedKeywords: ['stor','liten','medium'], hint: 'Choose a size.', modelAnswer: 'Stor, takk.' }`
  3. `{ id: 'name', character: 'Hva er navnet ditt?', characterEnglish: 'What is your name?', expectedKeywords: ['heter','navn','jeg','er'], hint: 'Tell them your name.', modelAnswer: 'Jeg heter [ditt navn].' }`
  4. `{ id: 'thanks', character: 'Det blir femti kroner. Ha en fin dag!', characterEnglish: "That's fifty kroner. Have a nice day!", expectedKeywords: ['takk','tusen','deg','også','ha'], hint: 'Say thank you.', modelAnswer: 'Takk! Ha det bra.' }`

**Scenario 2 — "Be om veibeskrivelse" (Asking for directions)**
- characterName: "Forbipasserende"
- setting: "You're lost in the city. You stop a passerby."
- turns (4):
  1. `{ id: 'excuse', character: 'Hei, kan jeg hjelpe deg?', characterEnglish: 'Hi, can I help you?', expectedKeywords: ['unnskyld','hjelp','stasjon','togstasjon','buss','veien','hvor'], hint: 'Ask for directions to somewhere.', modelAnswer: 'Unnskyld, hvor er togstasjonen?' }`
  2. `{ id: 'understand', character: 'Togstasjonen er rett frem og til venstre ved lyskrysset.', characterEnglish: 'The train station is straight ahead and to the left at the traffic light.', expectedKeywords: ['forstår','ok','takk','skjønner','frem','venstre'], hint: 'Confirm you understand.', modelAnswer: 'Ok, rett frem og til venstre. Takk!' }`
  3. `{ id: 'howfar', character: 'Det tar omtrent fem minutter å gå.', characterEnglish: "It's about a five minute walk.", expectedKeywords: ['takk','minutter','langt','greit','bra'], hint: 'Respond to the time estimate.', modelAnswer: 'Fem minutter — perfekt, takk så mye.' }`
  4. `{ id: 'bye', character: 'Bare hyggelig! God tur!', characterEnglish: "You're welcome! Safe travels!", expectedKeywords: ['takk','ha','det','bra','hyggelig'], hint: 'Say goodbye.', modelAnswer: 'Takk! Ha det bra!' }`

**Scenario 3 — "Introdusere deg selv" (Introducing yourself)**
- characterName: "Kollega"
- setting: "First day at a new job. A colleague introduces themselves."
- turns (4):
  1. `{ id: 'meet', character: 'Hei! Jeg heter Kari. Er du ny her?', characterEnglish: "Hi! I'm Kari. Are you new here?", expectedKeywords: ['heter','hei','ja','ny','navn','jeg'], hint: 'Introduce yourself.', modelAnswer: 'Hei! Jeg heter [ditt navn]. Ja, jeg er ny.' }`
  2. `{ id: 'from', character: 'Hyggelig å møte deg! Hvor er du fra?', characterEnglish: 'Nice to meet you! Where are you from?', expectedKeywords: ['fra','bor','land','england','usa','norge','australia'], hint: 'Say where you are from.', modelAnswer: 'Jeg er fra England.' }`
  3. `{ id: 'work', character: 'Spennende! Hva jobber du med her?', characterEnglish: 'Interesting! What will you be doing here?', expectedKeywords: ['jobber','arbeider','avdeling','prosjekt','design','kode','salg'], hint: 'Describe your role.', modelAnswer: 'Jeg jobber med design.' }`
  4. `{ id: 'coffee', character: 'Kjempebra! Vil du ha en kopp kaffe?', characterEnglish: 'Great! Would you like a cup of coffee?', expectedKeywords: ['ja','takk','gjerne','kaffe','vil','ha'], hint: 'Accept or politely decline.', modelAnswer: 'Ja, gjerne! Tusen takk.' }`

Export:
```ts
export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [ /* three scenarios above */ ]
```

---

### Screen component (`src/components/muntlig/RoleplayScreen.tsx`)

`'use client'` component. Three phases managed with `useState<'selection' | 'turn' | 'complete'>`.

**Imports to reuse:**
- `useSpeechRecognition` from `@/hooks/useSpeechRecognition`
- `computeMatchScore` from `@/lib/speechMatchUtils`
- `useFingerprint` from `@/hooks/useFingerprint`
- `useFingerprintStore` from `@/stores/fingerprint-store`
- `BottomNav` from `@/components/layout/BottomNav`
- `motion`, `AnimatePresence` from `framer-motion`
- `ROLEPLAY_SCENARIOS`, types from `@/lib/roleplayContent`

**State:**
```ts
const [phase, setPhase] = useState<'selection' | 'turn' | 'complete'>('selection')
const [activeScenario, setActiveScenario] = useState<RoleplayScenario | null>(null)
const [turnIndex, setTurnIndex] = useState(0)
const [turnPhase, setTurnPhase] = useState<'prompt' | 'listening' | 'result' | 'fallback'>('prompt')
const [transcript, setTranscript] = useState('')
const [retried, setRetried] = useState(false)      // true after first failed attempt
const [scores, setScores] = useState<boolean[]>([]) // per-turn pass/fail
```

**Turn flow (per-turn state machine inside the 'turn' phase):**
- `prompt`: show character line + mic button. Pressing mic → `listening`
- `listening`: useSpeechRecognition active, 5-second countdown bar (same pattern as ListenRespondExercise). On transcript or timeout → `result`
- `result`: show transcript + pass/fail. If pass → advance turn (or → `complete`). If fail and not retried → `fallback`
- `fallback`: show hint + modelAnswer ("Prøv å si: ...") + two buttons: "Prøv igjen" (→ `listening`, sets `retried=true`) and "Fortsett" (advance turn, mark as fail)
- If fail and already retried → advance directly

**Match threshold:** `computeMatchScore(expectedKeywords.join(' '), transcript) >= 0.3` — since keywords are sparse (2–7 words), any single matching keyword in a normalised transcript counts as a reasonable attempt. For stronger validation: at least 1 keyword must match (score > 0).

Actually use: `const matched = turn.expectedKeywords.some(kw => normaliseWord(transcript).includes(kw) || tokenise(normaliseWord(transcript)).includes(kw))` — same pattern as ListenRespondExercise's `getMatchedKeywords`. This is already the established pattern.

**Fingerprint integration:**
On each completed turn (pass or skip):
```ts
recordResult({
  sessionId: 'roleplay',
  itemId: `roleplay-${scenario.id}-${turn.id}`,
  correct: passed,
  userAnswer: transcript,
  correctAnswer: turn.modelAnswer,
  timeTakenSeconds: 5,
  conceptId: 'speaking-production',
  errorTag: passed ? undefined : 'listening-recognition',
})
```

On scenario complete: increment `speakingMinutesTotal` by `turns.length * (5 / 60)`.

**Selection phase UI:**
- Page heading "Rollespill"
- Subtitle "Øv på hverdagslige samtaler på norsk"
- Feature chips: `['Samtalesimulator', 'Talegjenkjenning', 'Fingeravtrykk']`
- Three scenario cards — `nc-glass`, clickable, show title + titleEnglish + setting + characterName
- Pattern: identical to ListenRespondScreen's question cards

**Turn phase UI:**
- Heading showing scenario title
- Progress indicator: `{turnIndex + 1} / {turns.length}` with a progress bar
- Character card (`nc-glass-dark`):
  - Small label: characterName
  - Large Norwegian line: `text-[1.5rem] font-bold text-[var(--nc-text)]`
  - English subtitle below
- Learner area below (varies by turnPhase):
  - `prompt`: large mic button `nc-button-primary` with mic icon + "Svar" label
  - `listening`: pulsing red dot + countdown bar + interim transcript + "Hopp over" button
  - `result`: show transcript, pass/fail badge (same chips as ListenRespondExercise), "Neste" button
  - `fallback`: hint text + `"Prøv å si: ${turn.modelAnswer}"` in teal tint box + "Prøv igjen" + "Fortsett"

**Complete phase UI:**
- Same pattern as ListenRespondScreen's complete phase
- Show pass count, per-turn bar, summary message
- "Prøv et annet scenario" → back to selection
- "Tilbake til dashboard" → router.push('/dashboard')

---

### Page wrapper (`src/app/roleplay/page.tsx`)

```tsx
import { RoleplayScreen } from '@/components/muntlig/RoleplayScreen'
export const metadata = { title: 'Rollespill — NorskCoach' }
export default function RoleplayPage() {
  return (
    <main className="min-h-dvh">
      <RoleplayScreen />
    </main>
  )
}
```

No server-side data loading needed (content is in-memory, not from Supabase).

---

## Model
sonnet (well-specified UI, established patterns)

---

## Acceptance Criteria

1. `src/app/roleplay/page.tsx` exists and resolves at `/roleplay` without errors.
2. `ROLEPLAY_SCENARIOS` exports 3 scenarios, each with 4 turns, correct Norwegian/English content.
3. Scenario selection screen: 3 cards render with title, English subtitle, setting, and character name.
4. Turn flow works end-to-end for at least one scenario: character line shown → mic button → speech input (or skip) → pass/fail → next turn → complete screen.
5. Complete screen shows pass count and two buttons (try another, dashboard).
6. `recordResult` is called once per completed turn. `speakingMinutesTotal` incremented on scenario complete.
7. No TypeScript errors.
8. No new npm dependencies — uses only existing hooks, utilities, and design system.

---

## Blocking Flags
Stop and write `BLOCKED: [reason]` to this file if:
- `useSpeechRecognition` or `computeMatchScore` import fails
- Any TypeScript error is introduced
- You are about to add a new npm dependency
- You are about to change any existing file other than optionally adding `/roleplay` to the dashboard nav link

---

## Playwright Checkpoint
yes
Test flows:
1. Navigate to `/roleplay` — verify selection screen renders with 3 scenario cards
2. Click first scenario — verify turn 1 character line appears
3. Verify mic button is present and labelled
4. Verify layout at 375px and 1280px
5. Verify no console errors
