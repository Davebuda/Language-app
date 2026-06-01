# Cloze Passage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cloze passage exercise — a coherent multi-sentence Norwegian text with concept-targeted gaps the learner types into — that feeds the fingerprint and repair loop per gap (Rule 8).

**Architecture:** One cloze passage is a single `SessionItem` (`exerciseType: 'cloze-passage'`). It resolves to a `ClozePassage` held in a **parallel `passageCache`** (the existing single-sentence `contentCache` is untouched — zero regression). On submit, a pure helper grades each gap and produces **one `ExerciseResult` per gap**; `submitClozeResults` records each into the fingerprint via the existing `recordResult`, injects a single-sentence repair per wrong gap, and marks the passage passed only when every gap is correct. v1 is **fully non-AI** (deterministic `checkAnswer`).

**Tech Stack:** Next.js App Router, TypeScript strict, Zustand, vitest (`vitest run`), Testing Library, Tailwind, Framer Motion, Schibsted Grotesk.

**Source spec:** `docs/superpowers/specs/2026-06-01-cloze-passage-design.md`

**Conventions verified in-repo:** tests live in `tests/`, import `{ describe, it, expect } from 'vitest'`, use the `@/` path alias; run a single test file with `npx vitest run <path>`. Content JSON is snake_case, mapped to camelCase at load. No emoji in UI; tokens `--nc-cream*`, `--nc-signal`.

---

## File map

| File | Responsibility | Create/Modify |
|---|---|---|
| `src/types/content.ts` | `ClozePassage`, `ClozeSegment`, `ResolvedClozePassage` types | Modify |
| `src/types/session.ts` | add `'cloze-passage'` to `ExerciseType` | Modify |
| `src/lib/cloze.ts` | pure: extract gaps, grade → `ExerciseResult[]` | Create |
| `tests/lib/cloze.test.ts` | unit tests for the pure grader | Create |
| `content/passages/a1.json`, `a2.json` | authored pilot passages (snake_case) | Create |
| `src/lib/passage-pool.ts` | client static passages → `SEED_PASSAGES`, `SEED_PASSAGE_IDS` | Create |
| `tests/lib/passage-pool.test.ts` | loader/mapping tests | Create |
| `src/components/session/exercises/ClozePassageExercise.tsx` | typed-inline-gaps UI | Create |
| `src/components/session/ExerciseCard.tsx` | route `'cloze-passage'` | Modify |
| `src/hooks/useSession.ts` | cloze resolve branch + `submitClozeResults` + `currentCloze` | Modify |
| `src/components/session/SessionScreen.tsx` | render cloze component for cloze items | Modify |
| `src/engine/scheduler.ts` | select cloze items by `primaryConceptId` + level + passed filter | Modify |

---

## Phase 1 — Types + pure grader (TDD)

### Task 1: ClozePassage types

**Files:**
- Modify: `src/types/content.ts`

- [ ] **Step 1: Add the types** (append after the existing `ResolvedContent` interface)

```ts
export type ClozeSegment =
  | { kind: 'text'; value: string }
  | {
      kind: 'gap';
      answer: string;            // correct word/phrase the learner types
      acceptedAnswers?: string[]; // optional equivalents
      conceptId: string;         // concept THIS gap targets
      errorTag: ErrorTag;        // tag logged on a wrong answer for this gap
    };

export interface ClozePassage {
  id: string;
  cefrLevel: CEFRLevel;
  primaryConceptId: string;      // drives scheduling/selectionReason
  englishGloss: string;          // full-passage hint (shown small/muted)
  segments: ClozeSegment[];
  difficulty: DifficultyTier;
  title?: string;
}

// What the cloze component receives (parallel to ResolvedContent for sentences).
export interface ResolvedClozePassage extends ClozePassage {
  source: 'seed' | 'generated';
}
```

`ErrorTag`, `CEFRLevel`, `DifficultyTier` are already imported/defined in this file.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no usages yet).

- [ ] **Step 3: Commit**

```bash
git add src/types/content.ts
git commit -m "feat(cloze): add ClozePassage content types"
```

---

### Task 2: Pure cloze grader (`src/lib/cloze.ts`)

