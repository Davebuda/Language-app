import type { MistakeFingerprint, CEFRLevel } from '@/types/fingerprint'

// ── Norwegian concept-label dict ─────────────────────────────────────────────
// Lives here (not on the ConceptGraph json) per architect D5: a local dict is
// the Phase-3-scoped move; a `labelNo` field on the graph is the long-term
// answer but is Phase-F scope (content authoring). Missing-concept fallback
// returns the daily prompt — never English-in-Norwegian (silent-substitution
// prevention per Operating Rule 6).

export const NORWEGIAN_CONCEPT_LABELS: Record<string, string> = {
  // A1
  'personal-pronouns': 'personlige pronomen',
  'noun-gender': 'substantivgenus (en/ei/et)',
  'to-be-verb': "verbet 'å være'",
  'numbers-basic': 'tallene 0–100',
  'common-prepositions': 'vanlige preposisjoner',
  'indefinite-articles': 'ubestemt artikkel (en/ei/et)',
  'plural-formation': 'flertall',
  'definite-articles-singular': 'bestemt form entall',
  'definite-articles-plural': 'bestemt form flertall',
  'present-tense-regular': 'presens av regelmessige verb',
  'infinitive-form': 'infinitivsform',
  'to-have-verb': "verbet 'å ha'",
  'svo-word-order': 'SVO-ordstilling',
  'v2-word-order': 'V2-ordstilling',
  negation: "nektelse med 'ikke'",
  'question-formation': 'spørsmålsformulering',
  'basic-adjectives': 'grunnleggende adjektiver',
  'adjective-agreement': 'adjektivbøying',
  'common-modal-verbs': 'modalverb (kan, vil, skal, må)',
  'preterite-regular': 'preteritum av regelmessige verb',
  'preterite-irregular-core': 'preteritum av sterke verb',
  'possessive-pronouns': 'eiendomspronomen',
  // A2
  'perfect-tense': 'presens perfektum (har + partisipp)',
  'future-constructions': 'fremtidsformer (skal, vil, kommer til å)',
  'passive-voice': 'passiv (-s og bli-passiv)',
  'comparative-adjectives': 'komparativ av adjektiver',
  'superlative-adjectives': 'superlativ av adjektiver',
  'reflexive-verbs': 'refleksive verb',
  'object-pronouns': 'objektspronomen (meg, deg, ham, henne)',
  'subordinate-clauses': 'leddsetninger (at, fordi, når, hvis)',
  'relative-clauses': "relativsetninger ('som')",
  conjunctions: 'konjunksjoner',
  'advanced-prepositions': 'preposisjoner og preposisjonsfraser',
  'time-expressions': 'tidsuttrykk',
  'modal-verbs-advanced': 'modalverb (burde, trenge, tørre, orke)',
  'preterite-irregular-advanced': 'preteritum av sterke verb (utvidet)',
  'indirect-speech': 'indirekte tale',
  'conditional-clauses': 'vilkårssetninger (hvis/om)',
  'sentence-adverbials': 'setningsadverbialer',
  genitive: 'genitiv med -s',
  'infinitive-clauses': 'infinitivskonstruksjoner',
  'word-formation': 'ordlaging og sammensatte ord',
  'numerals-advanced': 'tall (ordenstall, brøk, store tall)',
  imperative: 'imperativ',
}

// ── Daily fallback prompts ───────────────────────────────────────────────────
// Moved here from WritingEditor.tsx as part of Stream 5.5 Phase 3 — the journal
// surface now owns its prompt selection through getJournalPrompt; getDailyPrompt
// is the unbiased fallback when no weekly focus exists OR no Norwegian label
// is available for the focus concept.

