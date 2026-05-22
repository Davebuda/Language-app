# NorskCoach System Walkthrough — 2026-05-20

**Test environment:** Local dev server (`next dev --turbopack`), Chromium via Playwright MCP  
**Auth state tested:** Guest (unauthenticated) — auth-dependent findings noted in Unverifiable  
**Screenshots saved:** `test-reports/` directory  
**WebLLM model status:** Non-functional throughout — returns `null` for all generation tasks (confirmed via /eval harness), produces broken Norwegian in conversation  

---

## CRITICAL — Blocks core use

---

### C1 · Translation-to-English grader always fails

**Where:** `/session` — "Sentence transformation" / "Translate to English" exercise type  
**Expected:** Submitting a correct English translation of a Norwegian sentence advances the exercise.  
**Actual:** The repair loop fires on every correct English answer. The system compares the user's English text against the wrong reference. In some exercises the "correct answer" displayed is the original Norwegian sentence; in others it's an English sentence the user typed exactly. The database has inconsistent expected answers: some "Oversett til engelsk" exercises have the Norwegian source stored as the expected answer, others have the English translation. Neither state can be reliably passed. Every "translate to English" exercise in the session is permanently unpassable.  
**Evidence:** Submitted "What is your sister's name?" for "Hva heter søsteren din?" → repair loop fired, correct answer shown as "Hva heter søsteren din?". Submitted "Do you like Norwegian food?" for "Liker du norsk mat?" → same. Submitted Norwegian original "Neste uke reiser hun til Tromsø." for that exercise → repair loop fired with correct answer shown as "Next week she is travelling to Tromsø."  
**Screenshots:** `06b-session-false-repair.png`  
**Console errors:** WebLLM `generateContent` warnings (model failed, fell back to string comparison)  
**Network errors:** None  

---

### C2 · AI model (WebLLM/Llama) is non-functional

**Where:** All AI-dependent surfaces — `/session` (semantic grading, explanations), `/conversation` (replies), `/journal` (feedback), `/eval` (harness)  
**Expected:** WebLLM loads the local model, generates Norwegian text for exercise explanations, conversation replies, and journal feedback.  
**Actual:** The model fails silently on every call. Console shows continuous `[WebLLM] generateContent attempt 1/2: SyntaxError` and `Error` warnings — 90+ warnings logged during a single session. The eval harness confirms: Run 1 of "Generate fill-in-blank (A1, noun-gender)" returned `null` after 24 seconds. The "AI ready" badge appears in the session header but the model produces null output for all generation tasks. All AI-dependent features fall back to templates or produce garbage output.  
**Evidence:** Eval harness Run 1 = `null`. Conversation AI produced "Hur forkler du det til dag?" (contains Swedish "Hur", garbled "forkler", non-standard "til dag"). Journal analysis produced incorrectly explained errors. Session repair explanations all used the same V2 boilerplate regardless of error type.  
**Screenshots:** `06d-session-listening.png`, `08c-conversation-bad-ai.png`  
**Console:** 90+ `[WebLLM] generateContent` warnings throughout session  

---

### C3 · Session exercises render blank — user gets stuck

**Where:** `/session` — multiple exercise positions  
**Expected:** Every exercise in a session renders a question, prompt, and interactive input.  
**Actual:** Multiple exercises in a session render either as a completely blank dark card (no content, no input, no button — user is stuck) or silently auto-advance without the user doing anything. Confirmed: Q6 (Listening) auto-skipped, Q8 auto-skipped, Q9 auto-skipped, Q10 rendered a blank card. The session counter jumped from Q5→Q7 and Q8→Q10+ without user action. An empty exercise card has no way to advance — no skip button, no input, nothing.  
**Evidence:** Session expanded from 14→17→20 questions due to repair loops, and multiple empty positions appeared throughout. Screenshot at Q10 shows a dark empty card as the sole UI element.  
**Screenshots:** `06d-session-listening.png`, `06e-session-empty-exercise.png`  
**Console:** No additional errors at empty exercise positions  

---

### C4 · Word order exercise cannot be solved without drag-and-drop

