/**
 * Norwegian labels for the error-tag taxonomy, keyed by errorTag.
 *
 * Single source of truth so the session-complete repair list and the Profile
 * "Tilbakevendende feil" panel show identical learner-facing wording. Callers
 * fall back to the raw tag when a key is absent.
 */
export const ERROR_TAG_LABELS: Partial<Record<string, string>> = {
  'word-order': 'Ordstilling',
  'verb-tense': 'Verbtid',
  'verb-conjugation': 'Verbform',
  'noun-gender': 'Substantivkjønn',
  'article-use': 'Artikkelbruk',
  'adjective-agreement': 'Adjektivsamsvar',
  'pronoun-choice': 'Pronomen',
  preposition: 'Preposisjon',
  'modal-verb': 'Modalverb',
  'negation-placement': 'Negasjon',
  'compound-word': 'Sammensatt ord',
  spelling: 'Stavefeil',
  'wrong-word-same-category': 'Feil ord',
  'wrong-word-different-category': 'Feil ord',
  'meaning-misunderstood': 'Misforstått betydning',
  'listening-recognition': 'Lytteforståelse',
  'reading-parsing': 'Leseforståelse',
  unspecified: 'Grammatikk',
}
