You are transforming the UI of NorskCoach, a Norwegian language learning app. This is a Next.js 15 App Router project using TypeScript, Tailwind CSS v3, and Framer Motion. A reference design image is attached — match it as closely as possible.

---

## REFERENCE DESIGN ANALYSIS

From the attached image:
- **Primary canvas**: Deep near-black (#17171d) for session cards, exercise cards, hero landing panel
- **Secondary surfaces**: Clean white (#ffffff) and warm off-white (#fdf6ee) for stat cards, secondary panels, body background
- **Hero accent**: Lime/chartreuse #C8FF00 — ALL primary CTAs, active nav indicator, progress ring color, accuracy highlight. One color owns CTAs.
- **Typography**: Geist (install `geist` npm package) — clean geometric sans, heavier display weights, clean mono for Norwegian sentences
- **Concept tiles**: Each concept gets a distinct, vivid color. Not opacity-faded versions — bold color per tile.
- **Score ring (session complete)**: Large circular ring showing accuracy % — this is the centrepiece of the completion screen
- **Repair card ("Almost there!")**: Warm card with grammar correction highlighted in green
- **Dashboard stats**: Large numbers, minimal label, clean card grid
- **Exercise card**: Dark panel, clean source sentence, input field, lime "Check answer →" button
- **Overall feel**: Premium, digital-native, editorial. No clutter, no pattern overlays on dark panels.

---

## IMPLEMENTATION STEPS — EXECUTE IN ORDER

### STEP 1: Install Geist font package
```
npm install geist
```

### STEP 2: Update `src/app/layout.tsx`
Import GeistSans and GeistMono from the geist package and apply as CSS variables:

```tsx
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import type { Metadata } from 'next'
import { ClientAILoader } from '@/components/ai/ClientAILoader'
import './globals.css'

export const metadata: Metadata = {
  title: 'NorskCoach',
  description: 'A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'NorskCoach',
    description: 'A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.',
    type: 'website',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <ClientAILoader />
      </body>
    </html>
  )
}
```

### STEP 3: Update `src/app/globals.css`

Replace the entire `:root` block and font references with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* shadcn/ui tokens */
    --background: 37 52% 97%;
    --foreground: 250 18% 12%;
    --card: 0 0% 100%;
    --card-foreground: 250 18% 12%;
    --popover: 0 0% 100%;
    --popover-foreground: 250 18% 12%;
    --primary: 257 72% 83%;
    --primary-foreground: 250 18% 12%;
    --secondary: 34 42% 94%;
    --secondary-foreground: 250 18% 12%;
    --muted: 35 35% 94%;
    --muted-foreground: 258 10% 44%;
    --accent: 30 86% 89%;
    --accent-foreground: 250 18% 12%;
    --destructive: 9 98% 71%;
    --destructive-foreground: 0 0% 100%;
    --border: 258 12% 88%;
    --input: 258 16% 91%;
    --ring: 257 72% 83%;
    --radius: 0.875rem;

    /* NorskCoach brand tokens */
    --nc-bg: #fdf6ee;
    --nc-paper: #fbf7f1;
    --nc-card: #ffffff;
    --nc-card-soft: #fdfaf5;
    --nc-dark: #17171d;
    --nc-dark-2: #1e1e28;

    --nc-green: #C8FF00;
    --nc-green-tint: rgba(200,255,0,0.08);
    --nc-green-border: rgba(200,255,0,0.22);

    --nc-violet: #b9b0ff;
    --nc-apricot: #ffc9a8;
    --nc-coral: #ff9a78;
    --nc-sage: #d7e5d2;

    --nc-border: rgba(23,23,29,0.08);
    --nc-border-strong: rgba(23,23,29,0.14);
    --nc-text: #17171d;
    --nc-text-muted: rgba(23,23,29,0.60);
    --nc-text-dim: rgba(23,23,29,0.38);
    --nc-shadow: 0 2px 12px rgba(23,23,29,0.06);
    --nc-shadow-strong: 0 8px 32px rgba(23,23,29,0.14);
    --nc-repair-bg: rgba(255,200,165,0.14);
    --nc-repair-border: rgba(255,200,165,0.28);
  }

  * {
    @apply border-border;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    min-height: 100dvh;
    background:
      radial-gradient(circle at 10% 12%, rgba(255,201,168,0.18) 0%, transparent 20%),
      radial-gradient(circle at 87% 8%, rgba(200,255,0,0.10) 0%, transparent 18%),
      radial-gradient(circle at 72% 38%, rgba(185,176,255,0.08) 0%, transparent 16%),
      linear-gradient(180deg, #fbf7f1 0%, #f8f3ea 100%);
    color: var(--nc-text);
    font-family: var(--font-geist-sans, var(--font-sans, sans-serif));
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-geist-sans, var(--font-sans, sans-serif));
    font-weight: 700;
    letter-spacing: -0.03em;
  }

  ::selection {
    background-color: rgba(200,255,0,0.28);
    color: var(--nc-dark);
  }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(23,23,29,0.14); border-radius: 9999px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(23,23,29,0.24); }
}

