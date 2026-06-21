import { describe, it, expect } from 'vitest'
import { classifyError } from '@/lib/classify-error'

describe('classifyError — observed-error tagging', () => {
  it('detects word-order from a token reorder (high-confidence, ignores candidates)', () => {
    expect(classifyError('er jeg glad', 'jeg er glad', 'translation-to-norwegian', [])).toBe('word-order')
    // even when the sentence authored something else, a clear reorder wins
    expect(classifyError('er jeg glad', 'jeg er glad', 'translation-to-norwegian', ['preposition'])).toBe('word-order')
  })

  it('detects article-use from an en/et/ei swap', () => {
    expect(classifyError('et hund', 'en hund', 'fill-in-blank', ['noun-gender', 'article-use'])).toBe('article-use')
  })

  it('detects adjective-agreement from an adjective ending diff when authored', () => {
    expect(classifyError('et stor hus', 'et stort hus', 'translation-to-norwegian', ['adjective-agreement'])).toBe('adjective-agreement')
  })

  it('detects verb-tense from a verb-form diff', () => {
    expect(classifyError('jeg spiste', 'jeg spiser', 'translation-to-norwegian', ['verb-tense'])).toBe('verb-tense')
  })

  it('detects a misplaced negation (inserted ikke)', () => {
    expect(classifyError('jeg liker ikke det', 'jeg liker det', 'translation-to-norwegian', [])).toBe('negation-placement')
  })

  it('detects pronoun-choice from a pronoun swap', () => {
    expect(classifyError('han ser ham', 'han ser henne', 'translation-to-norwegian', ['pronoun-choice'])).toBe('pronoun-choice')
  })

  it('detects spelling from a small edit distance (high-confidence)', () => {
    expect(classifyError('jeg snakekr norsk', 'jeg snakker norsk', 'translation-to-norwegian', ['word-order'])).toBe('spelling')
  })

  it('detects compound split (særskrivning) high-confidence, regardless of authored tags', () => {
    // learner split the compound: "kjøkken benk" → "kjøkkenbenk"
    expect(classifyError('jeg vil ha en kjøkken benk', 'jeg vil ha en kjøkkenbenk', 'translation-to-norwegian', ['word-order'])).toBe('compound-word')
    // reverse: learner joined what should be two words
    expect(classifyError('en lastebil sjåfør', 'en lastebilsjåfør', 'translation-to-norwegian', [])).toBe('compound-word')
  })

  it('does not false-flag a genuine inserted word as a compound', () => {
    // "går hjem" vs "går" — a real extra token, no concatenation match
    expect(classifyError('jeg går hjem nå', 'jeg går nå', 'translation-to-norwegian', [])).not.toBe('compound-word')
  })

  it('defers a murky single-word substitution to the authored candidate', () => {
    // på vs til: not article/pronoun/modal/negation/adj/verb/spelling → wrong-word (low confidence)
    expect(classifyError('jeg går på skolen', 'jeg går til skolen', 'translation-to-norwegian', ['preposition'])).toBe('preposition')
  })

  it('returns wrong-word-same-category for a murky swap when nothing is authored', () => {
    expect(classifyError('jeg går på skolen', 'jeg går til skolen', 'translation-to-norwegian', [])).toBe('wrong-word-same-category')
  })

  it('falls back to authored tag when the diff is too ambiguous to read', () => {
    expect(classifyError('helt feil svar her', 'dette er riktig nå', 'translation-to-norwegian', ['preposition'])).toBe('preposition')
  })

  it('uses comprehension defaults when no signal and no candidates', () => {
    expect(classifyError('helt feil svar her', 'dette er riktig nå', 'listening-comprehension', [])).toBe('listening-recognition')
  })

  it('returns unspecified only when there is genuinely nothing to go on', () => {
    expect(classifyError('helt feil svar her', 'dette er riktig nå', 'translation-to-norwegian', [])).toBe('unspecified')
  })

  it('never crashes on empty user answer; defers to authored', () => {
    expect(classifyError('', 'jeg er glad', 'fill-in-blank', ['article-use'])).toBe('article-use')
  })

  // p6 W4 — modal-verb / pronoun-choice / negation-placement promoted to
  // HIGH_CONFIDENCE: a clean closed-class single swap is now trusted even when it
  // contradicts the sentence's authored tag (B2 authors 0 pronoun/0 modal tags,
  // so these were previously discarded and mislabelled as word-order).
  it('trusts modal-verb over an authored tag (clean modal swap)', () => {
    expect(classifyError('jeg kan gå', 'jeg må gå', 'translation-to-norwegian', ['word-order'])).toBe('modal-verb')
  })

  it('trusts pronoun-choice over an authored tag (clean pronoun swap)', () => {
    expect(classifyError('han ser ham', 'han ser henne', 'translation-to-norwegian', ['word-order'])).toBe('pronoun-choice')
  })

  it('trusts negation-placement over an authored tag for a clean negation-for-negation swap', () => {
    expect(classifyError('jeg går aldri', 'jeg går ikke', 'translation-to-norwegian', ['word-order'])).toBe('negation-placement')
  })

  it('tightened negation: a negation-for-non-negation swap is NOT negation-placement', () => {
    // only one side is a negation → lexical/meaning error, falls through (no false placement flag)
    expect(classifyError('jeg sier ikke', 'jeg sier ja', 'translation-to-norwegian', [])).not.toBe('negation-placement')
    expect(classifyError('jeg sier ikke', 'jeg sier ja', 'translation-to-norwegian', [])).toBe('wrong-word-same-category')
  })

  // p6 — wrong-word-different-category via the deterministic POS lexicon (pos-map.ts):
  // a single-token swap between two KNOWN words with DISJOINT part-of-speech sets.
  it('detects wrong-word-different-category from a disjoint-POS swap, trusted over authored', () => {
    // raskt (adj) typed where sykkel (noun) belongs — disjoint POS, high-confidence
    expect(classifyError('jeg kjøpte raskt', 'jeg kjøpte sykkel', 'translation-to-norwegian', ['word-order'])).toBe('wrong-word-different-category')
    // preposition where a noun belongs
    expect(classifyError('han leser på', 'han leser bok', 'translation-to-norwegian', [])).toBe('wrong-word-different-category')
  })

  it('does NOT claim different-category when POS sets overlap (same category)', () => {
    // sykkel and bok are both nouns → overlap → same-category, not different
    expect(classifyError('jeg fant en sykkel', 'jeg fant en bok', 'translation-to-norwegian', [])).toBe('wrong-word-same-category')
  })

  it('is OOV-safe: an unknown word never yields wrong-word-different-category', () => {
    expect(classifyError('jeg fant en blarghx', 'jeg fant en bok', 'translation-to-norwegian', [])).not.toBe('wrong-word-different-category')
  })
})
