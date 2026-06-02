# NorskCoach — Bigger Picture & Direction (synthesis of 2026-06-01 audit session)

**Inputs synthesized:** `output/pandoai-live-audit-2026-06-01.md` (functional audit + Lanes A/B/C + surface sweep + audio + perf + Exercise×Level matrix + Part 2 capacity + Part 3 quality), `.scout/2026-06-01-feature-exercise-verdicts.md` (competitive verdicts), `output/pandoai-fingerprint-sim-2026-06-01.md` (Part 4 sim — PENDING at time of writing).
**Mode:** direction analysis for approval (Operating Rule 2). No implementation here.

---

## 1. THE BIGGER PICTURE — 5 themes

### Theme 1 — The engine is mechanically excellent; the DIAGNOSIS (the moat's headline) is half-wired
Mastery EMA, decay, SRS ladder, weekly-sprint graduation, scheduler recipe + level filter + passed-removal — all real, traced, behaviorally confirmed live. BUT the differentiator the whole product rests on — *root-cause diagnosis* — under-delivers in production:
- Wrong-answer error tags are **authored-positional** (`errorTagsDetectable[0]`), not the learner's observed error. Three types hard-code their tag regardless of what was typed.
- `computeProductionGap` is **dead code** → diagnosis rule 2 never fires; production-bias scheduler always reads 0.
- The repair retry **doesn't gate graduation** — mistakes are beaten into the *schedule*, not into proven mastery.
- Net: ~1.5 of 4 root-cause rules truly operate. CLAUDE.md ranks "Diagnosis = STRONGEST"; live it is the **weakest** leg.

### Theme 2 — Content is genuinely good but supply is brittle at the top + on mobile
- Corpus is CEFR-calibrated and well-written (clean difficulty gradient A1→B2; B2 has real register/cohesion). A1/A2 deep (~40/concept, 880/760).
- B1/B2 shallow (30/concept) AND type-collapsed (listening/speed-round/cloze ≈0 at B1/B2; translation-to-norwegian only 82 at B2).
- On **mobile** (the primary device) the AI top-up escape valve doesn't exist (`ServerAIService.generateContent` returns null) → static corpus is a hard ceiling. B2 production supply exhausts in ~1 week of daily use → **brittle**.

### Theme 3 — The NORTH STAR (production + speaking) is structurally undercut
- **Speaking is not in the session loop at all** — the "snakk" block is typed (translation/word-order); roleplay/listen are separate, thin (3 scenarios / 8 fixed Qs), level-agnostic.
- Production-bias scheduler is **inert** (productionGap dead), so the engine can't actually push production.
- Exercise **mechanics don't scale with CEFR** — a B2 sentence is delivered through the same single-sentence task as an A1 sentence; no inference, long-text, or extended production. Higher levels drift recognition-ward.

### Theme 4 — Honesty/trust erosions (small individually, corrosive to the "No lies" principle)
- Fabricated "4.9 ★ fra tidlige brukere" on landing (no real users).
- Analytics "Bevaring/retention" is really a **recency** signal — a mislabeled metric in a diagnostic product.
- "AI ready" badge vs profile "Maler" fallback contradiction.
- Dashboard "12 oppgaver · ca. 3 min" vs real 25 items / ~18 min.
- Phantom exercise types are **scheduled into live sessions** (honest banner, but wastes a slot mid-session).

### Theme 5 — UI / perf / honesty-architecture are solid (NOT where the leverage is)
- Fast (FCP ~184ms, CLS 0, ~18KB landing), distinctive lime/black editorial aesthetic, Norwegian-dominant across all learning surfaces, honest "kommer i V2" / "Repetisjon" banners, full guest access, working concept-graph progress page, real MP3 on /drills.
- Main debt: systemic low-contrast muted-text token (7 WCAG-AA fails), session-listening uses TTS instead of available MP3, SEO (noindex/canonical/og:image).

---

## 2. COMPARE TO THE VISION

| Vision pillar | Claim | Live reality | Gap |
|---|---|---|---|
| Moat — Diagnosis | "STRONGEST; no competitor does root-cause" | Half-wired (authored tags, dead productionGap) | 🔴 Largest gap — the headline differentiator under-delivers |
| Moat — Scheduling | recipe/SRS/weekly bias/level filter | Real & strong | ✅ Matches |
| Moat — Remediation | explain→drill→retry→SRS | Wired & traceable, retry not graduation-gated | 🟡 Mostly matches |
| North star — Production | every surface pushes production | Partially; production scheduler inert; recognition drift at B2 | 🟠 Undercut |
| North star — Speaking | "push to actually speak" | Not in core loop; thin side-surfaces | 🔴 Structural gap |
| Ship-ready #9 (audio) | real audio not TTS | Holds on /drills; session uses TTS | 🟡 Partial |
| Ship-ready #11 (no lies) | zero fabrication | Fabricated rating + mislabeled metric | 🔴 Violated |
| Content depth | A1-B2 selectable & honest | True; B1/B2 thin + brittle on mobile | 🟠 Thin at top |

**One-sentence diagnosis of the product:** NorskCoach is a **well-built engine + well-calibrated content whose single most important promise (root-cause diagnosis) and single most important outcome (production/speaking) are the two things least delivered in production** — and both are fixable without new surface area.

