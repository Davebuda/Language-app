# NorskCoach — Type Scale

Defined in UI-1.1 (onboarding proving ground). Applies to every screen from UI-1.2 forward.
Typeface: Schibsted Grotesk (single family, 400/500/700 loaded).

---

## Primary test

On any exercise or prompt screen: the Norwegian text must be unmistakably the most prominent
element. A learner finishing a session remembers the Norwegian, not the layout.

---

## Scale

| Tier | Role | Size | Weight | Extra |
|---|---|---|---|---|
| **T1** | Norwegian prompt / exercise text | `text-[1.75rem]` (28px) | `font-bold` (700) | `leading-[1.2]` `text-balance` |
| **T2** | Answer options / interactive labels | `text-[0.9375rem]` (15px) | `font-medium` (500) | `leading-snug` |
| **T3** | Support / explanation / prose | `text-sm` (14px) | `font-normal` (400) | `leading-7` `text-pretty` |
| **T4** | Labels / metadata / CEFR tags | `text-[11px]` | `font-bold` (700) | `uppercase` `tracking-[0.08em]` |

### Hierarchy ratios
- T1 : T2 = 28 : 15 = **1.87×** — Norwegian prompt clearly dominates answer options
- T1 : T4 = 28 : 11 = **2.55×** — Labels are subordinate, nearly invisible
- T2 : T3 = 15 : 14 = 1.07× — Intentionally close; weight (500 vs 400) differentiates them

---

## Application rules

**T1 is reserved for one thing:** the text the learner is actively working on — Norwegian sentences, prompts, questions in Norwegian. It is never used for English headings, section titles, or UI chrome. If English copy appears at T1 size, that is a violation of the "Norwegian dominates" principle.

**T2 applies to:** answer option text, interactive button labels (not CTA buttons — those use T2 size but with font-semibold 600), and any text the learner reads before acting.

**T3 applies to:** grammar explanations, English hints, secondary prose, body copy in info sections.

**T4 applies to:** CEFR level tags, concept IDs, section markers ("QUESTION 3 / 12"), the nc-label and nc-label-red CSS classes. Always uppercase, always with tracking.

---

## Display headings (non-exercise screens)

UI navigation headings (dashboard section titles, onboarding section headers) are NOT T1.
They use a separate heading scale:

| Context | Size | Weight |
|---|---|---|
| Hero / onboarding slide heading | `text-[2.25rem]` (36px) | `font-bold` |
| Section heading (dashboard, etc.) | `text-2xl` (24px) | `font-bold` |
| Card heading | `text-lg` (18px) | `font-semibold` |

These headings are in English or Norwegian — the scale is the same. What matters is that
on any exercise screen, T1 Norwegian text overrides all headings in visual weight.

---

## What this replaces

The old onboarding quiz used `text-[1.25rem] font-semibold` (20px / 600) for the Norwegian
prompt. At 20px semibold, the prompt had a 1.43× advantage over 14px answer text — readable
hierarchy but not "unmistakably dominant." The new 28px / 700 at Schibsted Grotesk is
decisive.

---

## Implementation notes

- `text-balance` on T1: prevents orphan words in short Norwegian prompts
- `text-pretty` on T3: prevents mid-word breaks in explanation prose
- `tabular-nums` where numbers appear in T2/T3 context (scores, percentages, timers)
- Do not use `text-[1.75rem]` for anything other than Norwegian exercise text — the size
  is the signal. If it appears on a non-exercise element, readers will expect Norwegian content.
