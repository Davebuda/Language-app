# NorskCoach — Stress Walkthrough Report

**Date:** 2026-05-21
**Target:** `http://localhost:3000` (Next.js dev, A1 guest user)
**Methodology:** Live Playwright walkthrough across 17 surfaces. Findings F001–F039 in `_findings.md`. Screenshots in per-surface subdirectories.
**Coverage:** Full exhaustive guest pass completed. **Authenticated user pass not completed** (requires magic-link click — F039). 19-task eval suite started but not waited to completion.

---

## TL;DR

The engine and the UI are diverging fast. Eight months of work has produced a system that *looks* like adaptive coaching but, for a new learner today, would:

- Show the diagnostic absorbing wrong answers as if they were right (F017).
- Surface AI grammar explanations that teach the **opposite** of the correct rule (F022, F033).
- Let Kari (the AI tutor) reply with non-Norwegian words (F029).
- Silently drop everything the user writes in /conversation and /journal — no fingerprint write (F030, F034).
- Show "everything is Locked / 0%" on /progress even though the fingerprint has data (F036).
- Celebrate completed sessions the user never started, by allowing direct nav to /session/complete (F023).

The moat's three legs — diagnosis, scheduling, remediation — each have at least one critical regression. Operating rule 8 from CLAUDE.md ("pipeline honesty") is being violated on the exact surfaces it was written to guard.

This is the third walkthrough; the first surfaced eight P0 bugs (closed); the second confirmed recovery held. **The recovery has not held.** See `comparison.md`.

---

## 1. Critical — bugs that break core functionality or corrupt data

### C-1 (F022) — AI grammar explanation teaches the wrong rule
The "Vis grammatikkregler" upgrade in /session repair-loop showed a paragraph claiming `et` is for masculine, `ei` is for neuter, and that `ett` (the number "one") is a noun. The correct rule (en = masculine, ei = feminine, et = neuter) sits in the template fallback right below — the AI overrides it. A beginner reading this internalises reversed grammar.
- Where: `/session` repair card, "Vis grammatikkregler" expanded
- Expected: correct gender-article mapping
- Actual: 4 factual errors in one paragraph
- Evidence: `05-session/01-ai-explanation-wrong.png`

### C-2 (F029) — Kari (conversation AI) produces gibberish Norwegian
- *"Det lunter for å ikke væreatraftet tidlig oglanda!"* — first sentence contains no real Norwegian words.
- *"Te er en fin alternativ!"* — `alternativ` is an et-word, gender error.
- Where: `/conversation` Daglig rutine A2
- Expected: imitable Norwegian
- Actual: malformed strings shipped to learner
- Evidence: `06-conversation/02-ai-gibberish.png`

### C-3 (F033) — Journal AI corrections invent words, flip meanings
- Praise: "gi **døvreslekkende åndedrag**" — `døvreslekkende` is not a word.
- Correction: "Den er **ikke** godt for meg" → "Den er godt for meg" — the AI silently removed the negation, reversing the sentence.
- Tip: "Øv å bruke riktig **ordensnitt**" — `ordensnitt` is not a word.
- Where: `/journal` analysis output
- Evidence: `07-journal/01-broken-analysis.png`

### C-4 (F030) — Conversation contributes nothing to the fingerprint
I sent a Norwegian sentence with two clear errors (V2 negation, adverb placement). No correction card fired; `recentErrors` did not grow; `updatedAt` did not change. The "Practice / Snakk med Kari" feature is decorative.
- Where: `/conversation`
- Evidence: IndexedDB pre/post diffs in `_findings.md` F030

### C-5 (F034) — Journal contributes nothing to the fingerprint
Analyser tekst produced three concrete corrections; `recentErrors.length` stayed at 2 (just session errors); `updatedAt` unchanged. The journal does not feed the engine.
- Where: `/journal`
- Evidence: IndexedDB pre/post

### C-6 (F036) — Progress shows 0% / Locked for concepts the fingerprint already has
Fingerprint has `prepositions-place: 100`, `past-tense-regular: 100`, `noun-gender: 100`, etc. /progress shows all of them either Intro 0% (when names happen to overlap) or **Locked** (when concept-ID naming diverges). Mastery is invisible.
- Where: `/progress`
- Likely cause: concept-id mismatch between diagnostic/fingerprint side and curriculum-graph side
- Severity multiplier: this is one of the three moat legs

### C-7 (F017) — Diagnostic seeds rawScore=100 for every concept seen, ignoring wrong answers
I answered the diagnostic with 5 wrong / 7 correct. After the write committed, `question-formation: 100, adjective-agreement: 100, past-tense-regular: 100, prepositions-place: 100, negation-placement: 100, modal-verbs: 100` — only `v2-word-order: 67` actually moved. Wrong diagnostic answers do not lower mastery. The phase-adaptive EMA the moat depends on is not being applied here.
- Where: post-diagnostic IndexedDB
- Evidence: F017 in `_findings.md`

