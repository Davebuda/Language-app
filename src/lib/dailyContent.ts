export type GrammarRule = {
  title: string
  norwegianExample: string
  englishTranslation: string
  ruleExplanation: string
}

const RULES: GrammarRule[] = [
  {
    // 0 — V2 word order
    title: 'V2 Word Order',
    norwegianExample: 'I morgen reiser jeg til Bergen.',
    englishTranslation: 'Tomorrow I travel to Bergen.',
    ruleExplanation:
      'In Norwegian, the verb is always the second element in a sentence, even when an adverb starts the clause.',
  },
  {
    // 1 — Noun gender (en/et)
    title: 'Noun Gender (en/et)',
    norwegianExample: 'En mann og et barn gikk i parken.',
    englishTranslation: 'A man and a child walked in the park.',
    ruleExplanation:
      'Norwegian nouns are either masculine (en) or neuter (et). Memorize the article with each noun.',
  },
  {
    // 2 — Definite form (-en/-et)
    title: 'Definite Form (-en/-et)',
    norwegianExample: 'Hunden leker i hagen.',
    englishTranslation: 'The dog is playing in the garden.',
    ruleExplanation:
      'To say "the" in Norwegian, add -en to masculine nouns and -et to neuter nouns at the end of the word.',
  },
  {
    // 3 — Adjective agreement
    title: 'Adjective Agreement',
    norwegianExample: 'Det store huset er rødt.',
    englishTranslation: 'The big house is red.',
    ruleExplanation:
      'Adjectives must agree with the noun\'s gender and definiteness — stort for neuter, store for definite.',
  },
  {
    // 4 — Prepositions (i/på)
    title: 'Prepositions (i/på)',
    norwegianExample: 'Jeg bor i Oslo, men jobber på kontoret.',
    englishTranslation: 'I live in Oslo, but work at the office.',
    ruleExplanation:
      'Use i for cities, countries, and enclosed spaces; use på for surfaces, islands, and workplaces.',
  },
  {
    // 5 — Reflexive verbs
    title: 'Reflexive Verbs',
    norwegianExample: 'Hun vasker seg og kler på seg om morgenen.',
    englishTranslation: 'She washes and gets dressed in the morning.',
    ruleExplanation:
      'Reflexive verbs use seg to show the action refers back to the subject — like "herself" or "himself" in English.',
  },
  {
    // 6 — Question formation
    title: 'Question Formation',
    norwegianExample: 'Hvem er du, og hva heter du?',
    englishTranslation: 'Who are you, and what is your name?',
    ruleExplanation:
      'Norwegian question words — hva (what), hvem (who), hvor (where), når (when) — come first, followed by the verb.',
  },
]

export function getDailyRule(): GrammarRule {
  return RULES[new Date().getDate() % 7]
}

export type DailyWord = {
  norwegian: string
  english: string
  exampleSentence: string
  wordClass: string
}