export const FALLBACK_PROMPTS: Record<CEFRLevel, string[]> = {
  A1: [
    'Skriv 3 setninger om familien din',
    'Skriv 3 setninger om hva du liker å spise',
    'Skriv 3 setninger om hva du gjør i dag',
    'Skriv 3 setninger om været der du bor',
    'Skriv 3 setninger om favorittfargen din',
  ],
  A2: [
    'Beskriv din ideelle norske helg',
    'Beskriv et sted du vil besøke i Norge',
    'Beskriv deg selv på norsk',
    'Beskriv hva du liker best med vinteren',
    'Beskriv en vanlig dag i livet ditt',
  ],
  B1: [
    'Skriv et avsnitt der du bruker presens perfektum minst tre ganger',
    'Skriv et avsnitt der du beskriver noe du ønsker å gjøre, med modalverb',
    'Skriv et avsnitt om en reise du har tatt, med fortid og perfektum',
    'Skriv et avsnitt der du sammenligner to byer i Norge',
    'Skriv et avsnitt der du forklarer en mening med fordi-setninger',
  ],
  B2: [
    'Skriv et avsnitt der du bruker presens perfektum minst tre ganger',
    'Skriv et avsnitt der du beskriver noe du ønsker å gjøre, med modalverb',
    'Skriv et avsnitt om en reise du har tatt, med fortid og perfektum',
    'Skriv et avsnitt der du sammenligner to byer i Norge',
    'Skriv et avsnitt der du forklarer en mening med fordi-setninger',
  ],
}

export function getDailyPrompt(now: Date = new Date(), level: CEFRLevel = 'A1'): string {
  const prompts = FALLBACK_PROMPTS[level]
  return prompts[now.getDay() % prompts.length]
}

// ── Journal prompt selection ─────────────────────────────────────────────────

export interface JournalPrompt {
  prompt: string
  focusConceptId: string | null   // null when daily fallback fired
  focusLabel: string | null       // Norwegian label for chip display; null when daily fallback fired
}

/**
 * Pick the journal prompt for this session.
 *
 * D2 — live-lowest decayedScore from `weeklyFocus`, not `weeklyFocus[0]`.
 * The week's "weakest" drifts during the week as the user practises; this
 * suggests the concept that CURRENTLY needs work.
 *
 * D5 — if the live-lowest focus concept has no Norwegian label, fall back to
 * the daily prompt. Silent English-in-Norwegian rendering is the failure mode
 * we explicitly prevent (Operating Rule 6).
 *
 * Pure: no side effects.
 */
export function getJournalPrompt(
  fp: MistakeFingerprint,
  now: Date = new Date(),
): JournalPrompt {
  const level: CEFRLevel = fp.currentLevel ?? 'A1'
  const dailyFallback: JournalPrompt = {
    prompt: getDailyPrompt(now, level),
    focusConceptId: null,
    focusLabel: null,
  }

  if (!fp.weeklyFocus || fp.weeklyFocus.length === 0) return dailyFallback

  // Live-lowest decayedScore. A concept with no mastery entry is treated as 0
  // (weakest) — the engine hasn't seen it yet, so it's a candidate for focus.
  const ranked = fp.weeklyFocus
    .map((id) => ({ id, score: fp.conceptMastery[id]?.decayedScore ?? 0 }))
    .sort((a, b) => a.score - b.score)

  const lowest = ranked[0]
  if (!lowest) return dailyFallback

  const label = NORWEGIAN_CONCEPT_LABELS[lowest.id]
  if (!label) return dailyFallback // silent English-in-Norwegian prevention

  const focusedPrompt: Record<CEFRLevel, string> = {
    A1: `Skriv 3 setninger der du bruker '${label}'.`,
    A2: `Beskriv noe du liker, og bruk '${label}' minst to ganger.`,
    B1: `Skriv et avsnitt der du bruker '${label}' minst tre ganger.`,
    B2: `Skriv et avsnitt der du bruker '${label}' minst tre ganger.`,
  }

  return {
    prompt: focusedPrompt[level],
    focusConceptId: lowest.id,
    focusLabel: label,
  }
}

// ── Error sort (focus-first, stable) ─────────────────────────────────────────

/**
 * D4 — silent sort focus errors to the top of the rendered error list. No
 * visual highlight, no chip — focus errors aren't "more wrong" than non-focus
 * errors, they're just what the user is actively working on. Stable
 * partition: focus errors keep their original relative order; non-focus
 * errors keep theirs.
 *
 * Generic over the error shape so it's reusable. Caller passes a predicate
 * deciding "is this error focus" — this avoids coupling journal-prompts to
 * the errorTag-to-concept mapping module.
 */
export function sortErrorsByFocus<T>(
  errors: T[],
  isFocus: (error: T) => boolean,
): T[] {
  const focus: T[] = []
  const other: T[] = []
  for (const e of errors) {
    if (isFocus(e)) focus.push(e)
    else other.push(e)
  }
  return [...focus, ...other]
}
