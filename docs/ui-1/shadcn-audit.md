# UI-1.0 — shadcn Primitive Audit

Read-only inventory. No installs in UI-1.0.

---

## What is installed

From `src/components/ui/` and `package.json`:

| Component | Source | Status |
|---|---|---|
| `button.tsx` | shadcn/ui new-york | Installed ✓ |
| `badge.tsx` | shadcn/ui new-york | Installed ✓ |
| `card.tsx` | shadcn/ui new-york | Installed ✓ |
| `separator.tsx` | shadcn/ui (Radix `@radix-ui/react-separator`) | Installed ✓ |
| `TopographicGrid.tsx` | Custom canvas component | Installed — not shadcn |

Radix packages in `package.json`:
- `@radix-ui/react-separator` ✓
- `@radix-ui/react-slot` ✓ (used by button)

That is the entire installed primitive set. Everything else in the app is hand-rolled.

---

## Hand-rolled vs. should-migrate inventory

### Button
- **Status: Already shadcn.** `src/components/ui/button.tsx` is the shadcn Button with cva, token contract applied. Used directly and via `nc-button-primary` / `nc-button-dark` CSS classes.
- **Action: None.**

### Badge
- **Status: Already shadcn.** Used in `dashboard/page.tsx` for concept phase labels.
- **Action: None.**

### Card
- **Status: Already shadcn, but largely unused.** The app uses `nc-glass`, `nc-glass-elevated`, `nc-glass-cream-strong` CSS classes as card surfaces instead. The shadcn Card component is installed but no component imports it.
- **Action: Evaluate during UI-1.1 whether nc-glass classes should be expressed as shadcn Card variants or kept as CSS utilities. Do not migrate speculatively.**

### Separator
- **Status: Already shadcn.**
- **Action: None.**

### Input
- **Status: Hand-rolled. High migration value.**
- Hand-rolled in: `waitlist-form.tsx`, `login/page.tsx`, `conversation/page.tsx`, `WritingEditor.tsx`, `TranslationExercise.tsx`, `ListeningExercise.tsx`, `SpeedRound.tsx`, `FillInBlankExercise.tsx` (9 files)
- Current pattern: `nc-input` CSS class (globals.css) or inline `<input>` with inline styles
- shadcn Input wraps a native input, applies consistent height, ring, radius, border tokens. Migrating eliminates 9 separate hand-rolled patterns.
- **Action: High priority. Install during UI-1.1 when onboarding inputs are first touched.**

### Label
- **Status: Hand-rolled (via `nc-label`, `nc-label-red` CSS classes).**
- No Radix Label installed. The existing CSS classes (`nc-label`, `nc-label-red`) define the visual language correctly; they are not semantically wrong (they apply correct typography). A shadcn Label would add `htmlFor` binding enforcement via the Radix primitive.
- **Action: Low priority. The CSS classes are sufficient. Install only if form accessibility becomes a focus — defer to UI-1.2 or later.**

### Progress
- **Status: Hand-rolled.**
- Current: `ProgressBar.tsx` is a custom `motion.div` with scaleX animation. `ConceptProgressRow.tsx` has the same pattern. DiagnosticQuiz, RecalibrationQuiz, SpeedRound, eval page all hand-roll their own progress tracks.
- shadcn Progress uses `@radix-ui/react-progress` (not installed). It provides accessible `role="progressbar"` and `aria-valuenow` semantics — missing from all current implementations.
- **Action: Medium priority. Install during UI-1.1 for the diagnostic quiz bar. The session ProgressBar is a specialized animation element — keep it custom with scaleX.**

### Dialog / AlertDialog
- **Status: Not installed, not used.** The app has no modal dialogs currently. Level changes and confirmations use inline UI (the LevelSelector dropdown, inline confirmation text).
- **Action: Do not install speculatively. Install if UI-1.2 session work identifies a need for destructive confirmation (e.g., "quit session?" modal).**

### Tooltip
- **Status: Not installed.** No tooltips in the current UI.
- **Action: Deferred. The Aceternity animated tooltip candidate (for word-level grammar in exercise sentences) would build on this primitive when approved. Do not install yet.**

### Select / DropdownMenu
- **Status: Not installed.** No selects in the current UI (level switching uses a custom dropdown via AnimatePresence, not Radix Select).
- **Action: Do not install. The level selector pattern is fine as-is and does not warrant a Radix migration.**

