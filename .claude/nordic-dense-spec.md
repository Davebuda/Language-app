# Nordic Dense — Page Elevation Spec

The agreed, approved UI direction. Goal: bring **every page** up to the sharpness and
component composition of the two gold-standard reference surfaces. This is a POLISH +
RECONSTRUCT pass on already-themed pages — not a from-scratch rebuild, not a feature change.

## Gold-standard reference files (READ THESE FIRST — mirror their composition)

- `src/app/dashboard/page.tsx` — the canonical composition: dark↔cream alternation, lime hero, stat strips, micro-labels.
- `src/app/page.tsx` — the landing page: sharp hierarchy, lime focal surface, dark CTAs, sparse geometric SVG accents.
- `src/app/globals.css` — the ONLY source of design tokens + component classes. Reuse these. Do **not** add new global CSS.

## Surface system (already in globals.css — compose from these, don't invent)

- **Dark cards:** `bg-[var(--nc-card)] border border-[var(--nc-border)]` (#151718) — or the `nc-glass` / `nc-glass-elevated` classes.
- **Cream cards:** `bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)]` — or `nc-glass-cream` / `nc-surface`. Cream uses dark text (`--nc-cream-text`, `--nc-cream-muted`, `--nc-cream-dim`).
- **Lime focal panel:** `nc-signal-panel`, or inline `bg-[linear-gradient(135deg,#C8FF20_0%,#B8EF10_100%)]` with dark text (`#0A1206` / `rgba(10,18,6,0.x)`).
- **Chips:** `nc-chip-signal` (green) for primary; level badges use `bg-[var(--nc-signal-tint)] text-[var(--nc-signal)] border-[rgba(200,255,32,0.18)]`.
- **Buttons:** `nc-button-primary` (lime, on dark surfaces); dark button on lime = `bg-[rgba(10,18,6,0.90)] text-white`.
- Secondary flow pages wrap in `nc-gradient-page nc-secondary-flow` + `nc-mobile-shell nc-flow-shell`.

## The 7 DNA rules (apply to every page)

1. **Shell:** `nc-gradient-page flex min-h-dvh flex-col` → `<main className="nc-mobile-shell ...">` with tight gaps (≈6px) and bottom clearance (`pb-32` or `nc-flow-shell` which already pads). Keep the `BottomNav` if the page has one.
2. **Surface contrast, not padding:** NEVER stack 3+ near-identical dark `nc-glass` cards in a row. Alternate dark and cream surfaces. Vary component *shape* (hero panel, stat strip, list panel, 2-col grid) — like the dashboard does.
3. **One lime focal element per page:** the primary action or the page's headline lives on a lime surface (`nc-signal-panel` / lime gradient). Exactly one dominant green focal point per view.
4. **Green is dominant:** make `--nc-signal` (#C8FF20) the main accent on all main components — progress bars, active states, key stat values (`text-[var(--nc-signal)]`), primary chips/badges, CTAs. **Demote teal** (`--nc-teal`) to a secondary/supporting role only (e.g. a single "speak/listen" accent), never competing with green for primacy.
5. **Micro-labels:** section eyebrows use `text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]` (or the `nc-label` class). Data is `tabular-nums`.
6. **Display headings:** `font-display font-extrabold leading-[0.94] tracking-[-0.03em]`. Use `text-balance` on headings, `text-pretty` on body.
7. **CTA + accents:** lime button on dark / dark button on lime. Sparse geometric SVG accents (thin rings, dots) at very low opacity are allowed (see landing) — never blobs, never gradient mesh.

## Concrete elevation directives (the actual gap to close)

- Replace flat repeated-dark-card stacks with a composed rhythm: lead with a lime or cream focal panel, then alternate. Profile/progress are the worst offenders — they stack identical dark cards.
- Promote the page's headline/hero into a real focal surface (lime panel or cream panel with a green accent), matching the dashboard hero's weight.
- Pull stat rows into a cream stat-strip with dividers (see dashboard `Stat Strip (Cream)` block) instead of dark-on-dark tiles.
- Tighten typography to the dashboard scale (micro uppercase labels, compact bold headings) where pages currently use larger generic text.
- Swap any teal-dominant accents to green; keep teal only as an occasional secondary signal.

## Rails (NON-NEGOTIABLE)

- **Depth not breadth:** do NOT add features, routes, or surfaces. Visual/composition only.
- **Do NOT change logic:** preserve all hooks, data flow, engine/scheduler calls, state, props, event handlers, fingerprint writes, and Norwegian copy. This is a presentation-layer pass.
- **Norwegian-dominates** on learning surfaces (session, conversation, journal, reading, muntlig, weekly). Assessment surfaces (diagnostic/quiz instructions) may keep English instructions by design — don't translate those.
- Font is **Schibsted Grotesk** only (already wired). No Inter/Roboto/Arial/Geist.
- **No emoji as icons** — Lucide / inline SVG stroke icons only. Icon-only buttons need `aria-label`.
- No purple/pink/multicolor gradients, no glassmorphism-as-decoration (the `nc-glass*` classes are opaque — keep them opaque), no decorative blobs, no 3D, no gradient mesh.
- Animations: motion only on `transform`/`opacity`, ≤200ms for interaction feedback, respect `prefers-reduced-motion`. Use `framer-motion` (the installed lib).
- Keep all changes type-safe (TS strict). Do not break imports/exports.

## Out of scope / do not touch

- `globals.css` (no new classes — compose from existing), `BottomNav.tsx` (already on-DNA), `dashboard/page.tsx`, `page.tsx` (the references), `CoachHeroCard.tsx`, `LaneTrackRow.tsx` (dashboard, already done).
- No rendering/screenshot verification needed (user waived it). Verify by reading your own diff for composition correctness + type safety.