**Where:** `/session` — Word Order exercise type  
**Expected:** User arranges scrambled Norwegian word tiles into the correct sentence order.  
**Actual:** Clicking a tile highlights it (radio-select behavior — only one tile active at a time). No sentence-building zone is visible or populated. The `status` element in the accessibility tree remains empty regardless of tile clicks. The exercise checks "the current order of tiles" which is the initial scrambled order. Submitting with no rearrangement immediately triggers the repair loop. Without a mouse drag operation (not possible via keyboard or click-only interaction), the exercise cannot be completed.  
**Additional issue:** The "correct answer" displayed for the exercise "This evening we are watching a film" was "Hvordan kommer du **deg** til jobb om vinteren?" — a different exercise's answer was shown, AND the answer itself is grammatically incorrect (contains both subject pronoun "du" and object pronoun "deg").  
**Screenshots:** `06c-session-wordorder.png`  

---

## SIGNIFICANT — Partial function, misleading behavior, or data corruption risk

---

### S1 · Diagnostic wrong-answer feedback shows the NEXT question's explanation

**Where:** `/onboarding` — diagnostic quiz (slide 4)  
**Expected:** After a wrong answer on Question N, an explanation appears explaining why Question N's answer was wrong.  
**Actual:** After clicking a wrong answer on Question N, the screen transitions to show Question N+1's question (buttons disabled) along with Question N+1's explanation. The user never sees feedback about the question they just got wrong. Clicking "Next question" makes Question N+1 interactive. This pattern is consistent across all wrong answers tested.  
**Evidence:** Answered Q1 (question formation) wrong → explanation shown was about adjective agreement (Q2's topic). Answered Q2 (adjective agreement) wrong → explanation about V2 word order (Q3's topic).  

---

### S2 · Repair loop explanation is always the same V2 boilerplate regardless of error type

**Where:** `/session` — repair loop card  
**Expected:** The repair explanation matches the actual error concept (e.g., modal verbs get a modal verb explanation, noun gender gets a noun gender explanation).  
**Actual:** Every repair loop card across the entire session showed the identical text: "In Norwegian, the verb must always be in the second position in a main clause (V2 rule). When you start a sentence with an adverb or time expression, the subject and verb switch places." This was shown for translation exercises, word order exercises, and fill-in-blank exercises regardless of the concept being tested. The error tag chip shows different values (e.g., "question-formation") but the explanation body never changes. This is the template fallback stuck on a single template — related to C2.  

---

### S3 · Repair loop retry does not retry the failed question

**Where:** `/session` — "Prøv igjen" button in repair card  
**Expected:** After the micro-drill phase, "Prøv igjen" presents the original failed question again for a second attempt.  
**Actual:** Clicking "Prøv igjen" advances to the next scheduled exercise in the session — a different exercise, not the one that failed. The failed question is never presented again in the natural session flow. The session counter also grows (14→17→20) indicating micro-drills are injected, but the retry of the original question doesn't occur.  

---

### S4 · Conversation AI produces broken Norwegian

**Where:** `/conversation`  
**Expected:** Kari responds in grammatical Norwegian Bokmål with contextually appropriate sentences.  
**Actual:** First observed response: "Frokost er en god måte å begynne på. Hur forkler du det til dag?" — "Hur" is Swedish (Norwegian: "Hvordan"), "forkler" is Norwegian for "disguises" (not meaningful here — likely attempted "forklarer" or "forteller"), "til dag" is non-standard (Norwegian: "i dag"). Opening message "Bra! Kan du fortelle mer?" is a follow-up phrase used as an opener with no topic context. No grammar correction surfaced for deliberate user error ("å spiser" instead of "å spise"). No constraint banner appeared.  
**Screenshots:** `08c-conversation-bad-ai.png`  

---

### S5 · Microphone auto-starts recording without user consent

**Where:** `/conversation`  
**Expected:** User must explicitly start recording by clicking the microphone button.  
**Actual:** When a conversation starts, the mic button immediately shows "Stop recording" — recording began automatically. This also occurs after each message is sent (mic restarts without user action). No permission prompt is shown (browser permission is pre-granted in test environment, but the auto-start behavior would trigger a browser permission dialog on first visit without warning).  

---

### S6 · Journal "Rettet versjon" does not apply identified corrections

