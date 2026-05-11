# NorskCoach — Frontend Design Spec
**Date:** 2026-05-11  
**Status:** Approved  
**Scope:** Complete frontend implementation — all screens, routing, guest mode, engine wiring

---

## 1. Goal

Build a complete, usable web app from landing page to completed session. Every screen connects to the real adaptive engine (fingerprint → scheduler → exercise → repair loop). The app must work fully without login (guest mode via IndexedDB), with an optional sign-in banner that persists progress to Supabase.

---

## 2. Route Architecture

| Route | Status | Description |
|---|---|---|
| `/` | update existing | Dark landing — hero + features + "Start gratis" CTA |
| `/onboarding` | **new** | 3-question placement quiz → seeds initial fingerprint |
| `/dashboard` | **new** | Home for all users; today's session, concept bars, streak |
| `/session` | update existing | Active exercise session; no nav chrome while in session |
| `/session/complete` | **new** | Post-session summary — score, stats, next session preview |
| `/progress` | **new** | Full concept list: mastered / in-progress / locked |

Navigation: bottom nav (4 tabs: Hjem, Økt, Fremgang, Profil) visible on all screens except `/session`.

---

## 3. Design Tokens

All tokens defined as CSS custom properties in `globals.css`:

| Token | Value | Usage |
|---|---|---|
| `--color-dark` | `#0d0d14` | Landing background only |
| `--color-cream` | `#faf7f0` | All app screen backgrounds |
| `--color-navy` | `#1a1a2e` | Today card, check buttons |
| `--color-orange` | `#e87c3e` | Primary CTA, progress bars, streak number |
| `--color-green` | `#7cb87e` | Mastered concepts, completion card |
| `--color-repair-bg` | `#fff8ef` | Repair loop panel background |
| `--color-repair-border` | `#fde8cc` | Repair loop panel border |
| `--color-surface` | `#ffffff` | Exercise cards, concept rows |
| `--color-muted` | `#ede9e0` | Borders, track backgrounds |

Font: `Plus Jakarta Sans` (already configured in `layout.tsx`). Banned: Inter, Roboto, Arial, Space Grotesk.

---

## 4. Guest Mode

- On first visit, the app uses a local guest identity (UUID stored in `localStorage` as `norskcoach_guest_id`).
- Display name defaults to "Gjest" until overridden by sign-in.
- All engine state (fingerprint, session history) lives in IndexedDB — the existing `useFingerprint` hook handles this.
- A persistent guest banner appears on `/dashboard` and `/progress`: *"Fremgangen din lagres lokalt. Logg inn for å synkronisere."* with a "Logg inn →" link.
- The `/onboarding` placement quiz runs once (gated by `localStorage` key `norskcoach_onboarded`). Subsequent visits go directly to `/dashboard`.

---

## 5. Screen Specifications

### 5.1 Landing — `/`

**Layout:** Full-height dark screen. No bottom nav.

**Sections (top → bottom):**
1. Header: `NorskCoach` wordmark (top-left), `Logg inn` text link (top-right)
2. Hero: large headline "Lær norsk med selvtillit.", subtitle, `Start gratis →` button (orange, full-width on mobile)
3. Feature cards (3 cards, vertical stack on mobile): "Diagnoses daily", "Repair loop", "Concept graph"
4. Footer: `© NorskCoach 2026` — minimal

**CTA behaviour:** "Start gratis →" checks `localStorage` for `norskcoach_onboarded`:
- Not set → navigate to `/onboarding`
- Set → navigate to `/dashboard`

### 5.2 Placement Quiz — `/onboarding`

**Layout:** Cream background. No bottom nav. Back arrow (top-left) goes to `/`.

**Flow:** 3 questions, one per screen with animated slide transition (Framer Motion `AnimatePresence`).

**Questions:**
1. "Hvor mye norsk kan du fra før?" — 4 options: Ingenting / Litt / Grunnleggende / Middels
2. "Hva er vanskeligst for deg nå?" — 4 options: Ord og uttrykk / Grammatikk / Lytte og forstå / Vet ikke
3. "Hva er målet ditt med norsk?" — 4 options: Jobb / integrering / Familie / sosialt / Reise / Akademisk

**Progress indicator:** 3 dots at top (orange = answered, muted = pending).