---

## 3. DIRECTION OPTIONS

### Option A — "Make the moat real" (depth-first engine + content) — RECOMMENDED CORE
Fix the things that make the *existing* promise true. No new surfaces.
- A1. Wrong-answer tagging reflects the actual error (or 1 tag/sentence) — restores diagnosis.
- A2. Wire `computeProductionGap` into `recordResult` — activates production diagnosis + scheduler bias (north star).
- A3. Gate repair graduation on a passed retry.
- A4. R1 re-tag B1/B2 (listening/speed-round) + deepen B1/B2 corpus to ≥50/concept (cloze first — highest-leverage production type, 0 at B1/B2).
- A5. Wire server-side AI generation (`/api/ai` generate) so mobile gets top-up — removes the brittle ceiling.
**Pro:** every item compounds the moat + north star; matches Rule 1 (depth not breadth); mostly bug-fix + content, not new architecture. **Con:** less visible than new features; needs careful Rule-8 write-tracing per fix.

### Option B — "Trust + polish wave" (fast, low-risk, parallel)
Fix the honesty/credibility erosions before real users arrive.
- Remove fabricated rating; relabel "Bevaring"→recency or compute real retention; reconcile AI badge vs Maler; fix dashboard count/time; stop scheduling phantom types; fix muted-contrast token; SEO (noindex decision, canonical, og:image).
**Pro:** protects the "No lies" principle the project prizes; small, mostly mechanical; ship-blocker hygiene. **Con:** doesn't move the moat — necessary, not sufficient.

### Option C — "Breadth: new exercise types + speaking-in-loop + layout"
Build discourse/production types (cloze passages at scale, guided composition), bring a speaking item into the session loop, redesign layouts.
**Pro:** directly attacks the north-star speaking gap + B2 mechanic mismatch. **Con:** breadth-before-depth risk; the speaking-in-loop + cloze-depth slices are high-value, but a full layout-direction pass (`feature-to-layout-director`) is NOT supported by the evidence — the problems are engine/content/pedagogy, not visual layout. Layout work now = scope drift.

---

## 4. RECOMMENDED DIRECTION & SEQUENCE

**Sequence: A (core) + B (parallel fast wave), then the two high-value slices of C — explicitly NOT a layout pass.**

1. **Wave 1 (parallel):**
   - A1+A2+A3 — the three engine fixes that make diagnosis + production real (this IS the moat).
   - B — trust/polish wave (independent, low-risk, can run alongside).
2. **Wave 2:** A4 (B1/B2 cloze depth + R1 retag + corpus deepen) + A5 (server AI top-up) — fixes the brittle top-level supply.
3. **Wave 3 (gated on Wave 1):** the C slices that earned their place — **one speaking-production type in the session loop** + **cloze at B1/B2 scale**. Each must trace a real fingerprint write (Rule 8) before shipping.
4. **Explicitly deferred:** layout-direction redesign (`feature-to-layout-director`), new recognition types, anything that adds surface without compounding the moat.

**Why this order:** Wave 1 makes the product's central claim true (highest leverage, lowest new-risk). B protects credibility cheaply. Wave 2 removes the supply ceiling. Wave 3 closes the speaking gap once the engine that measures it actually works (no point pushing production before the production-gap signal is wired).

**Rule-2 checkpoint:** this is a reversible architectural direction → STOP for user approval. On approval: `architect` sign-off on Wave 1 scope → `/ultraplan` the chosen wave. Do NOT plan all waves at once (Rule 4: one move at a time).

---

## 5. PART 4 (fingerprint sim) — RESULTS (folded in)
Sim ran the 4 users × 7 days against the real engine (`output/pandoai-fingerprint-sim-2026-06-01.md`). **Verdict: a real concept-level learner model wrapped around a broken root-cause diagnoser.** Findings:
- ✅ Fingerprint DRIVES selection — weak concept scheduled 2-8× above random (A2 ~38%, B2 ~39% of lær block).
- ✅ Passed items suppressed; ✅ cross-surface coherent (journal `repairFromSurface` → same concept + error log).
- 🔴 `runDiagnosis` named the WRONG root cause 4/4 (uses authored error tags). Concept-mastery layer (drives scheduling) is RIGHT; the "why" label is wrong.
- ⚠️ **Corrects §1/Theme 1:** `computeProductionGap` is NOT dead code — it's wired (`useFingerprint.ts:314-320`) but low-signal (rule fires near-random).
- 🆕 **F1 (serious):** Weekly Sprint DEAD at B1/B2 — phase computation only sees the active-level graph → B1/B2 concepts permanently `locked` → `selectWeeklyFocus` returns `[]`. Stream-5 weekly bias/graduation inert above A2.
- 🆕 **F2:** lower-level concepts orphaned (`phase=unknown`) after progression.

**Impact on the direction:** the moat's "scheduling/adaptation" leg is STRONGER than feared (works at concept level); the fix list shifts — §3 Option A's "wire computeProductionGap" is superseded. The corrected, authoritative, sequenced action list is in **`output/pandoai-execution-plan-2026-06-01.md`** (replaces the rough A1-A5/B/C sketch here). New top item: **F1 graph/phase prerequisite resolution** (revives Weekly Sprint above A2).