The testable core of Rule 8: turning a passage + answers into per-gap `ExerciseResult`s.

**Files:**
- Create: `src/lib/cloze.ts`
- Test: `tests/lib/cloze.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { getClozeGaps, buildClozeResults } from '@/lib/cloze';
import type { ClozePassage } from '@/types/content';

const PASSAGE: ClozePassage = {
  id: 'cz-1',
  cefrLevel: 'A1',
  primaryConceptId: 'v2-word-order',
  englishGloss: 'I get up early. Then I drink coffee.',
  difficulty: 1,
  segments: [
    { kind: 'text', value: 'Jeg ' },
    { kind: 'gap', answer: 'står', conceptId: 'v2-word-order', errorTag: 'word-order' },
    { kind: 'text', value: ' opp tidlig. Så ' },
    { kind: 'gap', answer: 'drikker', conceptId: 'present-tense-regular', errorTag: 'verb-conjugation' },
    { kind: 'text', value: ' jeg kaffe.' },
  ],
};

describe('getClozeGaps', () => {
  it('returns gap segments in order', () => {
    const gaps = getClozeGaps(PASSAGE);
    expect(gaps.map((g) => g.answer)).toEqual(['står', 'drikker']);
    expect(gaps[1].conceptId).toBe('present-tense-regular');
  });
});

describe('buildClozeResults', () => {
  it('produces one result per gap with the gap concept and error tag', () => {
    const results = buildClozeResults({
      passage: PASSAGE, answers: ['feil', 'drikker'], sessionId: 's1', itemId: 'item1', timeTakenSeconds: 30,
    });
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ conceptId: 'v2-word-order', correct: false, errorTag: 'word-order' });
    expect(results[1]).toMatchObject({ conceptId: 'present-tense-regular', correct: true });
    expect(results[1].errorTag).toBeUndefined();
  });

  it('grades case/punctuation-insensitively (reuses checkAnswer)', () => {
    const results = buildClozeResults({
      passage: PASSAGE, answers: [' STÅR ', 'Drikker'], sessionId: 's1', itemId: 'item1', timeTakenSeconds: 10,
    });
    expect(results.every((r) => r.correct)).toBe(true);
  });

  it('marks the passage passed (only) when all gaps correct: first result carries passage id', () => {
    const allRight = buildClozeResults({ passage: PASSAGE, answers: ['står', 'drikker'], sessionId: 's1', itemId: 'i', timeTakenSeconds: 5 });
    expect(allRight[0].sentenceId).toBe('cz-1');
    expect(allRight.slice(1).every((r) => r.sentenceId === undefined)).toBe(true);
  });

  it('does NOT mark passed when any gap wrong: no result carries passage id', () => {
    const oneWrong = buildClozeResults({ passage: PASSAGE, answers: ['feil', 'drikker'], sessionId: 's1', itemId: 'i', timeTakenSeconds: 5 });
    expect(oneWrong.some((r) => r.sentenceId === 'cz-1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/cloze.test.ts`
Expected: FAIL — `getClozeGaps`/`buildClozeResults` not exported.

- [ ] **Step 3: Implement `src/lib/cloze.ts`**

