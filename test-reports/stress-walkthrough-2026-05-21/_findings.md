# Stress Walkthrough — Running Findings Log

Date: 2026-05-21
Target: http://localhost:3000
Approach: Full exhaustive walkthrough across 17 surfaces.

Findings are logged here as they are discovered, then categorized into report.md at the end.

---

## Tally by severity (live)
- Critical: 0
- Significant: 0
- Minor: 0
- Edge cases: 0
- Performance: 0
- Accessibility: 0
- State management: 0

---

## Findings (chronological)

### F003 — Waitlist accepts 280+ character emails silently (Minor)
URL: `/`  
Component: WaitlistForm  
Expected: at minimum, basic length capping (RFC 5321 maxes the local part at 64, full address at 254).  
Actual: typed 280-char email, regex passed, success copy shown.  
Severity: Minor (compounded by F002's cosmetic nature, but on its own a validation gap).

### F004 — Unicode (æøå) email addresses rejected (Edge case, Significant in context)
URL: `/`  
Component: WaitlistForm validator  
Expected: a Norwegian-learning app should accept Norwegian users' email addresses, including IDN domains (`københavn.no`) and local parts with å/æ/ø.  
Actual: `øystein-æøå@københavn.no` → "Please enter a valid email address."  
Evidence: paragraph e158 "Please enter a valid email address."  
Severity: Significant — exclusionary for the target audience, a real product-quality miss for a Norwegian-first brand.

### F006 — /auth/callback redirects to /login?error=auth_failed but login UI does not surface the error (Significant)
URL: `/auth/callback` (no code) or expired/invalid code → `/login?error=auth_failed`  
Component: `src/app/login/page.tsx`  
Expected: tell the user that the magic link was invalid/expired and to request another.  
Actual: `error=auth_failed` is in the URL but `LoginPage` never reads `searchParams.get('error')`. User sees the default sign-in form with no banner. They wonder if they did something wrong, and may re-request a new link without understanding.  
Evidence: navigated `/auth/callback?next=https://evil.com` → URL became `/login?error=auth_failed`, body contained no "error", no [role=alert] content, no Norwegian failure copy.  
Severity: Significant — silent failure on a key user-trust path.

### F007 — `?next=` parameter on /login is dead (Significant, behavioral)
URL: `/login?next=/dashboard`  
Component: `src/hooks/useAuth.ts:51-61` calls `signInWithOtp` with `emailRedirectTo: ${origin}/auth/callback` — the URL's `next` parameter is never read and never passed to Supabase's `emailRedirectTo`.  
Expected: after magic-link login, return the user to wherever they were trying to go (`?next=/journal` etc).  
Actual: any `?next=` is silently ignored. Users arriving at `/login` from a protected route (when such routing exists) cannot resume; they always land back on `/`.  
Severity: Significant — broken contract for any "deep-link with auth gate" UX. Dead code in a security-sensitive area is also a maintenance risk.

### F009 — Two IndexedDB databases exist; `norskcoach-fingerprint` is empty / unused (Minor / State management)
URL: any (browser-wide)  
Evidence: `indexedDB.databases()` returns both `norsk-coach` (v1, used) and `norskcoach-fingerprint` (v1, empty objectStoreNames). Likely leftover from a migration. Two DBs being created adds confusion and a minor resource cost; if a future change writes to the wrong one a split-brain bug becomes possible.  
Severity: Minor (state).

### F010 — `errorPatterns` contains a single `word-order` pattern with frequency 23 — the pattern detector is collapsing distinct errors (Significant)
Where: fingerprint in IndexedDB, store `fingerprints` → `errorPatterns[0]`.  
Expected: per `error-taxonomy` skill there are 17 distinct tags. Different mistake types should produce different patterns.  
Actual: every logged error in recentErrors (24 items spanning question-formation, adjective-agreement, v2-word-order) carries `errorTag: "word-order"` — even sentence-transformation errors where the user typed an English sentence (`wrong: "Who is that man over there?"`). The errorTag is being assigned by exercise-class default, not by inspecting the actual mistake.  
Severity: Significant — defeats the moat. Diagnosis is not diagnosing; it's defaulting to one tag. CLAUDE.md explicitly warns this is the failure mode the project must not regress to ("Pipeline honesty").

### F011 — Translation-to-english + sentence-transformation errors have `correct: "[unavailable]"` (Significant)
Where: fingerprint recentErrors entries with `exerciseType: sentence-transformation` and `sentenceId: item-0`/`item-1`.  
Expected: every logged error should record what the right answer was, so the repair loop can present it.  
Actual: 12 of 24 stored errors have `correct: "[unavailable]"`. The repair-loop and the eventual "show me what I missed" UX cannot recover from this. Also notable: the literal string `[unavailable]` is being stored — production data has user-visible placeholder.  
Severity: Significant.

### F013 — Onboarding state does NOT persist across refresh (Significant)
URL: `/onboarding` (any slide, including mid-quiz)  
Component: `OnboardingFlow`  
Expected: per spec, "Mid-quiz, refresh the page — does state persist or restart?"  
Actual: refresh resets to slide 1 even if user was on Sp. 6 of the diagnostic. All quiz answers are lost.  
Severity: Significant — onboarding completion rate will suffer from any accidental tab refresh.

### F014 — Diagnostic shows "kjørte" as both option 01 and option 03 (Significant — content authoring bug)
URL: `/onboarding` (slide 4 quiz, B1 past-tense-regular)  
Component: diagnostic question bank  
Expected: 4 distinct options.  
Actual: options 01 and 03 are identical strings "kjørte". Either of them is the "correct" answer; the other should have been a distractor (likely intended `kjørede` or `kjørt`).  
Evidence: screenshots e177/e179 in 03-onboarding artifacts.  
Severity: Significant — undermines diagnostic accuracy and trust.

### F015 — Diagnostic does not dedupe questions across runs (Significant)
URL: `/onboarding` quiz  
Component: diagnostic engine `askedDiagnosticQuestionIds` filter  
Expected: per spec "Verify the questions don't repeat from the original diagnostic." For users with an existing fingerprint, the recalibration should avoid previously-asked questions.  
Actual: the A2 q-formation question and A2 adjective-agreement question were both repeated on my walkthrough's two diagnostic attempts within the same browser session. The first run's askedIds were not respected by the second run.  
Severity: Significant — undermines IRT-style placement accuracy.

### F016 — Diagnostic write happens on navigation, not on submission (Critical — data loss)
URL: `/onboarding` → completion screen → `/dashboard`  
Component: diagnostic completion handler  
Expected: when the user reaches the result screen, all 12 answers and the seeded mastery are durably written to IndexedDB.  
Actual: at result screen, IndexedDB still shows pre-diagnostic state (askedIds.length=5, original rawScores, currentLevel=A2). Only after clicking "Gå til dashboard først" does the write commit. If the user closes the tab on the "B2 — Første økt er klar" screen, all 12 answers and seeded mastery scores are lost.  
Evidence: `_findings/diagnostic-pre-write.json` vs post-nav state captured inline in this run.  
Severity: Critical — silently loses work on a high-effort flow.

### F017 — Diagnostic seeds all answered concepts with rawScore 100 even when some answers were wrong (Critical — mastery integrity)
URL: post-diagnostic dashboard  
Component: diagnostic engine `seedConcept` / `applyDiagnosticToFingerprint`  
Expected: per `mistake-fingerprint` skill, mastery is a phase-adaptive EMA where wrong answers count for ~30%+ weight. 7/12 correct should not yield raw=100 across every concept.  
Actual: post-write rawScores show:  
  - question-formation: 100 (was 30) — but my first q-formation answer was WRONG  
  - adjective-agreement: 100 (was 54) — but my first adj answer was WRONG  
  - past-tense-regular: 100 (new) — I answered the duplicate-option case  
  - prepositions-place: 100 (new) — one correct answer → 100  
  - negation-placement: 100 (was 20) — but my first negation answer was WRONG, second was right  
  - v2-word-order: 67 (was 76)  
  - modal-verbs: 100 (was 100, single answer)  
The diagnostic is performing a "set to 100 if seen at level" overwrite, not an accumulating EMA. Wrong answers are not surfaced in raw scores at all.  
Severity: Critical — this is the diagnosis-engine claim the moat depends on. Wrong answers must show in the mastery score; right now they don't.

### F018 — Dashboard shows "95% accuracy" on `totalSessionsCompleted: 0` (Significant)
URL: `/dashboard` post-diagnostic  
Component: dashboard stats card  
Expected: a "stats" badge for accuracy should not display until at least one session is logged. Possibly show "—" or omit.  
Actual: badge shows 95% with 0 sessions and 0 streak. Number is plausibly derived from the just-seeded diagnostic accuracy (10/12 ≈ 83%, but shown as 95%), but the user has not "done" sessions yet. Was earlier 55% on 0 sessions.  
Evidence: screenshot/snapshot pre and post diagnostic.  
Severity: Significant — undermines stat honesty.

### F020 — Dashboard accuracy reads stale 95% in-memory vs "—" after refresh (Significant — hydration / state)
URL: `/dashboard` (guest, post-diagnostic)  
Component: dashboard stats card  
Expected: a consistent accuracy figure or a single empty-state placeholder, not two different presentations from the same underlying fingerprint.  
Actual: post-diagnostic in-memory render shows "95%". A hard refresh of the same `/dashboard` URL shows "—". Both are computed from the same fingerprint (`totalSessionsCompleted: 0`, no completed sessions). The two answers cannot both be right.  
Severity: Significant — undermines stat trust; user sees the page "downgrade" their own accuracy on reload.

### F028 — Conversation opener uses raw topic slug instead of Norwegian (Significant — copy honesty)
URL: `/conversation` (Daglig rutine + A2)  
Component: Kari opener template  
Expected: "Hei! La oss snakke om daglig rutine. Hva tenker du på?" (or richer).  
Actual: "Hei! La oss snakke om **daily-routine**. Hva tenker du på?" — the slug `daily-routine` is dropped into the Norwegian sentence verbatim. Looks like a developer debug fallback the user should never see.  
Evidence: `06-conversation/01-opener-bug.png`.  
Severity: Significant — first impression of the AI tutor is broken English in the middle of a Norwegian icebreaker.

### F029 — Kari (AI) replies contain malformed/gibberish Norwegian (Critical — pedagogical risk)
URL: `/conversation`  
Component: NB-Llama-3.2-3B reply generation  
Expected: Norwegian sentences a learner can imitate.  
Actual (verbatim from this run):  
1. After my message "Jeg står tidlig opp om morgenen og drikker kaffe.", Kari replied: *"Det lunter for å ikke væreatraftet tidlig oglanda! Har du noen siste ting du gjør før du starter på dagen?"* — first sentence is not Norwegian (`lunter`, `væreatraftet`, `oglanda` are non-words).  
2. After "Jeg ikke liker kaffe. Jeg drikker te alltid om morgen.", Kari replied: *"Te er en fin alternativ!"* — gender error: `alternativ` is an et-word, should be "et fint alternativ".  

Evidence: `06-conversation/02-ai-gibberish.png`.  
Severity: **Critical** — learners imitate input from the tutor. CLAUDE.md sets a hard rail on this: "AI never the headline" and "Every AI path has a non-AI fallback". Currently there is no language-validity gate before showing AI output.

### F030 — Conversation contributes nothing to the fingerprint (Critical — moat/pipeline honesty)
URL: `/conversation`  
Component: conversation grammar-check / fingerprint write  
Expected: per CLAUDE.md ("Full pipeline parity — session, conversation, AND journal all feed the identical mastery + SRS pipeline") and per spec ("does the fingerprint actually update — inspect IndexedDB before and after").  
Actual: sent "Jeg ikke liker kaffe. Jeg drikker te alltid om morgen." (negation-placement + adverb-placement errors). No correction card appeared. `recentErrors` did not grow from this message. Only the prior two /session errors are present.  
Evidence: IndexedDB read pre/post message — `recentErrorsCount: 2`, both from session, none from conversation.  
Severity: **Critical** — exactly the regression pattern CLAUDE.md operating rule 8 warns against. Conversation is now a feature that *looks like* it teaches but doesn't write to the engine.

### F032 — Journal voice/write toggle has visible SSR mismatch (Significant)
URL: `/journal`  
Component: journal entry switcher  
Expected: a stable initial UI on first paint.  
Actual: first snapshot (immediately after navigation) shows only the textarea with no toggle. After ~500ms the page re-renders with the Snakk/Skriv toggle AND defaults to voice (Snakk) mode — the textarea disappears and a "Trykk for å snakke" button replaces it. Visible flicker / change of primary affordance on hydration.  
Severity: Significant — the journal "feels broken" on every page load.

### F033 — Journal AI grammar feedback contains fabricated words and inverted meaning (Critical — pedagogical risk)
URL: `/journal`  
Component: journal grammar-check via AI  
Expected: corrections that match what the user wrote, with truthful explanations.  
Actual on input "Jeg ikke liker pizza. Den er ikke godt for meg. Jeg spiser sushi alltid om helgen. En sushi er den beste mat.":  
1. Praise: "🎉 Denne tekst viser at du kan skrive om en fysiske ting, som pizza, og gi **døvreslekkende åndedrag** for det." — `døvreslekkende` is not a word.  
2. Correction 1: "Jeg ikke liker pizza. Den er ikke godt for meg. → Jeg liker ikke pizza. **Den er godt for meg.**" — the AI removed the user's `ikke`, flipping the sentence's meaning ("not good for me" → "good for me"). Explanation says verbs follow subjects (true but irrelevant; the actual issue is negation placement).  
3. Correction 2: "Jeg spiser sushi alltid om helgen. → Jeg spiser sushi **hver helgen**." — `hver` requires indefinite (`hver helg`); explanation talks about en/den for "sushi" which has nothing to do with the change.  
4. Correction 3: "En sushi er den beste mat. → En sushi er den beste maten." — explanation invokes "number agreement" (irrelevant; the issue is double definiteness).  
5. Tip: "💡 Øv å bruke riktig **ordensnitt** og konjugering av verbet 'å være' i fremtiden." — `ordensnitt` is not a word (likely meant `ordstilling`); user's sentences don't even use future tense.  

The "Se rettet versjon" then concatenates these into the corrected paragraph, propagating the meaning-flip into the rewrite.  
Evidence: `07-journal/01-broken-analysis.png`.  
Severity: **Critical** — beginners studying this will internalize fake words and reversed grammar.

### F035 — Reading "Ferdig lesing" silently exits with no acknowledgement (Minor — UX)
URL: `/reading/<text>`  
Component: text reader  
Expected: per design reading does not feed the fingerprint, but the user should at least see a visited check or a "well done" affordance.  
Actual: clicking "Ferdig lesing ✓" returns to the list with no marker, no read-state, no acknowledgement. The same text can be opened again with no indication it was read.  
Severity: Minor.

### F037 — Profile shows level "–" while fingerprint has `currentLevel: A1` (Significant — read-side hydration)
URL: `/profile`  
Component: profile header / "Nåværende nivå" card  
Expected: read `currentLevel` from fingerprint, render "A1".  
Actual: both "Nivå" pill and "Nåværende nivå" show em-dash "–". The fingerprint at `updatedAt: 17:59:10` has `currentLevel: 'A1'`. The profile UI does not connect.  
Severity: Significant — undermines that the engine knows the user.

### F039 — Authenticated pass not completed (Coverage gap)
The plan called for a full authenticated user walkthrough after the guest pass. Completing magic-link sign-in requires the user to click the link in their inbox. During this asynchronous walkthrough I cannot drive that step end-to-end, so the authenticated paths (Supabase sync writes after each fingerprint mutation, RLS on `fingerprints` table, event log writes on session completion, profile session-style persistence across logout/login) were NOT exercised in this run. Findings F001–F038 are all guest-mode-applicable; many will translate identically to the authenticated flow but the Supabase write-through layer remains untested here.

### F038 — Profile session-style preference: write works, read on reload does not highlight saved selection (Significant)
URL: `/profile`  
Component: session-style button group  
Expected: per spec, "Toggle session-style preference between balanced / input_heavy / production_heavy. Reload and verify it persisted."  
Actual: clicking "Balanced" updates the fingerprint to `inputProductionPreference: 'balanced'` (verified in IndexedDB). Reloading `/profile` shows no button in the [active] state — the saved preference is not reflected in the UI. A user who returns later sees a "no choice yet" state even though they had picked one.  
Severity: Significant.

### F036 — Progress page shows every concept at 0% despite fingerprint rawScores of 100 (Critical — mastery visibility / concept-id mismatch)
URL: `/progress`  
Component: progress concept-graph reader  
Expected: per CLAUDE.md, "Mastery stays visible. The system feels intelligent before your second session." Progress should reflect what the fingerprint actually stores.  
Actual: fingerprint has `prepositions-place: 100`, `noun-gender: 100 actually no, fingerprint had noun-gender from a session wrong; modal-verbs: 100; past-tense-regular: 100; adjective-agreement: 100; question-formation: 100; v2-word-order: 67; negation-placement: 100`. The progress page shows:  
  - Intro (5): Personal pronouns 0%, Noun gender 0%, "The verb 'å være' (to be)" 0%, Basic numbers 0%, "Common prepositions (i, på, til, fra, med, av, for, om)" 0%.  
  - Locked (17): includes V2 word order, Negation with 'ikke', Question formation, Adjective agreement, Common modal verbs (kan, vil, skal, må), Preterite — regular verbs.  

So every concept the fingerprint knows about is either shown at 0% or **Locked** (V2, modals, question-formation, negation, preterite, adj agreement). The data is there, the UI doesn't see it.  
Likely root cause: divergent concept-id schemes (`prepositions-place` in fingerprint vs the curriculum's `common-prepositions`; `past-tense-regular` in fingerprint vs `preterite-regular-verbs` in graph). The diagnostic engine and the progress concept-graph are using different IDs and not joined.  
Severity: **Critical** — the third leg of the moat is invisible. A new user post-diagnostic sees "everything Locked" and concludes the system did nothing.

### F034 — Journal entry does NOT write any error to the fingerprint (Critical — pipeline honesty)
URL: `/journal`  
Component: journal grammar-check → fingerprint write path  
Expected: per CLAUDE.md "Full pipeline parity — session, conversation, AND journal all feed the identical mastery + SRS pipeline."  
Actual: after "Analyser tekst" produced 3 corrections, IndexedDB `recentErrors.length` remained at 2 (the two prior session errors). `updatedAt` unchanged (`17:49:37.466Z`). Despite the AI surfacing three concrete corrections (negation placement, adverb placement, double definiteness), none of those errors were attributed to the learner's fingerprint.  
Severity: **Critical** — matches the exact failure mode CLAUDE.md operating rule 8 warns against. Journal "looks like it teaches" but does not contribute to mastery.

### F031 — Diagnostic write wipes `recentErrors` (Significant — data loss)
URL: `/onboarding` post-completion  
Component: diagnostic finalize  
Expected: diagnostic should add to mastery state, not destroy prior error history.  
Actual: before the diagnostic the fingerprint had 24 entries in `recentErrors` (spanning multiple weeks of practice). After the diagnostic write, `recentErrors.length: 2` — only the freshly-added session errors remain. The 24 historical entries are gone.  
Severity: Significant — undermines diagnosis accuracy after every recalibration.

### F023 — `/session/complete` is directly accessible with no guard (Critical — pipeline honesty)
URL: `/session/complete`  
Component: `src/app/session/complete/page.tsx` (likely)  
Expected: per spec, "Try to reach /session/complete directly — verify the guard redirects to dashboard."  
Actual: typing the URL into the address bar lands the user on the celebration screen "Flott jobb! Bra innsats i dag" with stats `0 accuracy / 0 produksjon / 0:00 tid brukt / 0 konsepter`. The "Fortsett å lære! Neste økt er klar — Personal pronouns" promotion still renders. There is no redirect to /dashboard.  
Severity: **Critical** — celebrates work the user did not do.

### F024 — Mid-session exit via "Back to dashboard" has no confirmation (Significant — accidental data loss)
URL: `/session`  
Component: session header back button  
Expected: a mid-session exit should warn that progress will be discarded (per spec: "Hit the X exit button mid-session — verify the exit confirmation if present").  
Actual: clicking the back-arrow at 7/17 immediately navigates to /dashboard. No "Are you sure?" prompt. All progress is dropped.  
Severity: Significant.

### F025 — Re-entering /session after mid-session exit generates a new session, discarding 7/17 progress (Significant)
URL: `/session` → exit → `/session`  
Component: session state store  
Expected: the partial session should resume.  
Actual: re-entry from the dashboard "Start session" button gives a fresh session with new content (1/15). The discarded progress is not recovered. Hard refresh of /session likewise generates a new session (after a ~2s loading delay during which the header shows "Session 0 / -" with no content — see F026).  
Severity: Significant — undermines the daily-plan promise.

### F026 — `/session` shows "Session 0 / -" with no body for ~2s on direct nav (Minor / Performance)
URL: `/session` via direct URL (not via dashboard click)  
Component: session loading skeleton  
Expected: a skeleton or "Loading…" affordance, not an empty broken-looking header.  
Actual: navigating directly to /session renders the back button + a "0 / -" counter with no content for ~2 seconds, then the question pops in. Looks broken to a first-time user.  
Severity: Minor.

### F027 — Repair loop adds 3 items per wrong answer, unbounded (Edge case / Significant)
URL: `/session`  
Component: scheduler repair-loop expansion  
Expected: a learner with many mistakes should still see a session that finishes in a reasonable time. Some upper bound on per-session expansion seems warranted.  
Actual: each wrong answer that triggers a repair adds 3 items (2 micro-drills + retry). With multiple wrongs the session grew from 11 → 14 → 17 in two repairs. No cap observed. A struggling learner could easily land in a 30+ item session, which contradicts the dashboard estimate "Estimated: 18 min" and is demotivating.  
Severity: Significant.

### F022 — AI-generated grammar explanation contains four factual errors in one paragraph (Critical — moat violation)
URL: `/session` during repair loop on a noun-gender fill-in-blank ("Han kjøper ___ avis på butikken")  
Component: AI-enhanced repair-loop explanation (the "Vis grammatikkregler" upgrade)  
Expected: a correct explanation of Norwegian noun gender (the template fallback below the AI paragraph is correct — "en bil / ei jente / et hus").  
Actual: the AI paragraph reads, verbatim:  
> "In Norwegian, the indefinite article 'et' is used for masculine nouns. Unfortunately, 'ett' is a masculine noun, but it's used incorrectly. The correct answer is 'ei' because it's the indefinite article used for neuter nouns. The rule is: 'A neuter noun must be preceded by ei, en, or et, and the gender of the noun must agree with the article.' In your case, 'ett' should be replaced with 'ei' because 'ett' is a neuter noun."  

Errors:  
1. "et" is for neuter nouns, NOT masculine. ❌  
2. "ett" is the cardinal number "one" — it is not a noun, not "masculine", not "neuter". ❌  
3. "ei" is for feminine nouns, NOT neuter. ❌  
4. Internal contradiction: first sentence says et is masculine, third sentence says ei is neuter — leaves the reader without a correct gender→article mapping.  

Pedagogical cost: a learner reading this is being taught the OPPOSITE of the correct rule. The on-screen correct template example below (`en bil` / `ei jente`) has the right mapping; the AI prose actively contradicts it.  
Evidence: `05-session/01-ai-explanation-wrong.png`. Captured during a real /session run on guest user.  
Severity: **Critical**. CLAUDE.md operating rule 6: "No silent substitution. Never make a feature appear to work when it doesn't." This is the AI badge showing "AI ready" and shipping hallucinated grammar onto a beginner's screen. Per the moat statement, "AI is a power tool that supports the coaching. AI is never the headline. Every AI path has a non-AI fallback" — but here the AI prose replaces (rather than supplements) the correct rule.

### F021 — "Today's session" content and estimate change on every navigation/refresh (Significant — daily-plan honesty)
URL: `/dashboard`  
Component: scheduler / dashboard "Today's session" card  
Expected: "Today's session" should be a stable plan generated once per day per learner (or per first-visit-of-day) so a user can leave and return without losing their place.  
Actual: between consecutive loads of `/dashboard`:  
  - load 1: "V2 word order (verb-second rule) — 3 min — 2 repairs + 1 new"  
  - load 2: "Noun gender — 18 min — no repair/new badges"  
Different concept, different estimate, different composition. The "Today's session" label promises continuity that the implementation does not provide.  
Severity: Significant.

### F019 — Scheduler emits 36 warnings on dashboard load: "no eligible sentence for any type in pool" (Significant — content gap exposed by diagnostic write)
URL: `/dashboard`  
Component: `src/lib/scheduler` (file path inferred from chunk `_30228449.js`)  
Expected: every concept in the active level should have at least one sentence per allowed exercise type.  
Actual: after diagnostic write, scheduler runs and emits "skipping `v2-word-order` — no eligible sentence" for each of v2-word-order, adjective-agreement, past-tense-regular, prepositions-place, negation-placement, modal-verbs at the current A2 level. Result: dashboard "Today's session" shrinks to "Norwegian Foundations · Estimated 2 min · 2 repairs" — a degraded session.  
Severity: Significant — the moat's "scheduling" leg is documented to skip concepts silently; this should be an honest banner ("not enough content yet at your level").

### F012 — `totalSessionsCompleted: 0` with 24 recorded errors (Critical — counter integrity)
Where: fingerprint `totalSessionsCompleted: 0`, `lastSessionAt: null` while `recentErrors` length is 24 and `errorPatterns[0].frequency: 23`.  
Expected: if errors are being attributed (and conceptMastery has 27 attempts on question-formation), at least one session has happened. The session counter should reflect that.  
Actual: counter stuck at 0. Either sessions were never marked complete (so the SRS scheduling on session-end never ran for those answers), or the counter increment path is broken.  
Severity: Critical for engine honesty. Streak/session-count badges shown to the user will be perpetually 0 even though they've been practising.

### F008 — /auth/callback validator: `safeRedirectPath` correctly blocks open redirects but allows path traversal within origin (Edge case)
URL: hypothetical `/auth/callback?code=valid&next=/../etc/passwd`  
Component: `src/app/auth/callback/route.ts:5-9`  
Expected: only allow whitelisted in-app routes.  
Actual: regex `/^\/[^/]/` accepts `/../etc/passwd`, `/\evil.com`, `/javascript:alert(1)` (any "/" + non-"/"). `NextResponse.redirect` URL-normalises these so they cannot escape origin (no actual open redirect), and within-origin they become 404s, **but** in principle `/api/admin-endpoint` could be reached as a next-target, and `/__internal/...` style paths bypass any client guards. No vulnerability proven, but the validator is broader than it advertises.  
Severity: Edge case — no exploit confirmed, worth tightening.

### F005 — Landing "Dagens grammatikk" never rotates (Edge case)
URL: `/`  
Component: Dagens grammatikk card on landing  
Expected: per the user spec "Daily Learning Card behavior across reloads — does it rotate?" — at minimum daily rotation.  
Actual: every reload shows "V2 Word Order — I morgen reiser jeg til Bergen." with no tap-to-reveal interaction. Card is static brochure content, not daily.  
Severity: Edge case — name implies daily content but it's a one-time hero card.

### F002 — Waitlist form shows "you're on the list" but is cosmetic (Significant)
URL: `/`  
Component: WaitlistForm (landing page)  
Expected: per CLAUDE.md the landing waitlist is "cosmetic" — but a user submitting their email reasonably believes they have been signed up.  
Actual: form POSTs to `/` (same URL, 200 OK), no `/api/waitlist` endpoint hit; client renders "You're on the list. We'll reach out when early access opens." with green check icon. No actual signup occurs.  
Evidence: `browser_network_requests` showed only `[POST] http://localhost:3000/ => [200] OK` (the page itself), no API call to a waitlist endpoint, no Supabase request. Success copy is fabricated.  
Severity: Significant — actively misleads visitors about a commitment.

### F001 — Landing footer has no links (Edge case)
URL: `/`  
Component: footer (page.tsx footer block)  
Expected: per spec, "footer links" should exist to click.  
Actual: footer contains only brand chip + tagline "Lær. Forstå. Mestre." — zero links.  
Evidence: snapshot `01-landing/01-initial-1280.png`  
Severity: Minor (no privacy/terms/contact links is a real product gap for a launchable site).