@layer components {
  .nc-app-shell {
    position: relative;
    max-width: 28rem;
    margin-inline: auto;
  }

  /* Light card */
  .nc-panel {
    position: relative;
    overflow: hidden;
    border-radius: 1.1rem;
    border: 1px solid var(--nc-border);
    background: var(--nc-card);
    box-shadow: var(--nc-shadow);
  }

  /* Soft warm card */
  .nc-panel-soft {
    position: relative;
    overflow: hidden;
    border-radius: 1.1rem;
    border: 1px solid rgba(23,23,29,0.06);
    background: linear-gradient(180deg, #fffdf9 0%, #fff8ef 100%);
    box-shadow: var(--nc-shadow);
  }

  /* Dark primary canvas */
  .nc-panel-dark {
    position: relative;
    overflow: hidden;
    border-radius: 1.2rem;
    border: 1px solid rgba(255,255,255,0.06);
    background: linear-gradient(160deg, #1e1e28 0%, #17171d 100%);
    box-shadow: 0 8px 32px rgba(0,0,0,0.28);
    color: white;
  }

  .nc-label {
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--nc-text-dim);
  }

  .nc-label-light {
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.38);
  }

  .nc-subtle-line {
    height: 1px;
    background: rgba(23,23,29,0.07);
  }

  .nc-input {
    width: 100%;
    min-height: 3rem;
    border-radius: 0.85rem;
    border: 1px solid var(--nc-border);
    background: rgba(255,255,255,0.96);
    padding: 0.85rem 1rem;
    color: var(--nc-text);
    outline: none;
    font-family: inherit;
    font-size: 0.9375rem;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }

  .nc-input::placeholder { color: rgba(23,23,29,0.30); }

  .nc-input:focus {
    border-color: rgba(200,255,0,0.45);
    box-shadow: 0 0 0 3px rgba(200,255,0,0.10);
  }

  /* Lime primary CTA — matches reference */
  .nc-button-primary {
    border-radius: 0.9rem;
    background: var(--nc-green);
    color: var(--nc-dark);
    font-weight: 700;
    box-shadow: 0 8px 20px rgba(200,255,0,0.18);
    transition: box-shadow 150ms ease, transform 150ms ease;
  }

  .nc-button-primary:hover { box-shadow: 0 12px 28px rgba(200,255,0,0.26); transform: translateY(-1px); }

  .nc-button-dark {
    border-radius: 0.9rem;
    background: var(--nc-dark);
    color: white;
    font-weight: 700;
    box-shadow: 0 8px 24px rgba(23,23,29,0.18);
  }

  /* Legacy lime alias */
  .nc-button-lime {
    border-radius: 0.9rem;
    background: var(--nc-green);
    color: var(--nc-dark);
    font-weight: 700;
    box-shadow: 0 8px 20px rgba(200,255,0,0.18);
  }

  .nc-chip {
    border-radius: 0.65rem;
    border: 1px solid var(--nc-border);
    background: rgba(23,23,29,0.03);
    color: var(--nc-text-muted);
  }

  .nc-chip-soft {
    border-radius: 0.65rem;
    border: 1px solid rgba(23,23,29,0.05);
    background: rgba(255,255,255,0.72);
    color: var(--nc-text-muted);
  }

  /* Patterns — keep but use sparingly */
  .nc-pattern-dots {
    background-image: radial-gradient(circle at 1px 1px, rgba(23,23,29,0.10) 1px, transparent 0);
    background-size: 14px 14px;
  }

  .nc-dot-grid {
    background-image: radial-gradient(circle at 1px 1px, rgba(23,23,29,0.10) 1px, transparent 0);
    background-size: 14px 14px;
  }
}