**Where:** `/journal` — "Se rettet versjon"  
**Expected:** The corrected version shows the text with all identified errors fixed.  
**Actual:** The rettet versjon both fails to apply a correction it identified AND introduces a new error. The feedback card correctly identified "å spiser → å spise", but the rettet versjon still contains "å spiser". The rettet versjon also capitalised "Jeg" mid-sentence ("og Jeg er fra Polen") which is incorrect in Norwegian.  
**Screenshots:** `09b-journal-feedback.png`  

---

### S7 · Journal feedback quality issues

**Where:** `/journal` — analysis feedback card  
**Expected:** Praise is specific to the submitted text; error explanations are accurate; feedback language is Norwegian or bilingual.  
**Actual:** (1) Praise: "I like that you used the correct form of 'jeg' (I) instead of 'du' (you)!" — no "du" appears in the submitted text; praise is fabricated/generic. (2) First error: capitalisation fix "jeg er fra Polen → Jeg er fra Polen" explained as "In Norwegian, the subject (jeg) should be in the second position, not the first" — this explanation is grammatically wrong (subject position is not the issue; it was a capitalisation error). (3) Second error: "å spiser → å spise" explained as "The verb 'liker' should be in the present tense, not the future tense" — 'liker' is already present tense; the actual rule is that modals/constructions with 'å' require a bare infinitive. (4) All feedback delivered in English for a Norwegian language learning product.  

---

### S8 · Waitlist email form is entirely cosmetic — no data is stored

**Where:** `/` — "Join the waitlist" section  
**Expected:** Submitting an email address records the address for early access notification.  
**Actual:** Submitting a valid email shows a success message ("You're on the list") but makes zero network requests. No API call, no Supabase write, no local storage. The email is immediately discarded. Additionally, on 375px mobile the success state shows only an icon with the text hidden due to layout overflow.  
**Screenshots:** `01-landing-mobile.png`  
**Network:** No requests recorded after form submission  

---

### S9 · Notifications bell is a dead button

**Where:** `/dashboard` — top-right bell icon  
**Expected:** Clicking opens a notifications panel or shows a count.  
**Actual:** Clicking the "Notifications" button produces no visible response — no panel, no dropdown, no modal, no toast, no console error, no network request. The button registers as "active" state briefly then nothing else happens.  

---

### S10 · Progress and Profile pages show wrong level on initial SSR render

**Where:** `/progress`, `/profile`  
**Expected:** Level badge and header consistently display the current fingerprint level (A2 in this test).  
**Actual:** The server-rendered HTML contains "A1" for both the level badge and "Nåværende nivå" text. The client hydrates to A2 from IndexedDB, causing a visible flash. This is a React hydration mismatch (React warning in console). Progress page also shows A1 concept graph for an A2 user — only the A1 concepts are displayed regardless of the fingerprint's current level.  

---

### S11 · Diagnostic terminates at 5 of 12 questions

**Where:** `/onboarding` — diagnostic quiz  
**Expected:** The spec describes a "12-question adaptive diagnostic." A learner expects to answer 12 questions.  
**Actual:** The quiz terminated at 5 questions with a placement result. This may be intentional adaptive early-exit behaviour (IRT confidence threshold reached), but: (1) the page header shows "0/12" through "5/12" and then transitions to results — a learner reading "12" on the screen would expect 12 questions; (2) the slide counter advances to 5/5 after only 5 questions, suggesting the slide structure wraps the quiz position into the 5-slide count in a confusing way.  
**Screenshots:** `05b-onboarding-placement-result.png`  

---

### S12 · Recalibration starts immediately with no trigger banner

**Where:** `/recalibrate`  
**Expected:** A trigger condition (e.g., "You haven't practised these 3 concepts in 14 days") is shown with an opt-in, or the recalibration is only accessible from an explicit dashboard prompt.  
**Actual:** Navigating to `/recalibrate` directly launches a 7-question quiz with no explanation of why recalibration is being offered, no summary of what will be tested, and no option to decline. The recalibrate page also exposes no interactive content to the accessibility tree — the snapshot only shows an `alert` element, meaning screen readers get nothing from the recalibration interface.  

---

### S13 · "Del" (share) button visible but untested at session complete

