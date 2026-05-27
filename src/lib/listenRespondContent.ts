import type { ErrorTag } from '@/types/taxonomy'

export interface ListenRespondQuestion {
  id: string
  question: string          // Norwegian question (large T1 display)
  questionEnglish: string   // Translation shown as subtitle
  expectedKeywords: string[] // Words a valid answer should contain (normalised lowercase)
  hint: string              // Short English coaching tip
  conceptId: string         // Concept this question exposes — MUST exist in the level's graph
  errorTag: ErrorTag        // Tag used when the user's answer misses
  audioUrl?: string
}

const AUDIO_BASE = '/audio/sentences'

const A1_QUESTIONS: ListenRespondQuestion[] = [
  {
    id: 'morning',
    question: 'Hva gjør du om morgenen?',
    questionEnglish: 'What do you do in the morning?',
    expectedKeywords: ['stå', 'opp', 'kaffe', 'frokost', 'spiser', 'drikker', 'dusjer'],
    hint: 'Beskriv morgenrutinen din.',
    conceptId: 'present-tense-regular',
    errorTag: 'verb-tense',
    audioUrl: `${AUDIO_BASE}/morning.mp3`,
  },
  {
    id: 'where-live',
    question: 'Hvor bor du?',
    questionEnglish: 'Where do you live?',
    expectedKeywords: ['bor', 'hus', 'leilighet', 'by', 'oslo', 'norge'],
    hint: 'Si hvor du bor.',
    conceptId: 'question-formation',
    errorTag: 'word-order',
    audioUrl: `${AUDIO_BASE}/where-live.mp3`,
  },
  {
    id: 'breakfast',
    question: 'Hva spiser du til frokost?',
    questionEnglish: 'What do you eat for breakfast?',
    expectedKeywords: ['spiser', 'brød', 'egg', 'havregrøt', 'frukt', 'yoghurt', 'frokost'],
    hint: 'Nevn noe du spiser om morgenen.',
    conceptId: 'present-tense-regular',
    errorTag: 'verb-tense',
    audioUrl: `${AUDIO_BASE}/breakfast.mp3`,
  },
  {
    id: 'name',
    question: 'Hva heter du?',
    questionEnglish: 'What is your name?',
    expectedKeywords: ['heter', 'navn', 'jeg', 'er'],
    hint: 'Si navnet ditt.',
    conceptId: 'personal-pronouns',
    errorTag: 'pronoun-choice',
    audioUrl: `${AUDIO_BASE}/name.mp3`,
  },
  {
    id: 'how-are-you',
    question: 'Hvordan har du det?',
    questionEnglish: 'How are you?',
    expectedKeywords: ['bra', 'fint', 'ok', 'godt', 'takk', 'dårlig'],
    hint: 'Beskriv hvordan du har det.',
    conceptId: 'question-formation',
    errorTag: 'word-order',
    audioUrl: `${AUDIO_BASE}/how-are-you.mp3`,
  },
  {
    id: 'job',
    question: 'Hva jobber du med?',
    questionEnglish: 'What do you do for work?',
    expectedKeywords: ['jobber', 'student', 'lærer', 'lege', 'ingeniør', 'kontor', 'skole'],
    hint: 'Si hva du jobber med eller at du er student.',
    conceptId: 'common-prepositions',
    errorTag: 'preposition',
    audioUrl: `${AUDIO_BASE}/job.mp3`,
  },
  {
    id: 'hobby',
    question: 'Hva liker du å gjøre på fritiden?',
    questionEnglish: 'What do you like to do in your free time?',
    expectedKeywords: ['liker', 'lese', 'løpe', 'spille', 'se', 'film', 'musikk', 'trene'],
    hint: 'Nevn noe du liker å gjøre.',
    conceptId: 'infinitive-form',
    errorTag: 'verb-tense',
    audioUrl: `${AUDIO_BASE}/hobby.mp3`,
  },
  {
    id: 'weekend',
    question: 'Hva liker du å gjøre i helgen?',
    questionEnglish: 'What do you like to do on the weekend?',
    expectedKeywords: ['liker', 'helg', 'helgen', 'gjøre'],
    hint: 'Beskriv hva du gjør i helgen.',
    conceptId: 'basic-adjectives',
    errorTag: 'verb-tense',
    audioUrl: '',
  },
]

