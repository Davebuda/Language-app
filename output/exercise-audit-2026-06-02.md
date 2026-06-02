# Exercise Audit — Wave 6 + /skriv read-respond module

**Date:** 2026-06-02
**Branch:** content/a1-depth-overhaul-gate
**Auditor:** Claude (deep browser + engine-trace audit)
**Method:** Playwright MCP (runtime), source trace, targeted vitest suites, production build E2E
**Scope (newest → oldest):** /skriv read→recite→write module · dashboard entry routing · cloze passage · phantom-type honesty

> Audit-only. No product code changed. Adjacent issues noted, not acted on.

---

## Surfaces under audit (from git log)

| Commit | Surface |
|---|---|
| 983832f | dashboard "Les" lane → /skriv at B1/B2 |
| 0a8b382 | skriv build fix |
| e017b1b | 6 B1 reading passages + loader |
| 8490cea | ReadingPassage content type |
| 1454ade | deterministic Tier-1 WRITE grader |
| 83d8b3e | recordProductionFromSurface (engine) |
| 89ea1a1 | cloze level-honesty + per-gap diagnosis tests |
| 41973f2 | shadow mistag fix |

---

## FINDINGS LOG

### F1 — Pre-hydration level-gate flash on /skriv  ·  severity: LOW (UX)
On a direct visit to `/skriv`, a B1-eligible learner momentarily sees the gate
empty-state **"Skriv-modulen er på B1-nivå / kommer for ditt nivå senere"**
before the fingerprint hydrates from IndexedDB (fingerprint starts null → level
defaults to `A1` → `passage === null` → gate), then the real READ step at B1
renders once hydration completes.
- **Evidence:** first `browser_navigate` snapshot showed the gate; a screenshot
  moments later (`skriv-01-A1-levelgate-375.png`) showed the B1 passage. IndexedDB
  read confirms the stored anon fingerprint IS `currentLevel: "B1"`.