### C-8 (F016) — Diagnostic write only commits on navigation away
At the "B2 — Første økt er klar" result screen, IndexedDB still shows pre-diagnostic state. Closing the tab at the celebration page loses all 12 answers. Only when the user clicks "Gå til dashboard" or "Start første økt" does the write fire.

### C-9 (F012) — `totalSessionsCompleted: 0` with 24 historical errors / sessions never log as completed
Counter does not increment on real session play. Streak/sessions stats can never grow even when the learner is practising. The dashboard's "0 sessions / X% accuracy" stat block will be permanently misleading.

### C-10 (F023) — `/session/complete` is directly accessible with no guard
Typing the URL renders the celebration screen (`Flott jobb!`) with 0/0/0:00 stats and a "next session is ready" promotion. No redirect to /dashboard.

### C-11 (F011) — Half of stored errors have `correct: "[unavailable]"`
12 of 24 historical error entries store the literal placeholder string in the `correct` field. The repair loop has nothing to show the learner. The string `[unavailable]` is appearing in production data.

---

## 2. Significant — bugs that mislead, frustrate, or degrade trust

| # | ID | Surface | Headline |
|---|---|---|---|
| S-1 | F002 | `/` | Waitlist form shows "You're on the list" but does not actually sign anyone up |
| S-2 | F004 | `/` | Unicode emails (`øystein-æøå@københavn.no`) rejected by validator — exclusionary for a Norwegian-first product |
| S-3 | F006 | `/auth/callback`→`/login` | `error=auth_failed` in URL, no error banner; user gets silent failure |
| S-4 | F007 | `/login` | `?next=` URL parameter is dead — never passed to Supabase emailRedirectTo |
| S-5 | F010 | fingerprint | `errorPatterns[]` collapses all errors into a single `word-order` pattern with freq 23 — pattern detector is not differentiating |
| S-6 | F013 | `/onboarding` | Refreshing mid-onboarding (including mid-quiz) restarts from slide 1; no resume |
| S-7 | F014 | `/onboarding` quiz | Past-tense-regular B1 question has duplicate options 01 = `kjørte`, 03 = `kjørte` |
| S-8 | F015 | `/onboarding` quiz | Diagnostic does not dedupe questions across runs (same q-formation/adjective questions re-served) |
| S-9 | F018 | `/dashboard` | "95% accuracy / 0 sessions" — stat displayed before any session is completed |
| S-10 | F019 | `/dashboard` | Scheduler emits 36+ "no eligible sentence" warnings on a single dashboard load; "Today's session" silently degrades to "Norwegian Foundations" |
| S-11 | F020 | `/dashboard` | Accuracy value oscillates between renders: 55% → 95% → "—" → 83% during this session |
| S-12 | F021 | `/dashboard` | "Today's session" concept + estimate change on every navigation (V2/3min one load, Noun gender/18min the next) |
| S-13 | F024 | `/session` | Back-to-dashboard mid-session has no confirmation dialog |
| S-14 | F025 | `/session` | Re-entering /session generates a new session, dropping prior 7/17 progress |
| S-15 | F027 | `/session` | Repair loop adds 3 items per wrong answer with no upper bound (saw 11 → 14 → 17 within 2 wrongs) |
| S-16 | F028 | `/conversation` | Kari opener reads "La oss snakke om **daily-routine**" — slug not substituted |
| S-17 | F031 | fingerprint | Diagnostic completion **wipes** the existing `recentErrors` array (lost 24 prior errors) |
| S-18 | F032 | `/journal` | SSR mismatch: page initially renders write-mode textarea then re-renders to voice-mode with a different primary affordance |
| S-19 | F037 | `/profile` | Level shows "–" even though fingerprint has `currentLevel: 'A1'` |
| S-20 | F038 | `/profile` | Session-style preference: write persists to fingerprint, but on reload no button is highlighted as selected |

---

## 3. Minor — cosmetic, accessibility, or polish issues

| # | ID | Surface | Headline |
|---|---|---|---|
| M-1 | F001 | `/` | Footer contains no links (no privacy / terms / contact) |
| M-2 | F003 | `/` | Waitlist accepts 280+ character emails silently — no length cap |
| M-3 | F005 | `/` | "Dagens grammatikk" on landing never rotates — same V2 example on every visit, despite the "Daily" name |
| M-4 | F009 | IDB | Two IndexedDB DBs exist: `norsk-coach` (used) + `norskcoach-fingerprint` (empty) |
| M-5 | F026 | `/session` direct nav | "Session 0 / -" with no body for ~2s before content pops in — looks broken |
| M-6 | F035 | `/reading` | "Ferdig lesing" returns to list with no visited indicator |

