# Phase 2: Exercise Types + Real Content — Research

**Researched:** 2026-05-10
**Domain:** React exercise UI, drag-and-drop, audio playback, Supabase seeding, session state management
**Confidence:** HIGH (codebase verified) / MEDIUM (library patterns) / see per-section breakdowns

---

## Executive Summary

Phase 2 adds the exercise layer on top of the Phase 1 engine. The engine is complete and works correctly — `generateSession`, `buildRepairPlan`, `makeRepairItems` are all ready to consume. The primary challenge is building five distinct exercise component types that feel native on mobile, wiring them to the engine through clean React hooks, and populating Supabase with 500+ tagged sentences before any of it is testable end-to-end.

Three decisions dominate the architecture: (1) **@dnd-kit/core v6 is the only viable drag-and-drop choice** — react-beautiful-dnd is deprecated, the native HTML5 drag API has no touch support. dnd-kit requires `dynamic(() => ..., { ssr: false })` wrapping in Next.js to prevent aria-describedby hydration mismatches. (2) **Zustand slices beat useReducer for session state** — the session state is complex enough (item index, repair mode, results accumulation, fingerprint sync) that a single Zustand slice with `createSessionSlice` gives superior dev tooling and avoids prop-drilling through a deep exercise tree. (3) **Supabase seeding should use a TypeScript script (tsx) calling the JS client in batches of 100** — this is idempotent, works from CI, and keeps seed data in version control as JSON files per concept, validated with Zod before insertion.

The repair loop UI should be **inline expansion, not a modal**. The explanation card slides down below the wrong answer in the same screen; the user never navigates away. Micro-drills queue immediately after in the session's item list. This keeps the user in the flow state established by the Duolingo/Anki pattern.

**Primary recommendation:** Build in this order: schema → seed pipeline (gives content to test with) → hooks layer → exercise components → session screen → repair loop UI → dashboard. Never build UI before there is real content to render.

---

## Project Constraints (from CLAUDE.md)

### From project CLAUDE.md (web-conventions skill)
- Next.js 15 App Router, TypeScript strict, no `any`, no non-null assertions
- Server Components by default — `'use client'` only when needed
- Zustand for global client state (fingerprint, session) — already in package.json
- Framer Motion for ALL animations — already installed
- shadcn/ui for interactive primitives — already installed
- Background `#09090e`, brand accent `#3b82f6`, font: Plus Jakarta Sans (already in layout.tsx)
- BANNED fonts: Inter, Roboto, Arial, Space Grotesk
- Components never call engine functions directly — must go through hooks
- No inline styles — Tailwind classes only with `cn()`
- Discriminated unions for state, not boolean flags

### From global CLAUDE.md (David's stack)
- Dark backgrounds — nightlife/events aesthetic applies here (bold, not playful)
- Framer Motion for all animations — mandatory
- shadcn/ui component primitives
- Mobile-first CSS
- After every UI task: run /baseline-ui then /fixing-accessibility
- Before PR: aikido + semgrep security scan

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Exercise rendering (Translation, FillInBlank, etc.) | Browser/Client | — | Requires event handlers, animation, keyboard; 'use client' |
| Session state (current item, results, repair mode) | Browser/Client (Zustand) | — | Local-first; no server round-trips during session |
| Fingerprint persistence | Browser (IndexedDB) | Supabase (opt-in) | REQ-P-03: never synced without user opt-in |
| Content delivery (sentences, vocab) | Supabase (DB) | Next.js Server Component cache | Public read via anon key + RLS |
| Audio playback | Browser/Client | Azure Blob CDN | HTML5 Audio/howler loaded client-side; files in Azure |
| Drag-and-drop (WordOrder) | Browser/Client | — | Pointer/touch events; must be 'use client' with ssr:false |
| Dashboard mastery map | Next.js Server (partial) + Client | — | Static concept graph can SSR; mastery scores from IndexedDB = client |
| Seed pipeline | Node.js script (tsx) | — | Run once; not a route; reads JSON, writes to Supabase via service role key |
| Repair loop logic | Engine (src/engine/repair-loop.ts) | — | Pure TS, no React; already built in Phase 1 |
| Repair loop UI | Browser/Client | — | Needs animation, user interaction |

---

## Standard Stack

### Core — already installed

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x | App Router, SSR/RSC | Project foundation |
| react | 19.x | UI components | Project foundation |
| framer-motion | 12.38.0 | All animations | Project requirement (mandatory) |
| zustand | 5.x | Session + fingerprint state | Project convention; slices pattern |
| @supabase/supabase-js | 2.105.4 | Content queries, upsert | Project foundation |
| @supabase/ssr | installed | SSR-safe Supabase client | Already in storage/supabase.ts |
| idb | 8.0.3 | IndexedDB fingerprint | Already in storage/indexeddb.ts |
| tailwind | 3.x | Styling | Project foundation |
| shadcn/ui (radix primitives) | installed | Button, Input, Card, Dialog | Project requirement |
| zod | 4.4.3 | Seed validation, form schemas | Already installed |

