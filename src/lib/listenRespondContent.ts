import type { ErrorTag } from '@/types/taxonomy'

export interface ListenRespondQuestion {
  id: string
  question: string          // Norwegian question (large T1 display)
  questionEnglish: string   // Translation shown as subtitle
  expectedKeywords: string[] // Words a valid answer should contain (normalised lowercase)
  hint: string              // Short English coaching tip
  conceptId: string         // Concept this question exposes — MUST exist in a1/a2-graph.json
  errorTag: ErrorTag        // Tag used when the user's answer misses
  audioUrl?: string         // optional — Stream 3 batch audio pipeline will populate
}

export const LISTEN_RESPOND_QUESTIONS: ListenRespondQuestion[] = [
  {
    id: 'morning',
    question: 'Hva gjør du om morgenen?',
    questionEnglish: 'What do you do in the morning?',
    expectedKeywords: ['stå', 'opp', 'kaffe', 'frokost', 'spiser', 'drikker', 'dusjer'],
    hint: 'Describe your morning routine.',
    conceptId: 'present-tense-regular',
    errorTag: 'verb-tense',
  },
  {
    id: 'where-live',
    question: 'Hvor bor du?',
    questionEnglish: 'Where do you live?',
    expectedKeywords: ['bor', 'hus', 'leilighet', 'by', 'oslo', 'norge'],
    hint: 'Say where you live.',
    conceptId: 'question-formation',
    errorTag: 'word-order',
  },
  {
    id: 'breakfast',
    question: 'Hva spiser du til frokost?',
    questionEnglish: 'What do you eat for breakfast?',
    expectedKeywords: ['spiser', 'brød', 'egg', 'havregrøt', 'frukt', 'yoghurt', 'frokost'],
    hint: 'Name something you eat in the morning.',
    conceptId: 'present-tense-regular',
    errorTag: 'verb-tense',
  },
  {
    id: 'name',
    question: 'Hva heter du?',
    questionEnglish: 'What is your name?',
    expectedKeywords: ['heter', 'navn', 'jeg', 'er'],
    hint: 'Say your name.',
    conceptId: 'personal-pronouns',
    errorTag: 'pronoun-choice',
  },
  {
    id: 'how-are-you',
    question: 'Hvordan har du det?',
    questionEnglish: 'How are you doing?',
    expectedKeywords: ['bra', 'fint', 'ok', 'godt', 'takk', 'dårlig'],
    hint: 'Describe how you feel.',
    conceptId: 'question-formation',
    errorTag: 'word-order',
  },
  {
    id: 'job',
    question: 'Hva jobber du med?',
    questionEnglish: 'What do you do for work?',
    expectedKeywords: ['jobber', 'student', 'lærer', 'lege', 'ingeniør', 'kontor', 'skole'],
    hint: 'Name your job or say you are a student.',
    conceptId: 'common-prepositions',
    errorTag: 'preposition',
  },
  {
    id: 'hobby',
    question: 'Hva liker du å gjøre på fritiden?',
    questionEnglish: 'What do you like to do in your free time?',
    expectedKeywords: ['liker', 'lese', 'løpe', 'spille', 'se', 'film', 'musikk', 'trene'],
    hint: 'Name something you enjoy.',
    conceptId: 'infinitive-form',
    errorTag: 'verb-tense',
  },
]
