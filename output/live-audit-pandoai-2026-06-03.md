# Live Runtime Audit — pandoai.no (NorskCoach) — 2026-06-03

> **RESOLVED (same day, deployed + live-verified):** **Critical-1** — conversation no longer
> uses the 1B WebLLM; routed to Groq-8B/template (`0b8112e`). **High-1 partial** — a CORRECTION
> scaffolding leak this exposed (" CORRECTION: None") was fixed with a split-based strip (`6fe9f0e`,
> test-locked). Live re-test: Kari now returns coherent on-topic Norwegian, no garbage, no
> scaffolding. Remaining: the **AI-status badge** ("Lokal AI" on a Groq surface) — the rest of
> High-1, an async-init-race + per-surface-source issue, still open. Decision:
> `docs/decisions/2026-06-03-conversation-no-local-1b.md`.

Method: Playwright runtime audit of live pandoai.no (desktop 1280, fresh guest), per the
live-audit brief. **Drift baseline: live == current `main` (`cd422df`), deployed this
session today** (pulled + built + pm2-reloaded, HTTP 200 verified) — so there is **no deploy
drift**; all findings are SHARED (live == main) unless noted. Headless Chromium here **does**
expose WebGPU, so the desktop WebLLM path executed for real (this matters — see Critical-1).

## 1. Executive summary

The live app is **substantially healthier than the prior (stale-build) walkthrough implied**:
the entire core loop is completable and the original "Critical" set (3a/3b/3c/3d/2a/2b/7a) is
**verified fixed on HEAD** — those are now DRIFT (historical). It is **improving, not drifting**.

It is **mostly honest about its capabilities, with one serious exception**: the **conversation
("Snakk med Kari") AI runs the raw WebLLM 1B model and emits garbled non-Norwegian**, while the
**profile simultaneously claims "AI is unavailable, the app falls back to fixed rules."** Both
cannot be true. The safe-template surfaces (journal feedback, repair explanations) are honest
and useful; the unguarded conversation surface is the single biggest trust risk on the live site.

Net: deterministic/template surfaces are the trustworthy product today; the one place that lets
the 1B model speak freely (conversation) is where trust breaks. This strongly validates the
project's Option-C ("demote AI") direction — the fix is to guard/disable the conversation model,
not improve it.

## 2. Route-by-route findings