### Tabs
- **Status: Not installed, not used.**
- **Action: Defer. No current surface uses tabs. If dashboard redesign in UI-1.3 introduces a tabbed navigation within a section, install then.**

### Toast / Sonner
- **Status: Not installed.** Dashboard references `toast` in one import pattern but no toast system is wired up.
- **Action: Install Sonner during UI-1.3 dashboard pass if toasts are used for mastery milestones or level-up confirmation. Do not install in UI-1.1 or UI-1.2 unless a specific need arises.**

### Skeleton
- **Status: Not used.** Loading states are handled via conditional renders (loading spinners, inline text). No structural skeleton UI exists.
- **Action: Defer to whichever surface first needs a proper loading skeleton. Likely dashboard (concept mastery tiles) or session (exercise card loading).**

### Switch
- **Status: Not used.**
- **Action: Defer.**

### Accordion
- **Status: Not installed.** The grammar explainer toggle in `ExplanationCard.tsx` and `GrammarExplainerCard.tsx` is hand-rolled with AnimatePresence + height animation (the pre-existing `height: 'auto'` violation). This is a natural Accordion candidate.
- **Action: Install during UI-1.2 session pass when ExplanationCard is reworked. The height animation fix and the shadcn Accordion migration are the same move.**

---

## Migration order

When UI-1.1 surface work begins, install in this order:

| Order | Primitive | Surface | Reason |
|---|---|---|---|
| 1 | `input` | Onboarding (PlacementQuiz, DiagnosticQuiz) | Highest usage count, most inconsistent current implementations |
| 2 | `progress` (Radix) | DiagnosticQuiz, RecalibrationQuiz bars | Adds `role="progressbar"` semantics missing everywhere |
| 3 | `accordion` | ExplanationCard (UI-1.2) | Resolves height:auto animation violation simultaneously |
| 4 | `dialog` / `alert-dialog` | Session (UI-1.2) if quit-session confirmation needed | Only if the need arises |
| 5 | `sonner` | Dashboard (UI-1.3) | Level-up and mastery milestone notifications |
| — | `select`, `tabs`, `switch`, `skeleton` | Defer | No current need |

**Do not install items 3–5 during UI-1.1. Install only what the active surface requires.**

---

## Token conflict risk callout

shadcn components ship with defaults wired to the CSS variable contract. The current token state:

| Token | shadcn default behavior | NorskCoach current value | Conflict? |
|---|---|---|---|
| `--primary` | Button default variant background | `0 72% 51%` = `#DC2626` (red) | No conflict — maps correctly |
| `--ring` | Focus ring color | `0 72% 51%` = `#DC2626` | No conflict — red focus ring |
| `--radius` | Border radius for all shadcn components | `0.75rem` | No conflict — aligns with design |
| `--background` | Page/card background | `0 10% 6%` = `#120E0E` | No conflict |
| `--border` | Border color | `31 10% 16%` = ~`rgba(255,255,255,0.10)` equivalent | Acceptable — close enough to `--nc-border` |
| `--muted` / `--muted-foreground` | Disabled and secondary text | Set to dark variants | No conflict |
| Animation duration | shadcn components (Dialog, Dropdown) ship with CSS transitions around 150–200ms | Not overridden | **Risk: shadcn Dialog open/close uses CSS transitions, not Framer Motion. Visual language inconsistency if Framer Motion is used everywhere else.** Resolution: Override Dialog animation with Framer Motion `AnimatePresence` wrapper when Dialog is installed. |
| Focus ring style | shadcn default: `ring-2 ring-ring ring-offset-2` | No override set | **Risk: On dark backgrounds, `ring-offset` creates a visible gap that may conflict with the glass card system. May need `ring-offset-transparent` or `ring-offset-[var(--nc-bg)]`.** Flag for UI-1.1 when first input/button focus state is verified. |

**The two risks that need action during UI-1.1:**
1. Dialog animation inconsistency — wrap with Framer Motion when Dialog is installed.
2. Focus ring offset on dark — audit first input in onboarding and set `ring-offset-[var(--nc-bg)]` if the gap is visually wrong.

These do not block UI-1.0 approval. They are pre-flight notes for UI-1.1.
