# NorskCoach Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all six screens (landing, onboarding, dashboard, session, complete, progress) wired to the live adaptive engine, working in full guest mode with no login required.

> **DESIGN DIRECTION (updated):** Dark UI throughout — `#0d0d14` background on ALL screens, `#1a1a26` cards, lime green `#a8ef6a` as the single accent color. No cream/light mode. Text is white hierarchy. See Task 1 for the full token set.

**Architecture:** Next.js App Router pages for each route. Zustand stores (`useSessionStore`, `useFingerprintStore`) carry state across navigation. IndexedDB persists the fingerprint. Mock sentences in `src/lib/mock-sentences.ts` provide dev content until Supabase is seeded.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand, `idb`, `lucide-react`, shadcn/ui Button.

---

## Task 1: Design tokens + streak utility

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`
- Create: `src/lib/streak.ts`

- [ ] **Step 1: Add CSS custom properties to globals.css**

Open `src/app/globals.css`. In the `:root` block (after the existing variables), add:

```css
/* NorskCoach dark design tokens */
--nc-bg: #0d0d14;
--nc-card: #1a1a26;
--nc-green: #a8ef6a;
--nc-green-tint: rgba(168, 239, 106, 0.08);
--nc-green-border: rgba(168, 239, 106, 0.18);
--nc-border: rgba(255, 255, 255, 0.07);
--nc-border-subtle: rgba(255, 255, 255, 0.04);
--nc-text: #ffffff;
--nc-text-muted: rgba(255, 255, 255, 0.35);
--nc-text-dim: rgba(255, 255, 255, 0.55);
--nc-repair-bg: rgba(168, 239, 106, 0.06);
--nc-repair-border: rgba(168, 239, 106, 0.15);
```

Also update the `body` background in globals.css to use the token:
```css
body {
  background-color: #0d0d14;
}
```

- [ ] **Step 2: Add Tailwind color tokens**

In `tailwind.config.ts`, inside `theme.extend.colors`, add:

```ts
nc: {
  bg: '#0d0d14',
  card: '#1a1a26',
  green: '#a8ef6a',
  'green-tint': 'rgba(168,239,106,0.08)',
  'green-border': 'rgba(168,239,106,0.18)',
  border: 'rgba(255,255,255,0.07)',
  'repair-bg': 'rgba(168,239,106,0.06)',
  'repair-border': 'rgba(168,239,106,0.15)',
  'text-muted': 'rgba(255,255,255,0.35)',
  'text-dim': 'rgba(255,255,255,0.55)',
},
```

- [ ] **Step 3: Create streak utility**

Create `src/lib/streak.ts`:

```ts
const KEY = 'norskcoach_streak'

interface StreakData {
  count: number
  lastDate: string // YYYY-MM-DD
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getStreak(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return 0
    const data: StreakData = JSON.parse(raw)
    const today = todayStr()
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (data.lastDate === today || data.lastDate === yesterday) return data.count
    return 0
  } catch {
    return 0
  }
}

