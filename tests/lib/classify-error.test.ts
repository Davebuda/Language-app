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
})
