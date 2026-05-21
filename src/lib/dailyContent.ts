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