const B1_QUESTIONS: ListenRespondQuestion[] = [
  {
    id: 'b1-past-experience',
    question: 'Fortell om noe du hadde gjort før du begynte å lære norsk.',
    questionEnglish: 'Tell me about something you had done before you started learning Norwegian.',
    expectedKeywords: ['hadde', 'lært', 'jobbet', 'studert', 'bodd', 'reist', 'snakket'],
    hint: 'Use "hadde + past participle" to describe a completed past action.',
    conceptId: 'past-perfect',
    errorTag: 'verb-tense',
    audioUrl: '',
  },
  {
    id: 'b1-opinion',
    question: 'Hva synes du er den vanskeligste delen av norsk grammatikk?',
    questionEnglish: 'What do you think is the hardest part of Norwegian grammar?',
    expectedKeywords: ['synes', 'tror', 'mener', 'vanskelig', 'grammatikk', 'ordstilling', 'verb'],
    hint: 'Give your opinion using "synes", "tror" or "mener".',
    conceptId: 'discourse-markers',
    errorTag: 'meaning-misunderstood',
    audioUrl: '',
  },
  {
    id: 'b1-wish',
    question: 'Hva skulle du ønske du kunne gjøre bedre på norsk?',
    questionEnglish: 'What do you wish you could do better in Norwegian?',
    expectedKeywords: ['skulle', 'ønske', 'kunne', 'snakke', 'skrive', 'forstå', 'lese'],
    hint: 'Use "skulle ønske jeg kunne..." to express a wish.',
    conceptId: 'subjunctive-equivalents',
    errorTag: 'modal-verb',
    audioUrl: '',
  },
  {
    id: 'b1-give-up',
    question: 'Har du noen gang gitt opp noe som var viktig for deg?',
    questionEnglish: 'Have you ever given up on something that was important to you?',
    expectedKeywords: ['gitt', 'opp', 'sluttet', 'prøvde', 'fortsatte', 'vanskelig', 'aldri'],
    hint: 'Use "gi opp" (to give up) and describe the situation.',
    conceptId: 'phrasal-verbs',
    errorTag: 'preposition',
    audioUrl: '',
  },
  {
    id: 'b1-formal-email',
    question: 'Hvordan ville du starte en formell e-post på norsk?',
    questionEnglish: 'How would you begin a formal email in Norwegian?',
    expectedKeywords: ['kjære', 'hei', 'viser', 'henvendelse', 'angående', 'skriver', 'hilsen'],
    hint: 'Think about formal opening phrases for written Norwegian.',
    conceptId: 'formal-informal-register',
    errorTag: 'wrong-word-same-category',
    audioUrl: '',
  },
  {
    id: 'b1-double-definite',
    question: 'Beskriv det flotteste stedet du har besøkt.',
    questionEnglish: 'Describe the most beautiful place you have visited.',
    expectedKeywords: ['den', 'det', 'de', 'store', 'vakre', 'flotte', 'beste', 'stedet'],
    hint: 'Use the double definite: "den vakre fjorden", "det store fjellet".',
    conceptId: 'double-definite',
    errorTag: 'adjective-agreement',
    audioUrl: '',
  },
  {
    id: 'b1-indirect-question',
    question: 'Vet du om det er mulig å lære seg norsk på ett år?',
    questionEnglish: 'Do you know whether it is possible to learn Norwegian in one year?',
    expectedKeywords: ['vet', 'lurer', 'om', 'mulig', 'tror', 'kanskje', 'år'],
    hint: 'Embed the yes/no question using "om": "Jeg lurer på om...".',
    conceptId: 'indirect-questions',
    errorTag: 'word-order',
    audioUrl: '',
  },
  {
    id: 'b1-idiom',
    question: 'Hva gjør du når du vil ta det med ro?',
    questionEnglish: 'What do you do when you want to take it easy?',
    expectedKeywords: ['ta', 'ro', 'slappe', 'av', 'hvile', 'lese', 'gå', 'tur'],
    hint: '"Ta det med ro" means to take it easy — describe what that looks like for you.',
    conceptId: 'idiomatic-expressions',
    errorTag: 'meaning-misunderstood',
    audioUrl: '',
  },
]