### To Install

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @dnd-kit/core | 6.3.1 | DnD context, sensors | Only maintained React DnD with touch + a11y |
| @dnd-kit/sortable | 10.0.0 | useSortable for word tiles | Sortable preset on top of core |
| @dnd-kit/utilities | 3.2.2 | CSS.Transform helpers | Companion utilities |
| howler | 2.2.4 | Audio playback + rate control | Web Audio + HTML5 fallback; rate() for slow playback |
| tsx | 4.21.0 | Run seed script TypeScript | Already available via npx |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities howler
npm install --save-dev @types/howler
```

**Version verification:** [VERIFIED: npm registry 2026-05-10]
- @dnd-kit/core: 6.3.1
- @dnd-kit/sortable: 10.0.0
- @dnd-kit/utilities: 3.2.2
- howler: 2.2.4
- framer-motion: 12.38.0 (already installed)
- zustand: current v5 (already installed)

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | react-beautiful-dnd | rbd is deprecated (Atlassian dropped it); no React 18+ support |
| @dnd-kit | native HTML5 drag API | No touch events on iOS; inaccessible |
| @dnd-kit | custom pointer events | Weeks of work; accessibility is hard to get right |
| howler | use-sound | use-sound is a thin hook around howler v2 with no rate() control — too thin for language learning |
| howler | HTML5 `<audio>` element directly | Fine for simple play/pause; rate control via `element.playbackRate` works but no preloading/caching/sprite support |
| Zustand slice | useReducer + Context | useReducer is fine for isolated components; Zustand wins when session state is shared across SessionScreen + ExerciseCard + RepairCard + Dashboard simultaneously |
| tsx seed script | Supabase CLI seed.sql | SQL is harder to maintain than JSON + TypeScript; CLI seed.sql runs on `db reset` only (local), not against remote |

---

## Architecture Patterns

### System Architecture Diagram

```
User (browser)
       │
       ▼
[Dashboard / Home Screen]          ← Next.js Server Component (concept graph static)
       │ "Start Session"           + Client island (mastery from IndexedDB)
       ▼
[useSession hook]  ←────────────── [IndexedDB] (MistakeFingerprint)
       │ generateSession()         [Supabase] (fetch sentence IDs by concept)
       │
       ▼
[SessionScreen]  ('use client')
       │
       ├─ currentItem.exerciseType ──► [TranslationExercise]
       │                               [FillInBlankExercise]
       │                               [WordOrderExercise] (dnd-kit, ssr:false)
       │                               [ListeningExercise] (howler, ssr:false)
       │                               [SpeedRound]
       │
       │ onResult(ExerciseResult)
       │
       ├─ result.correct ──► advance to next item
       │
       └─ result.wrong ──► [useSession].enterRepairMode()
                                  │
                                  ▼
                           buildRepairPlan(error)   ← engine/repair-loop.ts
                           makeRepairItems(...)
                                  │
                                  ▼
                           [ExplanationCard]  (slides down inline)
                                  │
                                  ▼
                           micro-drill items injected into session queue
                                  │
                                  ▼
                           retry item → back to SessionScreen flow
                                  │
                                  ▼
                           [useFingerprint].recordResult()
                           updateConceptMastery() ← engine/fingerprint.ts
                           saveFingerprint() ← storage/indexeddb.ts
```

### Recommended Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing (existing)
│   ├── dashboard/
│   │   └── page.tsx                # Dashboard (Server Component wrapper)
│   └── session/
│       └── page.tsx                # Session screen route
├── components/
│   ├── ui/                         # shadcn primitives (existing)
│   ├── landing/                    # existing
│   ├── session/
│   │   ├── SessionScreen.tsx       # orchestrates items + progress bar
│   │   ├── ExerciseCard.tsx        # wrapper that routes to exercise type
│   │   ├── ProgressBar.tsx         # top progress indicator
│   │   ├── ExplanationCard.tsx     # repair loop explanation + micro-drill UI
│   │   └── exercises/
│   │       ├── TranslationExercise.tsx
│   │       ├── FillInBlankExercise.tsx
│   │       ├── WordOrderExercise.tsx     # dynamic ssr:false
│   │       ├── ListeningExercise.tsx     # dynamic ssr:false
│   │       └── SpeedRound.tsx
│   └── dashboard/
│       ├── ConceptMasteryMap.tsx
│       ├── StreakDisplay.tsx
│       └── SessionCTA.tsx
├── hooks/
│   ├── useFingerprint.ts           # load/save fingerprint, update mastery
│   ├── useSession.ts               # session generation, item advance, repair mode
│   └── useExercise.ts              # answer submission, validation, result creation
├── stores/
│   ├── session-store.ts            # Zustand slice for session state
│   └── fingerprint-store.ts        # Zustand slice for fingerprint
├── engine/                         # (existing — DO NOT modify in Phase 2)
├── storage/                        # (existing)
├── types/                          # (existing)
└── scripts/
    └── seed-content.ts             # seed script (run with npx tsx)
```

### Pattern 1: WordOrderExercise — dnd-kit with SSR disabled

**What:** Word tiles displayed as draggable chips; user reorders them to form a correct Norwegian sentence following V2 word order.

