# UI-1.0 — Typeface Analysis

## The test

Five criteria, in priority order:

1. **Norwegian dominates** — at display size (48–72px), the exercise text is unmistakably the most prominent thing on screen. The typeface presents content, not itself.
2. **æ/ø/å at display weight** — ring on å is well-formed and uncropped; slash on ø is a proper diagonal, not a hyphen; æ is a true ligature, not a kerned ae.
3. **Dark canvas readability** — renders cleanly at 48–72px on `#120E0E` near-black warm background.
4. **Recedes without calling attention** — a learner finishing a session remembers the Norwegian, not the font. If the typeface has a notable personality trait, that's a mild fail.
5. **Free / self-hostable** — no Adobe Fonts, no per-pageview licensing, deployable on EU VPS.

---

## Candidate 1 — Outfit (display) + DM Sans (body) [current]

**What it is:** Outfit by Rodrigo Fuenzalida (2021); DM Sans by Colophon Foundry. Both on Google Fonts, both loaded via `next/font/google` in `layout.tsx`.

| Criterion | Assessment |
|---|---|
| Norwegian dominates | Partial pass. Outfit at large sizes is clean and present, but its high x-height and open geometry give it a "designed" quality. "Jeg spiser mat" in Outfit at 64px looks like a language-learning app trying to look modern, which is slightly wrong. |
| æ/ø/å at display weight | Pass. Extended Latin A/B coverage is good. The å ring is geometrically constructed (clean, slightly mechanical). The ø slash is diagonal. æ is a proper ligature. No failure modes. |
| Dark canvas readability | Pass. High x-height helps at large sizes. Renders crisply on dark. |
| Recedes without calling attention | Fail. Outfit has distinctive design choices visible at display weight — the `G` with a spur, the geometric proportions. Experienced eyes would recognize it as Outfit. It pulls attention subtly to itself. |
| Free / self-hostable | Pass. Google Fonts, SIL Open Font License. |

**Compound issue:** Outfit (geometric) and DM Sans (humanist) come from different design languages. At small sizes this tension is invisible. At the type scale this app needs — exercise prompt at 48px, label at 11px, body at 15px — the inconsistency becomes legible. Two families that don't share visual DNA introduce a resolved-vs-not-resolved feeling that undermines the "precise" aesthetic.

**Verdict: Marginal fail.** Functional but not optimal. The personality is too present; the pairing is slightly incoherent.

---

## Candidate 2 — IBM Plex Sans (single family, two weights)

**What it is:** IBM Plex Sans by Mike Abbink at Bold Monday (2017). IBM's corporate typeface. On Google Fonts; also available via GitHub under SIL Open Font License — fully self-hostable without Google dependency.

| Criterion | Assessment |
|---|---|
| Norwegian dominates | Pass. IBM Plex Sans is a "content typeface" — it was designed to present information, not to express a brand personality. Norwegian exercise text in IBM Plex Sans reads as content, not as typeset design. |
| æ/ø/å at display weight | Strong pass. IBM required comprehensive multilingual coverage for a global corporate typeface. The å, ø, æ characters were engineered with the same care as the Latin baseline. No optical collision between the å ring and the cap height. The ø slash is clean. |
| Dark canvas readability | Pass. IBM Plex Sans has higher stroke contrast than pure geometric sans-serifs. At 48–72px on dark, this contrast reads as solidity rather than heaviness. |
| Recedes without calling attention | Strong pass — and this is its strongest point. IBM Plex Sans is so intentionally neutral that it disappears into its content. The limitation: it can read as "corporate" or "clinical" in some contexts. For a coaching tool that positions itself as a serious tutor, this neutrality is precisely right. |
| Free / self-hostable | Pass. GitHub release, SIL license, can be self-hosted as static fonts on the VPS without Google DNS dependency. |

**Verdict: Pass on all criteria.** The strongest candidate on the "recedes" test. The risk is that "neutral" and "precise" edges toward "cold." For an app whose moat is personalization and remediation, cold is a risk worth naming. Norwegian exercise text in IBM Plex would feel correct — it would not feel warm.