---

## 4. Edge cases worth knowing

- **F008 — safeRedirectPath**: `src/app/auth/callback/route.ts` blocks `https://evil.com` and `//evil.com` correctly, but allows `/../etc/passwd`, `/\evil.com`, `/api/internal-thing` and other in-origin paths. No external open-redirect risk found, but the validator is more permissive than the comment claims.
- **Recalibration / onboarding overlap**: a user with an existing fingerprint who hits /onboarding sees the same diagnostic again — onboarding for returning users is effectively a forced recalibration with no banner saying so.
- **Conversation level vs dashboard level**: /conversation has its own A1/A2/B1/B2 picker. Picking A2 there while the dashboard is at A1 is allowed silently; no sync.
- **Reading filter**: only `Alle / A1 / A2` filter pills exist; if user is at B1/B2 they see no level-matching banner (only the implicit "2 tekster på ditt A1-nivå" copy on the dashboard).

---

## 5. Performance observations

- Dashboard load emits **36 warnings** in a single first-paint pass. Each level switch adds 11–14 more. After 4 level switches I saw 72 warnings. These are real scheduler iterations being thrown away.
- `/session` direct nav has a **~2s blank "Session 0 / -" state** before content. No skeleton.
- `/progress` direct nav has a **~2s blank `<main>`** before content.
- `/recalibrate` direct nav has a **~2s blank shell** before the banner.
- The diagnostic completion screen took 3+ seconds of "Working out your level…" before showing the B2 result. Acceptable for a 12-question pass but not instrumented as a loading state per question.
- No animations stuttered visibly at 1280px (FPS not measured).

---

## 6. Accessibility findings

- Bottom-nav touch targets measure **56×44px** — passes WCAG 2.5.5 minimum.
- Form labels are present on auth (`E-postadresse`), waitlist (`Email address` aria-label), and journal (`Skriv på norsk her...` aria-label).
- Diagnostic answer buttons disable themselves after selection; the **correct answer is not visually marked** on the buttons (only revealed in the explanation card below).
- `/auth/callback` failure produces `error=auth_failed` in the URL but **no role=alert** on /login (F006).
- Profile shows "Nivå: –" — empty placeholder uses an em-dash which a screen reader will read as a horizontal line; no `aria-label` clarifies the state.
- Conversation mic button is named "Start recording" — good; does NOT auto-activate (matches earlier P1 directive).
- Headless Playwright correctly fell back to text-mode on /shadow when mic access was unavailable — the fallback path exists. Real-mic flow not exercisable in this run.
- Reduced-motion preferences not explicitly tested (Playwright headless does not propagate OS-level prefers-reduced-motion; this would need a real browser run).

---

## 7. State management observations

- IndexedDB has **two databases**: `norsk-coach` (active) and `norskcoach-fingerprint` (created but empty). The latter looks like a leftover from a migration (F009).
- Fingerprint persists across navigation, but key dashboard stats (accuracy %) read from a different source on first paint vs after hydration (F020).
- Mid-session state does **not** persist: exit via back button or hard refresh discards a partially-completed session (F024, F025).
- Onboarding state does **not** persist: refresh at any slide returns to slide 1 (F013).
- Diagnostic answers buffer in memory and only commit to IndexedDB on navigation away from /onboarding result page (F016).
- Diagnostic completion **destructively overwrites** `recentErrors` — 24 historical entries dropped to 2 (F031).
- Multi-tab corruption: not measurably tested in this run (single tab throughout). Worth a dedicated probe.
- Browser back/forward: tested implicitly via the auth `next=` URL probes; no breakage observed there. Not exhaustively tested across session/conversation.
- Conversation, journal, and reading surfaces do **not** persist any state between visits — every entry to /conversation starts a new chat, every entry to /journal shows a fresh prompt.

---

## Coverage caveats

- **No authenticated pass** — magic-link delivery would have required a live human in the loop (F039). Findings F001–F038 are all from guest mode.
- **No real microphone tests** — headless Playwright cannot grant mic permission. /shadow, /drills, /listen, /roleplay verified to load but not exercised end-to-end with audio.
- **Eval harness 19×3 run** — started but not waited to completion (would have taken many minutes per AI call × 57 calls).
- **Two-tab race conditions** — not tested.
- **Reduced-motion / dark-mode OS preferences** — not driven from headless.
- **Lighthouse / Web Vitals** — not measured (out of scope for an observation walkthrough).

---

## Where it goes from here

Findings live in `_findings.md` with verbatim evidence (screenshots, IndexedDB reads, console transcripts) for each. Triage and prioritisation are deferred to the next session per the brief.