```ts
import { checkAnswer } from '@/lib/answer';
import type { ClozePassage, ClozeSegment } from '@/types/content';
import type { ExerciseResult } from '@/types/session';

export type ClozeGap = Extract<ClozeSegment, { kind: 'gap' }>;

export function getClozeGaps(passage: ClozePassage): ClozeGap[] {
  return passage.segments.filter((s): s is ClozeGap => s.kind === 'gap');
}

function gapCorrect(gap: ClozeGap, answer: string): boolean {
  if (checkAnswer(answer, gap.answer)) return true;
  return (gap.acceptedAnswers ?? []).some((a) => checkAnswer(answer, a));
}

/**
 * Grade a typed cloze passage into one ExerciseResult per gap.
 * Per-gap results carry the gap's own conceptId + errorTag (Rule 8 diagnosis).
 * sentenceId is left undefined so a single correct gap never marks the passage
 * passed; only when EVERY gap is correct does the first result carry the
 * passage id, so recordResult marks the whole passage passed exactly once.
 */
export function buildClozeResults(params: {
  passage: ClozePassage;
  answers: string[];
  sessionId: string;
  itemId: string;
  timeTakenSeconds: number;
}): ExerciseResult[] {
  const { passage, answers, sessionId, itemId, timeTakenSeconds } = params;
  const gaps = getClozeGaps(passage);
  const perGap = timeTakenSeconds / Math.max(1, gaps.length);

  const results: ExerciseResult[] = gaps.map((gap, i) => {
    const userAnswer = answers[i] ?? '';
    const correct = gapCorrect(gap, userAnswer);
    return {
      sessionId,
      itemId,
      correct,
      userAnswer,
      correctAnswer: gap.answer,
      timeTakenSeconds: perGap,
      errorTag: correct ? undefined : gap.errorTag,
      conceptId: gap.conceptId,
      sentenceId: undefined,
    };
  });

  if (results.length > 0 && results.every((r) => r.correct)) {
    results[0] = { ...results[0], sentenceId: passage.id };
  }
  return results;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/lib/cloze.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cloze.ts tests/lib/cloze.test.ts
git commit -m "feat(cloze): pure per-gap grader with passage-passed semantics"
```

---

## Phase 2 — Exercise type + content + loader

### Task 3: Register the exercise type

**Files:**
- Modify: `src/types/session.ts:5-15`

- [ ] **Step 1: Add `'cloze-passage'` to the union**

```ts
export type ExerciseType =
  | 'translation-to-norwegian'
  | 'translation-to-english'
  | 'sentence-transformation'
  | 'fill-in-blank'
  | 'word-order'
  | 'listening-comprehension'
  | 'dictation'
  | 'reading-comprehension'
  | 'free-writing'
  | 'speed-round'
  | 'cloze-passage';
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git add src/types/session.ts && git commit -m "feat(cloze): register cloze-passage exercise type"`

---

### Task 4: Author the pilot passages (content + linguist gate)

**Files:**
- Create: `content/passages/a1.json`, `content/passages/a2.json`

- [ ] **Step 1: Author A1 pilot passages** (snake_case; 3–5 coherent sentences; gaps target the primary concept + at most one earlier concept). Start with 3 passages for `v2-word-order`, `present-tense-regular`, `noun-gender`.

