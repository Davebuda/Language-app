import type { ErrorTag } from '@/types/taxonomy'

export interface ListenRespondQuestion {
  id: string
  question: string          // Norwegian question (large T1 display)
  questionEnglish: string   // Translation shown as subtitle
  expectedKeywords: string[] // Words a valid answer should contain (normalised lowercase)
  hint: string              // Short English coaching tip
  conceptId: string         // Concept this question exposes — MUST exist in a1/a2-graph.json
  errorTag: ErrorTag        // Tag used when the user's answer misses
  audioUrl?: string
}

const AUDIO_BASE = '/audio/sentences'

export const LISTEN_RESPOND_QUESTIONS: ListenRespondQuestion[] = [
  {
    id: 'morning',
    question: 'Hva gjør du om morgenen?',
    questionEnglish: 'Hva gjør du om morgenen?',
    expectedKeywords: ['stå', 'opp', 'kaffe', 'frokost', 'spiser', 'drikker', 'dusjer'],
    hint: 'Beskriv morgenrutinen din.',
    conceptId: 'present-tense-regular',
    errorTag: 'verb-tense',
    audioUrl: `${AUDIO_BASE}/morning.mp3`,
  },
  {
    id: 'where-live',
    question: 'Hvor bor du?',
    questionEnglish: 'Hvor bor du?',
    expectedKeywords: ['bor', 'hus', 'leilighet', 'by', 'oslo', 'norge'],
    hint: 'Si hvor du bor.',
    conceptId: 'question-formation',
    errorTag: 'word-order',
    audioUrl: `${AUDIO_BASE}/where-live.mp3`,
  },
  {
    id: 'breakfast',
    question: 'Hva spiser du til frokost?',
    questionEnglish: 'Hva spiser du til frokost?',
    expectedKeywords: ['spiser', 'brød', 'egg', 'havregrøt', 'frukt', 'yoghurt', 'frokost'],
    hint: 'Nevn noe du spiser om morgenen.',
    conceptId: 'present-tense-regular',
    errorTag: 'verb-tense',
    audioUrl: `${AUDIO_BASE}/breakfast.mp3`,
  },
  {
    id: 'name',
    question: 'Hva heter du?',
    questionEnglish: 'Hva heter du?',
    expectedKeywords: ['heter', 'navn', 'jeg', 'er'],
    hint: 'Si navnet ditt.',
    conceptId: 'personal-pronouns',
    errorTag: 'pronoun-choice',
    audioUrl: `${AUDIO_BASE}/name.mp3`,
  },
  {
    id: 'how-are-you',
    question: 'Hvordan har du det?',
    questionEnglish: 'Hvordan har du det?',
    expectedKeywords: ['bra', 'fint', 'ok', 'godt', 'takk', 'dårlig'],
    hint: 'Beskriv hvordan du har det.',
    conceptId: 'question-formation',
    errorTag: 'word-order',
    audioUrl: `${AUDIO_BASE}/how-are-you.mp3`,
  },
  {
    id: 'job',
    question: 'Hva jobber du med?',
    questionEnglish: 'Hva jobber du med?',
    expectedKeywords: ['jobber', 'student', 'lærer', 'lege', 'ingeniør', 'kontor', 'skole'],
    hint: 'Si hva du jobber med eller at du er student.',
    conceptId: 'common-prepositions',
    errorTag: 'preposition',
    audioUrl: `${AUDIO_BASE}/job.mp3`,
  },
  {
    id: 'hobby',
    question: 'Hva liker du å gjøre på fritiden?',
    questionEnglish: 'Hva liker du å gjøre på fritiden?',
    expectedKeywords: ['liker', 'lese', 'løpe', 'spille', 'se', 'film', 'musikk', 'trene'],
    hint: 'Nevn noe du liker å gjøre.',
    conceptId: 'infinitive-form',
    errorTag: 'verb-tense',
    audioUrl: `${AUDIO_BASE}/hobby.mp3`,
  },
]