**Key detail:** dnd-kit generates unique `aria-describedby` IDs at runtime. If the component SSRs, these IDs differ between server and client, causing React 19 hydration errors. Solution: always wrap in `dynamic(() => import(...), { ssr: false })`.

**When to use:** For exercises tagged `word-order` in session items (V2 rule practice, negation placement, verb-second after fronted adverbs).

```tsx
// Source: Context7 /clauderic/dnd-kit, verified 2026-05-10
// src/components/session/exercises/WordOrderExercise.tsx
'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Wrap sensors: PointerSensor (mouse) + TouchSensor (mobile) + KeyboardSensor (a11y)
function useTileSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}

// Individual tile
function WordTile({ id, word }: { id: string; word: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none rounded-lg border border-white/10 bg-surface px-4 py-2 text-sm font-semibold select-none active:cursor-grabbing"
    >
      {word}
    </div>
  );
}
```

```tsx
// Dynamic import wrapper — prevents SSR hydration mismatch
// src/components/session/exercises/WordOrderExerciseLazy.tsx
import dynamic from 'next/dynamic';
const WordOrderExercise = dynamic(
  () => import('./WordOrderExercise'),
  { ssr: false, loading: () => <div className="h-24 animate-pulse rounded-lg bg-surface" /> }
);
export default WordOrderExercise;
```

### Pattern 2: ListeningExercise — howler with client-only guard

**What:** Audio clip from Azure Blob Storage plays via howler; user types what they heard or selects from multiple choice.

**Key detail:** howler references `window` on import. Must use `dynamic(() => import('howler'), { ssr: false })` or instantiate inside `useEffect`. The `rate()` method (0.5–4.0) enables the slow-playback button (0.75x for L2 learners).

**When to use:** For `listening-comprehension` and `dictation` exercise types.

```tsx
// Source: howler.js docs (howlerjs.com), verified 2026-05-10
// src/components/session/exercises/ListeningExercise.tsx
'use client';
import { useEffect, useRef, useState } from 'react';

export function useAudio(audioUrl: string) {
  const howlRef = useRef<Howl | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1.0);

  useEffect(() => {
    // Dynamic import to avoid SSR
    import('howler').then(({ Howl }) => {
      howlRef.current = new Howl({
        src: [audioUrl],
        html5: true, // Enables streaming for large files; Azure Blob URLs work directly
        rate,
        onload: () => setIsLoaded(true),
        onplay: () => setIsPlaying(true),
        onend: () => setIsPlaying(false),
      });
    });
    return () => { howlRef.current?.unload(); };
  }, [audioUrl]);

  const play = () => howlRef.current?.play();
  const setPlaybackRate = (r: number) => {
    setRate(r);
    howlRef.current?.rate(r);
  };

  return { play, isLoaded, isPlaying, setPlaybackRate, currentRate: rate };
}
```

### Pattern 3: Zustand Session Slice

**What:** Single Zustand store with two slices — `sessionSlice` manages active session items, current index, repair mode; `fingerprintSlice` manages the local fingerprint with IndexedDB sync.

**When to use:** All session state. Do not use React state (`useState`) for session-level state — it won't survive route navigations and can't be read by the dashboard.

```typescript
// Source: Context7 /pmndrs/zustand slices pattern, verified 2026-05-10
// src/stores/session-store.ts
import { create, type StateCreator } from 'zustand';
import type { Session, ExerciseResult, SessionItem } from '@/types/session';
import type { RepairPlan } from '@/engine/repair-loop';

interface SessionSlice {
  session: Session | null;
  currentItemIndex: number;
  results: ExerciseResult[];
  isInRepair: boolean;
  repairPlan: RepairPlan | null;
  startSession: (session: Session) => void;
  advanceItem: () => void;
  recordResult: (result: ExerciseResult) => void;
  enterRepair: (plan: RepairPlan) => void;
  exitRepair: () => void;
  endSession: () => void;
}

const createSessionSlice: StateCreator<SessionSlice> = (set) => ({
  session: null,
  currentItemIndex: 0,
  results: [],
  isInRepair: false,
  repairPlan: null,
  startSession: (session) => set({ session, currentItemIndex: 0, results: [], isInRepair: false }),
  advanceItem: () => set((s) => ({ currentItemIndex: s.currentItemIndex + 1 })),
  recordResult: (result) => set((s) => ({ results: [...s.results, result] })),
  enterRepair: (plan) => set({ isInRepair: true, repairPlan: plan }),
  exitRepair: () => set({ isInRepair: false, repairPlan: null }),
  endSession: () => set({ session: null, currentItemIndex: 0, results: [], isInRepair: false }),
});

export const useSessionStore = create<SessionSlice>()(createSessionSlice);
```

### Pattern 4: Repair Loop UX — Inline Expansion (not modal)

**What:** When a wrong answer is submitted, the ExplanationCard slides down inline below the exercise card. The user sees "Here's why" text + a "Continue" button. Tapping Continue queues the micro-drill items into the session and resumes the flow.