**Engine seeding (after Q3):**
- Q1 (experience) sets concept pool start level: `beginner` → A1 only, `some` → A1 weighted, `intermediate` → A1+A2
- Q2 (weakness) pre-weights fingerprint error tags: `grammar` → boost `word-order-v2`, `artikel` tags; `vocab` → boost `unknown-vocab` tag; `listening` → boost `listening` tag
- Q3 (goal) sets a `scenario_preference` field in the fingerprint for sentence selection
- After seeding: set `norskcoach_onboarded = true` in `localStorage`, redirect to `/dashboard`

**Result screen (after Q3 answered):** Shows the computed starting session: "Klar for A1! Vi starter med [concept name]." + "Start første økt →" CTA.

### 5.3 Dashboard — `/dashboard`

**Layout:** Cream background. Bottom nav (tab: Hjem active).

**Sections (top → bottom):**

1. **Header row:** Date (small, muted) + greeting "Hei, [name]! 👋" + avatar circle (initial, orange)
2. **Guest banner** (conditional, cream → amber tint strip): "Fremgang lagres lokalt · Logg inn →"
3. **Today's session card** (navy background):
   - Label: "I dag · ~{estimated_minutes} min"
   - Title: name of primary concept being targeted today
   - Pills row: "{n} reparasjoner" (orange pill) + "{n} repetisjon" + "{n} nytt"
4. **Concept progress section:**
   - Section header: "Konseptfremgang" + "Se alle →" link → `/progress`
   - List of top 5 concepts from fingerprint (most recently active), each row:
     - Colour dot + concept name + horizontal bar (filled = decayedScore) + percentage
   - Locked concepts shown greyed with 🔒 instead of percentage
5. **Streak row:** 🔥 + streak number (orange) + "dagers streak"
6. **Start CTA:** "Start dagens økt →" (orange, full-width) → `/session`

**Data:** `useFingerprint` + `generateSession()` called client-side on mount. If fingerprint is empty (new user somehow bypassed onboarding), redirect to `/onboarding`.

### 5.4 Session — `/session`

**Layout:** Cream background. No bottom nav. No header. Full-focus mode.

**Header area:**
- Thin orange progress bar (top of screen, `useSessionStore.currentItemIndex / session.items.length`)
- Exercise type pill: `✏️ Oversettelse · {n} av {total}` (small, muted)

**Exercise area:**
- `ExerciseCard` component (already built) — routes to the correct exercise component based on `item.exerciseType`
- Wrong answer → repair loop expands inline below the exercise card (already built in `ExplanationCard`)

**Repair loop visual treatment:**
- Amber tint background (`--color-repair-bg`), amber border (`--color-repair-border`)
- Header: "🔁 Reparasjonsløkke" (orange, small caps)
- Explanation text: large, clear — this is the teaching moment
- Micro-drill card: white surface inside amber panel
- Framer Motion `AnimatePresence` slide-down (already implemented — keep as-is)

**Session end:** When `currentItemIndex >= session.items.length`, navigate to `/session/complete` passing session results via `useSessionStore`.

### 5.5 Session Complete — `/session/complete`

**Layout:** Cream background. Bottom nav (tab: Økt active).