@layer utilities {
  .text-balance { text-wrap: balance; }
}
```

### STEP 4: Update `tailwind.config.ts`

Add `nc-dark-2` to the nc color tokens and update fontFamily to use geist variables:

```ts
fontFamily: {
  display: ['var(--font-geist-sans)', 'var(--font-display)', 'sans-serif'],
  sans: ['var(--font-geist-sans)', 'var(--font-sans)', 'sans-serif'],
  mono: ['var(--font-geist-mono)', 'monospace'],
},
```

Also add to the nc color map:
```ts
'dark-2': '#1e1e28',
```

### STEP 5: Update `src/components/layout/BottomNav.tsx`

Match the reference: clean bar, active item uses lime dot indicator below the icon, active icon is full-weight, inactive is dim. Background is translucent blur:

```tsx
// Key style changes:
// - background: rgba(251,247,241,0.96) with backdrop-filter blur
// - Active icon: strokeWidth 2.2, color nc-text (#17171d)  
// - Active label: color nc-text
// - Active indicator: 3px lime dot below label
// - Inactive: strokeWidth 1.6, color nc-text-dim
```

Read the file first, then apply these changes to the existing component structure.

### STEP 6: Update `src/app/dashboard/page.tsx`

Key visual changes to match the reference (PRESERVE ALL LOGIC):
- "Start session" button: use `nc-button-primary` class (lime, dark text) — not violet
- Session card chips: the "repairs/review/new" chips should be more visible
- Stats row: make the value numbers slightly larger (`text-[1.75rem]` → `text-[2rem]`) and adjust colors
- Concept mastery grid tiles: increase color opacity for practiced tiles (change `${tile.color}20` → `${tile.color}28` for bg and `${tile.color}33` → `${tile.color}45` for border) so colors are more vivid
- "Keep going" CTA strip: use lime gradient `bg-[linear-gradient(135deg,rgba(200,255,0,0.55)_0%,rgba(251,247,241,0.94)_72%)]`
- Mode tiles: keep emoji but ensure clean consistent sizing
- Level-up celebration banner: use lime (#C8FF00) accent text

Read the file, make the minimum changes to align with the reference aesthetic. Keep every line of logic intact.

### STEP 7: Update `src/components/session/SessionScreen.tsx`

Key changes:
- Progress bar dots: change `bg-nc-violet` → `bg-nc-green` for completed segments
- Session header: cleaner, tighten spacing slightly
- Remove any pattern texture from the exercise area background
- Keep all logic, hooks, router calls unchanged

### STEP 8: Update `src/components/session/ExerciseCard.tsx`

Key changes to match the reference exercise card:
- Remove the `nc-pattern-orbits` and `nc-pattern-topography` absolute overlay divs (they add visual noise that the reference doesn't have)
- The dark card itself is the surface — clean, no texture overlays
- Keep the shake animation logic

The component should look like:
```tsx
<motion.div
  key={shakeKey}
  animate={wasWrong && shakeKey > 0 ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
  transition={{ duration: 0.4 }}
  onAnimationComplete={() => setWasWrong(false)}
  className="nc-panel-dark p-5"
>
  <div className="relative z-[1]">{renderExercise()}</div>
</motion.div>
```

### STEP 9: Update `src/components/session/exercises/TranslationExercise.tsx`

Read this file first. Then update to match the reference:
- Exercise type label: uppercase tracking label at top (already exists, keep)
- Source sentence: large, white, prominent — `text-[1.85rem]` font-weight 700
- Answer textarea/input: clean nc-input style but within the dark card — slightly different: `bg-white/8 border-white/12 text-white placeholder:text-white/30 focus:border-nc-green/50 focus:ring-nc-green/10`
- Submit button: `nc-button-primary w-full` (lime, dark text) with arrow icon
- Correct state: green highlight with lime border
- Wrong state: coral/red highlight with shake (already handled by parent)

### STEP 10: Update `src/components/session/ScoreCircle.tsx`

Read the file first. Update the SVG circle stroke to use lime:
- The progress arc stroke: `#C8FF00` (lime green)
- The background circle stroke: `rgba(255,255,255,0.08)`  
- The percentage text: white, large, GeistSans weight 800
- Increase default size to 172px if current is smaller
- The circle should look clean and prominent, matching the reference "87%" ring

### STEP 11: Update `src/app/session/complete/page.tsx`

Key changes to match the reference "Flott jobb!" screen:
- Title: Keep "Du bygger norsk! 🗣️" or update to match reference feel
- The `nc-panel-soft` wrapping the ScoreCircle: make it cleaner — lighter background, less ornamentation
- Remove the absolute dot decorations (the `absolute left-10 top-28` colored dots) — they don't appear in the reference
- Stats below the ring: clean white panels, larger numbers
- The "What you mastered" dark panel: keep, it appears in the reference
- Reflection prompt: keep, it's a key feature
- "Continue learning" / "Til dashboard" CTA: use `nc-button-primary` (lime)
- Use Framer Motion stagger: each section animates in with 80ms delay

### STEP 12: Update `src/components/session/ExplanationCard.tsx`

Match the "Almost there!" card from the reference:
- Keep `nc-panel-soft` as the container
- Remove the orbit ring SVG decoration (absolute positioned circles) — clean card in reference
- "Correct answer" block: use lime-tinted background: `bg-[rgba(200,255,0,0.10)] border-[rgba(200,255,0,0.22)]` 
- The grammar explainer expand button: keep as `nc-button-dark`  
- "Prøv igjen" button: `nc-button-primary` (lime)

---

## CRITICAL CONSTRAINTS

DO NOT touch any of these:
- `src/engine/` — pure engine logic
- `src/hooks/` — React hooks
- `src/stores/` — Zustand stores  
- `src/types/` — TypeScript types
- `src/lib/` — utility functions (exception: concept-colors.ts if you need to)
- `src/ai/` — AI layer
- `content/` — content files
- Any server action files (`actions/` or `action.ts` files)
- API routes (`src/app/api/`)

Only change: JSX structure, className values, CSS, and layout.tsx font imports.

After all steps complete, run `npm run build` to verify no TypeScript errors were introduced.