const WORD_PACKS: DailyWord[][] = [
  // Pack 0 — Daily routines
  [
    { norwegian: 'stå opp', english: 'get up', exampleSentence: 'Jeg står opp klokken syv.', wordClass: 'verb' },
    { norwegian: 'frokost', english: 'breakfast', exampleSentence: 'Vi spiser frokost sammen.', wordClass: 'noun' },
    { norwegian: 'jobbe', english: 'work', exampleSentence: 'Han jobber hjemmefra i dag.', wordClass: 'verb' },
    { norwegian: 'trøtt', english: 'tired', exampleSentence: 'Jeg er veldig trøtt om morgenen.', wordClass: 'adjective' },
    { norwegian: 'dusje', english: 'shower', exampleSentence: 'Hun dusjer alltid før jobb.', wordClass: 'verb' },
    { norwegian: 'kveld', english: 'evening', exampleSentence: 'Vi slapper av om kvelden.', wordClass: 'noun' },
  ],
  // Pack 1 — Common verbs
  [
    { norwegian: 'snakke', english: 'speak', exampleSentence: 'Kan du snakke saktere?', wordClass: 'verb' },
    { norwegian: 'forstå', english: 'understand', exampleSentence: 'Jeg forstår ikke alt ennå.', wordClass: 'verb' },
    { norwegian: 'hjelpe', english: 'help', exampleSentence: 'Vil du hjelpe meg?', wordClass: 'verb' },
    { norwegian: 'lære', english: 'learn', exampleSentence: 'Vi lærer norsk sammen.', wordClass: 'verb' },
    { norwegian: 'huske', english: 'remember', exampleSentence: 'Husker du det?', wordClass: 'verb' },
    { norwegian: 'glemme', english: 'forget', exampleSentence: 'Jeg glemmer alltid nøklene mine.', wordClass: 'verb' },
  ],
  // Pack 2 — Emotions
  [
    { norwegian: 'glad', english: 'happy', exampleSentence: 'Hun er veldig glad i dag.', wordClass: 'adjective' },
    { norwegian: 'lei seg', english: 'sad', exampleSentence: 'Han er lei seg for det.', wordClass: 'adjective' },
    { norwegian: 'overrasket', english: 'surprised', exampleSentence: 'Jeg er overrasket over nyheten.', wordClass: 'adjective' },
    { norwegian: 'nervøs', english: 'nervous', exampleSentence: 'Er du nervøs for prøven?', wordClass: 'adjective' },
    { norwegian: 'rolig', english: 'calm', exampleSentence: 'Prøv å være rolig.', wordClass: 'adjective' },
    { norwegian: 'spent', english: 'excited', exampleSentence: 'Barna er spent på ferien.', wordClass: 'adjective' },
  ],
  // Pack 3 — Food
  [
    { norwegian: 'middag', english: 'dinner', exampleSentence: 'Vi lager middag klokken seks.', wordClass: 'noun' },
    { norwegian: 'grønnsaker', english: 'vegetables', exampleSentence: 'Spis flere grønnsaker!', wordClass: 'noun' },
    { norwegian: 'drikke', english: 'drink', exampleSentence: 'Vil du drikke noe?', wordClass: 'verb' },
    { norwegian: 'sulten', english: 'hungry', exampleSentence: 'Jeg er veldig sulten nå.', wordClass: 'adjective' },
    { norwegian: 'smake', english: 'taste', exampleSentence: 'Kan jeg smake?', wordClass: 'verb' },
    { norwegian: 'matbutikk', english: 'grocery store', exampleSentence: 'Jeg går i matbutikken i dag.', wordClass: 'noun' },
  ],
  // Pack 4 — Travel
  [
    { norwegian: 'reise', english: 'travel', exampleSentence: 'Vi reiser til Bergen neste uke.', wordClass: 'verb' },
    { norwegian: 'flyplass', english: 'airport', exampleSentence: 'Er flyplassen langt unna?', wordClass: 'noun' },
    { norwegian: 'hotell', english: 'hotel', exampleSentence: 'Hotellet er i sentrum.', wordClass: 'noun' },
    { norwegian: 'kart', english: 'map', exampleSentence: 'Har du et kart?', wordClass: 'noun' },
    { norwegian: 'billett', english: 'ticket', exampleSentence: 'Jeg har to billetter.', wordClass: 'noun' },
    { norwegian: 'fin', english: 'nice', exampleSentence: 'Det er et fint land.', wordClass: 'adjective' },
  ],
  // Pack 5 — Common adjectives
  [
    { norwegian: 'stor', english: 'big', exampleSentence: 'Det er et stort hus.', wordClass: 'adjective' },
    { norwegian: 'liten', english: 'small', exampleSentence: 'Katten er liten og søt.', wordClass: 'adjective' },
    { norwegian: 'ny', english: 'new', exampleSentence: 'Jeg har en ny bil.', wordClass: 'adjective' },
    { norwegian: 'gammel', english: 'old', exampleSentence: 'Det er et gammelt hus.', wordClass: 'adjective' },
    { norwegian: 'viktig', english: 'important', exampleSentence: 'Det er viktig å øve.', wordClass: 'adjective' },
    { norwegian: 'enkel', english: 'simple', exampleSentence: 'Det er en enkel oppgave.', wordClass: 'adjective' },
  ],
  // Pack 6 — Describing people/things
  [
    { norwegian: 'hyggelig', english: 'friendly', exampleSentence: 'Han er veldig hyggelig.', wordClass: 'adjective' },
    { norwegian: 'flink', english: 'skilled', exampleSentence: 'Du er flink til å snakke norsk.', wordClass: 'adjective' },
    { norwegian: 'interessant', english: 'interesting', exampleSentence: 'Det er en interessant bok.', wordClass: 'adjective' },
    { norwegian: 'morsom', english: 'funny', exampleSentence: 'Hun er veldig morsom.', wordClass: 'adjective' },
    { norwegian: 'kjent', english: 'famous', exampleSentence: 'Oslo er en kjent by.', wordClass: 'adjective' },
    { norwegian: 'vanlig', english: 'common', exampleSentence: 'Det er en vanlig norsk rett.', wordClass: 'adjective' },
  ],
]

export function getDailyWords(): DailyWord[] {
  return WORD_PACKS[new Date().getDate() % 7]
}