**Where:** `/session/complete`  
**Expected:** Share button allows sharing session results.  
**Actual:** The session complete screen is guarded — navigating directly to `/session/complete` redirects to `/dashboard`. Could not reach the share button in this walkthrough since no session was completed (blocked by C1 and C3). Flagged for separate testing.  

---

## MINOR — Cosmetic, accessibility, or polish

---

### M1 · Grey rectangle visual artifact on login and onboarding cards

**Where:** `/login`, `/onboarding` slides 1–3  
**Expected:** Clean card layout with no extra elements.  
**Actual:** A grey/white rounded rectangle (approximately 90×60px) is visibly rendered overlapping the top-right area of the main content card. It appears on every slide of onboarding and on the login card. Looks like an SVG icon element that failed to render an actual image.  
**Screenshots:** `02-login-empty.png`, `04-onboarding-slide1.png`  

---

### M2 · Excessive whitespace below footer — landing page and others

**Where:** `/` (and other pages)  
**Expected:** Page ends at the footer.  
**Actual:** Large empty space below the footer at desktop and mobile. Visible at both 1280px and 375px. Approximately 200–300px of dead space below the last visible element. Consistent across pages.  
**Screenshots:** `01-landing-desktop.png`, `01-landing-mobile.png`  

---

### M3 · Footer Norwegian text uses Latin substitutions

**Where:** `/` — footer  
**Expected:** "Lær. Forstå. Mestre."  
**Actual:** "Laer. Forsta. Mestre." — the Norwegian special characters æ and å have been replaced with Latin equivalents. Minor but inconsistent with a Norwegian language app.  

---

### M4 · Dashboard accuracy shows 53% for 0-session guest user

**Where:** `/dashboard` — stats strip  
**Expected:** Accuracy shows 0% or N/A for a fresh guest with no completed sessions.  
**Actual:** Accuracy shows 43% initially (before diagnostic), 53% after diagnostic (from diagnostic answers). This is technically derived from the fingerprint, not session accuracy, but the label "accuracy" without qualification is misleading — a user with 0 sessions sees a specific accuracy percentage with no context.  

---

### M5 · Favicon missing — 404 on every page load

**Where:** All pages  
**Expected:** Browser tab shows the NorskCoach favicon.  
**Actual:** `favicon.ico` returns 404. Console error on every page load: "Failed to load resource: the server responded with a status of 404 (Not Found) @ /favicon.ico"  

---

### M6 · Vocab and Shadow "Varsle meg" notify buttons have no feedback

**Where:** `/vocab`, `/shadow`  
**Expected:** Clicking "Varsle meg når det er klart" either records the notification request or shows a confirmation ("we'll let you know!").  
**Actual:** Button enters active/pressed state with no visible feedback, no toast, no state change, no network request. User cannot tell if anything happened.  

---

### M7 · Conversation ends with no summary or confirmation

**Where:** `/conversation` — "Avslutt" button  
**Expected:** Ending a conversation shows a brief summary (duration, exchanges, corrections) or at least confirms the session was saved.  
**Actual:** "Avslutt" immediately returns to the topic selection screen with no summary, no save confirmation, no error count, no time display, and no indication whether the session was persisted or discarded.  

---

### M8 · Word order exercise English instruction capitalisation

**Where:** `/session` — Word Order exercises  
**Expected:** Instruction consistent with design language.  
**Actual:** The English instruction at the top of word order exercises is in ALL CAPS ("HOW DO YOU GET TO WORK IN WINTER?"). Other exercise types use sentence case for labels. Minor inconsistency.  

---

### M9 · scroll-behavior: smooth warning on every navigation

**Where:** All pages  
**Expected:** No console warnings during navigation.  
**Actual:** `[WARNING] Detected 'scroll-behavior: smooth' on the <html> element` fires on every route change. Not a breaking issue but indicates a known compatibility warning with Next.js or scroll restoration.  

---

### M10 · Journal hydration mismatch — React warning on every load

**Where:** `/journal`  
**Expected:** Server and client render consistently.  
**Actual:** React hydration error on page load: server renders a `<textarea>` (text mode default) but client hydrates to `<button>` elements (voice mode). The `WritingEditor` component has an SSR/CSR state mismatch — the mode toggle reads client-only state (IndexedDB or localStorage) that differs from the server default. React falls back to a full client re-render. Logged as a full React error with component stack trace.  

