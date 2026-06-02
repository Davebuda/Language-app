# UI Handoff Brief — NorskCoach read→recite→write module + progress representation

You are designing and building the UI/UX for new functionality in **NorskCoach**, an adaptive Norwegian language-learning web app (Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Framer Motion, Supabase). The **engine, grading, content type, and content are already built and tested** — your job is the *front end*, and first to **brainstorm how the UI can best represent these changes** before writing any component.

Do NOT rebuild engine logic. Consume the APIs listed under "Already built." Start by reading the files in "Read first."

---

## Read first (in order)
1. `CLAUDE.md` (root) — the moat, north star, Operating Rules (esp. Rule 1 depth-not-breadth, Rule 6 no silent substitution, Rule 8 pipeline honesty). This file wins over everything.
2. `output/unified-read-recite-write-design.md` — the full design spec for the module (per-level shape, the 3 honest writes, daily/weekly compounding, UI build checklist §7). This is your primary source.
3. `output/skriv-readwrite-design.md` — the read→write half it extends.
4. `docs/per-level-progression-proposal.md` — how each CEFR level develops a *different* area (A1 foundations / A2 combination / B1 production / B2 lexical-nuance) and the per-level daily/weekly walls.
5. `.omc/plans/2026-06-02-resume-readwrite.md` — current state + the remaining Lane B step list.
6. Design memory: `~/.claude/design-memory/taste-profile.md` (explicit visual preferences).

---

## North star + moat (every UI decision traces to these)
- **Moat:** diagnosis + scheduling + remediation. The app knows *precisely* what the learner fails at and fixes it.
- **North star:** make the user **produce** Norwegian (construct sentences) and **speak** with confidence. A pure-recognition surface fails this unless wrapped in an output requirement.
- **"Norwegian dominates the screen"** on all learning surfaces (session, translation, fill-in-blank, journal, muntlig, and this new module). English is muted/opt-in. (Assessment surfaces like the diagnostic are the only exception.)

---

## Non-negotiable design constraints (from CLAUDE.md global rules)
- **Typography:** Schibsted Grotesk only (display 700 / body 400). BANNED: Inter, Roboto, Arial, Space Grotesk, system-ui, Geist. æ/ø/å are first-class.
- **No emoji as UI icons** — Lucide or SVG stroke icons only.
- **Density / anti-slop:** tight layouts, surface contrast over padding, no filler text, varied corner radii, dark glassmorphic base. Avoid uniform card stacks, uniform corners, excessive padding, long generic text. Every screen needs one memorable thing.
- **Stack:** Tailwind utility-first; shadcn/ui primitives (never raw/default-styled); Framer Motion for all animation (no CSS transitions for interactive/complex); App Router Server Components by default, client boundary only when needed; `next/image` for images; react-hook-form + zod at form boundaries; Zustand for shared client state.
- **Library docs are mandatory:** before writing code using React/Next/Tailwind/shadcn/Framer, fetch current docs for the installed version via Context7 MCP. Not from memory.
- **Frontend completion checklist (required before any "done"):** render at 375 / 768 / 1280 / 1920 via Chrome DevTools MCP → save screenshots to `.claude/screenshots/<task>/` → run `/baseline-ui` → `/fixing-accessibility` → `/fixing-motion-performance` → `/polish` → visual QA (no overflow, no overlap, WCAG AA contrast, no placeholder/debug DOM, no duplicate brand) → **surface all screenshots to the user before claiming completion.**

---

## THE CHANGES THAT NEED UI REPRESENTATION
Brainstorm how each is best represented. Each has an **honesty rail** the UI must not violate.

