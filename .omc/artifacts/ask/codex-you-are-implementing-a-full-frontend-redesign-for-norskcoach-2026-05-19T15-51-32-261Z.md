# codex advisor artifact

- Provider: codex
- Exit code: 0
- Created at: 2026-05-19T15:51:32.262Z

## Original task

You are implementing a full frontend redesign for NorskCoach, a Norwegian language learning app built in Next.js 15 / TypeScript / Tailwind CSS / shadcn/ui. The project is at C:\Users\daveb\Documents\GitHub\Language-app.

## INSPIRATION DESIGN (from reference image)
The reference design shows:
- Landing page: dark navy background (#0B0B1F), large bold sans-serif headline 'Fluent Norwegian, guided by AI.', acid-green (#BAFF39) CTA button, glowing green accent sphere element
- Interior screens: slightly lighter dark surface (#111827 area), clean card-based layout
- Dashboard: 'God kveld, [name] 👋' greeting in large bold type, Today's session card with rounded corners, progress section
- Exercise screens: clean card with prompt text at ~36-40px, pill-shaped word tiles for word order, standard text input for translation
- Session complete: circular score ring showing '87%' in large bold type, stats grid below
- Color system: dark navy bg, warm cream/beige accent, coral/orange accent, sage green, light blue accent — all muted/supporting. Acid green is the PRIMARY action color only.
- Typography: clean geometric sans-serif (NOT Geist, NOT Inter), bold display weights, clear size hierarchy
- Cards: rounded corners 8-12px, clean borders, good padding
- Bottom nav: dark surface, acid-green active indicator dot or underline

## CRITICAL P0 BUGS TO FIX (these exist in the codebase right now)
1. src/components/layout/BottomNav.tsx — background is rgba(251,247,241,0.96) CREAM on a dark app. Change to dark card surface (#18181C or similar) with 1px top border
2. src/components/landing/diagnostic-hero.tsx — uses #3b82f6 blue as accent. Replace with #BAFF39 acid green
3. src/components/landing/value-props.tsx — uses rgba(59,130,246) blue. Replace with acid green
4. src/app/globals.css — loads Geist Sans + Geist Mono as primary fonts. Replace with a proper free geometric sans-serif (Plus Jakarta Sans, or DM Sans via next/font/google)
5. src/app/layout.tsx — same Geist font import. Update to match globals.css change
6. Inline arbitrary radius values throughout (rounded-[0.9rem], rounded-xl, rounded-2xl, etc.) — consolidate to rounded-xl (12px) consistently

## DESIGN TOKEN ALIGNMENT
The codebase already has these CSS variables in globals.css that are CORRECT and must be preserved:
- --nc-bg: #111114
- --nc-card: #1C1C21 
- --nc-green: #B8FF2E (the acid green, keep this)
- --nc-border: rgba(255,255,255,0.08)

Deprecated tokens that are WRONG (they map to zinc in tailwind.config.ts but are still in JSX):
- nc-violet, nc-apricot, nc-coral, nc-sage — all render as flat zinc gray now. Any concept phase badges/indicators using these need to use acid green tints instead

## PHASE INDICATOR REMAPPING (for progress page and concept list)
When concept phase badges appear:
- 'mastered' / 'strong' / 'maintenance' → bg: rgba(184,255,46,0.15), text: #B8FF2E, border: rgba(184,255,46,0.3)  
- 'consolidating' / 'practice' → bg: rgba(255,255,255,0.05), text: rgba(240,240,244,0.6), border: rgba(255,255,255,0.12)
- 'intro' / 'learning' / 'locked' → bg: transparent, text: rgba(240,240,244,0.3), border: rgba(255,255,255,0.08), opacity-60

## TYPOGRAPHY SYSTEM TO IMPLEMENT
Replace Geist with Plus Jakarta Sans from Google Fonts via next/font/google:
- Display/headings: Plus Jakarta Sans 700-800, -0.025em tracking
- Body: Plus Jakarta Sans 400-500, normal tracking
- Labels/caps: Plus Jakarta Sans 600, 0.1em tracking, uppercase
- Mono (code/scores only): keep system mono as fallback

## SESSION COMPLETE SCREEN
The score display should look like the inspiration: circular ring (not just a number) with the percentage inside. Currently src/app/session/complete/page.tsx and src/components/session/ScoreCircle.tsx may have a score circle — make sure it renders as: outer ring (2px stroke, rgba(255,255,255,0.1)), inner colored arc (acid green, stroke-dasharray based on score %) and the score number centered at large size (48-64px, bold).

## WHAT TO PRODUCE
Give me a complete, ordered implementation plan with:
1. Exact files to change, in priority order
2. For each file: the specific CSS/JSX changes (show the old pattern and new pattern)
3. The font import code for layout.tsx and globals.css
4. The BottomNav fix
5. The ScoreCircle SVG ring implementation
6. Any tailwind.config.ts changes needed

Be specific and complete. Show real code, not pseudocode. The developer will implement directly from your output.

## Final prompt

You are implementing a full frontend redesign for NorskCoach, a Norwegian language learning app built in Next.js 15 / TypeScript / Tailwind CSS / shadcn/ui. The project is at C:\Users\daveb\Documents\GitHub\Language-app.

## INSPIRATION DESIGN (from reference image)
The reference design shows:
- Landing page: dark navy background (#0B0B1F), large bold sans-serif headline 'Fluent Norwegian, guided by AI.', acid-green (#BAFF39) CTA button, glowing green accent sphere element
- Interior screens: slightly lighter dark surface (#111827 area), clean card-based layout
- Dashboard: 'God kveld, [name] 👋' greeting in large bold type, Today's session card with rounded corners, progress section
- Exercise screens: clean card with prompt text at ~36-40px, pill-shaped word tiles for word order, standard text input for translation
- Session complete: circular score ring showing '87%' in large bold type, stats grid below
- Color system: dark navy bg, warm cream/beige accent, coral/orange accent, sage green, light blue accent — all muted/supporting. Acid green is the PRIMARY action color only.
- Typography: clean geometric sans-serif (NOT Geist, NOT Inter), bold display weights, clear size hierarchy
- Cards: rounded corners 8-12px, clean borders, good padding
- Bottom nav: dark surface, acid-green active indicator dot or underline

## CRITICAL P0 BUGS TO FIX (these exist in the codebase right now)
1. src/components/layout/BottomNav.tsx — background is rgba(251,247,241,0.96) CREAM on a dark app. Change to dark card surface (#18181C or similar) with 1px top border
2. src/components/landing/diagnostic-hero.tsx — uses #3b82f6 blue as accent. Replace with #BAFF39 acid green
3. src/components/landing/value-props.tsx — uses rgba(59,130,246) blue. Replace with acid green
4. src/app/globals.css — loads Geist Sans + Geist Mono as primary fonts. Replace with a proper free geometric sans-serif (Plus Jakarta Sans, or DM Sans via next/font/google)
5. src/app/layout.tsx — same Geist font import. Update to match globals.css change
6. Inline arbitrary radius values throughout (rounded-[0.9rem], rounded-xl, rounded-2xl, etc.) — consolidate to rounded-xl (12px) consistently

## DESIGN TOKEN ALIGNMENT
The codebase already has these CSS variables in globals.css that are CORRECT and must be preserved:
- --nc-bg: #111114
- --nc-card: #1C1C21 
- --nc-green: #B8FF2E (the acid green, keep this)
- --nc-border: rgba(255,255,255,0.08)

Deprecated tokens that are WRONG (they map to zinc in tailwind.config.ts but are still in JSX):
- nc-violet, nc-apricot, nc-coral, nc-sage — all render as flat zinc gray now. Any concept phase badges/indicators using these need to use acid green tints instead

## PHASE INDICATOR REMAPPING (for progress page and concept list)
When concept phase badges appear:
- 'mastered' / 'strong' / 'maintenance' → bg: rgba(184,255,46,0.15), text: #B8FF2E, border: rgba(184,255,46,0.3)  
- 'consolidating' / 'practice' → bg: rgba(255,255,255,0.05), text: rgba(240,240,244,0.6), border: rgba(255,255,255,0.12)
- 'intro' / 'learning' / 'locked' → bg: transparent, text: rgba(240,240,244,0.3), border: rgba(255,255,255,0.08), opacity-60

## TYPOGRAPHY SYSTEM TO IMPLEMENT
Replace Geist with Plus Jakarta Sans from Google Fonts via next/font/google:
- Display/headings: Plus Jakarta Sans 700-800, -0.025em tracking
- Body: Plus Jakarta Sans 400-500, normal tracking
- Labels/caps: Plus Jakarta Sans 600, 0.1em tracking, uppercase
- Mono (code/scores only): keep system mono as fallback

## SESSION COMPLETE SCREEN
The score display should look like the inspiration: circular ring (not just a number) with the percentage inside. Currently src/app/session/complete/page.tsx and src/components/session/ScoreCircle.tsx may have a score circle — make sure it renders as: outer ring (2px stroke, rgba(255,255,255,0.1)), inner colored arc (acid green, stroke-dasharray based on score %) and the score number centered at large size (48-64px, bold).

## WHAT TO PRODUCE
Give me a complete, ordered implementation plan with:
1. Exact files to change, in priority order
2. For each file: the specific CSS/JSX changes (show the old pattern and new pattern)
3. The font import code for layout.tsx and globals.css
4. The BottomNav fix
5. The ScoreCircle SVG ring implementation
6. Any tailwind.config.ts changes needed

Be specific and complete. Show real code, not pseudocode. The developer will implement directly from your output.

## Raw output

```text
Current landing note: `src/app/page.tsx` does not render `src/components/landing/diagnostic-hero.tsx` or `src/components/landing/value-props.tsx` today. The redesign should switch the landing page to those components, not just recolor the unused files.

**1. Foundation First**
1. `src/app/layout.tsx`: remove `next/font/local`, remove both Geist imports, and mount Plus Jakarta Sans on `<html>`.
```tsx
import { Plus_Jakarta_Sans } from 'next/font/google'
import type { Metadata } from 'next'
import { ClientAILoader } from '@/components/ai/ClientAILoader'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NorskCoach',
  description:
    'A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'NorskCoach',
    description:
      'A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${plusJakartaSans.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <ClientAILoader />
      </body>
    </html>
  )
}
```

2. `src/app/globals.css`: preserve `--nc-bg`, `--nc-card`, `--nc-green`, `--nc-border`; change radius and font usage.
```css
:root {
  --radius: 0.75rem;
}

body {
  min-height: 100dvh;
  background: var(--nc-bg);
  color: var(--nc-text);
  font-family: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.nc-label,
.nc-label-light {
  font-family: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

code,
kbd,
pre,
samp {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
```
Old:
```css
--radius: 0.25rem;
font-family: var(--font-geist-sans, var(--font-sans, sans-serif));
```
New:
```css
--radius: 0.75rem;
font-family: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif;
```

3. `tailwind.config.ts`: update font families and normalize radii so `rounded-xl` is the standard everywhere.
```ts
fontFamily: {
  display: ['var(--font-plus-jakarta-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  sans: ['var(--font-plus-jakarta-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
},

borderRadius: {
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  xl: 'var(--radius)',
  '2xl': 'var(--radius)',
  '3xl': 'var(--radius)',
  '4xl': 'var(--radius)',
  hero: 'var(--radius)',
  card: 'var(--radius)',
  feature: 'var(--radius)',
  chip: '9999px',
  pill: '9999px',
},
```
Old:
```ts
display: ['var(--font-geist-sans)', ...]
sans: ['var(--font-geist-sans)', ...]
mono: ['var(--font-geist-mono)', 'monospace']
'2xl': '4px'
'3xl': '4px'
'4xl': '4px'
```

4. `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`: remove blue `brand-*` styling and standardize dark surfaces.
Old:
```tsx
bg-brand-500 text-white shadow-[0_0_24px_rgba(59,130,246,0.35)]
text-brand-400
rounded-full
rounded-lg border bg-card
```
New:
```tsx
bg-nc-green text-[#0A1500] hover:brightness-95
text-nc-green
rounded-xl
rounded-xl border border-nc-border bg-nc-card text-nc-text shadow-none
```

5. Radius sweep: replace every non-pill `rounded-[0.9rem]`, `rounded-[0.95rem]`, `rounded-[0.85rem]`, `rounded-lg`, `rounded-2xl` with `rounded-xl` in:
`src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/progress/page.tsx`, `src/app/session/complete/page.tsx`, `src/app/login/page.tsx`, `src/components/dashboard/LevelSelector.tsx`, `src/components/layout/GuestBanner.tsx`, `src/components/layout/BottomNav.tsx`, `src/components/onboarding/OnboardingFlow.tsx`, `src/components/onboarding/DiagnosticQuiz.tsx`, `src/components/landing/waitlist-form.tsx`, `src/components/session/**/*`.
Leave only pill exceptions: `.nc-chip`, `rounded-full`, and word tiles in `WordOrderExercise.tsx`.

**2. Shell And Landing**
6. `src/components/layout/BottomNav.tsx`: fix the P0 cream background bug.
```tsx
export function BottomNav({ active }: { active: NavTab }) {
  return (
    <nav className="border-t border-[rgba(255,255,255,0.08)] bg-[#18181C]">
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2.5">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = id === active

          return (
            <Link
              key={id}
              href={href}
              aria-label={label}
              className="flex min-w-[56px] flex-col items-center gap-1 px-1 py-1.5"
            >
              <Icon
                size={18}
                className={isActive ? 'text-nc-green' : 'text-nc-text-dim'}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={`text-[10px] font-medium tracking-[0.02em] ${
                  isActive ? 'text-nc-text' : 'text-nc-text-dim'
                }`}
              >
                {label}
              </span>
              <span
                aria-hidden="true"
                className={`h-1 w-1 rounded-full bg-nc-green transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

7. `src/app/page.tsx`: replace the current stone/lilac showcase with the actual reference landing. Delete the mock design-system collage and use a dark hero with a green sphere, real headline, `DiagnosticHero`, and `ValueProps`.
Old:
```tsx
<section className="mt-10 grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] ...">
  ...bg-nc-violet...
  ...bg-white...
  ...text-nc-apricot...
</section>
```
New:
```tsx
<section className="relative overflow-hidden rounded-[32px] border border-white/8 bg-[#0B0B1F] px-6 py-10 sm:px-10 sm:py-14">
  <div className="pointer-events-none absolute right-[-9rem] top-[-6rem] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(184,255,46,0.28)_0%,rgba(184,255,46,0.12)_36%,transparent_72%)] blur-3xl" />
  <div className="relative z-10">
    <h1 className="max-w-3xl text-[3.25rem] font-extrabold leading-[0.95] tracking-[-0.025em] text-[#F3F0E8] sm:text-[4.5rem]">
      Fluent Norwegian, guided by AI.
    </h1>
    <p className="mt-5 max-w-xl text-base leading-7 text-[rgba(243,240,232,0.72)]">
      Your personalized path to speak, understand, and think in Norwegian.
    </p>
    <div className="mt-8 flex flex-wrap gap-3">
      <StartButton />
      <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-[#F3F0E8]">
        Open dashboard
        <ArrowRight size={15} />
      </Link>
    </div>
    <div className="mt-12">
      <DiagnosticHero />
    </div>
    <ValueProps />
  </div>
</section>
```

8. `src/components/landing/diagnostic-hero.tsx`: fix the P0 blue accent bug and swap invalid `text-foreground-*` classes to `text-nc-*`.
Old:
```tsx
low: '#3b82f6'
border: '1px solid rgba(59,130,246,0.18)'
backgroundColor: i === activeIndex ? '#3b82f6' : ...
background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #93c5fd 100%)'
className="text-foreground-muted"
```
New:
```tsx
low: '#B8FF2E'
border: '1px solid rgba(184,255,46,0.18)'
backgroundColor: i === activeIndex ? '#B8FF2E' : ...
background: 'linear-gradient(135deg, #F2FFD2 0%, #B8FF2E 48%, #7BAE19 100%)'
className="text-nc-text-muted"
```

9. `src/components/landing/value-props.tsx`: fix the P0 blue accent bug.
Old:
```tsx
whileHover={{ backgroundColor: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.18)' }}
background: 'rgba(59,130,246,0.1)'
border: '1px solid rgba(59,130,246,0.2)'
<Icon className="h-4 w-4 text-brand-400" />
```
New:
```tsx
whileHover={{ backgroundColor: 'rgba(184,255,46,0.04)', borderColor: 'rgba(184,255,46,0.18)' }}
background: 'rgba(184,255,46,0.1)'
border: '1px solid rgba(184,255,46,0.2)'
<Icon className="h-4 w-4 text-nc-green" />
```

10. `src/components/landing/StartButton.tsx` and `src/components/landing/waitlist-form.tsx`: keep primary CTA acid green only. Replace `'->'` with `ArrowRight`. If `WaitlistForm` is re-used, change every blue fill/border/caret from `#2563eb/#3b82f6` to `var(--nc-green)` and `rgba(184,255,46,...)`.

**3. Dashboard And Progress**
11. `src/app/dashboard/page.tsx`: remove remaining white cards, rainbow stats, and deprecated phase colors.
Old:
```tsx
bg-white
text-nc-violet
bg: 'rgba(183,167,255,0.14)'
color: '#7060d8'
import { getConceptColor } from '@/lib/concept-colors'
```
New:
```tsx
bg-nc-card-soft
text-nc-green
bg: 'rgba(184,255,46,0.15)'
color: '#B8FF2E'
remove getConceptColor usage; drive dots/badges from phase only
```
Also change:
`text-[1.75rem]` greeting -> `text-[2.25rem]`
`nc-glass` stat tiles -> `rounded-xl border border-nc-border bg-[#18181C]`
Notification button `bg-white` -> `bg-nc-card-soft`.

12. `src/components/dashboard/LevelSelector.tsx`: darken the picker and remove white surfaces.
Old:
```tsx
background: current === lvl.value ? '#111118' : '#fff'
color: current === lvl.value ? '#C8FF00' : 'rgba(17,17,24,0.55)'
className="rounded-full ..."
```
New:
```tsx
background: current === lvl.value ? 'rgba(184,255,46,0.12)' : '#242429'
borderColor: current === lvl.value ? 'rgba(184,255,46,0.3)' : 'rgba(255,255,255,0.08)'
color: current === lvl.value ? '#B8FF2E' : 'rgba(240,240,244,0.72)'
className="rounded-xl ..."
```

13. `src/app/progress/page.tsx` and `src/components/progress/ConceptProgressRow.tsx`: implement the phase remap exactly and stop using zinc/deprecated tones.
```tsx
const PHASE_META = {
  maintenance: {
    label: 'Strong',
    badge: 'border border-[rgba(184,255,46,0.3)] bg-[rgba(184,255,46,0.15)] text-[#B8FF2E]',
  },
  consolidation: {
    label: 'Consolidating',
    badge: 'border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] text-[rgba(240,240,244,0.6)]',
  },
  practice: {
    label: 'Practice',
    badge: 'border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] text-[rgba(240,240,244,0.6)]',
  },
  intro: {
    label: 'Intro',
    badge: 'border border-[rgba(255,255,255,0.08)] bg-transparent text-[rgba(240,240,244,0.3)] opacity-60',
  },
  locked: {
    label: 'Locked',
    badge: 'border border-[rgba(255,255,255,0.08)] bg-transparent text-[rgba(240,240,244,0.3)] opacity-60',
  },
} as const
```
Old:
```tsx
countTone: 'bg-nc-violet/18 text-nc-violet'
countTone: 'bg-nc-apricot/20 text-nc-coral'
color={getConceptColor(...)}
```
New:
```tsx
className={`rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${meta.badge}`}
phase-driven dots/bars instead of rainbow concept colors
```

14. `src/lib/concept-colors.ts`: if no imports remain after the phase refactor, delete it. If it must remain, neutralize it.
Old:
```ts
const CONCEPT_COLORS = {
  'indefinite-articles': '#7eb8ef',
  'definite-articles-singular': '#ef7eb8',
  ...
}
```
New:
```ts
const PALETTE = [
  'rgba(184,255,46,0.95)',
  'rgba(184,255,46,0.72)',
  'rgba(184,255,46,0.54)',
  'rgba(240,240,244,0.38)',
]
export function getConceptColor(_id: string, index: number): string {
  return PALETTE[index % PALETTE.length]
}
```

**4. Session Flow**
15. `src/components/session/SessionScreen.tsx` and `src/components/session/ExerciseCard.tsx`: make the shell match the interior reference. Back button `bg-white` -> `bg-nc-card-soft`. Exercise container `nc-glass-dark p-5` -> `rounded-xl border border-nc-border bg-[#18181C] p-6`. `LoadingSkeleton` and empty states should use dark surfaces, not pale fills.

16. `src/components/session/exercises/TranslationExercise.tsx`, `FillInBlankExercise.tsx`, `ListeningExercise.tsx`, `SpeedRound.tsx`: standardize prompt scale and inputs.
Old:
```tsx
text-[1.85rem]
rounded-xl border border-white/12 bg-[rgba(255,255,255,0.04)]
border-nc-coral/50 bg-nc-coral/10 text-nc-coral
```
New:
```tsx
text-[2.35rem] sm:text-[2.5rem] leading-[1.08] tracking-[-0.025em]
className="nc-input min-h-[56px] text-base"
border-[rgba(217,123,83,0.32)] bg-[rgba(217,123,83,0.10)] text-[#E9B39A]
```
Also change all “primary” submit buttons to `nc-button-primary` only, and all secondary audio/reveal buttons to dark bordered surfaces.

17. `src/components/session/exercises/WordOrderExercise.tsx`: keep pill tiles as the one intentional radius exception.
Old:
```tsx
className="... rounded-lg border border-white/12 bg-white/10 ..."
```
New:
```tsx
className="cursor-grab touch-none select-none rounded-full border border-[rgba(255,255,255,0.12)] bg-[#202028] px-4 py-2.5 text-sm font-semibold text-nc-text transition-colors hover:border-[rgba(184,255,46,0.4)] hover:text-nc-green"
```
Container should stay `rounded-xl`, but the tiles themselves should be `rounded-full`.

18. `src/components/session/ExplanationCard.tsx`: remove light cards.
Old:
```tsx
className="rounded-[0.95rem] border ... bg-white ..."
className="... bg-[#fff9f3] ..."
className="... bg-nc-apricot/18 ..."
```
New:
```tsx
className="rounded-xl border border-[rgba(184,255,46,0.22)] bg-[rgba(184,255,46,0.10)] ..."
className="rounded-xl border border-nc-border bg-nc-card-soft ..."
className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] ..."
```

**5. Session Complete**
19. `src/components/session/ScoreCircle.tsx`: replace the current circle with a real track + progress arc ring.
```tsx
'use client'

import { useEffect, useState } from 'react'

interface ScoreCircleProps {
  accuracy: number
  size?: number
}

export function ScoreCircle({ accuracy, size = 208 }: ScoreCircleProps) {
  const clamped = Math.max(0, Math.min(100, accuracy))
  const [progress, setProgress] = useState(0)

  const trackStroke = 2
  const arcStroke = 8
  const radius = (size - arcStroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (progress / 100) * circumference

  useEffect(() => {
    const id = window.setTimeout(() => setProgress(clamped), 120)
    return () => window.clearTimeout(id)
  }, [clamped])

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={trackStroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--nc-green)"
          strokeWidth={arcStroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[3.5rem] font-extrabold leading-none tracking-[-0.04em] text-nc-text">
          {clamped}%
        </span>
        <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-nc-text-dim">
          Accuracy
        </span>
      </div>
    </div>
  )
}
```

20. `src/app/session/complete/page.tsx`: make the whole screen dark and let the ring be the hero.
Old:
```tsx
bg-white
bg-[linear-gradient(180deg,#fffefb_0%,#fff8ef_100%)]
textarea bg-[#fffdf9]
grid-cols-3
rounded-[0.8rem]
```
New:
```tsx
bg-nc-card-soft
bg-nc-card
textarea className="nc-input min-h-[96px]"
grid-cols-2
rounded-xl
```
Also make these structural changes:
`<ScoreCircle accuracy={accuracy} size={172} />` -> `<ScoreCircle accuracy={accuracy} size={208} />`
stats grid should be `grid-cols-2` with dark tiles
top icon buttons should use dark surfaces
the final CTA block should be a dark card with a green button, not a cream/green gradient.

**6. First-Run And Auth Cleanup**
21. `src/app/login/page.tsx`, `src/components/onboarding/OnboardingFlow.tsx`, `src/components/onboarding/DiagnosticQuiz.tsx`, `src/components/onboarding/PlacementQuiz.tsx`: remove the remaining `bg-white`, `text-nc-violet`, and `bg-nc-violet` usage.
Old:
```tsx
bg-white
text-nc-violet
bg-nc-violet
```
New:
```tsx
bg-nc-card-soft
text-nc-green
bg-nc-green
```
Specifically:
`login/page.tsx` primary submit should be `nc-button-primary`
`OnboardingFlow.tsx` step progress should be green, not violet
`DiagnosticQuiz.tsx` progress bar and loading dots should be green, option cards dark
`PlacementQuiz.tsx` already trends closer; just normalize radii and dark card surfaces.

That is the implementation order I would use: foundation first, then landing/dashboard/progress, then session flow, then session complete, then first-run/auth cleanup.


OpenAI Codex v0.125.0 (research preview)
--------
workdir: C:\Users\daveb\Documents\GitHub\Language-app
model: gpt-5.4
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: xhigh
reasoning summaries: none
session id: 019e40e2-6b4c-70b0-b794-bab09831f380
--------
user
You are implementing a full frontend redesign for NorskCoach, a Norwegian language learning app built in Next.js 15 / TypeScript / Tailwind CSS / shadcn/ui. The project is at C:\Users\daveb\Documents\GitHub\Language-app.

## INSPIRATION DESIGN (from reference image)
The reference design shows:
- Landing page: dark navy background (#0B0B1F), large bold sans-serif headline 'Fluent Norwegian, guided by AI.', acid-green (#BAFF39) CTA button, glowing green accent sphere element
- Interior screens: slightly lighter dark surface (#111827 area), clean card-based layout
- Dashboard: 'God kveld, [name] 👋' greeting in large bold type, Today's session card with rounded corners, progress section
- Exercise screens: clean card with prompt text at ~36-40px, pill-shaped word tiles for word order, standard text input for translation
- Session complete: circular score ring showing '87%' in large bold type, stats grid below
- Color system: dark navy bg, warm cream/beige accent, coral/orange accent, sage green, light blue accent — all muted/supporting. Acid green is the PRIMARY action color only.
- Typography: clean geometric sans-serif (NOT Geist, NOT Inter), bold display weights, clear size hierarchy
- Cards: rounded corners 8-12px, clean borders, good padding
- Bottom nav: dark surface, acid-green active indicator dot or underline

## CRITICAL P0 BUGS TO FIX (these exist in the codebase right now)
1. src/components/layout/BottomNav.tsx — background is rgba(251,247,241,0.96) CREAM on a dark app. Change to dark card surface (#18181C or similar) with 1px top border
2. src/components/landing/diagnostic-hero.tsx — uses #3b82f6 blue as accent. Replace with #BAFF39 acid green
3. src/components/landing/value-props.tsx — uses rgba(59,130,246) blue. Replace with acid green
4. src/app/globals.css — loads Geist Sans + Geist Mono as primary fonts. Replace with a proper free geometric sans-serif (Plus Jakarta Sans, or DM Sans via next/font/google)
5. src/app/layout.tsx — same Geist font import. Update to match globals.css change
6. Inline arbitrary radius values throughout (rounded-[0.9rem], rounded-xl, rounded-2xl, etc.) — consolidate to rounded-xl (12px) consistently

## DESIGN TOKEN ALIGNMENT
The codebase already has these CSS variables in globals.css that are CORRECT and must be preserved:
- --nc-bg: #111114
- --nc-card: #1C1C21 
- --nc-green: #B8FF2E (the acid green, keep this)
- --nc-border: rgba(255,255,255,0.08)

Deprecated tokens that are WRONG (they map to zinc in tailwind.config.ts but are still in JSX):
- nc-violet, nc-apricot, nc-coral, nc-sage — all render as flat zinc gray now. Any concept phase badges/indicators using these need to use acid green tints instead

## PHASE INDICATOR REMAPPING (for progress page and concept list)
When concept phase badges appear:
- 'mastered' / 'strong' / 'maintenance' → bg: rgba(184,255,46,0.15), text: #B8FF2E, border: rgba(184,255,46,0.3)  
- 'consolidating' / 'practice' → bg: rgba(255,255,255,0.05), text: rgba(240,240,244,0.6), border: rgba(255,255,255,0.12)
- 'intro' / 'learning' / 'locked' → bg: transparent, text: rgba(240,240,244,0.3), border: rgba(255,255,255,0.08), opacity-60

## TYPOGRAPHY SYSTEM TO IMPLEMENT
Replace Geist with Plus Jakarta Sans from Google Fonts via next/font/google:
- Display/headings: Plus Jakarta Sans 700-800, -0.025em tracking
- Body: Plus Jakarta Sans 400-500, normal tracking
- Labels/caps: Plus Jakarta Sans 600, 0.1em tracking, uppercase
- Mono (code/scores only): keep system mono as fallback

## SESSION COMPLETE SCREEN
The score display should look like the inspiration: circular ring (not just a number) with the percentage inside. Currently src/app/session/complete/page.tsx and src/components/session/ScoreCircle.tsx may have a score circle — make sure it renders as: outer ring (2px stroke, rgba(255,255,255,0.1)), inner colored arc (acid green, stroke-dasharray based on score %) and the score number centered at large size (48-64px, bold).

## WHAT TO PRODUCE
Give me a complete, ordered implementation plan with:
1. Exact files to change, in priority order
2. For each file: the specific CSS/JSX changes (show the old pattern and new pattern)
3. The font import code for layout.tsx and globals.css
4. The BottomNav fix
5. The ScoreCircle SVG ring implementation
6. Any tailwind.config.ts changes needed

Be specific and complete. Show real code, not pseudocode. The developer will implement directly from your output.
2026-05-19T15:37:21.306823Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when AuthRequired(AuthRequiredError { www_authenticate_header: "Bearer realm=\"OAuth\", error=\"invalid_token\", error_description=\"Missing or invalid access token\", resource_metadata=\"https://mcp.sentry.dev/.well-known/oauth-protected-resource/mcp\"" })
2026-05-19T15:37:21.353073Z ERROR rmcp::transport::worker: worker quit with fatal: Transport channel closed, when AuthRequired(AuthRequiredError { www_authenticate_header: "Bearer error=\"invalid_request\", error_description=\"No access token was provided in this request\", resource_metadata=\"https://mcp.supabase.com/.well-known/oauth-protected-resource/mcp\"" })
codex
I’m inspecting the current Next.js app structure and the target components so the implementation plan maps to the actual code, not a generic redesign checklist.
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg --files src tailwind.config.ts postcss.config.* package.json' in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short' in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-ChildItem -Name' in C:\Users\daveb\Documents\GitHub\Language-app
 exited -1073741502 in 10ms:
 exited -1073741502 in 14ms:
2026-05-19T15:37:39.173790Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

2026-05-19T15:37:39.177970Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

2026-05-19T15:37:39.182210Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

 exited -1073741502 in 9ms:
codex
The shell wrapper is failing before command execution, so I’m retrying with simpler invocations to get the file map another way.
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -Command 'cmd /c dir /b' in C:\Users\daveb\Documents\GitHub\Language-app
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -Command 'cmd /c git status --short' in C:\Users\daveb\Documents\GitHub\Language-app
2026-05-19T15:37:45.396684Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

 exited -1073741502 in 11ms:
 exited -1073741502 in 11ms:
exec
"C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -Command 'cmd /c rg --files src tailwind.config.ts package.json' in C:\Users\daveb\Documents\GitHub\Language-app
2026-05-19T15:37:45.401347Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

2026-05-19T15:37:45.420358Z ERROR codex_core::tools::router: error=Exit code: -1073741502
Wall time: 0 seconds
Output:

 exited -1073741502 in 10ms:
codex
I’m switching to the available MCP-style tools to read the repo directly since the shell isn’t starting in this session.
mcp: filesystem/list_allowed_directories started
mcp: filesystem/list_allowed_directories (completed)
mcp: filesystem/list_directory started
mcp: filesystem/list_directory (completed)
mcp: filesystem/search_files started
mcp: filesystem/search_files (completed)
codex
I have direct file access now. Next I’m reading the app shell, landing components, session score components, and theme config to produce exact file-level changes.
mcp: filesystem/read_multiple_files started
mcp: filesystem/read_multiple_files (completed)
mcp: filesystem/search_files started
mcp: filesystem/search_files (completed)
mcp: filesystem/search_files started
mcp: filesystem/search_files (completed)
mcp: filesystem/search_files started
mcp: filesystem/search_files (completed)
mcp: filesystem/read_multiple_files started
mcp: filesystem/read_multiple_files (completed)
mcp: filesystem/search_files started
mcp: filesystem/search_files (completed)
codex
I’ve confirmed the theme shell issues and the progress-page token drift. I’m reading the dashboard, landing page, and exercise stack now so the plan covers the full redesign surface instead of just the bug list.
mcp: filesystem/read_multiple_files started
mcp: filesystem/read_multiple_files (completed)
mcp: filesystem/search_files started
mcp: filesystem/search_files (completed)
mcp: filesystem/search_files started
mcp: filesystem/search_files (completed)
codex
The biggest remaining unknowns are the dashboard card stack and the exercise container wrappers, so I’m pulling those files in full before I write the ordered plan.
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
codex
I’ve got the core screens. I’m doing one quick pass over auth/onboarding to decide whether they need explicit file entries or whether the shared-token work already covers them.
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
mcp: filesystem/read_text_file started
mcp: filesystem/read_text_file (completed)
codex
Current landing note: `src/app/page.tsx` does not render `src/components/landing/diagnostic-hero.tsx` or `src/components/landing/value-props.tsx` today. The redesign should switch the landing page to those components, not just recolor the unused files.

**1. Foundation First**
1. `src/app/layout.tsx`: remove `next/font/local`, remove both Geist imports, and mount Plus Jakarta Sans on `<html>`.
```tsx
import { Plus_Jakarta_Sans } from 'next/font/google'
import type { Metadata } from 'next'
import { ClientAILoader } from '@/components/ai/ClientAILoader'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NorskCoach',
  description:
    'A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'NorskCoach',
    description:
      'A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${plusJakartaSans.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <ClientAILoader />
      </body>
    </html>
  )
}
```

2. `src/app/globals.css`: preserve `--nc-bg`, `--nc-card`, `--nc-green`, `--nc-border`; change radius and font usage.
```css
:root {
  --radius: 0.75rem;
}

body {
  min-height: 100dvh;
  background: var(--nc-bg);
  color: var(--nc-text);
  font-family: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.nc-label,
.nc-label-light {
  font-family: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

code,
kbd,
pre,
samp {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
```
Old:
```css
--radius: 0.25rem;
font-family: var(--font-geist-sans, var(--font-sans, sans-serif));
```
New:
```css
--radius: 0.75rem;
font-family: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif;
```

3. `tailwind.config.ts`: update font families and normalize radii so `rounded-xl` is the standard everywhere.
```ts
fontFamily: {
  display: ['var(--font-plus-jakarta-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  sans: ['var(--font-plus-jakarta-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
},

borderRadius: {
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  xl: 'var(--radius)',
  '2xl': 'var(--radius)',
  '3xl': 'var(--radius)',
  '4xl': 'var(--radius)',
  hero: 'var(--radius)',
  card: 'var(--radius)',
  feature: 'var(--radius)',
  chip: '9999px',
  pill: '9999px',
},
```
Old:
```ts
display: ['var(--font-geist-sans)', ...]
sans: ['var(--font-geist-sans)', ...]
mono: ['var(--font-geist-mono)', 'monospace']
'2xl': '4px'
'3xl': '4px'
'4xl': '4px'
```

4. `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`: remove blue `brand-*` styling and standardize dark surfaces.
Old:
```tsx
bg-brand-500 text-white shadow-[0_0_24px_rgba(59,130,246,0.35)]
text-brand-400
rounded-full
rounded-lg border bg-card
```
New:
```tsx
bg-nc-green text-[#0A1500] hover:brightness-95
text-nc-green
rounded-xl
rounded-xl border border-nc-border bg-nc-card text-nc-text shadow-none
```

5. Radius sweep: replace every non-pill `rounded-[0.9rem]`, `rounded-[0.95rem]`, `rounded-[0.85rem]`, `rounded-lg`, `rounded-2xl` with `rounded-xl` in:
`src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/progress/page.tsx`, `src/app/session/complete/page.tsx`, `src/app/login/page.tsx`, `src/components/dashboard/LevelSelector.tsx`, `src/components/layout/GuestBanner.tsx`, `src/components/layout/BottomNav.tsx`, `src/components/onboarding/OnboardingFlow.tsx`, `src/components/onboarding/DiagnosticQuiz.tsx`, `src/components/landing/waitlist-form.tsx`, `src/components/session/**/*`.
Leave only pill exceptions: `.nc-chip`, `rounded-full`, and word tiles in `WordOrderExercise.tsx`.

**2. Shell And Landing**
6. `src/components/layout/BottomNav.tsx`: fix the P0 cream background bug.
```tsx
export function BottomNav({ active }: { active: NavTab }) {
  return (
    <nav className="border-t border-[rgba(255,255,255,0.08)] bg-[#18181C]">
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2.5">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = id === active

          return (
            <Link
              key={id}
              href={href}
              aria-label={label}
              className="flex min-w-[56px] flex-col items-center gap-1 px-1 py-1.5"
            >
              <Icon
                size={18}
                className={isActive ? 'text-nc-green' : 'text-nc-text-dim'}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={`text-[10px] font-medium tracking-[0.02em] ${
                  isActive ? 'text-nc-text' : 'text-nc-text-dim'
                }`}
              >
                {label}
              </span>
              <span
                aria-hidden="true"
                className={`h-1 w-1 rounded-full bg-nc-green transition-opacity ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

7. `src/app/page.tsx`: replace the current stone/lilac showcase with the actual reference landing. Delete the mock design-system collage and use a dark hero with a green sphere, real headline, `DiagnosticHero`, and `ValueProps`.
Old:
```tsx
<section className="mt-10 grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] ...">
  ...bg-nc-violet...
  ...bg-white...
  ...text-nc-apricot...
</section>
```
New:
```tsx
<section className="relative overflow-hidden rounded-[32px] border border-white/8 bg-[#0B0B1F] px-6 py-10 sm:px-10 sm:py-14">
  <div className="pointer-events-none absolute right-[-9rem] top-[-6rem] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(184,255,46,0.28)_0%,rgba(184,255,46,0.12)_36%,transparent_72%)] blur-3xl" />
  <div className="relative z-10">
    <h1 className="max-w-3xl text-[3.25rem] font-extrabold leading-[0.95] tracking-[-0.025em] text-[#F3F0E8] sm:text-[4.5rem]">
      Fluent Norwegian, guided by AI.
    </h1>
    <p className="mt-5 max-w-xl text-base leading-7 text-[rgba(243,240,232,0.72)]">
      Your personalized path to speak, understand, and think in Norwegian.
    </p>
    <div className="mt-8 flex flex-wrap gap-3">
      <StartButton />
      <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-[#F3F0E8]">
        Open dashboard
        <ArrowRight size={15} />
      </Link>
    </div>
    <div className="mt-12">
      <DiagnosticHero />
    </div>
    <ValueProps />
  </div>
</section>
```

8. `src/components/landing/diagnostic-hero.tsx`: fix the P0 blue accent bug and swap invalid `text-foreground-*` classes to `text-nc-*`.
Old:
```tsx
low: '#3b82f6'
border: '1px solid rgba(59,130,246,0.18)'
backgroundColor: i === activeIndex ? '#3b82f6' : ...
background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #93c5fd 100%)'
className="text-foreground-muted"
```
New:
```tsx
low: '#B8FF2E'
border: '1px solid rgba(184,255,46,0.18)'
backgroundColor: i === activeIndex ? '#B8FF2E' : ...
background: 'linear-gradient(135deg, #F2FFD2 0%, #B8FF2E 48%, #7BAE19 100%)'
className="text-nc-text-muted"
```

9. `src/components/landing/value-props.tsx`: fix the P0 blue accent bug.
Old:
```tsx
whileHover={{ backgroundColor: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.18)' }}
background: 'rgba(59,130,246,0.1)'
border: '1px solid rgba(59,130,246,0.2)'
<Icon className="h-4 w-4 text-brand-400" />
```
New:
```tsx
whileHover={{ backgroundColor: 'rgba(184,255,46,0.04)', borderColor: 'rgba(184,255,46,0.18)' }}
background: 'rgba(184,255,46,0.1)'
border: '1px solid rgba(184,255,46,0.2)'
<Icon className="h-4 w-4 text-nc-green" />
```

10. `src/components/landing/StartButton.tsx` and `src/components/landing/waitlist-form.tsx`: keep primary CTA acid green only. Replace `'->'` with `ArrowRight`. If `WaitlistForm` is re-used, change every blue fill/border/caret from `#2563eb/#3b82f6` to `var(--nc-green)` and `rgba(184,255,46,...)`.

**3. Dashboard And Progress**
11. `src/app/dashboard/page.tsx`: remove remaining white cards, rainbow stats, and deprecated phase colors.
Old:
```tsx
bg-white
text-nc-violet
bg: 'rgba(183,167,255,0.14)'
color: '#7060d8'
import { getConceptColor } from '@/lib/concept-colors'
```
New:
```tsx
bg-nc-card-soft
text-nc-green
bg: 'rgba(184,255,46,0.15)'
color: '#B8FF2E'
remove getConceptColor usage; drive dots/badges from phase only
```
Also change:
`text-[1.75rem]` greeting -> `text-[2.25rem]`
`nc-glass` stat tiles -> `rounded-xl border border-nc-border bg-[#18181C]`
Notification button `bg-white` -> `bg-nc-card-soft`.

12. `src/components/dashboard/LevelSelector.tsx`: darken the picker and remove white surfaces.
Old:
```tsx
background: current === lvl.value ? '#111118' : '#fff'
color: current === lvl.value ? '#C8FF00' : 'rgba(17,17,24,0.55)'
className="rounded-full ..."
```
New:
```tsx
background: current === lvl.value ? 'rgba(184,255,46,0.12)' : '#242429'
borderColor: current === lvl.value ? 'rgba(184,255,46,0.3)' : 'rgba(255,255,255,0.08)'
color: current === lvl.value ? '#B8FF2E' : 'rgba(240,240,244,0.72)'
className="rounded-xl ..."
```

13. `src/app/progress/page.tsx` and `src/components/progress/ConceptProgressRow.tsx`: implement the phase remap exactly and stop using zinc/deprecated tones.
```tsx
const PHASE_META = {
  maintenance: {
    label: 'Strong',
    badge: 'border border-[rgba(184,255,46,0.3)] bg-[rgba(184,255,46,0.15)] text-[#B8FF2E]',
  },
  consolidation: {
    label: 'Consolidating',
    badge: 'border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] text-[rgba(240,240,244,0.6)]',
  },
  practice: {
    label: 'Practice',
    badge: 'border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] text-[rgba(240,240,244,0.6)]',
  },
  intro: {
    label: 'Intro',
    badge: 'border border-[rgba(255,255,255,0.08)] bg-transparent text-[rgba(240,240,244,0.3)] opacity-60',
  },
  locked: {
    label: 'Locked',
    badge: 'border border-[rgba(255,255,255,0.08)] bg-transparent text-[rgba(240,240,244,0.3)] opacity-60',
  },
} as const
```
Old:
```tsx
countTone: 'bg-nc-violet/18 text-nc-violet'
countTone: 'bg-nc-apricot/20 text-nc-coral'
color={getConceptColor(...)}
```
New:
```tsx
className={`rounded-xl px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${meta.badge}`}
phase-driven dots/bars instead of rainbow concept colors
```

14. `src/lib/concept-colors.ts`: if no imports remain after the phase refactor, delete it. If it must remain, neutralize it.
Old:
```ts
const CONCEPT_COLORS = {
  'indefinite-articles': '#7eb8ef',
  'definite-articles-singular': '#ef7eb8',
  ...
}
```
New:
```ts
const PALETTE = [
  'rgba(184,255,46,0.95)',
  'rgba(184,255,46,0.72)',
  'rgba(184,255,46,0.54)',
  'rgba(240,240,244,0.38)',
]
export function getConceptColor(_id: string, index: number): string {
  return PALETTE[index % PALETTE.length]
}
```

**4. Session Flow**
15. `src/components/session/SessionScreen.tsx` and `src/components/session/ExerciseCard.tsx`: make the shell match the interior reference. Back button `bg-white` -> `bg-nc-card-soft`. Exercise container `nc-glass-dark p-5` -> `rounded-xl border border-nc-border bg-[#18181C] p-6`. `LoadingSkeleton` and empty states should use dark surfaces, not pale fills.

16. `src/components/session/exercises/TranslationExercise.tsx`, `FillInBlankExercise.tsx`, `ListeningExercise.tsx`, `SpeedRound.tsx`: standardize prompt scale and inputs.
Old:
```tsx
text-[1.85rem]
rounded-xl border border-white/12 bg-[rgba(255,255,255,0.04)]
border-nc-coral/50 bg-nc-coral/10 text-nc-coral
```
New:
```tsx
text-[2.35rem] sm:text-[2.5rem] leading-[1.08] tracking-[-0.025em]
className="nc-input min-h-[56px] text-base"
border-[rgba(217,123,83,0.32)] bg-[rgba(217,123,83,0.10)] text-[#E9B39A]
```
Also change all “primary” submit buttons to `nc-button-primary` only, and all secondary audio/reveal buttons to dark bordered surfaces.

17. `src/components/session/exercises/WordOrderExercise.tsx`: keep pill tiles as the one intentional radius exception.
Old:
```tsx
className="... rounded-lg border border-white/12 bg-white/10 ..."
```
New:
```tsx
className="cursor-grab touch-none select-none rounded-full border border-[rgba(255,255,255,0.12)] bg-[#202028] px-4 py-2.5 text-sm font-semibold text-nc-text transition-colors hover:border-[rgba(184,255,46,0.4)] hover:text-nc-green"
```
Container should stay `rounded-xl`, but the tiles themselves should be `rounded-full`.

18. `src/components/session/ExplanationCard.tsx`: remove light cards.
Old:
```tsx
className="rounded-[0.95rem] border ... bg-white ..."
className="... bg-[#fff9f3] ..."
className="... bg-nc-apricot/18 ..."
```
New:
```tsx
className="rounded-xl border border-[rgba(184,255,46,0.22)] bg-[rgba(184,255,46,0.10)] ..."
className="rounded-xl border border-nc-border bg-nc-card-soft ..."
className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] ..."
```

**5. Session Complete**
19. `src/components/session/ScoreCircle.tsx`: replace the current circle with a real track + progress arc ring.
```tsx
'use client'

import { useEffect, useState } from 'react'

interface ScoreCircleProps {
  accuracy: number
  size?: number
}

export function ScoreCircle({ accuracy, size = 208 }: ScoreCircleProps) {
  const clamped = Math.max(0, Math.min(100, accuracy))
  const [progress, setProgress] = useState(0)

  const trackStroke = 2
  const arcStroke = 8
  const radius = (size - arcStroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (progress / 100) * circumference

  useEffect(() => {
    const id = window.setTimeout(() => setProgress(clamped), 120)
    return () => window.clearTimeout(id)
  }, [clamped])

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={trackStroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--nc-green)"
          strokeWidth={arcStroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[3.5rem] font-extrabold leading-none tracking-[-0.04em] text-nc-text">
          {clamped}%
        </span>
        <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-nc-text-dim">
          Accuracy
        </span>
      </div>
    </div>
  )
}
```

20. `src/app/session/complete/page.tsx`: make the whole screen dark and let the ring be the hero.
Old:
```tsx
bg-white
bg-[linear-gradient(180deg,#fffefb_0%,#fff8ef_100%)]
textarea bg-[#fffdf9]
grid-cols-3
rounded-[0.8rem]
```
New:
```tsx
bg-nc-card-soft
bg-nc-card
textarea className="nc-input min-h-[96px]"
grid-cols-2
rounded-xl
```
Also make these structural changes:
`<ScoreCircle accuracy={accuracy} size={172} />` -> `<ScoreCircle accuracy={accuracy} size={208} />`
stats grid should be `grid-cols-2` with dark tiles
top icon buttons should use dark surfaces
the final CTA block should be a dark card with a green button, not a cream/green gradient.

**6. First-Run And Auth Cleanup**
21. `src/app/login/page.tsx`, `src/components/onboarding/OnboardingFlow.tsx`, `src/components/onboarding/DiagnosticQuiz.tsx`, `src/components/onboarding/PlacementQuiz.tsx`: remove the remaining `bg-white`, `text-nc-violet`, and `bg-nc-violet` usage.
Old:
```tsx
bg-white
text-nc-violet
bg-nc-violet
```
New:
```tsx
bg-nc-card-soft
text-nc-green
bg-nc-green
```
Specifically:
`login/page.tsx` primary submit should be `nc-button-primary`
`OnboardingFlow.tsx` step progress should be green, not violet
`DiagnosticQuiz.tsx` progress bar and loading dots should be green, option cards dark
`PlacementQuiz.tsx` already trends closer; just normalize radii and dark card surfaces.

That is the implementation order I would use: foundation first, then landing/dashboard/progress, then session flow, then session complete, then first-run/auth cleanup.
2026-05-19T15:51:32.096475Z ERROR codex_core::session: failed to record rollout items: thread 019e40e2-6b4c-70b0-b794-bab09831f380 not found
tokens used
122,213

```

## Concise summary

Provider completed successfully. Review the raw output for details.

## Action items

- Review the response and extract decisions you want to apply.
- Capture follow-up implementation tasks if needed.
