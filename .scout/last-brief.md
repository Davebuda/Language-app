# Scout Brief: norskcoach-dashboard-expression
**Date:** 2026-06-22 · **Run mode:** focused (UX/IA lanes; perplexity key dead → WebSearch+WebFetch) · **Question:** how best the dashboard can express the app

---

## TL;DR
- **What exists (ours):** T1.1 dashboard-as-conductor already shipped — identity + ONE prescribed action ("Start dagens økt") hero, practice menu + status behind a "Mer" disclosure, muntlig sub-panel. Breaker-story ("what breaks your sentences, shrinking") exists but lives on **/progress**, not the dashboard.
- **What the best apps do:** they lead the home with a SINGLE thing and make the product's intelligence the spine of it — either a guided path (Duolingo) or a daily composite verdict that IS a recommendation (WHOOP/Oura).
- **The gap / opportunity:** our **moat is diagnosis (root cause)** — no competitor surfaces this. Duolingo *hides* its intelligence (every path looks generic); WHOOP *surfaces* its intelligence as a color-coded daily verdict + the action that flows from it. NorskCoach should do the WHOOP move with a learning verdict: **"what's breaking your sentences" → today's prescription → the breaker shrinking** as the home spine. T1.1 nailed "one action"; the next step is making the *why* (diagnosis) and the *motivation* (breaker shrinking) visible on the home surface itself.

---

## Competitor home-surface patterns (validated)

**Duolingo — the guided PATH (intelligence hidden).** Home is a linear path of circles; one clear next step. Explicit goal: kill "am I using it the *best* way" anxiety → *"a clear path to follow — so you can be confident that each step is truly the best step for reaching your goals."* Spaced repetition is built INTO the path (new + review interspersed so you never feel you're "going back"). It *strategically guides* and removed free choice. **Lesson:** one prescribed step beats a menu; SRS is invisible plumbing. **Limit:** the path looks identical for everyone — the intelligence is felt only as "it picks the next circle," never *named*. [Confirmed — blog.duolingo.com/new-duolingo-home-screen-design]

**WHOOP — the daily VERDICT (intelligence surfaced).** Home leads with the **Recovery score** (green/yellow/red): *"more than just a number; it's a personalized recommendation for how to approach your day."* Three dials (Sleep/Recovery/Strain) at top, deep-dive pages + weekly plans below, "highlight what members value." **Lesson:** the product's intelligence IS the home surface — one composite verdict → one recommendation → secondary detail one tap down. [Confirmed — whoop.com/thelocker/the-all-new-whoop-home-screen + how-does-whoop-recovery-work]

**Oura — composite readiness + contextual nudge.** Four scores, but **Readiness** leads as the "how hard can I go today" verdict; on abnormal days it *proactively suggests tags/actions* on first sync. **Lesson:** the verdict adapts the recommendation; the app speaks first when something changed. [Confirmed — support.ouraring.com]

**Synthesized home-screen best practice.** The home must answer **three questions instantly: (1) what do I do next, (2) how long will it take, (3) how close am I to my goal.** A single primary CTA (Resume/Start) + a visible progress/streak + the personalization reason removes decision friction and lifts session-starts; a full menu of modes is the anti-pattern. [Confirmed — design-bootcamp / language-app UX case studies]

---

## Anti-patterns to avoid (named)
- **Dashboard-as-junk-drawer:** a grid/menu of equal-weight doors (the exact "clutter of random Norwegian" the Vision Contract names; T1.1 already fought this — don't regress it).
- **Hidden intelligence (Duolingo's limit):** a smart engine the home never *names* feels generic. Our moat must be visible, or it's invisible.
- **Verdict without action:** dashboards that show charts but no next step.
- **Two co-equal heroes:** strategic-weight rule — at most one anchor + one supporting glance.

---

## Brainstorming fuel (→ feeds feature-to-layout directions)
1. **Coach's verdict as the spine (WHOOP move):** lead with the diagnosed sentence-breaker as a named daily "verdict" → the prescribed økt flows from it → breaker-trend as the progress glance. Makes the moat the home surface.
2. **The path, but diagnostic (Duolingo move, differentiated):** a single forward path where each node is *named by the root cause it fixes*, so guidance is visible, not generic.
3. **One question, answered (3-Q rule):** restructure the hero to explicitly answer next / how-long / how-close in one glance.
4. **Speak-first nudge (Oura move):** when diagnosis/production-gap shifts, the coach speaks first on the home ("Uttalen din henger etter — i dag øver vi muntlig").

---

## Scoring appendix
Sources: 3 WebSearch sweeps + 2 primary fetches (Duolingo blog, WHOOP locker). Perplexity unavailable (401). Confidence: home-surface patterns [Confirmed]; specific 2026 redesign details [Estimated]. All free/no-cost research.