**Why not modal:** Language learning research shows modals interrupt flow state and have higher abandonment on mobile (users dismiss without reading). Inline expansion is the Duolingo/Anki/Babbel pattern — explanation is part of the exercise card, not a interruption.

**Timing:** Micro-drills appear immediately in the next 2 session slots. The retry item appears 2 items later. The learner never sees a dedicated "repair mode screen" — it feels continuous.

```tsx
// Source: Framer Motion AnimatePresence docs, Context7 /grx7/framer-motion
// Inline expansion pattern
import { AnimatePresence, motion } from 'framer-motion';

function ExerciseCard({ item, onResult }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastResult, setLastResult] = useState<ExerciseResult | null>(null);

  function handleResult(result: ExerciseResult) {
    setLastResult(result);
    onResult(result);
    if (!result.correct) setShowExplanation(true);
  }

  return (
    <div className="space-y-4">
      {/* Exercise component renders here */}
      
      <AnimatePresence>
        {showExplanation && lastResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <ExplanationCard
              repairContext={item.repairContext}
              correctAnswer={lastResult.correctAnswer}
              onContinue={() => {
                setShowExplanation(false);
                // advance is handled by SessionScreen after onResult
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Pattern 5: Exercise Transition Animation

Use `AnimatePresence mode="wait"` to slide exercises in from the right. When the user completes an exercise, the card exits left while the next enters from the right. This gives the directional flow of progress.

```tsx
// Source: Framer Motion docs, verified via Context7
<AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={currentItemIndex}
    custom={direction}
    variants={{
      enter: { x: 80, opacity: 0 },
      center: { x: 0, opacity: 1 },
      exit: { x: -80, opacity: 0 },
    }}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
  >
    <ExerciseCard item={currentItem} onResult={handleResult} />
  </motion.div>
</AnimatePresence>
```

### Pattern 6: Supabase Seed Pipeline

**What:** TypeScript script reads JSON files from `content/a1/` (one per concept), validates with Zod against the `Sentence` type, then upserts in batches of 100 to avoid Supabase request size limits.

**Why not CLI seed.sql:** The `supabase/seed.sql` approach runs only on `db reset` and generates SQL from structured data in a lossy way. The TS script approach is idempotent (upsert), runs against remote, and keeps content in maintainable JSON.

**Deduplication:** Upsert with `onConflict: 'id'` — the JSON files carry stable UUIDs, so re-running never creates duplicates.

```typescript
// Source: Supabase JS docs (context7 /supabase/supabase-js), verified 2026-05-10
// scripts/seed-content.ts (run via: npx tsx scripts/seed-content.ts)
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const BATCH_SIZE = 100;

// Zod schema mirrors the Sentence type from src/types/content.ts
const SentenceSchema = z.object({
  id: z.string().uuid(),
  norwegian: z.string().min(1),
  english: z.string().min(1),
  concept_ids: z.array(z.string()),
  vocab_clusters: z.array(z.string()),
  error_tags_detectable: z.array(z.string()),
  cefr_level: z.enum(['A1', 'A2', 'B1', 'B2']),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  exercise_types: z.array(z.string()),
  audio_url: z.string().url().optional(),
  notes: z.string().optional(),
});

