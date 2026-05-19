# Dashboard Redesign — Feature-First Layout

**Date:** 2026-05-20  
**Status:** Approved for implementation

---

## Problem

The current dashboard treats Speak, Read, Write, and Recalibrate as identical items in a 4-column icon grid. This flattens a critically important feature (spoken AI conversation) to the same visual weight as a utility action (recalibrate). The "Currently Learning" concept list takes ~250px for low-actionability data. Stats sit above features despite being secondary context.

---

## New Layout Order

```
1. Header (greeting + level badge + notification bell)
2. Conditional toasts (level-up, B1/B2 notice, guest banner)
3. Today's Session card  ← unchanged, stays prime
4. Speak (Muntlig) card  ← NEW — full-width, visually heaviest
5. Write (Journal) card  ← NEW — full-width, daily prompt teaser
6. Read card             ← NEW — full-width, text count at level
7. Stats row             ← MOVED DOWN — 4 small muted chips
8. Concepts in focus     ← REPLACES "Currently Learning" list
9. Recalibration banner  ← unchanged, conditional only
```

---

## Section Specs

### 1. Speak — Muntlig Card

**Visual weight:** Heaviest of the three feature cards. Full width. Distinct from the session card but clearly a primary action.

**Content:**
- Label: `MUNTLIG` (uppercase, nc-label style)
- Headline: `Snakk med Kari` 
- Sub-line: Suggested topic from fingerprint — the concept in "practice" phase mapped to a conversation topic. Fallback: `"Velg et tema og start"`.
- Stat chip: `{speakingMinutesTotal} min snakket` — only shown if > 0, otherwise `"Bygg opp snakketiden din"`
- CTA button: `Start samtale →`

**Data sources:**
- `fingerprint.speakingMinutesTotal` — speaking minutes
- `fingerprint.conceptMastery` + active graph — to suggest a relevant topic (map concept in practice/consolidation phase to conversation topic)
- Topic suggestion logic: find concept in practice/consolidation phase → look up which of the 6 topics it relates to → show that topic as the suggestion. Fallback to "daglig rutine".

**Styling:** `nc-glass-elevated` with a subtle left-border or mic icon accent. NOT the red gradient (that's reserved for Today's Session).

---

### 2. Write — Skrivejournal Card

**Visual weight:** Medium. Full width. Feels like a daily pull — the prompt is the hook.

**Content:**
- Label: `SKRIVEJOURNAL`
- Prompt teaser: First 40 chars of today's rotating prompt + `"..."` (prompts rotate by day-of-week index)
- CTA: `Skriv i dag →`

**Data sources:**
- Today's prompt: `PROMPTS[dayOfWeek % PROMPTS.length]` — derive from existing prompt array in WritingEditor, or inline a simplified version of the 6 prompts keyed by day index.
- No fingerprint data needed (Read feature has no tracking yet either).

**Styling:** `nc-glass` — lighter than Speak card.

---

### 3. Read — Lesestudio Card

**Visual weight:** Medium. Full width. Discovery-focused, not progress-focused (no fingerprint data exists yet).

**Content:**
- Label: `LESESTUDIO`  
- Sub-line: `{count} tekster på ditt {level}-nivå` — count of texts matching `fingerprint.currentLevel` from the hardcoded TEXTS array in reading/page.tsx.
- CTA: `Bla gjennom →`

**Data sources:**
- `fingerprint.currentLevel` — to filter and count texts
- Hardcoded TEXTS array (already in reading/page.tsx) — count filtered by CEFR level

**Styling:** `nc-glass` — same weight as Write card.

---

### 4. Stats Row

**Change:** Moved below all three feature cards. Visual de-emphasis: smaller numbers, more muted colors, no colored values except streak (red) and accuracy (green). Same 4-column grid but tighter padding.

**No data changes** — same 4 values: streak, mins spoken, accuracy, sessions.

---

### 5. Concepts in Focus (replaces Currently Learning)

**Change:** The 5-row concept list is replaced by a single compact row:

```
[ ◉ {N} concepts in focus ]  [ View all → ]
```

Where `{N}` = `activeConcepts.length` (same computation as before, just not rendered as rows).

If `activeConcepts.length === 0`: show `"Start a session to track concepts"` in muted text.

The `activeConcepts` computation stays identical — just the render changes from a list to a single line.

---

### 6. Recalibrate

**Removed from feature cards entirely.** The existing `showRecalibrationSuggestion` conditional banner at the bottom of the page handles this correctly. No change needed.

---

## Component Changes

| File | Change |
|---|---|
| `src/app/dashboard/page.tsx` | Reorder sections, add Speak/Write/Read cards, replace concept list with single line, de-emphasize stats |
| No new components needed | All cards are inline JSX within the dashboard page |

---

## What Does NOT Change

- Today's Session card — layout, data, position all unchanged
- Header — unchanged
- Conditional toasts (level-up, B1/B2, guest banner) — unchanged
- Recalibration banner — unchanged
- BottomNav — unchanged
- All data computations (fingerprint reads, plan generation) — unchanged, just rendered differently

---

## Out of Scope

- Wiring Read completion to fingerprint (future work)
- Vocab / Shadow Lab cards (coming-soon features, separate task)
- Any engine or data model changes
