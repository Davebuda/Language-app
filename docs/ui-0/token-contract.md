# NorskCoach — Token Contract (UI-0 Resolution)

## The Problem

Two naming systems for the same red color exist simultaneously:

```css
/* globals.css — both point to #DC2626 */
--nc-violet:        #DC2626;   /* WRONG NAME — holds red */
--nc-violet-tint:   rgba(220,38,38,0.14);
--nc-violet-border: rgba(220,38,38,0.28);

--nc-red:        #DC2626;   /* correct */
--nc-red-tint:   rgba(220,38,38,0.14);
--nc-red-border: rgba(220,38,38,0.28);
```

```ts
// tailwind.config.ts — nc.violet holds red too
nc: {
  violet:          '#DC2626',   // WRONG NAME
  'violet-tint':   'rgba(220,38,38,0.14)',
  'violet-border': 'rgba(220,38,38,0.28)',
  red:             '#DC2626',   // correct
  'red-tint':      'rgba(220,38,38,0.14)',
  'red-border':    'rgba(220,38,38,0.28)',
```

Additionally, components use three different reference styles for the same token:

| Style | Example | Status |
|---|---|---|
| Tailwind utility | `text-nc-red` | Preferred — compile-time resolved |
| Inline CSS var | `text-[var(--nc-red)]` | Acceptable but verbose |
| Wrong token name | `text-nc-violet` / `text-[var(--nc-violet)]` | Must be removed |
| Hardcoded hex | `#7C3AED`, `#a78bfa` | Must be removed |

---

## Resolution Decision

**Drop `--nc-violet*` entirely. `--nc-red*` is the single primary brand system.**

Rationale: "violet" carries semantic meaning (purple/violet). The color is red. Carrying a permanently misnamed token creates confusion for every future editor. The cost is a find-and-replace across ~20 files — acceptable.

The token is renamed, not aliased. No bridge. No `--nc-violet: var(--nc-red)` shim.

---

## Target State — `globals.css`

### Remove
```css
--nc-violet:        #DC2626;
--nc-violet-tint:   rgba(220,38,38,0.14);
--nc-violet-border: rgba(220,38,38,0.28);
--nc-violet-fg:     #FFFFFF;
```

### Rename tailwind.config.ts comment
```ts
// Before:
// NorskCoach brand tokens — Warm Precision light theme
// Primary: violet #7C3AED | Base: stone warm off-white

// After:
// NorskCoach brand tokens — Ember dark theme
// Primary: red #DC2626 | Base: warm charcoal #120E0E
```

### Remove from tailwind.config.ts
```ts
violet:          '#DC2626',
'violet-tint':   'rgba(220,38,38,0.14)',
'violet-border': 'rgba(220,38,38,0.28)',
```

---

## Target State — Components

All component color references must resolve to one of these patterns:

```tsx
/* Primary brand — CTAs, active states, repair markers */
className="text-nc-red"               // Tailwind utility (preferred)
style={{ color: 'var(--nc-red)' }}    // Only when Tailwind can't do it

/* Brand tints */
className="bg-nc-red-tint"
className="border-nc-red-border"

/* Text hierarchy */
className="text-nc-text"
className="text-nc-text-muted"
className="text-nc-text-dim"

/* Success */
className="text-nc-green"
className="bg-nc-green-tint"
```

**Banned after token resolution:**
- `text-nc-violet`, `text-[var(--nc-violet)]`, `nc-label-light` (uses dim, keep but verify), `text-brand-400` (old blue brand — remove)
- Any hardcoded hex that maps to the brand color: `#DC2626`, `#7C3AED`, `#3b82f6` (old blue), `rgba(59,130,246,...)`, `rgba(124,58,237,...)`

---

## Specific Fixes Required

### `src/components/landing/waitlist-form.tsx` — REDO
```diff
- background: 'rgba(124,58,237,0.08)',    // violet — wrong
- border: '1px solid rgba(124,58,237,0.25)',
+ background: 'var(--nc-red-tint)',
+ border: '1px solid var(--nc-red-border)',

- background: '#7C3AED',                  // violet — wrong
+ background: 'var(--nc-red)',
```

### `src/components/landing/diagnostic-hero.tsx` — REDO gradient
```diff
- background: 'linear-gradient(135deg, #a78bfa 0%, var(--nc-violet) 50%, #c4b5fd 100%)',
  // ^ mixes violet stops with a red midpoint — incoherent
+ background: 'linear-gradient(135deg, #ef4444 0%, var(--nc-red) 50%, #dc2626 100%)',
  // or simply:
+ color: 'var(--nc-red)',
```

### `src/app/globals.css` — Remove deprecated aliases at bottom
After token rename, remove `nc-button-lime` (duplicate of `nc-button-primary`), and `.nc-panel`, `.nc-panel-soft`, `.nc-panel-dark`, `.nc-glass-dark`, `.nc-panel-dark` compatibility aliases — these will be replaced by the canonical glass system in UI-1.

---

## shadcn/ui Token Alignment

The shadcn tokens (`--primary`, `--ring`) are set to the same red value:
```css
--primary: 0 72% 51%;   /* #DC2626 in HSL */
--ring:    0 72% 51%;
```

This is correct — shadcn components (`<Button variant="default">`) will use the same red. No change needed here.

---

## Scope of the Find-and-Replace

Files that need token cleanup after `--nc-violet*` is removed:

| File | Pattern to fix |
|---|---|
| `src/components/landing/diagnostic-hero.tsx` | `var(--nc-violet)`, violet gradient stops |
| `src/components/landing/value-props.tsx` | `var(--nc-violet-tint)`, `var(--nc-violet-border)`, `var(--nc-violet)` |
| `src/components/landing/waitlist-form.tsx` | hardcoded violet hex |
| `src/components/onboarding/OnboardingFlow.tsx` | `text-nc-violet` references (if any remain) |
| Any file with `nc-label-light` | Verify: this class uses `--nc-text-dim` (valid), label text is fine |
| Any file with `text-brand-400` | Remove — old blue brand, should be `text-nc-red` |

---

## Backwards-Compat Aliases to Remove After UI-1

These exist in globals.css and are no longer needed once components migrate to canonical glass classes:
```css
/* REMOVE after UI-1 migration complete */
.nc-panel          { @apply nc-glass; }
.nc-panel-soft     { ... }
.nc-glass-dark     { @apply nc-glass; }
.nc-panel-dark     { @apply nc-glass; }
```