async function seedSentences(sentences: unknown[]) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role — bypasses RLS for seeding
  );

  const validated = z.array(SentenceSchema).parse(sentences);

  for (let i = 0; i < validated.length; i += BATCH_SIZE) {
    const batch = validated.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('sentences')
      .upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`Batch ${i / BATCH_SIZE + 1} failed: ${error.message}`);
    console.log(`Seeded batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
  }
}
```

**Content format** — one JSON file per concept:
```
content/
└── a1/
    ├── a1-verb-present.json         # ~25 sentences for present tense
    ├── a1-word-order.json           # ~30 sentences for V2 rule
    ├── a1-noun-gender.json          # ~25 sentences for en/ei/et
    └── ... (one per 22 A1 concepts)
```

Each file is an array of Sentence objects. The content-author agent generates these; the norwegian-linguist agent reviews them. The seed script validates before inserting.

### Pattern 7: Mobile Input Handling (iOS keyboard)

iOS Safari will NOT programmatically show the virtual keyboard on `element.focus()` unless it's called synchronously inside a user interaction handler (tap/click). 

**Pattern:** Auto-focus the answer input ONLY on desktop (detect via `matchMedia('(pointer: fine)')`). On mobile, rely on the user tapping the input field. Prevent iOS scroll-to-center behavior with `scrollIntoView({ block: 'nearest' })`.

```tsx
// src/components/session/exercises/TranslationExercise.tsx
'use client';
import { useEffect, useRef } from 'react';

function useSmartFocus(inputRef: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    // Only auto-focus on pointer-precise devices (desktop). iOS keyboard
    // only shows when focus is called inside a user gesture handler.
    const isPointerDevice = window.matchMedia('(pointer: fine)').matches;
    if (isPointerDevice) {
      inputRef.current?.focus();
    }
  }, [inputRef]);
}
```

**Viewport shrink on iOS:** Use `min-h-dvh` (dynamic viewport height) not `min-h-screen` — `dvh` accounts for the iOS browser chrome and keyboard. This is already set in the layout via `min-h-dvh` classes.

**Keyboard submission:** All exercise components must listen for `Enter` to submit. Use `onKeyDown` not `onKeyPress` (deprecated).

### Anti-Patterns to Avoid

- **SSR dnd-kit without dynamic():** Causes hydration mismatch on aria-describedby IDs — crash on React 19 strict mode.
- **Modal for repair loop:** Breaks flow state; users dismiss without reading the explanation. Always use inline expansion.
- **Calling engine functions directly from components:** All engine calls go through hooks. Components receive data and callbacks only.
- **Running seed with anon key:** Anon key is blocked from INSERT by RLS. Seed must use `SUPABASE_SERVICE_ROLE_KEY` (never expose this to client).
- **Seeding 500 rows in one API call:** Supabase has ~1MB request size limit. Always batch in chunks of 100.
- **Auto-focusing inputs on mobile:** iOS only shows keyboard on user gesture; programmatic focus silently fails. Conditional focus by pointer type.
- **`min-h-screen` on iOS:** Excludes Safari chrome height. Use `min-h-dvh` throughout.
- **Repeating the same ExerciseType twice in a row in repair:** The engine's `pickExerciseType` already prevents this, but the UI should also visually acknowledge variety.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop tiles | Custom pointer event handler | @dnd-kit/core + useSortable | Touch, keyboard, ARIA, scroll-during-drag — weeks of edge cases |
| Audio playback + rate control | `<audio>` element wrapper | howler.js | Web Audio fallback, iOS quirks, preloading, sprite support, stable rate() API |
| Session state machine | useReducer inside SessionScreen | Zustand session slice | Cross-component access needed (SessionScreen + Dashboard + hooks); useReducer is local only |
| Answer validation fuzzy matching | String comparison | Normalize + lowercase + trim in engine | The engine's `ExerciseResult.correct` boolean should be computed by useExercise, not each component |
| Seed deduplication | Manual ID check before insert | `upsert({ onConflict: 'id' })` | Database handles it atomically |
| Supabase types | Manual interface | Generated types via `supabase gen types` | Auto-sync with schema; never drift |

**Key insight:** The drag-and-drop and audio problems look simple but have deep mobile/a11y edge cases. Both @dnd-kit and howler have been battle-tested specifically for these edge cases across 5+ years of production use.

---

## Common Pitfalls

### Pitfall 1: dnd-kit Hydration Mismatch
**What goes wrong:** `aria-describedby` IDs are generated client-side by dnd-kit. If the component SSRs, React 19 throws a hydration error and the exercise is unusable.
**Why it happens:** dnd-kit uses `Math.random()` or crypto-based IDs for accessibility attributes at import time.
**How to avoid:** Wrap `WordOrderExercise` with `dynamic(() => import('./WordOrderExercise'), { ssr: false })`. The loading fallback should be a skeleton div with matching dimensions.
**Warning signs:** "Hydration failed because the initial UI does not match server-rendered HTML" in console.

### Pitfall 2: iOS Audio Autoplay Restriction
**What goes wrong:** The listening exercise audio refuses to play until a user gesture occurs. Azure Blob audio URLs load fine, but playback triggers are blocked.
**Why it happens:** iOS Safari requires audio playback to be initiated within a synchronous user gesture handler.
**How to avoid:** Never call `howl.play()` from `useEffect` on mount. Always wire it to a button `onClick`. Show a prominent "Play" button, not autoplay.
**Warning signs:** Audio plays on desktop but silently fails on iOS.

### Pitfall 3: Supabase Seed Script Uses Anon Key
**What goes wrong:** INSERT fails silently (RLS blocks it) or throws 403.
**Why it happens:** The anon key is subject to RLS. The `sentences` RLS policy only allows `SELECT`, not INSERT. Only the service_role key bypasses RLS.
**How to avoid:** The seed script must use `SUPABASE_SERVICE_ROLE_KEY` (from `.env.local`, never committed). Keep a `.env.seed.example` with the variable name but not the value.
**Warning signs:** Upsert returns no error but row count stays zero.

### Pitfall 4: Session State Lost on Navigation
**What goes wrong:** User starts a session, clicks back/forward, session is gone.
**Why it happens:** `useState` is local to the component; navigation unmounts it.
**How to avoid:** Session state lives in Zustand (not local state). The `useSession` hook reads from and writes to the Zustand store. Consider `persist` middleware if the session should survive hard refresh.
**Warning signs:** Session restarts from the beginning after back-navigation.

### Pitfall 5: A1 Content Volume Bottleneck
**What goes wrong:** Session can't generate because `availableSentenceIds[conceptId]` returns empty arrays for most concepts. The engine produces sessions of 0–3 items.
**Why it happens:** Seed content is not ready before development starts on session flow.
**How to avoid:** Plan 02-01 (schema + seed pipeline) must complete and be verified before any session flow work starts. The seed script should include a validation step that checks minimum sentence count per concept (at least 5 per concept for meaningful sessions).
**Warning signs:** `generateSession` returns sessions with fewer than 5 items.

### Pitfall 6: `touch-action: none` Missing on Draggable Tiles
**What goes wrong:** On mobile, dragging tiles also scrolls the page — the browser interprets touch as scroll.
**Why it happens:** Browsers intercept touch events for native scroll before JavaScript gets them.
**How to avoid:** Add `touch-action: none` (Tailwind: `touch-none`) to draggable tile elements. @dnd-kit's TouchSensor activation constraint delay (200ms) also helps distinguish scroll intent from drag intent.
**Warning signs:** Tile moves correctly on desktop but bounces/scrolls on iOS.

### Pitfall 7: Content JSON Not Validated Before Seeding
**What goes wrong:** A sentence is seeded with a misspelled concept_id (e.g., `"present-tense"` vs `"verb-present-tense"`). The engine never finds it because the ID doesn't match the concept graph.
**Why it happens:** The content-author agent generates IDs from memory; the concept graph IDs are authoritative.
**How to avoid:** The Zod seed schema must include an enum validator for `concept_ids` that cross-references the actual concept graph IDs from `src/engine/concepts.ts`. Any unknown concept_id fails validation before insert.
**Warning signs:** Engine generates sessions but exercises never match expected concepts.

---

## Code Examples

### TranslationExercise — answer validation pattern
```typescript
// src/hooks/useExercise.ts
// Answer normalization — handles typos, case, whitespace
function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?;:]/g, '');
}

function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}
```

### FillInBlankExercise — blank extraction
```typescript
// A sentence like "Jeg ___ til Oslo i dag." has one blank
// The blank marker is triple underscore ___
function extractBlank(norwegian: string): { before: string; after: string } {
  const parts = norwegian.split('___');
  return { before: parts[0] ?? '', after: parts[1] ?? '' };
}
```

### useSession hook — shell
```typescript
// src/hooks/useSession.ts
'use client';
import { useCallback } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useFingerprintStore } from '@/stores/fingerprint-store';
import { generateSession } from '@/engine';
import { buildRepairPlan, makeRepairItems } from '@/engine';
import type { ExerciseResult } from '@/types/session';

export function useSession() {
  const { session, currentItemIndex, startSession, advanceItem, recordResult, enterRepair } =
    useSessionStore();
  const { fingerprint } = useFingerprintStore();

  const startNewSession = useCallback(
    async (availableSentenceIds: Record<string, string[]>) => {
      if (!fingerprint) return;
      // graph is static — import from engine data
      const { default: graph } = await import('@/data/concept-graph.json');
      const { session } = generateSession({ fingerprint, graph, availableSentenceIds });
      startSession(session);
    },
    [fingerprint, startSession]
  );

  const submitResult = useCallback(
    (result: ExerciseResult) => {
      recordResult(result);
      if (!result.correct) {
        const error = {
          id: crypto.randomUUID(),
          conceptId: result.conceptId,
          errorTag: result.errorTag!,
          exerciseType: session!.items[currentItemIndex].exerciseType,
          wrong: result.userAnswer,
          correct: result.correctAnswer,
          timestamp: new Date().toISOString(),
        };
        const plan = buildRepairPlan(error);
        enterRepair(plan);
      } else {
        advanceItem();
      }
    },
    [session, currentItemIndex, recordResult, advanceItem, enterRepair]
  );

  return {
    session,
    currentItem: session?.items[currentItemIndex] ?? null,
    currentItemIndex,
    startNewSession,
    submitResult,
  };
}
```

### Supabase content query — server component pattern
```typescript
// src/app/session/page.tsx (Server Component — fetches sentence IDs)
import { createClient } from '@/storage/supabase';

export default async function SessionPage() {
  const supabase = createClient();
  const { data: sentences } = await supabase
    .from('sentences')
    .select('id, concept_ids')
    .eq('cefr_level', 'A1');

  // Build availableSentenceIds map
  const map: Record<string, string[]> = {};
  for (const s of sentences ?? []) {
    for (const cid of s.concept_ids) {
      map[cid] = [...(map[cid] ?? []), s.id];
    }
  }

  return <SessionScreenClient availableSentenceIds={map} />;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core | 2022 (rbd deprecated) | rbd has no React 18+ support; dnd-kit is the ecosystem standard |
| HTML5 Audio element | howler.js | Ongoing | Cross-browser, rate control, preloading |
| Redux for session state | Zustand slices | 2022–2024 | Zustand is what Duolingo uses; far less boilerplate |
| seed.sql file | TypeScript seed script with Zod | 2023+ | Type-safe, idempotent, works against remote |
| `min-h-screen` | `min-h-dvh` | 2023 (CSS dvh) | Correct height on mobile Safari with keyboard open |
| `onKeyPress` | `onKeyDown` | 2022 | `onKeyPress` deprecated in React 17+ |

**Deprecated/outdated:**
- react-beautiful-dnd: officially deprecated by Atlassian, last release 2022, no React 18 support — do not use
- `use-sound`: too thin a wrapper for language learning (no rate control); use howler directly
- `supabase/seed.sql` as primary seed mechanism: fine for local dev reset, inadequate for remote production seeding

---

## Implementation Risks

### Risk 1: Content Volume Blocks Development (HIGH probability)
The session flow cannot be tested without real sentences in Supabase. If the seed pipeline is built last, exercise development is blocked or requires fake data.
**Mitigation:** Plan 02-01 (schema + seed) is the first plan. Include a minimum 25 sentences per concept as the acceptance criterion.

### Risk 2: dnd-kit Mobile Touch Feel (MEDIUM probability)
dnd-kit's TouchSensor works but has known activation delay gotchas. The 200ms delay to distinguish scroll from drag can feel sluggish.
**Mitigation:** Use `activationConstraint: { delay: 150, tolerance: 5 }` as the starting point. Test on real iPhone — simulators do not accurately represent touch behavior.

### Risk 3: Audio Files Don't Exist Yet (HIGH probability)
REQ-21 (Azure Blob audio) is listed as SHOULD. Sentences will likely be seeded without audio_url values initially.
**Mitigation:** `ListeningExercise` must handle `audioUrl: undefined` gracefully — show a "No audio available" state, not an error. Audio can be added to rows later via a separate migration script. Build the exercise to work without audio in Phase 2.

### Risk 4: Fingerprint Not Loaded When Session Starts (MEDIUM probability)
IndexedDB read is async. If the session page renders before the fingerprint loads, `generateSession` gets `null` and produces a broken session.
**Mitigation:** Show a loading skeleton until `fingerprint !== null`. The `useFingerprintStore` should have a `status: 'loading' | 'ready' | 'empty'` discriminated union.

### Risk 5: Concept Graph IDs Mismatch Between Engine and Content (MEDIUM probability)
The concept graph IDs in `src/engine/` were set in Phase 1. If the content-author agent uses different IDs, sentences never map to concepts.
**Mitigation:** Export the concept IDs as a constant and import them into the Zod seed schema. This makes the validator fail loudly on any ID mismatch before data reaches the database.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (not yet installed — Wave 0 gap) |
| Config file | `vitest.config.ts` — Wave 0 creates |
| Quick run command | `npx vitest run --reporter=dot` |
| Full suite command | `npx vitest run` |
| Component testing | None in Phase 2 — unit tests for hooks and utilities only |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| REQ-10 | Schema deployed, RLS policies active | Manual (Supabase dashboard) | — |
| REQ-11 | TranslationExercise validates correct/wrong answers | Unit | `vitest run tests/exercises/translation.test.ts` |
| REQ-12 | FillInBlankExercise blank extraction works | Unit | `vitest run tests/exercises/fill-in-blank.test.ts` |
| REQ-13 | WordOrderExercise correct order recognized | Unit | `vitest run tests/exercises/word-order.test.ts` |
| REQ-14 | ListeningExercise handles missing audioUrl gracefully | Unit | `vitest run tests/exercises/listening.test.ts` |
| REQ-15 | SpeedRound timer counts down correctly | Unit | `vitest run tests/exercises/speed-round.test.ts` |
| REQ-16 | SessionScreen advances items on correct answer | Unit (hook) | `vitest run tests/hooks/useSession.test.ts` |
| REQ-17 | Wrong answer triggers repair plan creation | Unit | `vitest run tests/hooks/useSession.test.ts` |
| REQ-18 | useFingerprint persists changes to IndexedDB | Unit (mock idb) | `vitest run tests/hooks/useFingerprint.test.ts` |
| REQ-19 | Seed script inserts 500+ rows, idempotent | Integration (script) | `npx tsx scripts/seed-content.ts --dry-run` |
| REQ-20 | Dashboard renders mastery map from fingerprint | Manual smoke test | — |
| REQ-21 | Audio URL in sentence renders play button | Unit | `vitest run tests/exercises/listening.test.ts` |

### Sampling Rate
- **Per commit:** `npx vitest run --reporter=dot` (fast, unit only)
- **Per plan merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green + manual smoke test on iPhone before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — no test framework installed yet
- [ ] `tests/` directory — needs creating
- [ ] `package.json` test script — `"test": "vitest run"`
- [ ] Install: `npm install -D vitest @testing-library/react @testing-library/user-event jsdom`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 2 deferred — auth is Azure Entra, Phase 3) | Azure Entra External ID (pending) |
| V3 Session Management | No (local session, not server session) | — |
| V4 Access Control | Yes — content RLS | Supabase RLS policies (public read only for sentences/vocab) |
| V5 Input Validation | Yes — answer inputs, seed data | Zod (answer normalization in useExercise; Zod schema in seed script) |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Anon key exposed in client bundle | Information disclosure | Expected by design — anon key is public; RLS is the defense layer |
| Service role key in client code | Elevation of privilege | CRITICAL: Service role key only in seed script (.env.local server-side), never in Next.js client bundle |
| SQL injection via sentence content | Tampering | Supabase JS client uses parameterized queries; never concatenate user input into SQL |
| XSS via sentence Norwegian/English text | XSS | React auto-escapes; never use `dangerouslySetInnerHTML` for sentence content |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Seed script, Next.js | ✓ | (system node) | — |
| npx tsx | Seed script | ✓ | 4.21.0 | `ts-node` |
| Supabase project | REQ-10, REQ-19 | ✗ | — | Cannot proceed without — see Pending Todos in STATE.md |
| Azure Blob Storage | REQ-21 | ✗ | — | Skip audio_url in seed; exercise degrades gracefully |
| Vitest | Testing | ✗ | — | Wave 0 installs it |

**Missing dependencies with no fallback:**
- Supabase project must be created and `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` added to `.env.local` before Plan 02-01 can execute.

**Missing dependencies with fallback:**
- Azure Blob Storage (REQ-21) — ListeningExercise works without audio_url; audio added later.
- Vitest — Wave 0 of Plan 02-02 installs it.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The concept graph JSON has stable IDs since Phase 1 (no changes needed) | Seed Pipeline | Seed validation would fail; IDs must match exactly |
| A2 | 500+ sentences across 22 A1 concepts = ~23 sentences per concept on average | A1 Content Seed | Some concepts may need more (word-order is practiced heavily); count should be concept-weighted |
| A3 | howler 2.2.4 rate() min is 0.5x | ListeningExercise | GitHub issue #1732 shows requests to go lower; 0.5x may be too fast for some A1 learners |
| A4 | Supabase free tier allows 500 rows in sentences with no performance issues | Environment | Free tier has 500MB DB limit; 500 sentences is ~0.5MB — well within limits |
| A5 | Azure Blob Storage URLs work directly with howler html5:true (no CORS issues) | ListeningExercise | Azure Blob requires CORS configuration for the app domain; this must be set in Azure Storage Account settings |

---

## Open Questions (RESOLVED)

1. **Concept graph JSON location** (RESOLVED)
   - **Resolution:** The file is at `content/concepts/a1-graph.json` (outside `src/`). Add `"@content/*": ["./content/*"]` to `compilerOptions.paths` in `tsconfig.json`. Import as `import conceptGraph from '@content/concepts/a1-graph.json'` with `assert { type: 'json' }` (TypeScript 5.3+: `with { type: 'json' }`). Plan 02-04 Task 2 action uses this exact import path. `resolveJsonModule: true` is already set in tsconfig.json (confirmed).

2. **Audio file format for Azure Blob** (RESOLVED)
   - **Resolution:** MP3. All audio files are `.mp3` stored in Azure Blob Container `audio/` as `{sentence_id}.mp3`. URLs follow the pattern `https://{storage-account}.blob.core.windows.net/audio/{sentence_id}.mp3`. `html5: true` on the Howl constructor enables streaming from these URLs. No OGG fallback required for the target audience (iOS 14+, Chrome 90+).

3. **Dashboard mastery map format** (RESOLVED)
   - **Resolution:** 22-chip grid layout. Each chip is a small pill/badge colored by mastery score: gray/opacity-40 (locked — prerequisites not met), amber-500/10 (learning — started, score < 60), brand-500/10 blue (practiced — score 60-79), green-500/10 (mastered — score >= 80 + confidence >= 0.7). On hover, show concept label tooltip. Layout: `grid grid-cols-2 sm:grid-cols-3 gap-2`. Plan 02-05 Task 1 implements this exact spec.

4. **Supabase project credentials** (UNRESOLVED — requires user action)
   - **Resolution:** Cannot be resolved at planning time — requires the user to create a Supabase project. Plan 02-01 Task 0 (checkpoint:human-verify, gate: blocking) gates all subsequent tasks on credential availability. Execution of Plan 02-01 Tasks 1 and 2 is blocked until the user completes the checkpoint and types "env-ready".

---

## Sources

### Primary (HIGH confidence)
- Context7 /clauderic/dnd-kit — useSortable hook, SortableContext, sensor configuration
- Context7 /pmndrs/zustand — slices pattern, StateCreator typing
- Context7 /supabase/supabase-js — upsert with onConflict, batch patterns
- Context7 /grx7/framer-motion — AnimatePresence, exit animations, motion variants
- Project codebase — src/engine/*, src/types/*, src/storage/*, package.json (all verified via Read)

### Secondary (MEDIUM confidence)
- howler.js docs (howlerjs.com) — rate() method range (0.5–4.0), html5 mode
- Supabase docs — seeding guide, RLS public read pattern
- dnd-kit GitHub issue #1 — aria-describedby hydration mismatch pattern

### Tertiary (LOW confidence)
- WebSearch: Duolingo uses Zustand — from community post, not official Duolingo engineering blog
- WebSearch: howler rate() min 0.5x for language learning — from GitHub issues, not official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry; all existing dependencies confirmed in package.json
- Architecture: HIGH — based on actual codebase inspection of engine API, types, and storage layer
- Pitfalls: MEDIUM/HIGH — hydration mismatch and iOS audio from documented GitHub issues; iOS keyboard from 2026 community posts
- Content seed: HIGH — Supabase upsert API confirmed via Context7; batch pattern is a well-established pattern

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days — stable libraries)

---

## RESEARCH COMPLETE