---

## UNVERIFIABLE — Cannot confirm without authenticated user or longer interaction

---

### U1 · Speed round stale-closure timer bug

**Where:** `/session` — Speed Round exercise type  
**What:** A `setInterval` in SpeedRound captures `userInput` from the `useEffect` closure at mount time. When the timer expires and auto-submits, it calls `submitAnswer(userInput)` with the stale empty string. This was not observable in this test run because no Speed Round exercise appeared in the sessions tested. Flagged in the roadmap as a known bug. Needs a session that reliably surfaces a Speed Round, then deliberate mid-answer timer expiry.  

---

### U2 · Authenticated user session persistence

**Where:** `/conversation`, `/journal`, `/session`  
**What:** Cannot verify Supabase write paths, conversation history persistence, or cross-device sync without completing the magic-link auth flow. The magic-link endpoint returned a 400 error for test@example.com (blocked domain). Real email required.  

---

### U3 · Session counter increment after completion

**Where:** `/session/complete` → `/dashboard` stats  
**What:** The session complete screen is guarded — navigating directly redirects to dashboard. Could not complete a session in this walkthrough due to C1 (broken English grader) and C3 (empty exercises). Roadmap notes a prior fix was made; could not confirm.  

---

### U4 · Streak update logic

**Where:** `/dashboard`, `/profile`  
**What:** Streak stayed 0 throughout because no session was completed. Cannot verify streak increments, streak freeze, or streak reset behaviour.  

---

### U5 · Recalibration mastery update and question deduplication

**Where:** `/recalibrate`  
**What:** Only the quiz start was observed (1 question). Could not verify that mastery scores update for tested concepts post-recalibration, or that questions don't repeat from the initial diagnostic. Accessibility tree also missing interactive content, which may indicate recalibration results don't surface to the fingerprint either.  

---

### U6 · WebLLM model load in production environment

**Where:** All AI surfaces  
**What:** The model consistently failed throughout the test. "AI ready" badge shows in the session header despite the model producing null output. It is unclear whether this is a development environment issue (missing model files, GPU access, memory) or whether it would also fail in production. The eval harness's null output after 24 seconds suggests the model is attempting to generate but producing no valid output — not that it failed to load entirely. The distinction matters for triage.  

---

### U7 · FillInBlankExercise hardcoded error tag

**Where:** `/session` — Fill in Blank exercise  
**What:** Per roadmap integrity follow-up: both `MultipleChoice.choose()` and `FreeText.submit()` hardcode `errorTag: 'verb-conjugation'` regardless of the actual error. Could not verify during this walkthrough whether the fill-in-blank exercise I answered correctly (Q5: "lite") would have recorded the wrong error tag on an incorrect answer. Needs deliberate wrong answer and fingerprint inspection.  

---

## Cross-cutting observations

**WebLLM warning volume:** 90+ `[WebLLM] generateContent` warnings during a single session of ~30 minutes. Each exercise that requires AI grading spawns multiple background calls (attempt 1, attempt 2) that all fail. This will drain battery and generate noise in any error monitoring tool.

**Accessibility:** Recalibration page exposes nothing to the accessibility tree. Word order exercise cannot be completed without mouse drag. Session repair loop explanation is always the same V2 boilerplate. Conversation mic auto-starts. Multiple interactive elements have no `aria-label` beyond what the browser derives from text content.

**IndexedDB database name mismatch:** The fingerprint lives in `norsk-coach` database / `fingerprints` store. A second database `norskcoach-fingerprint` exists but has no object stores. If any code path opens `norskcoach-fingerprint` expecting data, it will find nothing.

**Session complete screen inaccessible:** The `/session/complete` route redirects to `/dashboard` when navigated directly. This means the session complete experience (share button, accuracy display, streak update, reflection prompt) was never testable in this walkthrough because no session could be completed due to C1 and C3.

---

*Report generated: 2026-05-20 | Screenshots: test-reports/ | Test runner: Playwright MCP + Chromium | Auth: Guest only*