### 1. The read→recite→write "skriv" module (the main build) — NEW, no UI yet
One Norwegian passage, three steps, one fingerprint write per step. Standalone `/skriv` flow (3 pages), B1-only for v1.
- **READ page** — a level-scaled passage (B1 = ~200 words, 5 paragraphs) on a reading-friendly surface; muted opt-in English gloss; "Les ferdig →" advances and logs *exposure* (no mastery — reading isn't producing).
- **RECITE page** — the learner listens to + says aloud 2–3 bounded "lead" sentences (not the whole passage). Reuses the existing `ShadowingExercise`. **Honesty rail:** the browser speech score is a *word-colour assist only* (green = heard), NEVER the grade, and **NO numeric percentage** is shown. The learner *self-reports* ("Jeg sa det" / "Det var vanskelig"). Non-mic fallback: read aloud + self-report. Represent this as honest rehearsal/activation, not a pronunciation judge.
- **WRITE page** — an opinion prompt about the passage; a textarea with a **live checklist preview** (see #2); "Sjekk svar" grades it. **Honesty rail:** no numeric score; show an honest checklist + (when AI is up) specific corrections.
- **Per-level scaling** exists in the design doc (A1 short frame → B2 developed argument); v1 ships B1 only.

**Brainstorm:** the visual rhythm of a 3-step single-passage journey; how reading flows into speaking flows into writing without feeling like 3 disconnected pages; how the same passage threads through all three; progress/step indication; the reading surface aesthetic (this is the one place a calm, editorial reading surface is right — but it must still feel like NorskCoach).

### 2. The WRITE-step grading UX (deterministic + AI, honest) — NEW
The grader returns one of four outcomes — represent each honestly:
- `pass` → credited production (a "brick"). When AI is up and confirms it's clean → full credit; when AI is down/unverified → **reduced** credit (don't over-claim correctness we can't verify).
- `structure-missing` → they wrote enough on-topic but dodged the target structure (e.g. no connector) → honest "you avoided X" nudge + a micro-drill.
- `too-short` / `off-topic` → not a real attempt → honest "skriv litt mer / hold deg til teksten", **no** credit, no punishment.
The grader also returns a **checklist** (`{label, ok}[]`, e.g. "Minst 30 ord", "Knyttet til teksten", "Bruk en bindestruktur («fordi»)") meant to render as a **live preview** that ticks as the learner types.
**Honesty rail (Rule 6/8):** no fake percentage; the UI's feedback must match what the engine actually verified. AI-down state must be visibly honest (template feedback, not a pretend AI review).

**Brainstorm:** how the live checklist feels (encouraging, not a gate that blocks); how to show "production counted" vs "almost — add a connector" vs "this isn't an attempt yet"; how AI-up rich corrections vs AI-down deterministic-only states differ visually without the AI-down state feeling broken.

### 3. The "brick → daily → weekly" compounding model — needs representation across the app
This is the user's core mental model and a primary ask: **every answered exercise is a brick** that compounds onto a **daily wall** and then a **weekly sprint**, and the meaning is **differentiated per CEFR level**.
- One `/skriv` passage writes **3 distinct bricks** (read = exposure, recite = speaking-minutes + recognition, write = production) onto existing daily blocks (`lytt` / `lær` / `snakk`) and rolls into the weekly sprint.
- Per-level walls differ: A1 = foundations touched/graduated; A2 = combination + connector error-rate↓; B1 = **production-gap reduction** + clauses/minutes produced; B2 = lexical range / "words you no longer miss".
**Honesty rail:** 3 bricks, not 1 composite — never let a passage "count" without the production step (Rule 6). Each brick is a real engine write (Rule 8).

**Brainstorm:** how a single exercise visibly "lays a brick"; how the daily wall and weekly sprint *read differently per level* (B1 should feel like a production meter; B2 like a vocabulary-coverage meter); the moment-of-contribution micro-feedback after each step; how this connects to the existing dashboard (WeekStrip, lane strip, speaking metric).

### 4. Production-credit honesty (`recordProductionFromSurface`) — engine done, UX implication
A correct written production now moves mastery — but a **guided/scaffolded** frame earns a **reduced** brick and does NOT advance the spaced-review schedule (a copied frame isn't retrieval). Free production earns full credit.
**Brainstorm:** if/how to communicate to the learner that free production is "worth more" than filling a frame — without gamifying dishonestly. Likely subtle, but consider it.

### 5. Cloze passages — already shipped, for visual consistency
The cloze exercise type (`ClozePassageExercise.tsx`) is live and renders inside the session. Your new module should feel like a sibling, not a stranger. Reuse its honesty patterns (honest "Repetisjon" fallback badge, level-gating). Match its visual language where sensible.

---

## Already built — CONSUME, do not rebuild
- **Content type:** `ReadingPassage` in `src/types/content.ts` (fields: `paragraphs[]`, `sentences[]`, `reciteTargetIndices[]`, `writePrompt`, `writeFrame?` (presence ⇒ guided), `targetConnectors[]`, `targetStructureTag`, `passageContentWords[]`, `primaryConceptId`, `conceptIds[]`, `englishGloss?`, `title`, `cefrLevel`, `difficulty`).
- **Content:** 6 linguist-approved B1 passages in `content/reading/b1.json`.
- **Loader:** `src/lib/reading-loader.ts` → `SEED_READING_PASSAGES` (by id), `SEED_READING_PASSAGE_IDS` (by `primaryConceptId`).
- **Deterministic grader:** `gradeReadRespond(params)` in `src/lib/grade-read-respond.ts` → `{ outcome: 'pass'|'too-short'|'off-topic'|'structure-missing', wordCount, sentenceCount, onTopicOverlap, hasTargetStructure, missingStructureTag?, checklist: {label,ok}[] }`. Params: `{ text, level, passageContentWords, targetConnectors, targetStructureTag }`.
- **Production write (correct):** `recordProductionFromSurface(fp, { conceptId, guided }, graph)` in `src/engine/repair-from-surface.ts`. One mastery brick, no error logged, reduced weight + frozen SRS when `guided`.
- **Repair write (wrong/structure-miss):** `repairFromSurface(fp, { surfaceKind, errorTag, conceptId?, wrong?, correct? }, graph)` (same file).
- **AI writing review (Tier-2):** `aiService.reviewWriting({ userText, prompt, level })` → `WritingFeedback { errors: TaggedError[], praise, suggestion, source }`. AI-down returns `errors: []` + template text (`source: 'template'`). Map `errors` → `repairBatchFromSurface`.
- **Fingerprint writes:** `recordResult`, `recordExposure`, `recordBlockProgress`, `speakingMinutesTotal` in `src/hooks/useFingerprint.ts`. Wiring precedent: `submitClozeResults` in `src/hooks/useSession.ts` (folds multiple results, injects repairs, advances).

## Existing components to reuse
- `src/components/muntlig/ShadowingExercise.tsx` + `src/lib/speechMatchUtils.ts` — the RECITE step (word-colour assist, mic + text-mode fallback). Reuse verbatim; add the self-report buttons + drop any percentage.
- `src/components/session/exercises/ClozePassageExercise.tsx` — passage-rendering + honesty-pattern precedent.
- `src/components/session/ExerciseCard.tsx`, `SessionScreen.tsx` — session rendering shell.
- `AudioPlayer` component — TTS playback (browser TTS fallback exists).
- Dashboard: `WeekStrip`, lane strip, `src/app/dashboard/page.tsx` (speaking metric) — where the brick/weekly model surfaces.

---

## Honesty rails (Rule 6 + Rule 8) — UI MUST NOT
- Show a fake/derived percentage as if it were a real pronunciation or correctness judgment.
- Let a passage register as "complete" without the production (write) step.
- Present AI-down template feedback as if it were an AI review.
- Render a state the engine didn't actually write (every visible claim of progress must trace to a real fingerprint write).
- Silently substitute below/above-level or recycled content without an honest badge.

---

## Your deliverable
1. **First, brainstorm — don't build.** Produce 3–5 UI/UX directions for (a) the 3-step `/skriv` module and (b) the brick→daily→weekly progress representation, with tradeoffs. Use the `/feature-to-layout-director` (structural layout directions) then `/design` (visual direction) pipeline. Reference the taste profile.
2. Get the direction chosen, THEN build: `/skriv` route + `UnifiedReadReciteWrite` component (3 pages) → wiring (`submitUnifiedPassage`) → scheduler/`ExerciseType` integration (add `'read-respond'` to the union *with* the renderer, not before — avoid a phantom) → Supabase persistence (RLS) → the frontend completion checklist → a **Rule-8 live trace** (real B1 session: confirm speaking-minutes grew, error log + mastery moved on write, `lytt`+`snakk` daily blocks advanced, `productionGap` changed).

## Scope discipline
B1 only for v1. Do NOT add A1/A2/B2 surfaces, full speaking-in-loop scoring, or new exercise types — those are explicitly deferred (Operating Rule 1). The independent **'Snakk' label bug** (`scheduler.ts` ~49/446, typed exercises mislabeled as speaking) is real but separate — do NOT bundle it in.
