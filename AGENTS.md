# norskcoach

## Purpose
Language-app project.

## Stack
- Framework: Next.js | Runtime: node

## Commands
- `npm run dev` — next dev --turbopack
- `npm run build` — next build
- `npm run start` — next start
- `npm run lint` — next lint
- `npm run test` — vitest run
- `npm run test:watch` — vitest
- `npm run audit:corpus` — tsx scripts/audit-corpus.ts
- `npm run council:verify` — playwright test tests/council/ && node .council/scripts/form

## For AI agents
- Fetch Context7 docs before writing against any library below.
- Route work via the strongest skill/agent/tool (global `~/.claude/CLAUDE.md` router).
- Global web / frontend / supabase / deploy standards auto-load from `~/.claude/rules/`.

## Dependencies
| Package | Version |
|---|---|
| `@anthropic-ai/sdk` | ^0.95.1 |
| `@dnd-kit/core` | ^6.3.1 |
| `@dnd-kit/sortable` | ^10.0.0 |
| `@dnd-kit/utilities` | ^3.2.2 |
| `@mlc-ai/web-llm` | ^0.2.83 |
| `@radix-ui/react-alert-dialog` | ^1.1.15 |
| `@radix-ui/react-separator` | ^1.1.8 |
| `@radix-ui/react-slot` | ^1.2.4 |
| `@supabase/ssr` | ^0.6.1 |
| `@supabase/supabase-js` | ^2.49.4 |
| `class-variance-authority` | ^0.7.1 |
| `clsx` | ^2.1.1 |
| `framer-motion` | ^11.18.2 |
| `howler` | ^2.2.4 |
| `idb` | ^8.0.2 |
| `lucide-react` | ^0.511.0 |
| `motion` | ^11.18.2 |
| `next` | ^15.3.2 |
| `react` | ^19.1.0 |
| `react-dom` | ^19.1.0 |
