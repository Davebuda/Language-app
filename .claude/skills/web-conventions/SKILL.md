---
name: web-conventions
description: TypeScript/React/Next.js coding conventions for NorskCoach. Use when writing or reviewing any frontend or API code in this project.
---

# Web Conventions — NorskCoach

## Stack
- Next.js 15 App Router (Server Components by default)
- TypeScript strict mode (no `any`, no non-null assertions)
- Tailwind CSS v3 + shadcn/ui
- Framer Motion for all animations
- Zustand for global client state (fingerprint, session)
- React Query / SWR for server state
- IndexedDB (via `idb`) for local-first fingerprint storage

## Module Boundaries

```
src/
├── app/          ← Next.js routing and layouts only. No business logic.
├── engine/       ← Pure TypeScript. No React imports. No fetch calls.
├── types/        ← Pure type definitions. No logic.
├── ai/           ← AI service interface + stub/real implementations.
├── storage/      ← IndexedDB and Supabase clients. No business logic.
├── components/   ← React components. No direct engine calls — use hooks.
│   ├── ui/       ← shadcn/ui primitives (Button, Card, Input, etc.)
│   ├── landing/  ← Landing page components
│   ├── session/  ← Exercise and session UI components (Phase 1B)
│   └── progress/ ← Progress/fingerprint display components
├── hooks/        ← Custom React hooks. Bridge between engine and components.
└── lib/          ← Utilities (cn(), formatters, etc.)
```

**Rule:** Components never call engine functions directly. They go through hooks. Hooks call engine functions. This keeps the engine testable and the components dumb.

## TypeScript Rules
- Strict mode: all files compile clean
- No `any` — if you need escape hatches, use `unknown` with type guards
- No non-null assertions (`!`) — use optional chaining or explicit guards
- `type` imports for type-only imports: `import type { X } from '...'`
- Discriminated unions over boolean flags: `{ status: 'loading' | 'success' | 'error' }` not `{ isLoading: boolean, isError: boolean }`

## React Patterns
- Server Components by default in Next.js App Router
- `'use client'` only when needed (event handlers, hooks, Framer Motion, browser APIs)
- No useEffect for data fetching — use React Query or server components
- Framer Motion: `motion.div` for entrance animations; use `variants` for staggered sequences
- No inline styles — Tailwind classes only, with `cn()` for conditional classes

## Design System
- Background: `#09090e` (base)
- Dark cards: `bg-surface` (`#111118`)
- Brand accent: `bg-brand-500` (`#3b82f6`)
- Fonts: Plus Jakarta Sans via `next/font/google` — never Inter/Roboto/Arial
- All animations go through Framer Motion — no CSS animation classes for components
- shadcn/ui for interactive primitives (Button, Input, Card, Dialog, etc.)

## Naming Conventions
- React components: PascalCase
- Hooks: `use` prefix, camelCase (`useFingerprint`, `useSession`)
- Engine functions: camelCase, verb-first (`generateSession`, `buildRepairPlan`)
- Types: PascalCase (`MistakeFingerprint`, `SessionItem`)
- Constants: SCREAMING_SNAKE for truly global constants, camelCase for module-level

## File Structure
- One component per file
- Co-locate component-specific hooks in the same directory
- Shared hooks in `src/hooks/`
- All API routes in `src/app/api/`

## Error Handling
- Use discriminated unions for result types: `{ ok: true, data: T } | { ok: false, error: string }`
- Never swallow errors silently
- IndexedDB failures should degrade gracefully (warn in console, don't crash)
