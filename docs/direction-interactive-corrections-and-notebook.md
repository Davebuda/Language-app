# Direction — Interactive Corrections + Universal Learner Notebook

> Status: **proposed**, not yet built. Captured 2026-06-23 from a product voice note, sharpened against this repo's moat + North Star. Second-brain mirror lives in the Obsidian vault under `02-Projects/`.

## Summary
Two linked features + one copy change:

1. **Interactive correction feedback** — every corrected word/phrase in feedback (session repair loop, `/journal`, `/conversation`, `/reading`) is clickable → popup with: Norwegian · English · learner-facing explanation · grammar note (if relevant) · **Save**.
2. **Universal learner notebook** — save words / phrases / full corrections / rules / freeform notes from anywhere, that **return as scheduled practice**.
3. **Feedback tone** — rewrite all learner-facing feedback to **second person** ("You used X here…"), never "The learner used X".

## Non-negotiable constraints (from CLAUDE.md + audit backlog)

1. **Notebook must feed the scheduler (North Star).** A passive saved-words list is recognition-only and fails the North Star ("a recognition feature fails unless wrapped with an output requirement"). Saved items must become SRS/diagnosis entities re-served in future økter as **output** practice. This strengthens diagnose→schedule→remediate; it does not sit beside it.

2. **Respect audit item AI-01.** `audit/issue-registry.md` flags that journal "Rettet versjon" surfaces *unverified AI corrections as truth.* Clickable explanations amplify this. The popup MUST:
   - prefer **verified** content from the structured corpus (`content/vocab`, `content/sentences`, `content/concepts`, `content/taxonomy`);
   - mark AI-generated explanations as suggestions, visually distinct;
   - degrade to a **non-AI fallback** (per "every AI path has a non-AI fallback").

3. **The notebook IS the v2 vocab layer — reuse the SRS plumbing, don't build a parallel one.** Per CLAUDE.md, `/vocab` is currently a retired "Kommer i versjon 2" banner and vocab-SRS is an explicit **stub/not built**. So the notebook doesn't extend a live vocab system — it *becomes* it. Reuse the existing SRS ladder (1→3→7→14→30) + fingerprint/IndexedDB→Supabase plumbing from the session engine; do not invent a second review scheduler. This reframes the open decision below: "does the notebook feed the scheduler" is really "does v2-vocab feed the daily session" — squarely on-moat.

## Data model (draft)
```
NotebookItem {
  id
  type: 'word' | 'phrase' | 'sentence' | 'rule' | 'note'
  norwegian: string
  english?: string
  explanation?: string
  grammarNote?: string
  source: 'okt' | 'journal' | 'reading' | 'conversation' | 'manual'
  sourceSentence?: string          // preserve surrounding context for sentence saves
  tags: string[]
  learnerNote?: string
  reviewStatus: 'new' | 'learning' | 'known' | 'starred' | 'archived'
  verified: boolean                // corpus-backed vs AI-suggested
  createdAt
}
```
Persist to Supabase with RLS (per-user), mirror to IndexedDB for the fire-and-forget pattern already used by the fingerprint store.

## UX
- **Word popup:** popover on desktop, bottom sheet on mobile (mobile is first-class — honor the 375px reality gate).
- **Notebook surface:** drawer for quick review + full page (`/notebook` or fold into `/vocab`) for browse/filter/study.
- **Save:** one tap from popup → "Lagret i notatboka" toast.
- **Anti-clutter:** only corrected/diagnosed tokens (and `/reading` words) are clickable — not every token.

## Suggested build order
1. **Tone rewrite (3rd→2nd person)** — cheap, independent, no schema. Ship first.
2. **Shared explainable-token component + popup** fed by the corpus, AI as marked fallback.
3. **NotebookItem store + Supabase table (RLS) + IndexedDB mirror.**
4. **Save action wired into popup across økt / journal / reading / conversation.**
5. **Notebook surface (drawer + page).**
6. **Feed saved items into the scheduler** as output practice (the North Star payoff).

## Decisions (locked 2026-06-23)
- **Notebook feeds the daily økt — but only with purpose (HYBRID gate).** A saved item is **reference-only by default**. It is promoted into the økt when EITHER (a) the learner taps **"practice this"** on the item, OR (b) the diagnosis engine finds the item relevant to a current weakness (its concept is weak/decaying in the fingerprint). Purpose = explicit learner intent OR diagnostic evidence. A "just keep it" save never auto-schedules.
- **Promotion guardrail (respects T1.6):** a promoted item starts its **own** SRS ladder (1→3→7→14→30) and feeds the **remediation / new-material** pools only. It must **not** tilt the existing **review/SRS-due** pool — those stay diagnosis-agnostic, or the spaced-repetition ladder breaks (CLAUDE.md T1.6 lock). Every promoted item carries a `selectionReason` (new value, e.g. `notebook_practice`) like any other `SessionItem`.
- **Pipeline honesty (Rule 8):** because the notebook now claims to "feed the engine," the write must be traced end-to-end before it ships — a promoted item must demonstrably land in the session pool and move mastery in a real økt, not in theory. Grading uses the deterministic grader on the learner's production; the AI explanation/translation is **display only** and never moves mastery unverified (the "no unverified AI moves mastery" hard rule).

## Open decisions (still to settle in planning)
- `/notebook` as its own route vs reviving `/vocab` (currently a retired "Kommer i versjon 2" banner) as the notebook surface.
- Save-time UX for the intent signal: a one-tap "practice this" toggle in the save popup vs a later promotion action from the notebook list.
- Whether diagnostic promotion is automatic (item silently becomes eligible) or suggested ("Vil du øve på dette?") — honesty vs friction.