| Route | Tested | Result | Severity | Live/Main/Shared |
|---|---|---|---|---|
| `/login` | render, button logic, guest path, console | Production-shaped; magic-link input; **send disabled until input**; explicit honest guest path ("Fortsett uten innlogging"). 0 console errors. | OK | shared |
| `/onboarding` | render, grey-rect (375), flow | Clean; signal panel renders correctly, **grey rectangle fixed** (rings behind heading). Honest 5-slide setup → diagnostic. | OK (was Finding #1) | shared (fix live) |
| `/dashboard` | SSR/hydrate, stats, level | Post-diagnostic shows **B2 consistently**; "Treff —" honest (no completed session). Pre-diagnostic guest defaults to **A1** (see profile mismatch). | OK / see Med-3 | shared |
| `/session` | full loop + forced repair | **Completable**; repair "Prøv igjen" **re-presents the exact failed sentence** (3d fixed); word-order is a proper tap-to-build surface (3c UI fixed); phantom type → honest "kommer snart" banner. 0 console errors. | OK (was Critical) | shared (fix live) |
| `/conversation` | topic/level, mic, AI turn, end | **No auto-mic** (explicit "Start opptak" — 4a fixed); **topic-seeded correct opener** (4b fixed); end-summary screen exists (4d). **AI reply garbled non-Norwegian** ("væresa", "Hvapondparticles", "foretakker") — **Critical-1**. End-summary "**0 Utvekslinger**" after a real exchange — **Med-1**. | **Critical** | shared |
| `/journal` | write w/ error, analyze, feedback | Feedback **in Norwegian** ("Bra forsøk!" — 5c fixed); **real fingerprint write** ("Murstein lagt · produksjon registrert"). But feedback **generic / misdiagnoses**: suggested "verbplassering" for a pronoun error (`Dem`→`De`) — **Med-2**. Text mode stable, no hydration flash (5a not reproduced). | Medium | shared |
| `/reading` | load, filter, levels | Reliable pillar: 4 texts; level filter offers **only A1/A2** (honest — no faked B1/B2). | OK | shared |
| `/progress` | SSR/hydrate, graph | Post-diagnostic shows correct **B2 concept graph** (7a fixed). Hydrates from IndexedDB (brief blank then content). | OK (was Med) | shared (fix live) |
| `/profile` | level, AI status, stats | Honest zeros for fresh guest. **AI-status "Maler/Fallback: AI er ikke tilgjengelig"** — contradicts `/conversation` "Lokal AI" running WebLLM — **High-1**. Pre-diagnostic level "–" vs dashboard "A1" — **Med-3**. | High | shared |
| `/uke` | load, content | "Laster innhold…" ~4s → resolves to a **real 6-item weekly retrieval check** (translate-to-norwegian). Real engine feature, not scaffolding. Loading state weak (no skeleton). | Low-Med | shared |

## 3. Feature relevance matrix

| Feature | Intended job | Score (1–5) | Net effect | Recommendation |
|---|---|---|---|---|
| Onboarding + diagnostic | Place learner, seed fingerprint | **5** | Core, working (adaptive A2→B2 observed) | Keep |
| Dashboard / session launcher | Express state + launch daily økt | **4** | Coherent post-diagnostic; pre-diagnostic A1 default slightly off | Align pre-diagnostic level |
| Session loop + repair | Practice + remediation moat | **5** | Completable; repair re-presents failed item | Keep |
| Reading | Comprehensible input | **4** | Reliable; A1/A2 only (honest) | Keep; add B1/B2 content later |
| Journal | Production + written feedback | **3** | Real write + Norwegian feedback, but generic/misdiagnosing | Narrow claims; key feedback to real error tag |
| Weekly repetition (`/uke`) | Spaced retrieval | **4** | Real items; weak loading state | Add skeleton; explain "why this" |
| Conversation / Kari | Spoken/written production | **2** | **Garbled WebLLM output actively harms trust** | **Guard/disable model → template/Groq fallback** |
| Progress | Show mastery/graph | **4** | Honest B2 graph post-activity | Keep |
| Profile | Truthful control center | **3** | Honest stats, but AI-status contradicts conversation | Make AI-status truthful + consistent |
| AI fallback/status system | Tell user AI state honestly | **2** | Inconsistent: claims unavailable while conversation runs it | **Unify + make truthful across surfaces** |

## 4. System coherence analysis

- **AI readiness vs fallback reality.** Template/heuristic surfaces (journal, repair explanations)
  are valid Norwegian and trustworthy. The conversation surface runs the raw Llama-3.2-1B (WebLLM)
  and ships garbage. **Guarding is applied unevenly** — the same validity discipline that keeps
  journal safe is absent/ineffective on conversation. The fallback product is more trustworthy than
  the live-AI product wherever both exist.
- **Learner-state trustworthiness.** Strong post-diagnostic: level, accuracy gating ("Treff —"),
  concept graph, and journal "produksjon registrert" are consistent and honest. Two nits:
  conversation end-summary undercounts ("0 Utvekslinger" after a real turn — possible missing
  fingerprint write), and pre-diagnostic level differs (dashboard A1 vs profile "–").
- **Diagnostic/fingerprint visibility.** Well expressed once activity exists (selectionReason
  "Valgt fordi…", B2 graph, production wall, journal brick). Thin pre-activity (expected).
- **Hydration / client-state risk.** Acceptable. `/progress` and `/uke` hydrate from IndexedDB with
  a brief loading state; no wrong-state flash observed. No console errors across login/conversation/journal.
- **Deploy drift.** **None.** Live == main (`cd422df`), deployed today; the prior walkthrough ran
  against a stale build and its Critical set is now historical drift.

## 5. Priority actions

**Top 5 — immediate (product honesty + stability):**
1. **Guard or disable the conversation WebLLM path** — route Kari through the same validity gate
   journal uses, or fall back to constrained templates / the Groq server path. Kills the garbage
   (single biggest trust win). [Critical-1]
2. **Make AI-status truthful and consistent** — profile must not claim "AI unavailable / falls back
   to rules" while conversation runs "Lokal AI". One source of truth for AI mode across surfaces. [High-1]
3. **Strengthen `validateNorwegianOutput`** — it silently passed "Hvapondparticles" with 0 console
   errors. Reject English-fragment/nonsense tokens; log on rejection. [Critical-1 root]
4. **Fix conversation exchange count / confirm the write** — "0 Utvekslinger" after a real exchange;
   trace whether the turn lands in the fingerprint (contract-#3). [Med-1]
5. **Align pre-diagnostic level** — dashboard "A1" vs profile "–" for the same no-activity guest. [Med-3]

**Top 5 — medium-term (quality):**
1. Key journal feedback to the **actual detected error tag** (it suggested verb placement for a
   pronoun error) — or narrow the claim so it doesn't imply specific analysis. [Med-2]
2. Add a real loading **skeleton** to `/uke` (and a one-line "why this repetition") instead of bare
   "Laster innhold…". [Low-Med]
3. Add **B1/B2 reading** content (filter currently honest at A1/A2 only).
4. Populate more `acceptedAnswers`/`acceptedOrders` via a second linguist pass (engine wired; sample seeded).
5. Improve `classifyError` precision (drives which repair/journal explanation is shown).

**Pause / hide / relabel until trustworthy:**
- **Conversation free-form WebLLM** — until guarded, it is the one surface that should fall back to
  templates/Groq rather than let the 1B model speak. Relabel "Lokal AI" honestly when it's actually
  the template path.

---
Evidence: screenshots in `.claude/screenshots/live-audit/` (`conversation-garbled-ai.png`, `login-1280.png`).
Cross-ref: `output/qa-walkthrough-remediation-plan-2026-06-03.md`, memory `project_qa_walkthrough_2026_06_03`.