const B2_QUESTIONS: ListenRespondQuestion[] = [
  {
    id: 'b2-counterfactual',
    question: 'Hvis du hadde kunnet velge et annet yrke, hva ville du ha valgt?',
    questionEnglish: 'If you could have chosen a different career, what would you have chosen?',
    expectedKeywords: ['hadde', 'ville', 'valgt', 'blitt', 'kanskje', 'ønsket', 'drømt'],
    hint: 'Use "hvis jeg hadde... ville jeg ha..." for counterfactual conditions.',
    conceptId: 'subjunctive-mood',
    errorTag: 'verb-tense',
    audioUrl: '',
  },
  {
    id: 'b2-argumentation',
    question: 'Selv om klimaendringer er et globalt problem, hva kan enkeltpersoner gjøre?',
    questionEnglish: 'Even though climate change is a global problem, what can individuals do?',
    expectedKeywords: ['selv', 'om', 'likevel', 'derimot', 'kan', 'gjøre', 'bidra', 'redusere'],
    hint: 'Use "selv om" (even though) and contrast markers like "likevel" or "derimot".',
    conceptId: 'complex-argumentation',
    errorTag: 'word-order',
    audioUrl: '',
  },
  {
    id: 'b2-reported-speech',
    question: 'Hva sa læreren din at du måtte jobbe med?',
    questionEnglish: 'What did your teacher say you needed to work on?',
    expectedKeywords: ['sa', 'måtte', 'burde', 'skulle', 'jobbe', 'forbedre', 'øve'],
    hint: 'Report what was said: "Læreren sa at jeg måtte..." — notice the tense backshift.',
    conceptId: 'reported-speech-advanced',
    errorTag: 'verb-tense',
    audioUrl: '',
  },
  {
    id: 'b2-topicalize',
    question: 'Den boken du nevnte — har du lest den ferdig?',
    questionEnglish: 'That book you mentioned — have you finished reading it?',
    expectedKeywords: ['den', 'boken', 'lest', 'ferdig', 'ja', 'nei', 'nesten', 'holder'],
    hint: 'Respond naturally — notice how the topic is fronted for focus in the question.',
    conceptId: 'advanced-word-order',
    errorTag: 'word-order',
    audioUrl: '',
  },
  {
    id: 'b2-academic',
    question: 'Hva kan hevdes å være den viktigste faktoren for språklæring?',
    questionEnglish: 'What could be argued to be the most important factor in language learning?',
    expectedKeywords: ['hevdes', 'hevde', 'antyde', 'ifølge', 'forskning', 'viser', 'motivasjon'],
    hint: 'Use formal hedging verbs: "det kan hevdes at...", "ifølge forskning...".',
    conceptId: 'academic-writing',
    errorTag: 'wrong-word-same-category',
    audioUrl: '',
  },
  {
    id: 'b2-advanced-passive',
    question: 'Hvorfor holdes noen opplysninger tilbake i offentlige dokumenter?',
    questionEnglish: 'Why is some information withheld in public documents?',
    expectedKeywords: ['holdes', 'tilbake', 'beskytter', 'sikkerhet', 'personvern', 'loven', 'regler'],
    hint: 'The question uses an -s passive for habitual action — respond in kind.',
    conceptId: 'advanced-passive',
    errorTag: 'verb-conjugation',
    audioUrl: '',
  },
  {
    id: 'b2-professional',
    question: 'Hvordan ville du ta ordet i et møte på norsk?',
    questionEnglish: 'How would you take the floor in a meeting in Norwegian?',
    expectedKeywords: ['ta', 'ordet', 'vil', 'gjerne', 'legge', 'til', 'spørsmål', 'mener'],
    hint: 'Use meeting phrases: "Jeg vil gjerne ta ordet", "Jeg vil legge til at...".',
    conceptId: 'professional-norwegian',
    errorTag: 'meaning-misunderstood',
    audioUrl: '',
  },
  {
    id: 'b2-idiom-advanced',
    question: 'Har du noen gang måttet bite i det sure eplet?',
    questionEnglish: 'Have you ever had to bite the bullet (do something unpleasant)?',
    expectedKeywords: ['bite', 'eplet', 'måtte', 'gjøre', 'ubehagelig', 'valg', 'situasjon'],
    hint: '"Å bite i det sure eplet" means to bite the bullet — describe such a situation.',
    conceptId: 'norwegian-idioms',
    errorTag: 'meaning-misunderstood',
    audioUrl: '',
  },
]

/** @deprecated use getListenQuestions(level) instead */
export const LISTEN_RESPOND_QUESTIONS: ListenRespondQuestion[] = A1_QUESTIONS

/**
 * Returns the listen-respond question set appropriate for the learner's CEFR level.
 * Falls back to A1 questions for A2 and unknown levels.
 */
export function getListenQuestions(level: string): ListenRespondQuestion[] {
  if (level === 'B2') return B2_QUESTIONS
  if (level === 'B1') return B1_QUESTIONS
  return A1_QUESTIONS
}
