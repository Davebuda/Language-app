import type { Sentence } from '@/types/content'

export const MOCK_SENTENCES: Record<string, Sentence> = {
  'mock-s1': {
    id: 'mock-s1',
    norwegian: 'Jeg har en bil.',
    english: 'I have a car.',
    conceptIds: ['noun-gender', 'indefinite-articles'],
    vocabularyClusters: ['everyday-objects'],
    errorTagsDetectable: ['noun-gender', 'article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'translation-to-norwegian', 'fill-in-blank'],
  },
  'mock-s2': {
    id: 'mock-s2',
    norwegian: 'Hun er en lege.',
    english: 'She is a doctor.',
    conceptIds: ['noun-gender', 'indefinite-articles'],
    vocabularyClusters: ['people-family'],
    errorTagsDetectable: ['noun-gender', 'article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'fill-in-blank'],
  },
  'mock-s3': {
    id: 'mock-s3',
    norwegian: 'Vi spiser et eple.',
    english: 'We are eating an apple.',
    conceptIds: ['noun-gender', 'indefinite-articles'],
    vocabularyClusters: ['food-drink'],
    errorTagsDetectable: ['noun-gender', 'article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'translation-to-norwegian'],
  },
  'mock-s4': {
    id: 'mock-s4',
    norwegian: 'Bilen er rød.',
    english: 'The car is red.',
    conceptIds: ['definite-articles-singular'],
    vocabularyClusters: ['everyday-objects'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'fill-in-blank'],
  },
  'mock-s5': {
    id: 'mock-s5',
    norwegian: 'Eplet er gult.',
    english: 'The apple is yellow.',
    conceptIds: ['definite-articles-singular'],
    vocabularyClusters: ['food-drink'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'fill-in-blank'],
  },
  'mock-s6': {
    id: 'mock-s6',
    norwegian: 'Huset er stort.',
    english: 'The house is big.',
    conceptIds: ['definite-articles-singular'],
    vocabularyClusters: ['everyday-objects'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'translation-to-norwegian'],
  },
  'mock-s7': {
    id: 'mock-s7',
    norwegian: 'De har mange biler.',
    english: 'They have many cars.',
    conceptIds: ['plural-formation'],
    vocabularyClusters: ['everyday-objects'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 2,
    exerciseTypes: ['translation-to-english', 'fill-in-blank'],
  },
  'mock-s8': {
    id: 'mock-s8',
    norwegian: 'Jeg ser to hunder.',
    english: 'I see two dogs.',
    conceptIds: ['plural-formation'],
    vocabularyClusters: ['animals'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: ['translation-to-english', 'translation-to-norwegian'],
  },
  'mock-s9': {
    id: 'mock-s9',
    norwegian: 'Et barn leker i parken.',
    english: 'A child plays in the park.',
    conceptIds: ['noun-gender', 'indefinite-articles'],
    vocabularyClusters: ['people-family'],
    errorTagsDetectable: ['noun-gender', 'article-use'],
    cefrLevel: 'A1',
    difficulty: 2,
    exerciseTypes: ['translation-to-english', 'word-order'],
  },
  'mock-s10': {
    id: 'mock-s10',
    norwegian: 'Husene er nye.',
    english: 'The houses are new.',
    conceptIds: ['definite-articles-plural', 'plural-formation'],
    vocabularyClusters: ['everyday-objects'],
    errorTagsDetectable: ['article-use'],
    cefrLevel: 'A1',
    difficulty: 2,
    exerciseTypes: ['translation-to-english', 'fill-in-blank'],
  },
}

// conceptId → array of sentence IDs (for generateSession)
export const MOCK_SENTENCE_IDS: Record<string, string[]> = Object.values(MOCK_SENTENCES).reduce<
  Record<string, string[]>
>((acc, sentence) => {
  for (const conceptId of sentence.conceptIds) {
    acc[conceptId] = [...(acc[conceptId] ?? []), sentence.id]
  }
  return acc
}, {})