`content/passages/a1.json`:
```json
[
  {
    "id": "cz-a1-v2-morning",
    "cefr_level": "A1",
    "primary_concept_id": "v2-word-order",
    "english_gloss": "I get up early every day. Then I drink a cup of coffee. At eight o'clock I leave for work.",
    "difficulty": 1,
    "segments": [
      { "kind": "text", "value": "Jeg står opp tidlig hver dag. Så " },
      { "kind": "gap", "answer": "drikker", "concept_id": "present-tense-regular", "error_tag": "verb-conjugation" },
      { "kind": "text", "value": " jeg en kopp kaffe. Klokka åtte " },
      { "kind": "gap", "answer": "drar", "concept_id": "v2-word-order", "error_tag": "word-order" },
      { "kind": "text", "value": " jeg til jobb." }
    ]
  }
]
```
(Add 2 more A1 passages following the same shape; keep each gap's `concept_id` to A1 concepts present in the A1 graph, and `error_tag` to a valid tag from the 17-tag taxonomy.)

- [ ] **Step 2: Author A2 pilot passages** — `content/passages/a2.json`, same shape, 2–3 passages for high-value A2 concepts (e.g. `preterite-regular`, `adjective-agreement`).

- [ ] **Step 3: Linguist review gate (BLOCKING — do not seed un-reviewed)**

Run the `norwegian-linguist` agent on every authored passage. Fix any flag/rewrite verdict before proceeding. This mirrors how A1/A2 sentences were built (memory: never seed staging without a linguist pass).

- [ ] **Step 4: Commit** (only after linguist PASS)

```bash
git add content/passages/a1.json content/passages/a2.json
git commit -m "content(cloze): A1/A2 pilot passages (linguist-reviewed)"
```

---

### Task 5: Client passage loader (`src/lib/passage-pool.ts`)

Mirrors `src/lib/seed-pool.ts`. Maps snake_case → `ClozePassage`, indexes by `primaryConceptId`.

**Files:**
- Create: `src/lib/passage-pool.ts`
- Test: `tests/lib/passage-pool.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { SEED_PASSAGES, SEED_PASSAGE_IDS } from '@/lib/passage-pool';

describe('passage-pool', () => {
  it('loads passages keyed by id with camelCase fields', () => {
    const p = SEED_PASSAGES['cz-a1-v2-morning'];
    expect(p).toBeDefined();
    expect(p.primaryConceptId).toBe('v2-word-order');
    expect(p.segments.some((s) => s.kind === 'gap')).toBe(true);
  });

  it('indexes passage ids by primaryConceptId', () => {
    expect(SEED_PASSAGE_IDS['v2-word-order']).toContain('cz-a1-v2-morning');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run tests/lib/passage-pool.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/passage-pool.ts`**

```ts
import a1Raw from '@content/passages/a1.json';
import a2Raw from '@content/passages/a2.json';
import type { ClozePassage, ClozeSegment } from '@/types/content';

interface RawSegment {
  kind: 'text' | 'gap';
  value?: string;
  answer?: string;
  accepted_answers?: string[];
  concept_id?: string;
  error_tag?: string;
}
interface RawPassage {
  id: string;
  cefr_level?: string;
  primary_concept_id?: string;
  english_gloss?: string;
  difficulty?: number;
  title?: string;
  segments?: RawSegment[];
}

function mapSegment(r: RawSegment): ClozeSegment {
  if (r.kind === 'gap') {
    return {
      kind: 'gap',
      answer: r.answer ?? '',
      acceptedAnswers: r.accepted_answers,
      conceptId: r.concept_id ?? '',
      errorTag: (r.error_tag ?? 'unspecified') as ClozeSegment extends { kind: 'gap' } ? never : never,
    } as ClozeSegment;
  }
  return { kind: 'text', value: r.value ?? '' };
}

function mapPassage(r: RawPassage): ClozePassage {
  return {
    id: r.id,
    cefrLevel: (r.cefr_level ?? 'A1') as ClozePassage['cefrLevel'],
    primaryConceptId: r.primary_concept_id ?? '',
    englishGloss: r.english_gloss ?? '',
    difficulty: (r.difficulty ?? 1) as ClozePassage['difficulty'],
    title: r.title,
    segments: (r.segments ?? []).map(mapSegment),
  };
}

const RAW: RawPassage[] = [
  ...(a1Raw as RawPassage[]),
  ...(a2Raw as RawPassage[]),
];

export const SEED_PASSAGES: Record<string, ClozePassage> = {};
export const SEED_PASSAGE_IDS: Record<string, string[]> = {};

for (const raw of RAW) {
  const p = mapPassage(raw);
  SEED_PASSAGES[p.id] = p;
  if (!SEED_PASSAGE_IDS[p.primaryConceptId]) SEED_PASSAGE_IDS[p.primaryConceptId] = [];
  SEED_PASSAGE_IDS[p.primaryConceptId].push(p.id);
}
```

Note: the `errorTag` cast above is awkward — replace with a direct cast `as import('@/types/taxonomy').ErrorTag`. Use:
```ts
import type { ErrorTag } from '@/types/taxonomy';
// ...in mapSegment gap branch:
errorTag: (r.error_tag ?? 'unspecified') as ErrorTag,
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run tests/lib/passage-pool.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git add src/lib/passage-pool.ts tests/lib/passage-pool.test.ts && git commit -m "feat(cloze): client passage loader indexed by primaryConceptId"`

---

## Phase 3 — Component

### Task 6: `ClozePassageExercise` component

**Files:**
- Create: `src/components/session/exercises/ClozePassageExercise.tsx`

- [ ] **Step 1: Implement the component** (typed inline gaps, cream card context matching FillInBlankExercise, deterministic grading, inline correct/wrong, single submit → `onClozeResults`)

```tsx
'use client';

import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ExerciseResult } from '@/types/session';
import type { ResolvedClozePassage } from '@/types/content';
import { getClozeGaps, buildClozeResults } from '@/lib/cloze';

interface ClozePassageExerciseProps {
  passage: ResolvedClozePassage;
  sessionId: string;
  itemId: string;
  onClozeResults: (results: ExerciseResult[]) => void;
}

export function ClozePassageExercise({ passage, sessionId, itemId, onClozeResults }: ClozePassageExerciseProps) {
  const gaps = useMemo(() => getClozeGaps(passage), [passage]);
  const [answers, setAnswers] = useState<string[]>(() => gaps.map(() => ''));
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<ExerciseResult[] | null>(null);
  const startRef = useRef(Date.now());

  function setAnswer(i: number, value: string) {
    if (submitted) return;
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? value : a)));
  }

  function submit() {
    if (submitted || answers.some((a) => !a.trim())) return;
    const built = buildClozeResults({
      passage, answers, sessionId, itemId,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
    });
    setResults(built);
    setSubmitted(true);
    onClozeResults(built);
  }

  let gapCursor = -1;
  const allFilled = answers.every((a) => a.trim().length > 0);

  return (
    <div className="space-y-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Fyll inn teksten</p>

      <motion.div
        className="font-display text-[1.15rem] font-extrabold leading-[1.55] tracking-[-0.01em] text-[var(--nc-cream-text)]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {passage.segments.map((seg, idx) => {
          if (seg.kind === 'text') return <span key={idx}>{seg.value}</span>;
          gapCursor += 1;
          const i = gapCursor;
          const res = results?.[i];
          const state = res ? (res.correct ? 'correct' : 'wrong') : 'idle';
          return (
            <input
              key={idx}
              type="text"
              value={answers[i]}
              onChange={(e) => setAnswer(i, e.target.value)}
              disabled={submitted}
              aria-label={`Luke ${i + 1}`}
              className={[
                'mx-1 inline-flex min-h-[44px] min-w-[96px] rounded-[0.45rem] border-[1.5px] px-2 py-1 align-middle text-[1rem] font-bold',
                state === 'correct'
                  ? 'border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] text-[#4A6A00]'
                  : state === 'wrong'
                    ? 'border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] text-[var(--nc-red)]'
                    : 'border-[rgba(120,150,20,0.7)] bg-[rgba(200,255,32,0.10)] text-[var(--nc-cream-text)]',
              ].join(' ')}
            />
          );
        })}
      </motion.div>

      <p className="text-[0.82rem] text-[var(--nc-cream-muted)]">{passage.englishGloss}</p>

      {!submitted ? (
        <button
          onClick={submit}
          disabled={!allFilled}
          className="nc-button-primary flex min-h-[52px] w-full items-center justify-center gap-2 py-3.5 text-[0.9375rem] font-bold disabled:cursor-not-allowed disabled:opacity-30"
        >
          Sjekk svar
        </button>
      ) : null}

      <div aria-live="polite" className="sr-only">
        {results ? (results.every((r) => r.correct) ? 'Alle riktige.' : 'Noen svar var feil.') : ''}
      </div>
    </div>
  );
}
```

(Repair after submit is driven by the engine layer injecting repair items — the component's job ends at `onClozeResults`. The `nc-red-border`/`nc-red-tint` tokens already exist; confirm in `globals.css` during implementation and fall back to `--nc-red` if absent.)

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git add src/components/session/exercises/ClozePassageExercise.tsx && git commit -m "feat(cloze): typed-inline-gaps ClozePassageExercise component"`

---

### Task 7: Route cloze through ExerciseCard

**Files:**
- Modify: `src/components/session/ExerciseCard.tsx`

- [ ] **Step 1: Extend props + switch.** Add optional `clozePassage` + `onClozeResults` to `ExerciseCardProps`; add the import and the case.

```tsx
import { ClozePassageExercise } from './exercises/ClozePassageExercise'
import type { ResolvedClozePassage } from '@/types/content'

interface ExerciseCardProps {
  item: SessionItem
  sentence: ResolvedContent
  sessionId: string
  onResult: (result: ExerciseResult) => void
  repairPlan?: RepairPlan | null
  clozePassage?: ResolvedClozePassage | null
  onClozeResults?: (results: ExerciseResult[]) => void
}
```
In `renderExercise()` switch, before `default`:
```tsx
      case 'cloze-passage':
        if (clozePassage && onClozeResults) {
          return (
            <ClozePassageExercise
              passage={clozePassage}
              sessionId={sessionId}
              itemId={item.id}
              onClozeResults={onClozeResults}
            />
          )
        }
        return <TranslationExercise {...props} />
```
(Destructure `clozePassage` and `onClozeResults` in the component signature.)

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git add src/components/session/ExerciseCard.tsx && git commit -m "feat(cloze): route cloze-passage through ExerciseCard"`

---

## Phase 4 — Engine wiring (Rule 8 core)

### Task 8: Resolve cloze items into a parallel passage cache

**Files:**
- Modify: `src/hooks/useSession.ts`

- [ ] **Step 1: Add the passage cache + cloze resolve branch.** Near the top of `useSession`, add a ref alongside `contentCache`:

```ts
import { SEED_PASSAGES, SEED_PASSAGE_IDS } from '@/lib/passage-pool';
import type { ResolvedClozePassage } from '@/types/content';
// ...
const passageCache = useRef<Map<string, ResolvedClozePassage>>(new Map());
```

In `resolveItem`, at the very top (before the sentence seed path), branch on cloze:

```ts
if (item.exerciseType === 'cloze-passage') {
  if (passageCache.current.has(item.id)) return;
  const conceptId = item.conceptIds[0] ?? '';
  const passedIds = useFingerprintStore.getState().fingerprint?.passedSentenceIds ?? {};
  const candidateIds = (SEED_PASSAGE_IDS[conceptId] ?? []).filter((id) => !passedIds[id]);
  const pickId = candidateIds[Math.floor(Math.random() * candidateIds.length)]
    ?? (SEED_PASSAGE_IDS[conceptId] ?? [])[0];
  const passage = pickId ? SEED_PASSAGES[pickId] : undefined;
  if (passage) {
    passageCache.current.set(item.id, { ...passage, source: 'seed' });
    forceUpdate((n) => n + 1);
  }
  return;
}
```

Expose it from the hook return: add `currentCloze` next to `currentContent`:
```ts
const currentCloze = currentItem ? passageCache.current.get(currentItem.id) : undefined;
// ...in the returned object:
currentCloze,
```
Clear `passageCache.current.clear()` wherever `contentCache.current.clear()` is called (in `startNewSession`).

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git add src/hooks/useSession.ts && git commit -m "feat(cloze): resolve cloze items into a parallel passage cache (no contentCache regression)"`

---

### Task 9: `submitClozeResults` — fingerprint writes + per-gap repair

**Files:**
- Modify: `src/hooks/useSession.ts`

- [ ] **Step 1: Add `submitClozeResults`** (sibling to `submitResult`). Records each gap result, emits events, and injects one single-sentence repair per wrong gap.

```ts
const submitClozeResults = useCallback((results: ExerciseResult[]) => {
  const sessionId = useSessionStore.getState().session?.id;
  const currentIndex = useSessionStore.getState().currentItemIndex;

  // 1. Record every gap into the fingerprint (mastery + error log + passed-passage via results[0].sentenceId)
  for (const r of results) {
    sessionStore.recordResult(r);
    recordFingerprintResult(r);
    emitEvent({
      eventType: 'exercise_result',
      mode: 'session',
      sessionId,
      conceptIds: [r.conceptId],
      errorTags: r.errorTag ? [r.errorTag] : [],
      payload: { correct: r.correct, exerciseType: 'cloze-passage' },
    });
  }

  // 2. Build a single-sentence repair per wrong gap, injected after the passage.
  const wrong = results.filter((r) => !r.correct);
  const repairItems: SessionItem[] = [];
  for (const r of wrong) {
    const error = {
      id: crypto.randomUUID(),
      conceptId: r.conceptId,
      errorTag: r.errorTag ?? 'unspecified',
      exerciseType: 'fill-in-blank' as ExerciseType, // single-sentence drill, not a nested cloze
      wrong: r.userAnswer,
      correct: r.correctAnswer,
      timestamp: new Date().toISOString(),
      sentenceId: undefined,
    } as const;
    const plan = buildRepairPlan(error);
    const conceptSentenceIds = (availableSentenceIdsProp[r.conceptId] ?? []);
    repairItems.push(...makeRepairItems(error, plan, conceptSentenceIds));
  }

  if (repairItems.length > 0) {
    // resolve the first repair item so the learner doesn't land on a blank card
    void resolveItem(repairItems[0]);
    repairItems.slice(1).forEach((it) => { resolveItem(it); });
    useSessionStore.getState().injectRepairItems(repairItems, currentIndex);
  }

  // 3. Advance past the passage (repairs, if any, are now queued next).
  sessionStore.advanceItem();
}, [sessionStore, recordFingerprintResult, availableSentenceIdsProp, resolveItem]);
```

Add `submitClozeResults` to the hook's returned object. Ensure `ExerciseType`, `buildRepairPlan`, `makeRepairItems`, `SessionItem` are imported (most already are via `@/engine`).

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git add src/hooks/useSession.ts && git commit -m "feat(cloze): submitClozeResults — per-gap fingerprint writes + per-gap repair injection"`

---

### Task 10: Render cloze in SessionScreen

**Files:**
- Modify: `src/components/session/SessionScreen.tsx`

- [ ] **Step 1: Pull `currentCloze` + `submitClozeResults` from the hook**, and pass them to `ExerciseCard` for cloze items. In the render branch that currently guards `currentItem && currentContent ?`, allow cloze items to render when `currentCloze` is present:

```tsx
// destructure from useSession(...)
const { /* existing */ currentCloze, submitClozeResults } = /* hook result */;

const isCloze = currentItem?.exerciseType === 'cloze-passage';
const hasContent = isCloze ? !!currentCloze : !!currentContent;
```
Replace the render condition `currentItem && currentContent ?` with `currentItem && hasContent ?`, and pass cloze props into `<ExerciseCard>`:
```tsx
<ExerciseCard
  item={currentItem}
  sentence={currentContent ?? /* cloze has no sentence; pass a minimal stub */ (currentCloze as unknown as ResolvedContent)}
  sessionId={session.id}
  onResult={handleResult}
  clozePassage={currentCloze ?? null}
  onClozeResults={submitClozeResults}
/>
```
For cloze items `currentContent` is undefined; `ExerciseCard`'s cloze branch ignores `sentence`, so passing the passage stub is safe. (Cleaner alternative: make `sentence` optional in `ExerciseCardProps` and skip the stub — prefer this if the typecheck allows it without touching the other exercise components.)

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → PASS.
- [ ] **Step 3: Commit** — `git add src/components/session/SessionScreen.tsx && git commit -m "feat(cloze): render cloze passages in the session screen"`

---

## Phase 5 — Scheduler selection

### Task 11: Schedule cloze items (conservative quota)

**Files:**
- Modify: `src/engine/scheduler.ts`

- [ ] **Step 1: Read the scheduler first.** Run: `npx vitest run tests/` to confirm baseline green, then read `src/engine/scheduler.ts` to locate where `lær`-block items are built and where `selectionReason`/level filtering happen.

- [ ] **Step 2: Add a bounded cloze insertion.** When the learner's level has authored passages for a focus concept (`SEED_PASSAGE_IDS[conceptId]` non-empty, level-matched, not all passed), emit **at most one** `cloze-passage` `SessionItem` into the `lær` block for the top focus concept:

```ts
// pseudo-shape — adapt to scheduler's existing item-builder:
{
  id: crypto.randomUUID(),
  exerciseType: 'cloze-passage',
  contentId: /* a passage id for primaryConceptId, or '' (resolveItem picks) */ '',
  conceptIds: [focusConceptId],
  estimatedSeconds: 90,
  isRepairItem: false,
  purpose: 'new-material',
  selectionReason: 'weekly_focus',
}
```
Gate it behind a level + passage-availability check and a single-per-session cap so cloze complements rather than replaces single-sentence work.

- [ ] **Step 3: Add a scheduler test** in the existing scheduler test file: given a fingerprint whose focus concept has an authored passage at the learner's level, the generated session contains exactly one `cloze-passage` item with `selectionReason: 'weekly_focus'`; given no authored passage, it contains none.

- [ ] **Step 4: Run tests** — `npx vitest run tests/` → PASS (baseline + new).
- [ ] **Step 5: Commit** — `git add src/engine/scheduler.ts tests/ && git commit -m "feat(cloze): schedule at most one cloze passage per session for the focus concept"`

---

## Phase 6 — Verification (the part that proves it's real)

### Task 12: Rule 8 end-to-end trace (live session, not theory)

- [ ] **Step 1:** `npm run dev`, open a session, force a cloze passage (focus concept with an authored passage).
- [ ] **Step 2:** Answer one gap wrong (concept Y), the rest right (primary concept X). Submit.
- [ ] **Step 3: Verify the writes** in order (DevTools + IndexedDB inspector / fingerprint store):
  - An error-log entry is added under **concept Y** (not X), with Y's `errorTag`.
  - Y's `conceptMastery` `attemptCount` increments and `decayedScore` changes; X's mastery reflects a correct attempt.
  - A repair item (`fill-in-blank`, `selectionReason: 'repair_target'`, `conceptIds: [Y]`) is injected immediately after the passage and the `ExplanationCard` shows on the retry.
  - Completing the repair retry schedules SRS (`nextReviewAt`/`srsLevel`) for Y.
  - The passage id is **absent** from `passedSentenceIds` (because a gap was wrong).
- [ ] **Step 4:** Repeat with all gaps correct → confirm the passage id **is** added to `passedSentenceIds` exactly once, and re-running a session does not re-serve that passage (passed filter in Task 8).
- [ ] **Step 5:** Record the trace in the PR description / a comment — evidence, not assertion (Operating Rule 3 + 8).

### Task 13: Quality gates + responsive + AI-off

- [ ] **Step 1: AI-unavailable check** — disable network/AI; confirm cloze grades and repairs fully without AI (deterministic path).
- [ ] **Step 2: Responsive renders** — render the cloze exercise at 375 / 768 / 1280 / 1920; confirm no horizontal scroll at 375px, gaps wrap, inputs ≥44px. Save screenshots to `.claude/screenshots/cloze-passage/`.
- [ ] **Step 3: Quality gate skills** — run `/baseline-ui` → `/fixing-accessibility` → `/fixing-motion-performance` → `/polish` on `ClozePassageExercise.tsx`. Fix findings.
- [ ] **Step 4: Full test suite** — `npx vitest run` → all green.
- [ ] **Step 5: Final commit** — `git add -A && git commit -m "test(cloze): Rule 8 trace evidence + quality-gate fixes"`

---

## Out of scope (do not implement here)
AI-generated passages (deferred — Wave 6.4/B2: server `generate` action) · algorithmic gap selection (spaCy) · guided composition / dictogloss / other types · B1/B2 passage coverage (pilot is A1/A2) · sticky-CTA thumb-zone refinement (Wave-3 representation work).

---

## Self-review notes
- **Spec coverage:** §3 data model → Task 1/5; §4 type+routing → Task 3/7; §4 resolution (parallel cache, refined from union-widening to eliminate regression) → Task 8; §5 engine path/Rule 8 → Task 2/9/12; §6 component → Task 6; §7 repair → Task 9 (fill-in-blank repairs); §8 scheduler → Task 11; §9 pilot scope → Task 4; §10 acceptance → Task 12/13. All covered.
- **Refinement vs spec:** spec §4 proposed widening `ResolvedContent | ResolvedClozePassage`; this plan uses a **parallel `passageCache`** instead — same outcome, strictly lower regression risk to single-sentence resolution (serves the spec's stated goal). Flagged here for the reviewer.
- **Type consistency:** `buildClozeResults`/`getClozeGaps` (Task 2) used identically in Task 6; `ResolvedClozePassage` (Task 1) used in Tasks 6/7/8; `SEED_PASSAGES`/`SEED_PASSAGE_IDS` (Task 5) used in Task 8. Repair uses `'fill-in-blank'` consistently (Task 9).
- **Known follow-up:** `passage-pool.ts` `errorTag` cast — use the explicit `as ErrorTag` form shown in Task 5 Step 3, not the awkward conditional type.
