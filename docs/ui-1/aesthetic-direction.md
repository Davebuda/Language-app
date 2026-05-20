# Aesthetic Direction — NorskCoach UI

Declared direction: **precise dark intelligence — Norwegian is the hero.**

The interface is dark, calm, and purposeful. Every element that is not load-bearing gets out of the way. The Norwegian language dominates every learning surface because the app exists to make users produce Norwegian — not to explain it to them in English.

---

## The "Norwegian Dominates" Principle

On learning surfaces, the Norwegian the learner is wrestling with dominates the screen. This is the single most load-bearing visual rule. It manifests differently depending on what form the Norwegian content takes:

**Translation / fill-in-blank** — the Norwegian text prompt sits above the answer options at minimum 1.6× their type-size, in the upper third of the card, at the highest font weight on screen. Acceptance test: 1.6× ratio, upper third, highest weight — all three at all four breakpoints (375 / 768 / 1280 / 1920px).

**Type scale discipline — 1.6× is a floor, not a target.** Production-exercise prompts (TranslationExercise, SpeedRound) should land at 1.75×+ to leave margin against font-size changes, root-em adjustments, or longer sentences that reduce apparent visual weight. Exactly-at-1.6× has no margin and erodes. The unified production-exercise prompt size is `text-[28px]` constant across breakpoints: 28 ÷ 15px (nc-input) = 1.87×. New exercise surfaces should match this unless there is a strong reason to diverge, documented here.

**Word-order** — the Norwegian content is the interaction tiles themselves, not a separate prompt. "Norwegian dominates" is satisfied by making the tiles the most visually prominent element on the card: large type (text-[22px]→text-[26px] across breakpoints), font-bold, generous padding, distinct border and background. The English hint is demoted to the small-label treatment (10px uppercase, tracking-widest, low opacity). Showing the full Norwegian sentence above the tiles is explicitly forbidden — it defeats the exercise by converting recall into pattern-matching, which corrupts the mistake fingerprint.

**Audio / listening** — the Norwegian content is the audio. No Norwegian text is displayed on screen during the listening phase (pre-answer). Dominance is expressed through the audio playback UI being the primary affordance, with text inputs subordinate.

---

## Three Explicit Exemptions

The "Norwegian dominates" rule has three explicitly documented exemptions. Any new surface that seems to need an exemption must be proposed and approved here before being built.

**1. Assessment surfaces — diagnostic and recalibration.**
English instructions with Norwegian answer options. Exemption reason: measurement accuracy. A learner who misreads an instruction due to language barrier produces a corrupted placement score. On assessment surfaces, instruction clarity matters more than immersion. Norwegian options still appear prominently as the choices; English instructions are the exception, not the frame.

**2. Word-order tiles (see above).**
The Norwegian is the tiles. No separate prompt. The tiles dominate visually through type size and weight; the English hint is subordinate. This is a form-follows-function exemption: the recall task requires the Norwegian to be scrambled, not displayed whole.

**3. Listening / audio-primary surfaces.**
No Norwegian text during the listening phase. The audio IS the Norwegian. Post-answer, the correct Norwegian text appears in the feedback state as normal.

---

## Token Contract

Single red system: `--nc-red*` is the brand signal. Violet dropped entirely. No purple or pink anywhere.

Typography: Schibsted Grotesk, single family, display 700 / body 400. Æ/ø/å are primary design requirements — the typeface was chosen to handle them as first-class characters.

Background: deep dark, not pure black — the topographic grid provides depth without decoration. No glassmorphism as decoration. No blob shapes. No gradient meshes.

---

## Reference

- `docs/ui-1/typeface-analysis.md` — Schibsted Grotesk selection rationale
- `docs/ui-1/type-scale.md` — documented type scale inherited by all screens
- `docs/ui-1/shadcn-audit.md` — primitive audit, install-at-the-surface policy
