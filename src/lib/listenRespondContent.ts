export interface ListenRespondQuestion {
  id: string
  question: string          // Norwegian question (large T1 display)
  questionEnglish: string   // Translation shown as subtitle
  expectedKeywords: string[] // Words a valid answer should contain (normalised lowercase)
  hint: string              // Short English coaching tip
  audioUrl?: string         // optional — same pipeline as drills
}

export const LISTEN_RESPOND_QUESTIONS: ListenRespondQuestion[] = [
  {
    id: 'morning',
    question: 'Hva gjør du om morgenen?',
    questionEnglish: 'What do you do in the morning?',
    expectedKeywords: ['stå', 'opp', 'kaffe', 'frokost', 'spiser', 'drikker', 'dusjer'],
    hint: 'Describe your morning routine.',
  },
  {
    id: 'where-live',
    question: 'Hvor bor du?',
    questionEnglish: 'Where do you live?',
    expectedKeywords: ['bor', 'hus', 'leilighet', 'by', 'oslo', 'norge'],
    hint: 'Say where you live.',
  },
  {
    id: 'breakfast',
    question: 'Hva spiser du til frokost?',
    questionEnglish: 'What do you eat for breakfast?',
    expectedKeywords: ['spiser', 'brød', 'egg', 'havregrøt', 'frukt', 'yoghurt', 'frokost'],
    hint: 'Name something you eat in the morning.',
  },
  {
    id: 'name',
    question: 'Hva heter du?',
    questionEnglish: 'What is your name?',
    expectedKeywords: ['heter', 'navn', 'jeg', 'er'],
    hint: 'Say your name.',
  },
  {
    id: 'how-are-you',
    question: 'Hvordan har du det?',
    questionEnglish: 'How are you doing?',
    expectedKeywords: ['bra', 'fint', 'ok', 'godt', 'takk', 'dårlig'],
    hint: 'Describe how you feel.',
  },
  {
    id: 'job',
    question: 'Hva jobber du med?',
    questionEnglish: 'What do you do for work?',
    expectedKeywords: ['jobber', 'student', 'lærer', 'lege', 'ingeniør', 'kontor', 'skole'],
    hint: 'Name your job or say you are a student.',
  },
  {
    id: 'hobby',
    question: 'Hva liker du å gjøre på fritiden?',
    questionEnglish: 'What do you like to do in your free time?',
    expectedKeywords: ['liker', 'lese', 'løpe', 'spille', 'se', 'film', 'musikk', 'trene'],
    hint: 'Name something you enjoy.',
  },
]