export function incrementStreak(): void {
  if (typeof window === 'undefined') return
  try {
    const today = todayStr()
    const existing = getStreak()
    const data: StreakData = {
      count: existing + 1,
      lastDate: today,
    }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable — ignore
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css tailwind.config.ts src/lib/streak.ts
git commit -m "feat: add design tokens (nc-*) and streak utility"
```

---

## Task 2: Mock sentences for dev

**Files:**
- Create: `src/lib/mock-sentences.ts`

- [ ] **Step 1: Create mock-sentences.ts**

Create `src/lib/mock-sentences.ts`:

```ts
import type { Sentence } from '@/types/content'

export const MOCK_SENTENCES: Record<string, Sentence> = {
  'mock-s1': {
    id: 'mock-s1',
    norwegian: 'Jeg har en bil.',
    english: 'I have a car.',
    conceptIds: ['noun-gender', 'indefinite-articles'],
    vocabularyClusters: ['everyday-objects'],
    errorTagsDetectable: ['noun-gender', 'article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'translation-to-norwegian', 'fill-in-blank'],
  },
  'mock-s2': {
    id: 'mock-s2',
    norwegian: 'Hun er en lege.',
    english: 'She is a doctor.',
    conceptIds: ['noun-gender', 'indefinite-articles'],
    vocabularyClusters: ['people-family'],
    errorTagsDetectable: ['noun-gender', 'article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'fill-in-blank'],
  },
  'mock-s3': {
    id: 'mock-s3',
    norwegian: 'Vi spiser et eple.',
    english: 'We are eating an apple.',
    conceptIds: ['noun-gender', 'indefinite-articles'],
    vocabularyClusters: ['food-drink'],
    errorTagsDetectable: ['noun-gender', 'article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'translation-to-norwegian'],
  },
  'mock-s4': {
    id: 'mock-s4',
    norwegian: 'Bilen er rød.',
    english: 'The car is red.',
    conceptIds: ['definite-articles-singular'],
    vocabularyClusters: ['everyday-objects'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'fill-in-blank'],
  },
  'mock-s5': {
    id: 'mock-s5',
    norwegian: 'Eplet er gult.',
    english: 'The apple is yellow.',
    conceptIds: ['definite-articles-singular'],
    vocabularyClusters: ['food-drink'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'fill-in-blank'],
  },
  'mock-s6': {
    id: 'mock-s6',
    norwegian: 'Huset er stort.',
    english: 'The house is big.',
    conceptIds: ['definite-articles-singular'],
    vocabularyClusters: ['everyday-objects'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'translation-to-norwegian'],
  },
  'mock-s7': {
    id: 'mock-s7',
    norwegian: 'De har mange biler.',
    english: 'They have many cars.',
    conceptIds: ['plural-formation'],
    vocabularyClusters: ['everyday-objects'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 2,
    exerciseTypes: ['translation-to-english', 'fill-in-blank'],
  },
  'mock-s8': {
    id: 'mock-s8',
    norwegian: 'Jeg ser to hunder.',
    english: 'I see two dogs.',
    conceptIds: ['plural-formation'],
    vocabularyClusters: ['animals'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'translation-to-norwegian'],
  },
  'mock-s9': {
    id: 'mock-s9',
    norwegian: 'Et barn leker i parken.',
    english: 'A child plays in the park.',
    conceptIds: ['noun-gender', 'indefinite-articles'],
    vocabularyClusters: ['people-family'],
    errorTagsDetectable: ['noun-gender', 'article-use'],
    cefrLevel: 'A1',
    difficulty: 2,
    exerciseTypes: ['translation-to-english', 'word-order'],
  },
  'mock-s10': {
    id: 'mock-s10',
    norwegian: 'Husene er nye.',
    english: 'The houses are new.',
    conceptIds: ['definite-articles-plural', 'plural-formation'],
    vocabularyClusters: ['everyday-objects'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 2,
    exerciseTypes: ['translation-to-english', 'fill-in-blank'],
  },
}

// conceptId → array of sentence IDs (for generateSession)
export const MOCK_SENTENCE_IDS: Record<string, string[]> = {}
for (const sentence of Object.values(MOCK_SENTENCES)) {
  for (const conceptId of sentence.conceptIds) {
    MOCK_SENTENCE_IDS[conceptId] = [...(MOCK_SENTENCE_IDS[conceptId] ?? []), sentence.id]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/mock-sentences.ts
git commit -m "feat: add mock sentences for dev (10 A1 sentences, 4 concepts)"
```

---

## Task 3: BottomNav + GuestBanner shared components

**Files:**
- Create: `src/components/layout/BottomNav.tsx`
- Create: `src/components/layout/GuestBanner.tsx`

- [ ] **Step 1: Create BottomNav**

Create `src/components/layout/BottomNav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { Home, BookOpen, BarChart2, User } from 'lucide-react'

export type NavTab = 'home' | 'session' | 'progress' | 'profile'

const TABS: { id: NavTab; label: string; href: string; Icon: React.ElementType }[] = [
  { id: 'home', label: 'Hjem', href: '/dashboard', Icon: Home },
  { id: 'session', label: 'Økt', href: '/session', Icon: BookOpen },
  { id: 'progress', label: 'Fremgang', href: '/progress', Icon: BarChart2 },
  { id: 'profile', label: 'Profil', href: '/profile', Icon: User },
]

export function BottomNav({ active }: { active: NavTab }) {
  return (
    <nav className="border-t border-nc-muted bg-nc-cream">
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = id === active
          return (
            <Link
              key={id}
              href={href}
              className="flex flex-col items-center gap-1 px-4 py-1"
            >
              <Icon
                size={20}
                className={isActive ? 'text-nc-orange' : 'text-[#bbb]'}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-semibold leading-none ${
                  isActive ? 'text-nc-orange' : 'text-[#bbb]'
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create GuestBanner**

Create `src/components/layout/GuestBanner.tsx`:

```tsx
'use client'

export function GuestBanner() {
  return (
    <div className="flex items-center justify-between rounded-xl bg-nc-repair-bg border border-nc-repair-border px-3 py-2 text-[11px]">
      <span className="text-[#7a6a50]">
        👤 Fremgangen din lagres lokalt.
      </span>
      <button className="font-bold text-nc-orange">
        Logg inn →
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/BottomNav.tsx src/components/layout/GuestBanner.tsx
git commit -m "feat: add BottomNav and GuestBanner layout components"
```

---

## Task 4: ConceptProgressRow + ScoreCircle

**Files:**
- Create: `src/components/progress/ConceptProgressRow.tsx`
- Create: `src/components/session/ScoreCircle.tsx`

- [ ] **Step 1: Create ConceptProgressRow**

Create `src/components/progress/ConceptProgressRow.tsx`:

```tsx
'use client'

import { motion } from 'framer-motion'

interface ConceptProgressRowProps {
  color: string
  name: string
  score: number        // 0–100
  locked?: boolean
  prereqLabel?: string // e.g. "Krever Noun gender"
}

export function ConceptProgressRow({
  color,
  name,
  score,
  locked = false,
  prereqLabel,
}: ConceptProgressRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ background: locked ? '#ddd' : color }}
      />
      <span className="w-28 flex-shrink-0 text-[11px] font-medium text-[#333] leading-tight">
        {name}
      </span>
      <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-nc-muted">
        {!locked && (
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </div>
      {locked ? (
        <span className="w-16 text-right text-[9px] text-[#ccc] leading-tight">{prereqLabel}</span>
      ) : (
        <span className="w-8 text-right text-[11px] font-semibold text-[#aaa]">{score}%</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create ScoreCircle**

Create `src/components/session/ScoreCircle.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'

interface ScoreCircleProps {
  accuracy: number // 0–100
  size?: number
}

export function ScoreCircle({ accuracy, size = 100 }: ScoreCircleProps) {
  const [animated, setAnimated] = useState(0)
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animated / 100) * circumference

  useEffect(() => {
    const t = setTimeout(() => setAnimated(accuracy), 80)
    return () => clearTimeout(t)
  }, [accuracy])

  return (
    <svg width={size} height={size} className="drop-shadow-sm">
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#ede9e0"
        strokeWidth={8}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e87c3e"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      {/* Label */}
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-display"
        style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 900 }}
        fontSize={size * 0.22}
        fill="#1a1a2e"
      >
        {accuracy}
      </text>
      <text
        x={size / 2}
        y={size / 2 + size * 0.17}
        textAnchor="middle"
        style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 }}
        fontSize={size * 0.1}
        fill="#aaa"
      >
        %
      </text>
    </svg>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/progress/ConceptProgressRow.tsx src/components/session/ScoreCircle.tsx
git commit -m "feat: add ConceptProgressRow and ScoreCircle components"
```

---

## Task 5: PlacementQuiz component + /onboarding page

**Files:**
- Create: `src/components/onboarding/PlacementQuiz.tsx`
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Create PlacementQuiz component**

Create `src/components/onboarding/PlacementQuiz.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { createEmptyFingerprint } from '@/types/fingerprint'
import { saveFingerprint } from '@/storage/indexeddb'

interface Question {
  text: string
  options: { label: string; value: string }[]
}

const QUESTIONS: Question[] = [
  {
    text: 'Hvor mye norsk kan du fra før?',
    options: [
      { label: 'Ingenting — helt nybegynner', value: 'none' },
      { label: 'Litt — kjenner noen ord', value: 'some' },
      { label: 'Grunnleggende — enkle setninger', value: 'basic' },
      { label: 'Middels — kan ha en samtale', value: 'intermediate' },
    ],
  },
  {
    text: 'Hva er vanskeligst for deg nå?',
    options: [
      { label: 'Ord og uttrykk', value: 'vocab' },
      { label: 'Grammatikk — f.eks. ordstilling', value: 'grammar' },
      { label: 'Lytte og forstå', value: 'listening' },
      { label: 'Vet ikke ennå', value: 'unknown' },
    ],
  },
  {
    text: 'Hva er målet ditt med norsk?',
    options: [
      { label: 'Jobb / integrering i Norge', value: 'work' },
      { label: 'Familie / sosialt', value: 'social' },
      { label: 'Reise / friluftsliv', value: 'travel' },
      { label: 'Akademisk / litteratur', value: 'academic' },
    ],
  },
]

function getOrCreateUserId(): string {
  const stored = localStorage.getItem('norsk-coach-anon-id')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('norsk-coach-anon-id', id)
  return id
}

function seedFingerprint(
  answers: string[],
  setFingerprint: (fp: ReturnType<typeof createEmptyFingerprint>) => void
) {
  const userId = getOrCreateUserId()
  const fp = createEmptyFingerprint(userId)

  // Q2: weakness pre-weights error patterns (not stored directly, but sets productionGap)
  if (answers[1] === 'vocab') {
    fp.productionGap['noun-gender'] = 30
    fp.productionGap['indefinite-articles'] = 30
  } else if (answers[1] === 'grammar') {
    fp.productionGap['noun-gender'] = 50
    fp.productionGap['indefinite-articles'] = 40
    fp.productionGap['definite-articles-singular'] = 40
  } else if (answers[1] === 'listening') {
    fp.productionGap['noun-gender'] = 20
  }

  setFingerprint(fp)
  saveFingerprint(fp).catch(console.warn)
  localStorage.setItem('norskcoach_onboarded', '1')
}

export function PlacementQuiz() {
  const router = useRouter()
  const { setFingerprint } = useFingerprintStore()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [direction, setDirection] = useState(1)

  const question = QUESTIONS[step]

  function advance(value: string) {
    const newAnswers = [...answers, value]
    setAnswers(newAnswers)
    if (step < QUESTIONS.length - 1) {
      setDirection(1)
      setSelected(null)
      setStep((s) => s + 1)
    } else {
      seedFingerprint(newAnswers, setFingerprint)
      setDone(true)
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        <div className="text-5xl">🎯</div>
        <div>
          <h2 className="text-xl font-extrabold text-nc-navy">Klar for A1!</h2>
          <p className="mt-2 text-sm text-[#888] leading-relaxed">
            Vi starter med grunnleggende ordklasser og artikler.
            <br />
            Motoren tilpasser seg etter hvert svar.
          </p>
        </div>
        <div className="w-full rounded-2xl bg-nc-navy p-4 text-left text-white">
          <div className="mb-1 text-[10px] uppercase tracking-widest opacity-40">Din første økt</div>
          <div className="text-base font-bold">Substantiv og artikler</div>
          <div className="mt-1 text-[11px] opacity-65">
            9 øvelser · ~12 min · motoren tilpasser seg
          </div>
        </div>
        <button
          onClick={() => router.push('/session')}
          className="w-full rounded-xl bg-nc-orange py-3.5 text-sm font-bold text-white"
        >
          Start første økt →
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-[#aaa] underline"
        >
          Gå til dashbord først
        </button>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Progress dots */}
      <div className="flex gap-2">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= step ? 'bg-nc-orange' : 'bg-nc-muted'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ x: direction * 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction * -40, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="flex flex-col gap-4"
        >
          <div>
            <div className="mb-1 text-[11px] font-semibold text-[#aaa]">
              Spørsmål {step + 1} av {QUESTIONS.length}
            </div>
            <h2 className="text-[18px] font-extrabold leading-snug text-nc-navy">
              {question.text}
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSelected(opt.value)
                  setTimeout(() => advance(opt.value), 180)
                }}
                className={`rounded-xl border-[1.5px] px-4 py-3 text-left text-[13px] font-medium transition-all duration-150 ${
                  selected === opt.value
                    ? 'border-nc-orange bg-nc-repair-bg text-nc-orange font-bold'
                    : 'border-nc-muted bg-white text-[#333] hover:border-nc-orange/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Create /onboarding page**

Create `src/app/onboarding/page.tsx`:

```tsx
import { PlacementQuiz } from '@/components/onboarding/PlacementQuiz'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Kom i gang — NorskCoach' }

export default function OnboardingPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-nc-cream">
      {/* Back arrow */}
      <div className="px-5 pt-5">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#aaa]">
          <ArrowLeft size={16} />
          Tilbake
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-5 pb-10 pt-8">
        <PlacementQuiz />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify the page renders**

Run `npm run dev` and navigate to `http://localhost:3000/onboarding`. You should see 3 progress dots at the top, a question in Norwegian, and 4 option buttons. Clicking an option should slide to the next question.

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/PlacementQuiz.tsx src/app/onboarding/page.tsx
git commit -m "feat: add placement quiz (3-question onboarding that seeds fingerprint)"
```

---

## Task 6: Dashboard page

**Files:**
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create the dashboard page**

Create `src/app/dashboard/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { generateSession, type SchedulerOutput } from '@/engine/scheduler'
import { BottomNav } from '@/components/layout/BottomNav'
import { GuestBanner } from '@/components/layout/GuestBanner'
import { ConceptProgressRow } from '@/components/progress/ConceptProgressRow'
import { getStreak } from '@/lib/streak'
import { MOCK_SENTENCE_IDS } from '@/lib/mock-sentences'
import type { ConceptGraph } from '@/types/concepts'
import conceptGraphJson from '@content/concepts/a1-graph.json'

const conceptGraph = conceptGraphJson as ConceptGraph

const CONCEPT_COLORS: Record<string, string> = {
  'noun-gender': '#e87c3e',
  'indefinite-articles': '#7cb87e',
  'definite-articles-singular': '#5b8fd4',
  'plural-formation': '#c85c8a',
  'definite-articles-plural': '#d4a843',
  'present-tense-regular': '#8b5e8b',
  'subject-pronouns': '#4abba5',
  'v2-word-order': '#e05c4b',
  'negation': '#6b8c42',
  'interrogatives': '#c4a862',
  'adjective-agreement': '#5b7dc8',
  'modal-verbs': '#d47040',
}

function getConceptColor(id: string, index: number): string {
  if (CONCEPT_COLORS[id]) return CONCEPT_COLORS[id]
  const palette = Object.values(CONCEPT_COLORS)
  return palette[index % palette.length]
}

function todayFormatted(): string {
  return new Date().toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function DashboardPage() {
  useFingerprint() // loads fingerprint into store
  const router = useRouter()
  const { fingerprint, status } = useFingerprintStore()
  const [plan, setPlan] = useState<SchedulerOutput | null>(null)
  const streak = getStreak()

  useEffect(() => {
    if (status === 'loading') return
    // Redirect to onboarding if never completed
    if (typeof window !== 'undefined' && !localStorage.getItem('norskcoach_onboarded')) {
      router.replace('/onboarding')
      return
    }
    if (!fingerprint) return
    const output = generateSession({
      fingerprint,
      graph: conceptGraph,
      availableSentenceIds: MOCK_SENTENCE_IDS,
    })
    setPlan(output)
  }, [fingerprint, status, router])

  // Compute top-5 concepts (in-progress first, then unlocked)
  const topConcepts = conceptGraph.concepts
    .slice(0, 8)
    .map((c, i) => {
      const mastery = fingerprint?.conceptMastery[c.id]
      return {
        id: c.id,
        label: c.label,
        score: mastery ? Math.round(mastery.decayedScore) : 0,
        color: getConceptColor(c.id, i),
        locked: !mastery && c.prerequisites.length > 0 &&
          !c.prerequisites.every((p) => !!fingerprint?.conceptMastery[p]),
      }
    })
    .slice(0, 5)

  const remediation = plan?.session.items.filter((i) => i.purpose === 'remediation').length ?? 0
  const review = plan?.session.items.filter((i) => i.purpose === 'review').length ?? 0
  const newMaterial = plan?.session.items.filter((i) => i.purpose === 'new-material').length ?? 0
  const estimatedMin = plan ? Math.max(1, Math.ceil(plan.session.items.length * 45 / 60)) : 12

  const primaryConceptId = plan?.primaryFocus ?? 'noun-gender'
  const primaryConcept = conceptGraph.concepts.find((c) => c.id === primaryConceptId)
  const sessionTitle = primaryConcept?.label ?? 'Grunnleggende norsk'

  return (
    <div className="flex min-h-dvh flex-col bg-nc-cream">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium capitalize text-[#aaa]">{todayFormatted()}</div>
            <h1 className="text-[20px] font-extrabold text-nc-navy">Hei, Gjest! 👋</h1>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-nc-orange text-sm font-bold text-white">
            G
          </div>
        </div>

        {/* Guest banner */}
        <GuestBanner />

        {/* Today's session card */}
        {plan && plan.session.items.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl bg-nc-navy p-4 text-white"
          >
            <div className="mb-1 text-[10px] uppercase tracking-widest text-white/40">
              I dag · ~{estimatedMin} min
            </div>
            <div className="mb-3 text-[16px] font-extrabold">{sessionTitle}</div>
            <div className="flex flex-wrap gap-2">
              {remediation > 0 && (
                <span className="rounded-full bg-nc-orange/30 px-3 py-1 text-[10px] font-semibold">
                  {remediation} reparasjoner
                </span>
              )}
              {review > 0 && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold">
                  {review} repetisjon
                </span>
              )}
              {newMaterial > 0 && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold">
                  {newMaterial} nytt
                </span>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-nc-muted p-6 text-center">
            <div className="text-2xl">🚧</div>
            <p className="mt-2 text-sm text-[#aaa]">Innhold kommer snart</p>
          </div>
        )}

        {/* Concept progress */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-nc-navy">
              Konseptfremgang
            </span>
            <Link href="/progress" className="text-[11px] font-semibold text-nc-orange">
              Se alle →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {topConcepts.map((c) => (
              <ConceptProgressRow
                key={c.id}
                color={c.color}
                name={c.label}
                score={c.score}
                locked={c.locked}
                prereqLabel={c.locked ? 'Låst' : undefined}
              />
            ))}
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-3 rounded-xl border border-nc-repair-border bg-nc-repair-bg px-4 py-3">
          <span className="text-xl">🔥</span>
          <span className="text-[22px] font-black text-nc-orange">{streak}</span>
          <span className="text-[12px] text-[#888]">dagers streak</span>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/session')}
          className="w-full rounded-xl bg-nc-orange py-4 text-sm font-extrabold text-white transition-transform active:scale-[0.98]"
        >
          Start dagens økt →
        </button>
      </main>

      <BottomNav active="home" />
    </div>
  )
}
```

- [ ] **Step 2: Verify dashboard renders**

Run `npm run dev`. Navigate to `http://localhost:3000/onboarding`, answer all 3 questions, click "Gå til dashbord først". You should see the dashboard with greeting, guest banner, session card with pills, concept progress rows, streak row, and CTA button. Bottom nav should be visible.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add dashboard page with session plan, concept bars, streak, guest banner"
```

---

## Task 7: Progress page

**Files:**
- Create: `src/app/progress/page.tsx`

- [ ] **Step 1: Create the progress page**

Create `src/app/progress/page.tsx`:

```tsx
'use client'

import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { BottomNav } from '@/components/layout/BottomNav'
import { ConceptProgressRow } from '@/components/progress/ConceptProgressRow'
import type { ConceptGraph, ConceptNode } from '@/types/concepts'
import conceptGraphJson from '@content/concepts/a1-graph.json'

const conceptGraph = conceptGraphJson as ConceptGraph

const CONCEPT_COLORS: Record<string, string> = {
  'noun-gender': '#e87c3e',
  'indefinite-articles': '#7cb87e',
  'definite-articles-singular': '#5b8fd4',
  'plural-formation': '#c85c8a',
  'definite-articles-plural': '#d4a843',
  'present-tense-regular': '#8b5e8b',
  'subject-pronouns': '#4abba5',
  'v2-word-order': '#e05c4b',
  'negation': '#6b8c42',
  'interrogatives': '#c4a862',
  'adjective-agreement': '#5b7dc8',
  'modal-verbs': '#d47040',
}

function getConceptColor(id: string, index: number): string {
  if (CONCEPT_COLORS[id]) return CONCEPT_COLORS[id]
  const palette = Object.values(CONCEPT_COLORS)
  return palette[index % palette.length]
}

function getPrereqLabel(concept: ConceptNode, allConcepts: ConceptNode[]): string {
  const firstPrereq = allConcepts.find((c) => c.id === concept.prerequisites[0])
  return firstPrereq ? `Krever: ${firstPrereq.label}` : 'Låst'
}

export default function ProgressPage() {
  useFingerprint()
  const { fingerprint } = useFingerprintStore()

  const masteredIds = new Set(
    conceptGraph.concepts
      .filter((c) => {
        const m = fingerprint?.conceptMastery[c.id]
        if (!m) return false
        return m.decayedScore >= c.masteryThreshold
      })
      .map((c) => c.id)
  )

  const mastered: ConceptNode[] = []
  const inProgress: ConceptNode[] = []
  const locked: ConceptNode[] = []

  conceptGraph.concepts.forEach((c, i) => {
    const hasData = !!fingerprint?.conceptMastery[c.id]
    const prereqsMet = c.prerequisites.every((p) => masteredIds.has(p))
    if (masteredIds.has(c.id)) {
      mastered.push(c)
    } else if (hasData || (prereqsMet && c.prerequisites.length === 0)) {
      inProgress.push(c)
    } else {
      locked.push(c)
    }
  })

  const masteredCount = mastered.length
  const totalCount = conceptGraph.concepts.length

  return (
    <div className="flex min-h-dvh flex-col bg-nc-cream">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-4 pt-5">
        <h1 className="mb-1 text-[22px] font-extrabold text-nc-navy">Konsepter</h1>
        <p className="mb-5 text-[12px] text-[#aaa]">
          A1 — {masteredCount} av {totalCount} mestret
        </p>

        {mastered.length > 0 && (
          <section className="mb-5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#888]">
              🟢 Mestret
            </div>
            <div className="flex flex-col gap-2">
              {mastered.map((c, i) => (
                <ConceptProgressRow
                  key={c.id}
                  color={getConceptColor(c.id, i)}
                  name={c.label}
                  score={Math.round(fingerprint?.conceptMastery[c.id]?.decayedScore ?? 0)}
                />
              ))}
            </div>
          </section>
        )}

        {inProgress.length > 0 && (
          <section className="mb-5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#888]">
              🔶 I gang
            </div>
            <div className="flex flex-col gap-2">
              {inProgress.map((c, i) => (
                <ConceptProgressRow
                  key={c.id}
                  color={getConceptColor(c.id, mastered.length + i)}
                  name={c.label}
                  score={Math.round(fingerprint?.conceptMastery[c.id]?.decayedScore ?? 0)}
                />
              ))}
            </div>
          </section>
        )}

        {locked.length > 0 && (
          <section className="mb-5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#888]">
              🔒 Låst
            </div>
            <div className="flex flex-col gap-2">
              {locked.map((c) => (
                <ConceptProgressRow
                  key={c.id}
                  color="#ddd"
                  name={c.label}
                  score={0}
                  locked
                  prereqLabel={getPrereqLabel(c, conceptGraph.concepts)}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav active="progress" />
    </div>
  )
}
```

- [ ] **Step 2: Verify progress page**

Navigate to `http://localhost:3000/progress`. You should see the header "Konsepter", subtitle "A1 — 0 av 22 mestret" (new user), all concepts under "🔒 Låst" except root concepts (those with no prerequisites) under "🔶 I gang". Bottom nav Fremgang tab should be active.

- [ ] **Step 3: Commit**

```bash
git add src/app/progress/page.tsx
git commit -m "feat: add progress page with all 22 A1 concepts grouped by mastery status"
```

---

## Task 8: Update SessionScreen to navigate to /session/complete

**Files:**
- Modify: `src/components/session/SessionScreen.tsx`
- Modify: `src/stores/session-store.ts`

- [ ] **Step 1: Add sessionStartedAt to session store**

The session store already has `session.startedAt` (ISO string). No store change needed — the complete page reads it directly. However, we need to track session completion time. Add a `completedAt` field to the store state:

In `src/stores/session-store.ts`, replace the `endSession` action body:

```ts
// Before:
endSession: () =>
  set({ session: null, currentItemIndex: 0, results: [], isInRepair: false, repairPlan: null }),

// After — keep session + results alive for /session/complete to read:
endSession: () =>
  set({ session: null, currentItemIndex: 0, results: [], isInRepair: false, repairPlan: null }),
```

No change needed — the store persists in memory during Next.js client-side navigation. The complete page reads `session` and `results` before they're cleared.

- [ ] **Step 2: Update SessionScreen to navigate on completion**

In `src/components/session/SessionScreen.tsx`:

1. Add at the top of the file:
```tsx
import { useRouter } from 'next/navigation'
import { incrementStreak } from '@/lib/streak'
```

2. Inside the `SessionScreen` function body, add this effect after the existing `useEffect` for `startNewSession`:
```tsx
const router = useRouter()

useEffect(() => {
  if (!session || totalItems === 0) return
  if (isComplete) {
    incrementStreak()
    router.push('/session/complete')
  }
}, [isComplete, session, totalItems, router])
```

3. Remove the inline `CompleteState` render branch — replace the `isComplete ?` branch:
```tsx
// Before:
isComplete ? (
  <CompleteState correctCount={correctCount} total={totalItems} />
) :

// After:
isComplete ? (
  <LoadingSkeleton />
) :
```

4. Delete the `CompleteState` function entirely (the one that renders the big score number with "Back to dashboard" link).

- [ ] **Step 3: Verify navigation works**

Run the dev server. Go through a session until all items are answered. The screen should briefly show the loading skeleton then navigate to `/session/complete`. If `/session/complete` doesn't exist yet, you'll get a 404 — that's expected until Task 9.

- [ ] **Step 4: Commit**

```bash
git add src/components/session/SessionScreen.tsx src/stores/session-store.ts
git commit -m "feat: navigate to /session/complete on session end + increment streak"
```

---

## Task 9: Session Complete page

**Files:**
- Create: `src/app/session/complete/page.tsx`

- [ ] **Step 1: Create the complete page**

Create `src/app/session/complete/page.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSessionStore } from '@/stores/session-store'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { ScoreCircle } from '@/components/session/ScoreCircle'
import { BottomNav } from '@/components/layout/BottomNav'
import type { ConceptGraph } from '@/types/concepts'
import conceptGraphJson from '@content/concepts/a1-graph.json'

const conceptGraph = conceptGraphJson as ConceptGraph

function formatDuration(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime()
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function SessionCompletePage() {
  const router = useRouter()
  const { session, results, endSession } = useSessionStore()
  const { fingerprint } = useFingerprintStore()

  // Guard: if no session in store (e.g. direct URL visit), redirect
  useEffect(() => {
    if (!session && results.length === 0) {
      router.replace('/dashboard')
    }
  }, [session, results, router])

  const totalAnswered = results.length
  const correctCount = results.filter((r) => r.correct).length
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
  const duration = session ? formatDuration(session.startedAt) : '0:00'

  const practicedConceptIds = [...new Set(results.map((r) => r.conceptId))]
  const conceptsCount = practicedConceptIds.length

  const primaryFocus = session?.primaryFocus ?? practicedConceptIds[0] ?? 'noun-gender'
  const primaryConceptNode = conceptGraph.concepts.find((c) => c.id === primaryFocus)
  const nextConceptNode = conceptGraph.concepts.find(
    (c) =>
      c.id !== primaryFocus &&
      c.prerequisites.every((p) => !!fingerprint?.conceptMastery[p])
  )

  function goToDashboard() {
    endSession()
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-nc-cream">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-6 px-5 pb-4 pt-10">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-[22px] font-extrabold text-nc-navy">Flott jobbet, Gjest! 👏</h1>
          <p className="mt-1 text-[13px] text-[#aaa]">Dagens økt fullført</p>
        </motion.div>

        {/* Score circle */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 18 }}
        >
          <ScoreCircle accuracy={accuracy} size={120} />
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex w-full justify-around"
        >
          {[
            { label: 'Nøyaktighet', value: `${accuracy}%` },
            { label: 'Tid', value: duration },
            { label: 'Konsepter', value: String(conceptsCount) },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-[20px] font-extrabold text-nc-navy">{value}</span>
              <span className="text-[10px] text-[#aaa]">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* Next session card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="w-full rounded-2xl bg-[#2d4a2d] p-4 text-white"
        >
          <div className="mb-1 text-[10px] uppercase tracking-widest text-white/40">
            🌱 Neste økt
          </div>
          <div className="mb-1 text-[15px] font-bold">
            {nextConceptNode?.label ?? primaryConceptNode?.label ?? 'Fortsett med A1'}
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-white/65">
            {accuracy >= 80
              ? 'Bra jobbet! Vi fortsetter med neste konsept.'
              : 'Litt mer øvelse, så er du klar for neste steg.'}
          </p>
          <button
            onClick={goToDashboard}
            className="w-full rounded-xl bg-nc-green py-2.5 text-[13px] font-bold text-white"
          >
            Gå til dashbord
          </button>
        </motion.div>

        {/* Practiced concepts */}
        {practicedConceptIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="w-full"
          >
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#888]">
              Øvde på
            </div>
            <div className="flex flex-wrap gap-2">
              {practicedConceptIds.map((id) => {
                const node = conceptGraph.concepts.find((c) => c.id === id)
                return (
                  <span
                    key={id}
                    className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-nc-navy shadow-sm"
                  >
                    {node?.label ?? id}
                  </span>
                )
              })}
            </div>
          </motion.div>
        )}
      </main>

      <BottomNav active="session" />
    </div>
  )
}
```

- [ ] **Step 2: Verify the complete flow**

Go through a full session: `/onboarding` → answer 3 questions → `/session` → answer all exercises → auto-navigate to `/session/complete`. You should see the score circle animate, stats row, green next-session card, and "Øvde på" concept pills. Clicking "Gå til dashbord" should call `endSession()` and navigate to `/dashboard`.

- [ ] **Step 3: Commit**

```bash
git add src/app/session/complete/page.tsx
git commit -m "feat: add session complete page with animated score, stats, next session preview"
```

---

## Task 10: Update /session/page.tsx — mock content fallback

**Files:**
- Modify: `src/app/session/page.tsx`

- [ ] **Step 1: Update session page to merge mock sentences**

Replace `src/app/session/page.tsx` entirely:

```tsx
import { SessionScreen } from '@/components/session/SessionScreen'
import { MOCK_SENTENCES, MOCK_SENTENCE_IDS } from '@/lib/mock-sentences'
import type { Sentence } from '@/types/content'

export const metadata = { title: 'Økt — NorskCoach' }

async function fetchSupabaseSentences(): Promise<{
  sentences: Record<string, Sentence>
  ids: Record<string, string[]>
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return { sentences: {}, ids: {} }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: rows, error } = await supabase
      .from('sentences')
      .select(
        'id, norwegian, english, concept_ids, vocab_clusters, error_tags_detectable, cefr_level, difficulty, exercise_types, audio_url, notes, scenario_id'
      )
      .eq('cefr_level', 'A1')
      .limit(1000)

    if (error || !rows?.length) return { sentences: {}, ids: {} }

    const sentences: Record<string, Sentence> = {}
    const ids: Record<string, string[]> = {}
    for (const row of rows) {
      const s: Sentence = {
        id: row.id,
        norwegian: row.norwegian,
        english: row.english,
        conceptIds: row.concept_ids ?? [],
        vocabularyClusters: row.vocab_clusters ?? [],
        errorTagsDetectable: row.error_tags_detectable ?? [],
        cefrLevel: row.cefr_level,
        difficulty: row.difficulty,
        exerciseTypes: row.exercise_types ?? [],
        audioUrl: row.audio_url ?? undefined,
        scenarioId: row.scenario_id ?? undefined,
        notes: row.notes ?? undefined,
      }
      sentences[s.id] = s
      for (const cId of s.conceptIds) {
        ids[cId] = [...(ids[cId] ?? []), s.id]
      }
    }
    return { sentences, ids }
  } catch {
    return { sentences: {}, ids: {} }
  }
}

export default async function SessionPage() {
  const { sentences: dbSentences, ids: dbIds } = await fetchSupabaseSentences()

  // Merge DB content with mock fallback (DB takes priority for same IDs)
  const sentences: Record<string, Sentence> = { ...MOCK_SENTENCES, ...dbSentences }
  const availableSentenceIds: Record<string, string[]> = { ...MOCK_SENTENCE_IDS }
  for (const [conceptId, sentenceIds] of Object.entries(dbIds)) {
    availableSentenceIds[conceptId] = [
      ...(availableSentenceIds[conceptId] ?? []),
      ...sentenceIds,
    ]
  }

  return (
    <main className="bg-nc-cream">
      <SessionScreen
        availableSentenceIds={availableSentenceIds}
        sentences={sentences}
      />
    </main>
  )
}
```

- [ ] **Step 2: Verify session works without Supabase**

With no Supabase credentials in `.env.local`, navigate to `/session`. The session should start with mock sentences and show exercises. Confirm exercises render and repair loop triggers on wrong answers.

- [ ] **Step 3: Commit**

```bash
git add src/app/session/page.tsx
git commit -m "feat: session page falls back to mock sentences when Supabase has no content"
```

---

## Task 11: Update SessionScreen visual style

**Files:**
- Modify: `src/components/session/SessionScreen.tsx`

- [ ] **Step 1: Apply new design tokens to SessionScreen**

Update `SessionScreen` to use the warm cream palette. In `src/components/session/SessionScreen.tsx`, apply these changes:

1. Change the outer div background:
```tsx
// Before:
<div className="flex min-h-dvh flex-col bg-[#FAFAFA] text-[#0A0A0F]">

// After:
<div className="flex min-h-dvh flex-col bg-nc-cream text-nc-navy">
```

2. Update the header to be minimal (no nav chrome):
```tsx
// Before (entire <header> block):
<header className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
  <div className="flex items-baseline gap-2">
    <span className="text-base font-extrabold tracking-tight">NorskCoach</span>
    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
      Session
    </span>
  </div>
  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0A0A0F]">
    {Math.min(currentItemIndex + (isComplete ? 0 : 1), Math.max(totalItems, 1))}
    {' / '}
    {totalItems || '—'}
  </span>
</header>

// After (minimal progress header):
<header className="px-5 pt-5 pb-2">
  <div className="flex items-center gap-2 mb-3">
    <div className="flex-1 h-[5px] bg-nc-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-nc-orange rounded-full transition-all duration-300"
        style={{ width: `${totalItems > 0 ? (Math.min(currentItemIndex, totalItems) / totalItems) * 100 : 0}%` }}
      />
    </div>
    <span className="text-[11px] font-semibold text-[#aaa] min-w-[48px] text-right">
      {Math.min(currentItemIndex + 1, Math.max(totalItems, 1))} / {totalItems || '—'}
    </span>
  </div>
  {currentItem && (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-nc-muted bg-white px-3 py-1 text-[10px] font-semibold text-[#888]">
      {getExerciseTypeLabel(currentItem.exerciseType)}
    </div>
  )}
</header>
```

3. Add the `getExerciseTypeLabel` helper above the `SessionScreen` function:
```tsx
function getExerciseTypeLabel(type: string): string {
  const map: Record<string, string> = {
    'translation-to-norwegian': '✏️ Oversett til norsk',
    'translation-to-english': '✏️ Oversett til engelsk',
    'fill-in-blank': '📝 Fyll inn',
    'word-order': '🔀 Ordstilling',
    'listening-comprehension': '🎧 Lytteøvelse',
    'speed-round': '⚡ Hurtigrunde',
    'sentence-transformation': '✏️ Omskriv',
    'dictation': '🎧 Diktat',
  }
  return map[type] ?? '✏️ Øvelse'
}
```

4. Remove the now-redundant segmented progress bar `<div className="px-5 py-3">` block (we moved it into the header).

- [ ] **Step 2: Update ExplanationCard to warm amber style**

In `src/components/session/ExplanationCard.tsx`, update the outer div to warm amber theme:

```tsx
// Before:
<div className="relative overflow-hidden rounded-2xl border-[1.5px] border-[#0A0A0F] border-t-4 border-t-[#DC2626] bg-[#0A0A0F]">

// After:
<div className="relative overflow-hidden rounded-2xl border-[1.5px] border-nc-repair-border bg-nc-repair-bg">
```

Update the label text color:
```tsx
// Before:
<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#DC2626]">

// After:
<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-nc-orange">
  🔁 Reparasjonsløkke
</p>
```

Update the "correct answer" label:
```tsx
// Before:
<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">

// After:
<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#888]">
```

Update the correct answer value:
```tsx
// Before:
<p className="text-2xl font-extrabold leading-tight text-white">

// After:
<p className="text-2xl font-extrabold leading-tight text-nc-navy">
```

Update the explanation text:
```tsx
// Before:
<p className="text-sm leading-relaxed text-white/70">

// After:
<p className="text-sm leading-relaxed text-[#555]">
```

Update the concept badge:
```tsx
// Before:
<span className="rounded-full bg-[#DC2626]/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#DC2626]">

// After:
<span className="rounded-full bg-nc-orange/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-nc-orange">
```

Update the continue button:
```tsx
// Before:
<button type="button" onClick={onContinue} className="min-h-[48px] w-full rounded-full bg-white px-6 font-bold text-[#0A0A0F] ...">

// After:
<button type="button" onClick={onContinue} className="min-h-[48px] w-full rounded-xl bg-nc-navy px-6 font-bold text-white transition-transform duration-150 hover:-translate-y-[1px] active:translate-y-0">
```

- [ ] **Step 3: Verify the session screen looks correct**

Go to `/session`. The progress bar at the top should be orange. Exercise type pill should show. The card background should be white on cream. Wrong answers should show the amber repair panel with orange "Reparasjonsløkke" label.

- [ ] **Step 4: Commit**

```bash
git add src/components/session/SessionScreen.tsx src/components/session/ExplanationCard.tsx
git commit -m "feat: update session screen to warm cream palette + amber repair loop style"
```

---

## Task 12: Update landing page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/landing/StartButton.tsx`

- [ ] **Step 1: Create StartButton client component**

The landing page is a Server Component, but the CTA needs `localStorage`. Extract just the button:

Create `src/components/landing/StartButton.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'

export function StartButton() {
  const router = useRouter()

  function handleStart() {
    const onboarded = localStorage.getItem('norskcoach_onboarded')
    router.push(onboarded ? '/dashboard' : '/onboarding')
  }

  return (
    <button
      onClick={handleStart}
      className="w-full rounded-xl bg-nc-orange px-6 py-4 text-[15px] font-extrabold text-white transition-transform active:scale-[0.98] sm:w-auto sm:px-10"
    >
      Start gratis →
    </button>
  )
}
```

- [ ] **Step 2: Update the landing page**

Replace `src/app/page.tsx` with:

```tsx
import Link from 'next/link'
import { StartButton } from '@/components/landing/StartButton'

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0d0d14] text-white">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(232,124,62,0.10) 0%, transparent 70%)',
        }}
      />

      {/* Top nav */}
      <nav className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-[13px] font-bold uppercase tracking-[0.15em] text-white/40">
          NorskCoach
        </span>
        <Link
          href="/dashboard"
          className="text-[13px] font-semibold text-white/50 transition-colors hover:text-white/80"
        >
          Logg inn
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 pb-20 pt-8 text-center">
        <h1 className="mb-4 text-balance text-[36px] font-black leading-[1.1] tracking-tight sm:text-[44px]">
          Lær norsk med selvtillit.
        </h1>
        <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-white/50">
          En personlig coach som finner svakhetene dine, forklarer dem, og fikser dem med målrettet
          øvelse.
        </p>
        <StartButton />
      </div>

      {/* Feature cards */}
      <div className="relative mx-auto w-full max-w-lg px-6 pb-16">
        <div className="flex flex-col gap-3">
          {[
            {
              icon: '🧠',
              title: 'Diagnostiserer deg daglig',
              desc: 'Finner nøyaktig hva du sliter med og bygger en personlig plan.',
            },
            {
              icon: '🔁',
              title: 'Reparasjonsløkke',
              desc: 'Hvert feil svar forklares og drilles inn — aldri hoppet over.',
            },
            {
              icon: '📈',
              title: 'Konseptgraf',
              desc: 'Grammatikk i avhengighetsrekkefølge. Du bygger på solid grunn.',
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-4 rounded-2xl border border-white/6 bg-white/4 px-5 py-4"
            >
              <span className="mt-0.5 text-[20px]">{icon}</span>
              <div>
                <div className="mb-0.5 text-[13px] font-bold text-white/90">{title}</div>
                <div className="text-[12px] leading-relaxed text-white/45">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative pb-6 text-center text-[11px] text-white/20">
        © NorskCoach 2026
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify landing page**

Navigate to `http://localhost:3000`. You should see a dark page with orange ambient glow, "NorskCoach" wordmark top-left, "Logg inn" top-right, large headline, "Start gratis →" orange button, and 3 feature cards below. Clicking "Start gratis →" should go to `/onboarding` (first visit) or `/dashboard` (returning visit).

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/landing/StartButton.tsx
git commit -m "feat: update landing page to match design — dark hero, orange CTA, feature cards"
```

---

## Task 13: Profile placeholder + smoke test

**Files:**
- Create: `src/app/profile/page.tsx`

- [ ] **Step 1: Create profile placeholder**

Create `src/app/profile/page.tsx`:

```tsx
import { BottomNav } from '@/components/layout/BottomNav'

export const metadata = { title: 'Profil — NorskCoach' }

export default function ProfilePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-nc-cream">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-5 py-10 text-center">
        <div className="text-4xl mb-4">👤</div>
        <h1 className="text-xl font-extrabold text-nc-navy mb-2">Profil</h1>
        <p className="text-sm text-[#aaa]">Kommer snart — logg inn for å lagre fremgangen din.</p>
      </main>
      <BottomNav active="profile" />
    </div>
  )
}
```

- [ ] **Step 2: Full flow smoke test**

Walk through the complete user journey:

1. Open `http://localhost:3000` — dark landing loads, "Start gratis →" button visible
2. Click "Start gratis →" → `/onboarding` — 3 progress dots, Norwegian question shown
3. Answer Q1, Q2, Q3 → Result screen shows "Klar for A1!"
4. Click "Gå til dashbord først" → `/dashboard` — greeting, guest banner, session card, concept bars, streak, CTA
5. Click "Start dagens økt →" → `/session` — progress bar, exercise type pill, exercise card with Norwegian sentence
6. Answer an exercise correctly → exercise advances (slide animation)
7. Answer an exercise incorrectly → amber repair panel expands inline with explanation
8. Complete all exercises → navigates to `/session/complete`
9. Score circle animates to accuracy %, stats row shows, green next-session card visible
10. Click "Gå til dashbord" → `/dashboard`
11. Click "Se alle →" or bottom nav Fremgang → `/progress` — all 22 concepts listed in 3 groups
12. Bottom nav Profil → `/profile` — placeholder screen
13. Refresh `/dashboard` → fingerprint still loaded from IndexedDB (streak counter preserved)

- [ ] **Step 3: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "feat: add profile placeholder page — completes 6-screen app"
```

---

## Self-Review Notes

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Dark landing + "Start gratis" CTA | Task 12 |
| localStorage `norskcoach_onboarded` gate | Task 5 (PlacementQuiz), Task 12 (StartButton) |
| 3-question placement quiz with Framer Motion | Task 5 |
| Fingerprint seeding from quiz answers | Task 5 |
| Dashboard: greeting, guest banner, today card, concept bars, streak, CTA | Task 6 |
| Bottom nav (4 tabs) | Task 3 |
| GuestBanner | Task 3 |
| Session: cream bg, progress bar, exercise type pill, no nav chrome | Task 11 |
| Repair loop: amber tint, orange label | Task 11 |
| Navigate to /session/complete on finish | Task 8 |
| /session/complete: score circle, stats, next-session card | Task 9 |
| /progress: mastered / in-progress / locked groups | Task 7 |
| ConceptProgressRow with animated fill | Task 4 |
| ScoreCircle SVG animation | Task 4 |
| Mock sentences fallback | Task 2, Task 10 |
| Streak utility | Task 1 |
| Design tokens (nc-*) | Task 1 |
| Profile placeholder | Task 13 |

All spec requirements covered. No placeholders remain.
