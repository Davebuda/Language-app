// The complete error taxonomy — every mistake gets exactly one tag

export type GrammarErrorTag =
  | 'word-order'           // V2 violation, SVO violation
  | 'verb-tense'           // wrong tense (present/past/perfect)
  | 'verb-conjugation'     // wrong verb form for person/number
  | 'noun-gender'          // en/ei/et gender error
  | 'article-use'          // definite/indefinite, wrong suffix
  | 'adjective-agreement'  // adjective not agreeing with noun gender/definiteness
  | 'pronoun-choice'       // wrong pronoun or case
  | 'preposition'          // wrong preposition
  | 'modal-verb'           // modal verb misuse
  | 'negation-placement'   // "ikke" in wrong position
  | 'compound-word';       // compound word formation error

export type VocabularyErrorTag =
  | 'wrong-word-same-category'    // false friend or near-synonym
  | 'wrong-word-different-category' // word not known at all
  | 'spelling';

export type ComprehensionErrorTag =
  | 'listening-recognition'    // couldn't parse spoken audio
  | 'reading-parsing'          // couldn't decode written sentence
  | 'meaning-misunderstood';   // recognized words but missed meaning

// Used when an answer is wrong but the sentence carries no detectable error tags
export type MetaErrorTag = 'unspecified';

export type ErrorTag = GrammarErrorTag | VocabularyErrorTag | ComprehensionErrorTag | MetaErrorTag;

export const GRAMMAR_ERROR_TAGS: GrammarErrorTag[] = [
  'word-order', 'verb-tense', 'verb-conjugation', 'noun-gender',
  'article-use', 'adjective-agreement', 'pronoun-choice', 'preposition',
  'modal-verb', 'negation-placement', 'compound-word',
];

export const VOCABULARY_ERROR_TAGS: VocabularyErrorTag[] = [
  'wrong-word-same-category', 'wrong-word-different-category', 'spelling',
];

export const COMPREHENSION_ERROR_TAGS: ComprehensionErrorTag[] = [
  'listening-recognition', 'reading-parsing', 'meaning-misunderstood',
];

export const ALL_ERROR_TAGS: ErrorTag[] = [
  ...GRAMMAR_ERROR_TAGS,
  ...VOCABULARY_ERROR_TAGS,
  ...COMPREHENSION_ERROR_TAGS,
  'unspecified',
];