**Sections:**
1. Headline: "Flott jobbet, [name]! 👏" + "Dagens økt fullført"
2. Score circle: large ring (orange border), `{accuracy}%` inside
3. Stats row (3 columns): Nøyaktighet {%} / Tid {mm:ss} / Konsepter {n}
4. Next session preview card (dark green background):
   - Label: "🌱 Neste økt"
   - Title: next target concept name (from engine's next session preview)
   - Description: brief coaching note
   - Button: "Gå til dashbord" → `/dashboard`
5. Concept mastery changes (if any mastery went up or down): small pill list showing concept name + delta arrow

**Data:** Read from `useSessionStore` (session results accumulated during session). Call `useFingerprint.saveFingerprint()` on mount to persist updated mastery.

### 5.6 Progress — `/progress`

**Layout:** Cream background. Bottom nav (tab: Fremgang active).

**Header:** "Konsepter" title + subtitle "A1 — {n} av 22 mestret"

**Sections (3 groups):**

1. **🟢 Mestret** — concepts where `decayedScore >= mastery_threshold` (from `a1-graph.json`)
   - Each row: colour dot + name + progress bar (filled) + percentage
2. **🔶 I gang** — unlocked concepts with `0 < decayedScore < threshold`
   - Same row format
3. **🔒 Låst** — concepts whose prerequisites aren't yet mastered
   - Row: grey dot + name + empty bar + "Krever {prereq name}" label

**Data:** `useFingerprint` + `a1-graph.json` (imported as JSON). `getUnlockedConcepts()` from `src/types/concepts.ts` determines which concepts are accessible.

---

## 6. Shared Components (new)

| Component | Path | Purpose |
|---|---|---|
| `BottomNav` | `src/components/layout/BottomNav.tsx` | 4-tab bottom nav, receives `activeTab` prop |
| `GuestBanner` | `src/components/layout/GuestBanner.tsx` | Conditional amber strip with sign-in link |
| `ConceptProgressRow` | `src/components/progress/ConceptProgressRow.tsx` | Single row: dot + name + bar + pct |
| `ScoreCircle` | `src/components/session/ScoreCircle.tsx` | SVG ring with percentage in centre |
| `PlacementQuiz` | `src/components/onboarding/PlacementQuiz.tsx` | 3-step animated quiz, returns `PlacementAnswers` |

---

## 7. State & Data Flow

```
localStorage: norskcoach_guest_id, norskcoach_onboarded
     ↓
IndexedDB (idb): MistakeFingerprint (via useFingerprint / useFingerprintStore)
     ↓
generateSession(fingerprint, a1-graph, sentenceIds) → Session
     ↓
useSessionStore: session, currentItemIndex, isInRepair, repairPlan
     ↓
SessionScreen → ExerciseCard → exercise component → onResult()
     ↓ (on wrong answer)
buildRepairPlan(error) → ExplanationCard (inline repair)
     ↓ (on completion)
/session/complete: accuracy, duration, concept changes
     ↓
useFingerprint.recordResult() → updateConceptMastery() → saveFingerprint()
```

---

## 8. Animation Plan (Framer Motion)

| Interaction | Animation |
|---|---|
| Placement quiz step transition | `x: 40 → 0` slide-in + fade, `x: 0 → -40` slide-out |
| Wrong answer shake | `x: [-8, 8, -8, 8, 0]` keyframe on exercise card |
| Correct answer | `scale: [1, 1.04, 1]` green pulse on card border |
| Repair loop expand | `height: 0 → auto` + `opacity: 0 → 1` with `AnimatePresence` (already built) |
| Score circle on complete | `strokeDashoffset` SVG animation from 0 → final value |
| Progress bar fill | `width: 0 → {pct}%` on mount |

---

## 9. Dev Mock Content

To keep the app functional during development (before sentences are seeded), add a `src/lib/mock-sentences.ts` file with 10 hardcoded `Sentence` objects covering A1 concepts. `generateSession()` falls back to these when Supabase returns 0 rows. This is dev-only — the fallback is removed once real content exists.

---

## 10. Content Fallback (no sentences in DB)

Until `content/sentences/` is seeded, `generateSession()` returns an empty items array. The dashboard must handle this gracefully:

- If session has 0 items: show a "Innhold kommer snart 🚧" card instead of the today's session card
- The `/session` route checks `session.items.length === 0` on load and shows the same placeholder rather than a blank screen

---

## 11. What Is Explicitly Out of Scope

- Auth (Supabase auth, login screen, OAuth) — deferred to Phase 3
- Real AI integration (WebLLM) — deferred to Phase 3
- Audio content (howler Listening exercise needs real audio URLs) — deferred to Phase 2 content seed
- Android / iOS native — deferred to Phase 5
- Profile tab content — placeholder screen only ("Kommer snart")

---

## 12. Success Criteria

- [ ] A new user can open `/`, complete the placement quiz, and land on a working dashboard in under 60 seconds
- [ ] A guest user's fingerprint persists across browser refreshes
- [ ] The session screen runs through all exercise types without crashing
- [ ] Wrong answers trigger the repair loop inline (existing behaviour preserved)
- [ ] Session completion shows accurate score + stats
- [ ] Progress screen shows all 22 A1 concepts correctly grouped by mastery status
- [ ] The app has zero crashes when `content/sentences/` is empty (graceful fallback)