---

## Candidate 3 — Schibsted Grotesk (single family, two weights)

**What it is:** Schibsted Grotesk, designed by Schibsted (the Norwegian media company that owns VG, Aftenposten, Finn.no, and several Scandinavian newspaper properties). Released on Google Fonts in 2022. Designed specifically for digital interfaces in the Scandinavian market.

| Criterion | Assessment |
|---|---|
| Norwegian dominates | Strong pass. This is the candidate where the criterion and the typeface are most directly aligned. Schibsted Grotesk was designed to present Scandinavian editorial content at scale. "Jeg spiser mat" at 64px in Schibsted Grotesk doesn't look like a language-learning exercise — it looks like a Norwegian headline. The learner will feel the language, not the font. |
| æ/ø/å at display weight | Best of the three. These characters were primary design requirements, not afterthoughts. The å ring has the most considered proportions of the three candidates — slightly more oval than mechanical, which reads as more natural at display weight. The ø slash has a diagonal angle that matches the typeface's optical rhythm. The æ is a true ligature that reads as a single glyph at all weights. These are glyphs designed by people who read Norwegian every day. |
| Dark canvas readability | Pass. Schibsted Grotesk has a slightly humanist quality within a broadly grotesque framework — the apertures are open enough that characters remain distinct at dark-background contrast levels. |
| Recedes without calling attention | Pass. Schibsted Grotesk has personality — it is not as neutral as IBM Plex — but the personality is specifically "Scandinavian editorial." For an app teaching Norwegian, this personality works *with* the content rather than against it. It does not call attention to itself as a typographic choice; it feels like a natural context for Norwegian text. |
| Free / self-hostable | Pass. Google Fonts, available via `next/font/google`. SIL Open Font License. |

**Weight range:** 400, 500, 600, 700, 800, 900. A single family with this range covers both display (700) and body (400–500) roles without introducing cross-family inconsistency.

**Verdict: Strong pass on all criteria.** Best fit for the specific product and language.

---

## Comparison summary

| | Norwegian dominates | æøå at display | Dark canvas | Recedes | Free/host |
|---|---|---|---|---|---|
| Outfit + DM Sans | Partial | Pass | Pass | Fail | Pass |
| IBM Plex Sans | Pass | Strong pass | Pass | Strong pass | Pass |
| Schibsted Grotesk | Strong pass | Best of three | Pass | Pass | Pass |

---

## Recommendation

**Schibsted Grotesk, single family, two weights.**

- Display: Schibsted Grotesk 700 — exercise prompts, headings, session titles
- Body: Schibsted Grotesk 400 — labels, supporting text, navigation items

A single family eliminates the cross-family tension that weakens the current Outfit + DM Sans pairing. The weight range (400–900) is sufficient. The choice is defensible on substance: a Norwegian media company's typeface, designed for digital interfaces in the Scandinavian market, treating æ/ø/å as primary design concerns. For an app where the primary test is "Norwegian text dominates the screen," the typeface that was built to present Norwegian text at scale is the correct answer.

The argument against: Schibsted Grotesk is less-known than IBM Plex, and choosing a Norwegian company's typeface for a Norwegian learning app could feel like a gimmick if it were announced. The counter: it is only a gimmick if it is explained. Used correctly, it is simply "the typeface where Norwegian looks right at display size," which is exactly the test.

IBM Plex Sans is the second choice. If IBM Plex were selected, the instruction would be: self-host the variable font directly from GitHub (avoiding the Google DNS dependency that adds a network request in production), and accept that the tone will skew slightly clinical compared to Schibsted.

**Do not keep Outfit + DM Sans.** It fails the "recedes" criterion and the cross-family inconsistency is a real compound problem at the type scale this app uses.

---

## Implementation note (for UI-1.0 approval only — no code changes yet)

The swap is two lines in `layout.tsx` — replace `Outfit` and `DM_Sans` imports with `Schibsted_Grotesk`. Variable names `--font-display` and `--font-body` stay the same; tailwind.config.ts and globals.css are untouched. This makes it a one-file change with no downstream class updates.