- **Impact:** brief flash of a message that is *false for this user* ("kommer for
  ditt nivå" shown to someone whose nivå it has arrived for). Not a data bug — the
  engine write path is unaffected — but it reads as a glitch.
- **Note (not acted on):** the screen has no loading/`status` guard; it renders the
  gate while `status` is still hydrating. `useFingerprintStore` exposes `status`.

### F2 — Dev-server instability blocks stateful browser E2E  ·  severity: MED (dev-env, not product)
The Turbopack **dev** server (`next dev --turbopack`) repeatedly crashes / churns
with `ENOENT … .next/static/development/_buildManifest.js.tmp.*`. This same error
class is present in the pre-existing `output/_devserver.log` from before this audit,
so it is a **standing Windows + Turbopack dev instability**, not introduced here.
- **Symptom 1:** intermittent 500s on first paint (`Cannot find module
  './vendor-chunks/@supabase'`) until `.next` is wiped and the server restarted.
- **Symptom 2:** a constant **Fast Refresh rebuild loop** that resets the React
  client state of `/skriv` back to the READ step every few hundred ms — making the
  multi-step read→recite→write flow impossible to drive to completion in dev.
- **Mitigation for this audit:** switched to a **production build + `next start`**
  for stable E2E (no Fast Refresh, no Turbopack temp-file churn).
- **Recommendation (not acted on):** for browser-based QA on this machine, prefer
  `next build && next start`; consider whether the dev `_buildManifest.js.tmp` race
  needs an upstream Turbopack/AV exclusion fix.

### F3 — READ + RECITE render correctly at B1  ·  status: PASS (visual)
- READ: title "Friluftsliv hele året", 5 paragraphs, "Vis engelsk" toggle,
  "Les ferdig" CTA, 3-segment stepper + brick trio. Screenshot:
  `skriv-01-A1-levelgate-375.png` (post-hydration B1 view).
- RECITE: "Setning 1 / 3", recite-target sentence, "Hør modellen" (TTS) +
  "Si det høyt" (ASR) buttons, read-brick lit in the trio. Screenshot:
  `skriv-02-recite-375.png`.
- Passage selection respects `weeklyFocus` (focus = [common-prepositions,
  noun-gender]); falls back to first eligible passage — matches code.

### F4 — Honest level gate works  ·  status: PASS (Rule 6)
For a default A1 learner, `/skriv` shows the honest "Skriv-modulen er på B1-nivå"
gate with a "Tilbake til dashboard" escape — no silent above-level fallback.

### F5 — Dashboard level-aware routing  ·  status: PASS (code-confirmed)
`dashboard/page.tsx:369`: `href={laneId === 'reading' && (levelLabel === 'B1' ||
levelLabel === 'B2') ? '/skriv' : undefined}` — B1/B2 route the "Les" lane to
/skriv; A1/A2 keep /reading. Hint at B1+ reads "Les → si → skriv · én passasje"
(`:180`). Avoids a dead-end gate (Rule 6).

### F6 — WRITE step engine write is REAL (Rule 8)  ·  status: PASS — proven end-to-end
Drove the full read→recite→write flow on a B1 guest in the **production** server,
then read IndexedDB directly. Passage primaryConceptId = `complex-subordination`.
`complex-subordination` mastery, measured before vs. after the WRITE submit:

| field | post-recite (pre-write) | post-write | expectation |
|---|---|---|---|
| rawScore | 40 | **64** | up (free production, full EMA step) ✓ |
| attemptCount | 1 | **2** | +1 (attempt counted) ✓ |
| srsLevel | 1 | **2** | advances (free production) ✓ |
| recentErrors | 0 | **0** | correct production logs no error ✓ |
| productionGap[concept] | 0 | **0** | error-derived, untouched ✓ |

Exactly matches `recordProductionFromSurface`'s contract and its unit tests. The
UI claim **"Produksjon registrert på «complex-subordination»"** is true, not
cosmetic. Screenshots: `skriv-03-write-checklist-4of4-375.png`,
`skriv-04-write-pass-grunnsjekk-375.png`.

### F7 — RECITE step engine write is REAL  ·  status: PASS — proven end-to-end
Completing the 3-sentence recite (self-reported "Jeg sa det" ×3) created a fresh
`complex-subordination` mastery brick (raw 40, att 1, srs 1) via `recordResult`
(correct, errorTag deliberately undefined — recite miss is not a listening error),
and bumped `speakingMinutesTotal` to **7.2**. Dashboard later reflected
"Min talt 7". The no-mic path is honest: with no audio captured it shows
"Ingen lyd registrert — du kan likevel rapportere selv" and still lets you
self-report. Screenshot: `skriv-02-recite-375.png`.

### F8 — Lane completion persists + dashboard reflects it  ·  status: PASS
`markLaneDone('reading')` on finish wrote
`norskcoach_lane_completion → {…, reading: true}` (date-scoped). Dashboard (B1)
then rendered the "Les" lane as **done** with hint "Les → si → skriv · én
passasje" and "1 fullført i dag". Done screen: `skriv-05-done-375.png`.

### F9 — AI-down WRITE feedback is honest (Rule 6)  ·  status: PASS
Headless has no WebGPU/WebLLM and the Groq call did not return, so
`reviewWriting` fell back to template (`source !== 'ai'`). The UI showed the
honest **"Grunnsjekk"** register ("Grunnsjekk i dag — rettelsene dine er
registrert og produksjonen teller. Detaljert tilbakemelding kommer når AI-en er
tilgjengelig igjen.") — production still counts, no fake AI praise. Minor note:
dashboard AIStatusBadge read "Lokal AI" (capability detection) while the actual
review used template — the badge reflects capability, not per-call success.

### F10 — Desktop-only CTA/BottomNav pre-scroll overlap  ·  severity: LOW (desktop)
On the READ step at a tall desktop-ish viewport, before scrolling the "Les ferdig"
CTA overlaps the fixed BottomNav (button 1050–1099 vs nav 1052–1125 → overlap).
- **Mobile (375, primary target): NO overlap** — after scroll the CTA sits ~39px
  above the nav and is the top (clickable) element. Verified via bounding-box math.
- **Impact:** cosmetic, desktop-only, pre-scroll. The app is mobile-first with a
  centered column, so low priority. **Recommend (not acted on):** ensure the
  `nc-flow-shell` reserves padding-bottom ≥ BottomNav height so the CTA always
  clears the nav regardless of content length/viewport.

### F11 — Cloze + phantom-type honesty: TEST-PROVEN (not browser-driven)  ·  status: PASS (tests)
Browser-driving cloze / phantom requires forcing a session to contain those item
types, which the dev-server instability (F2) made impractical. Both are covered by
green unit tests on this branch (see Test Summary): `cloze.test.ts` +
`passage-pool.test.ts` (level-honesty + per-gap write, Rule 6/8) and
`scheduler-phantom-types.test.ts` (phantom → NotYetAvailable, no silent fallback).
Honestly flagged: these are proven at the unit level, not re-confirmed in-browser
this pass.

---

## TEST SUMMARY (this branch, `vitest run`)
Targeted suites for the recent exercise work — **all green, 47 tests / 7 files**:

| suite | covers | result |
|---|---|---|
| `tests/lib/grade-read-respond.test.ts` | Tier-1 WRITE grader thresholds + outcomes | PASS |
| `tests/engine/repair-from-surface.test.ts` | recordProductionFromSurface (free/guided/never-lowers) + repairFromSurface | PASS |
| `tests/lib/cloze.test.ts` | cloze gap logic | PASS |
| `tests/lib/passage-pool.test.ts` | passage/cloze pool + level honesty | PASS |
| `tests/lib/reading-loader.test.ts` | B1 passage loader | PASS |
| `tests/engine/scheduler-phantom-types.test.ts` | phantom types → honest banner | PASS |
| `tests/lib/classify-error.test.ts` | observed-error classifier | PASS |

Production build: `npm run build` → **exit 0** (no type/build errors).

---

## VERDICT

**The newest, highest-risk surface — the `/skriv` read→recite→write module — is
behaviorally real and pipeline-honest.** Every "feeds the engine" claim it makes
was traced to an actual IndexedDB write in a live session (Rule 8): READ →
exposure, RECITE → recognition brick + speaking minutes, WRITE → production brick
(rawScore 40→64, SRS 1→2, zero false errors). Honest fallbacks hold under AI-down
(Grunnsjekk) and below-level (B1 gate). Dashboard routing + lane completion work.
Cloze + phantom honesty are unit-test-proven (47/47 green) but not re-driven in
browser this pass.

**Issues found:** all LOW/MED, none blocking the moat:
- F1 pre-hydration A1-flash on /skriv + /dashboard (UX glitch, no data impact)
- F2 Turbopack dev-server instability on Windows (dev-env; use `next start` for QA)
- F10 desktop-only pre-scroll CTA/nav overlap (mobile is clean)
- F9 minor: AIStatusBadge "Lokal AI" vs actual template review (capability vs call)

**No silent-substitution / fake-pipeline defects found in the audited surfaces.**

---

## CHANGE MADE (post-audit, user-directed 2026-06-02)

**Decision (user):** formalize `/skriv` as the B1/B2 replacement for the reading
lane; reading stays at A1/A2. Resolved the naming collision (journal lane was
already labeled "Skriv") by labeling the B1/B2 lane **"Les og skriv"** rather
than a bare "Skriv" — flagged to and accepted as the sensible disambiguation.

**Files:**
- `src/components/dashboard/LaneTrackRow.tsx` — added optional `label?` prop
  (mirrors existing `href?` override); `name = label ?? config.name` used in
  display + aria-label, in both done and active branches.
- `src/app/dashboard/page.tsx` — added `skrivReplacesReading = levelLabel ===
  'B1' || 'B2'`; for the `reading` lane at B1/B2 pass `href="/skriv"` +
  `label="Les og skriv"` in BOTH the uncompleted and done lane maps.

**Verification:**
- `npx tsc --noEmit` → clean (0 `error TS`).
- `npm run build` → exit 0; `/skriv` route present (10.8 kB).
- Browser (prod, B1): active lane = link "Åpne Les og skriv" → `/skriv`; journal
  lane unchanged ("Skriv" → `/journal`); done state shows "Les og skriv"
  line-through. A1/A2 keep "Les" → `/reading`. Screenshot:
  `dashboard-07-les-og-skriv-B1-375.png`.
- **Not done:** lane-completion is still keyed to the `reading` LaneId (so
  completing /skriv marks "reading" done) — acceptable since /skriv *is* the
  reading lane at B1/B2; no new LaneId introduced (scope discipline). Not yet
  committed; no mobile a11y/contrast gate re-run on the label change (trivial).

## CHANGE 2 (user-directed 2026-06-02): reorder + rename

**Asks:** move "Les og skriv" to the top of the "Neste valg" lane list; rename the
journal lane "Skriv" → "Journal" and move it last.

**Files:**
- `src/lib/lane-completion.ts` — `CORE_LANES` reordered
  `['session','journal','conversation','roleplay','reading']` →
  `['reading','session','conversation','roleplay','journal']`. Order is
  display-only; `allLanesDone()`/counts are order-independent (verified).
- `src/components/dashboard/LaneTrackRow.tsx` — `LANE_CONFIG.journal.name`
  `'Skriv'` → `'Journal'`. "Skriv" now belongs only to "Les og skriv".

**Verification (Playwright, prod build):**
- `npx tsc --noEmit` clean; `npm run build` exit 0.
- B1 list order now: **Les og skriv (→/skriv) → Snakk → Rollespill → Journal
  (→/journal)** — reading first, journal last. Journal label = "Journal".
  Screenshot: `dashboard-08-reordered-B1-375.png`.
- A1/A2 (pre-hydration render): "Les" (→/reading) leads, "Journal" trails — same
  order, level-correct labels.
- session remains the recommended hero (excluded from the list).
- **Note (not acted on):** the reading lane now leads the list at *all* levels;
  at A1/A2 that's plain "Les" (reading). If you want the lead position to be
  B1/B2-only, that's a follow-up.

## Screenshots (`.claude/screenshots/exercise-audit/`)
- `skriv-01-A1-levelgate-375.png` — post-hydration B1 READ (and F1 gate context)
- `skriv-02-recite-375.png` — RECITE step
- `skriv-03-write-checklist-4of4-375.png` — WRITE live checklist 4/4
- `skriv-04-write-pass-grunnsjekk-375.png` — WRITE pass + honest Grunnsjekk
- `skriv-05-done-375.png` — done / "Tre murstein lagt"
- `skriv-06-read-1280.png` — desktop centered column
